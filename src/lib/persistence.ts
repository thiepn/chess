import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { UserState } from "../domain/types";

// The P60 keys are deliberately not deleted. Their ownership is unknown and
// cannot safely be attributed to the next authenticated user.
const LEGACY_KEY = "thiepn.chess.user-state.v1";
const PREFIX = "thiepn.chess.user-state.v2";
const GUEST = "guest";

export type SyncPhase = "local" | "guest" | "loading" | "synced" | "pending" | "conflict";
export type SyncStatus = { phase: SyncPhase; detail: string };
type IdentityListener = () => void;
type StatusListener = (status: SyncStatus) => void;

function stateKey(owner: string) { return PREFIX + "." + owner + ".state"; }
function dirtyKey(owner: string) { return PREFIX + "." + owner + ".pending"; }
function revisionKey(owner: string) { return PREFIX + "." + owner + ".revision"; }
function recoveryKey(owner: string) { return PREFIX + "." + owner + ".recovery"; }

export function isChessState(value: unknown): value is UserState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Partial<UserState>;
  return Boolean(candidate.mastery && typeof candidate.mastery === "object" &&
    !Array.isArray(candidate.mastery) && Array.isArray(candidate.weaknesses) &&
    candidate.recentDomainMinutes &&
    typeof candidate.recentDomainMinutes === "object" &&
    !Array.isArray(candidate.recentDomainMinutes));
}

function parseState(raw: string | null): UserState | null {
  if (!raw || raw.length > 15_000_000) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return isChessState(value) ? value : null;
  } catch {
    return null;
  }
}
function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key: string, value: string) {
  try { localStorage.setItem(key, value); return true; } catch { return false; }
}
function remove(key: string) {
  try { localStorage.removeItem(key); } catch { /* Storage may be disabled. */ }
}
function local(owner: string): UserState | null {
  return parseState(read(stateKey(owner)));
}
function pending(owner: string) { return read(dirtyKey(owner)) === "1"; }
function revision(owner: string) {
  const parsed = Number(read(revisionKey(owner)) ?? "0");
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}
function storeState(owner: string, value: UserState, dirty: boolean) {
  const saved = write(stateKey(owner), JSON.stringify(value));
  if (saved && dirty) write(dirtyKey(owner), "1");
  return saved;
}
function storeRevision(owner: string, rev: number) {
  write(revisionKey(owner), String(rev));
}

// Move old browser-local progress into the GUEST profile only. Never
// automatically claim legacy data on behalf of an authenticated account.
function guestState(allowLegacyMigration: boolean): UserState | null {
  const existing = local(GUEST);
  if (existing) return existing;
  if (!allowLegacyMigration) return null;
  // Only a browser-only installation can attribute its old local store to
  // the guest profile. Account-enabled installations quarantine that key.
  const legacy = parseState(read(LEGACY_KEY));
  if (legacy) storeState(GUEST, legacy, false);
  return legacy;
}

export interface ChessStateRepository {
  load(fallback: UserState): Promise<UserState>;
  save(state: UserState): Promise<void>;
  retryPending(): Promise<void>;
  subscribeIdentity(listener: IdentityListener): () => void;
  subscribeStatus(listener: StatusListener): () => void;
  getStatus(): SyncStatus;
  getProfileId(): string;
  legacyRecovery(): UserState | null;
  archivedRecovery(): UserState | null;
  resolveConflict(choice: "keep-local" | "use-cloud"): Promise<UserState | null>;
  mode: "local" | "supabase";
}

abstract class ChessRepositoryBase {
  protected statusListeners = new Set<StatusListener>();
  protected status: SyncStatus = { phase: "loading", detail: "Loading saved progress" };
  getStatus() { return this.status; }
  getProfileId() { return GUEST; }
  subscribeStatus(listener: StatusListener) {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => { this.statusListeners.delete(listener); };
  }
  protected report(phase: SyncPhase, detail: string) {
    this.status = { phase, detail };
    this.statusListeners.forEach((listener) => listener(this.status));
  }
  legacyRecovery() { return parseState(read(LEGACY_KEY)); }
  archivedRecovery() { return null as UserState | null; }
}

class LocalChessStateRepository extends ChessRepositoryBase implements ChessStateRepository {
  mode = "local" as const;
  async load(fallback: UserState) {
    this.report("local", "Saved on this browser only");
    return guestState(true) ?? fallback;
  }
  async save(state: UserState) {
    if (!storeState(GUEST, state, false)) {
      this.report("pending", "Browser storage unavailable; export a backup");
      return;
    }
    this.report("local", "Saved on this browser only");
  }
  async retryPending() {}
  subscribeIdentity() { return () => {}; }
  async resolveConflict() { return null; }
}

type RemoteRecord = { state: UserState; revision: number };
type WriteResponse = {
  accepted: boolean;
  current_revision: number;
  current_state: UserState;
};

export class SupabaseChessStateRepository extends ChessRepositoryBase implements ChessStateRepository {
  mode = "supabase" as const;
  private client: SupabaseClient;
  private owner: string = GUEST;
  private initialized = false;
  private saveQueue: Promise<void> = Promise.resolve();
  private knownRevisions = new Map<string, number>();
  private conflict: { owner: string; remote: RemoteRecord } | null = null;
  private identityEpoch = 0;

  constructor(url: string, key: string) {
    super();
    this.client = createClient(url, key);
  }

  override legacyRecovery() {
    return this.owner === GUEST ? super.legacyRecovery() : null;
  }

  private async authOwner(): Promise<string | null> {
    const { data, error } = await this.client.auth.getUser();
    if (error) throw error;
    return data.user?.id ?? null;
  }
  private scope() { return this.owner === GUEST ? GUEST : "user." + this.owner; }
  override getProfileId() { return this.scope(); }
  override archivedRecovery() { return parseState(read(recoveryKey(this.scope()))); }
  private async ownerForLoad() {
    try { return (await this.authOwner()) ?? GUEST; }
    catch {
      // Supabase's cached session can select the correct local partition while
      // getUser() is offline; it is never trusted for a remote write.
      try {
        const { data } = await this.client.auth.getSession();
        if (data.session?.user?.id) return data.session.user.id;
      } catch { /* No cached session available. */ }
      return this.initialized ? this.owner : GUEST;
    }
  }
  subscribeIdentity(listener: IdentityListener) {
    const { data } = this.client.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") return;
      const next = session?.user?.id ?? GUEST;
      if (this.initialized && next === this.owner) return;
      ++this.identityEpoch;
      this.owner = next;
      this.conflict = null;
      this.report("loading", "Account changed; switching chess profile");
      listener();
    });
    return () => data.subscription.unsubscribe();
  }

  private async remoteRecord(): Promise<RemoteRecord | null> {
    const userId = this.owner;
    if (userId === GUEST) return null;
    const { data, error } = await this.client.from("chess_user_state")
      .select("state, revision").eq("user_id", userId).maybeSingle();
    if (error) throw error;
    if (!data?.state || !isChessState(data.state)) return null;
    return { state: data.state as UserState, revision: Number(data.revision ?? 0) };
  }

  async load(fallback: UserState) {
    const epoch = this.identityEpoch;
    const account = await this.ownerForLoad();
    if (epoch !== this.identityEpoch) return fallback;
    this.owner = account;
    this.initialized = true;
    this.conflict = null;
    const scope = this.scope();
    if (account === GUEST) {
      this.report("guest", "Guest progress stays on this browser");
      return guestState(false) ?? fallback;
    }

    const cached = local(scope);
    const wasPending = pending(scope);
    try {
      // A remote load is needed even for pending local edits to discover
      // conflicts rather than blindly overwriting another device's changes.
      const remote = await this.remoteRecord();
      if (epoch !== this.identityEpoch) return fallback;
      const base = revision(scope);
      if (remote) {
        this.knownRevisions.set(scope, remote.revision);
        if (wasPending && cached) {
          if (remote.revision !== base) {
            this.conflict = { owner: scope, remote };
            this.report("conflict", "Another device changed your progress; choose a recovery option");
          } else {
            this.report("pending", "Local changes waiting to sync");
          }
          return cached;
        }
        storeState(scope, remote.state, false);
        storeRevision(scope, remote.revision);
        remove(dirtyKey(scope));
        this.report("synced", "Progress synced to your account");
        return remote.state;
      }
      this.knownRevisions.set(scope, 0);
      if (cached) {
        // A missing server row must not discard an existing scoped local copy.
        write(dirtyKey(scope), "1");
        this.report("pending", "Local changes waiting for first cloud save");
        return cached;
      }
      this.report("synced", "Account ready; no saved chess progress yet");
      return fallback;
    } catch {
      if (epoch !== this.identityEpoch) return fallback;
      this.report("pending", "Cloud unavailable; local progress retained");
      return cached ?? fallback;
    }
  }

  async save(state: UserState) {
    const owner = this.owner;
    const epoch = this.identityEpoch;
    const scope = this.scope();
    // Loading an unchanged, already-synced snapshot is not a new edit.
    if (read(stateKey(scope)) === JSON.stringify(state) && !pending(scope)) return;
    if (owner === GUEST) {
      if (!storeState(GUEST, state, false)) {
        this.report("pending", "Browser storage unavailable; export a backup");
      } else {
        this.report("guest", "Guest progress stays on this browser");
      }
      return;
    }
    const mirrored = storeState(scope, state, true);
    if (!mirrored) {
      this.report("pending", "Browser cache unavailable; attempting cloud save");
    }
    if (this.conflict?.owner === scope) {
      this.report("conflict", "Cloud conflict; local progress preserved");
      return;
    }
    this.report("pending", "Syncing chess progress");
    const snapshot = JSON.stringify(state);
    const writeRemote = async () => {
      // Do not ever write a previous account's queued snapshot as another user.
      if (this.owner !== owner || this.identityEpoch !== epoch) return;
      try {
        if (await this.authOwner() !== owner ||
            this.owner !== owner || this.identityEpoch !== epoch) return;
        const expected = this.knownRevisions.get(scope) ?? revision(scope);
        const { data, error } = await this.client.rpc("chess_save_state", {
          p_state: state,
          p_expected_revision: expected,
        }).single();
        if (error || !data) {
          if (this.owner === owner && this.identityEpoch === epoch) this.report("pending", "Cloud save failed; will retry");
          return;
        }
        const response = data as WriteResponse;
        if (!response.accepted) {
          if (this.owner !== owner || this.identityEpoch !== epoch) return;
          this.conflict = {
            owner: scope,
            remote: { revision: Number(response.current_revision), state: response.current_state },
          };
          this.report("conflict", "Cloud changed elsewhere; local copy preserved");
          return;
        }
        const nextRevision = Number(response.current_revision);
        this.knownRevisions.set(scope, nextRevision);
        // The revision belongs to the last acknowledged snapshot, not a
        // newer local edit that is still in the queue.
        storeRevision(scope, nextRevision);
        if (this.owner === owner && this.identityEpoch === epoch &&
            (read(stateKey(scope)) === snapshot || !mirrored)) {
          if (mirrored) remove(dirtyKey(scope));
          this.report("synced", mirrored
            ? "Progress synced to your account"
            : "Saved in cloud; browser cache unavailable");
        }
      } catch {
        if (this.owner === owner && this.identityEpoch === epoch) this.report("pending", "Cloud unavailable; will retry");
      }
    };
    this.saveQueue = this.saveQueue.then(writeRemote, writeRemote);
    await this.saveQueue;
  }

  async retryPending() {
    await this.saveQueue;
    const scope = this.scope();
    if (this.owner === GUEST || this.conflict?.owner === scope || !pending(scope)) return;
    const cached = local(scope);
    if (cached) await this.save(cached);
  }

  async resolveConflict(choice: "keep-local" | "use-cloud"): Promise<UserState | null> {
    const current = this.conflict;
    if (!current || current.owner !== this.scope()) return null;
    const scope = current.owner;
    if (choice === "use-cloud") {
      // The remote version may have changed again since the original
      // conflict; never restore an obsolete remote snapshot.
      let latest: RemoteRecord | null;
      try {
        if (await this.authOwner() !== this.owner) return null;
        latest = await this.remoteRecord();
      } catch {
        this.report("conflict", "Cloud unavailable; conflict still unresolved");
        return null;
      }
      if (this.conflict !== current || scope !== this.scope() ||
          !latest || !isChessState(latest.state)) return null;
      const old = read(stateKey(scope));
      if (old && !write(recoveryKey(scope), old)) return null;
      if (!storeState(scope, latest.state, false)) return null;
      storeRevision(scope, latest.revision);
      remove(dirtyKey(scope));
      this.knownRevisions.set(scope, latest.revision);
      this.conflict = null;
      this.report("synced", "Latest cloud version restored; local copy archived");
      return latest.state;
    }
    const cached = local(scope);
    if (!cached) return null;
    // Explicit overwrite is conditional on the revision shown at conflict
    // time. A third device's newer edit can still produce another conflict.
    this.knownRevisions.set(scope, current.remote.revision);
    storeRevision(scope, current.remote.revision);
    this.conflict = null;
    await this.save(cached);
    return cached;
  }
}

export function createChessStateRepository(): ChessStateRepository {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (url && key) return new SupabaseChessStateRepository(url, key);
  return new LocalChessStateRepository();
}
