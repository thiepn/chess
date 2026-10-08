import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { UserState } from "../domain/types";

const LOCAL_KEY = "thiepn.chess.user-state.v1";
const PENDING_KEY = "thiepn.chess.user-state.pending-sync.v1";

function readLocalState(): UserState | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || !("mastery" in value)) return null;
    return value as UserState;
  } catch {
    return null;
  }
}

function mirrorLocalState(snapshot: string, pending: boolean) {
  try {
    localStorage.setItem(LOCAL_KEY, snapshot);
    if (pending) localStorage.setItem(PENDING_KEY, "1");
  } catch {
    // Storage can be disabled or full. Remote persistence remains available.
  }
}

export interface ChessStateRepository {
  load(fallback: UserState): Promise<UserState>;
  save(state: UserState): Promise<void>;
  retryPending(): Promise<void>;
  mode: "local" | "supabase";
}

class LocalChessStateRepository implements ChessStateRepository {
  mode = "local" as const;

  async load(fallback: UserState) {
    return readLocalState() ?? fallback;
  }

  async save(state: UserState) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
  }

  async retryPending() {
    // A local-only repository has no remote queue.
  }
}

export class SupabaseChessStateRepository implements ChessStateRepository {
  mode = "supabase" as const;
  private client: SupabaseClient;
  private saveQueue: Promise<void> = Promise.resolve();

  constructor(url: string, key: string) {
    this.client = createClient(url, key);
  }

  private async userId() {
    const { data } = await this.client.auth.getUser();
    return data.user?.id;
  }

  async load(fallback: UserState) {
    const local = readLocalState();
    // Failed/offline writes must never be replaced with older server data.
    try {
      if (local && localStorage.getItem(PENDING_KEY) === "1") return local;
    } catch {
      // The remote read below still works without browser storage.
    }

    try {
      const userId = await this.userId();
      if (!userId) return local ?? fallback;

      const { data, error } = await this.client
        .from("chess_user_state")
        .select("state")
        .eq("user_id", userId)
        .maybeSingle();

      if (error || !data?.state) return local ?? fallback;
      const state = data.state as UserState;
      mirrorLocalState(JSON.stringify(state), false);
      return state;
    } catch {
      return local ?? fallback;
    }
  }

  async save(state: UserState) {
    const snapshot = JSON.stringify(state);
    // The fallback must reflect the *latest* edit immediately, even when the
    // authenticated remote write is delayed, offline, or ultimately succeeds.
    mirrorLocalState(snapshot, true);

    // Serialize remote writes: an older slow response must never overwrite a
    // newer edit. This also means only the final synced snapshot clears dirty.
    const write = async () => {
      try {
        const userId = await this.userId();
        if (!userId) return;

        const { error } = await this.client.from("chess_user_state").upsert({
          user_id: userId,
          state,
          updated_at: new Date().toISOString(),
        });
        if (error) return;

        try {
          if (localStorage.getItem(LOCAL_KEY) === snapshot) {
            localStorage.removeItem(PENDING_KEY);
          }
        } catch {
          // Storage may become unavailable while the request is in flight.
        }
      } catch {
        // The locally mirrored state remains marked for later synchronization.
      }
    };

    this.saveQueue = this.saveQueue.then(write, write);
    await this.saveQueue;
  }

  async retryPending() {
    // A retry must come after all previously queued writes. Re-read the
    // mirror only then, so a reconnection cannot re-upload a stale snapshot.
    await this.saveQueue;
    try {
      if (localStorage.getItem(PENDING_KEY) !== "1") return;
      const pending = readLocalState();
      if (pending) await this.save(pending);
    } catch {
      // No browser storage (private mode / blocked storage): nothing to retry.
    }
  }
}

export function createChessStateRepository(): ChessStateRepository {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (url && key) return new SupabaseChessStateRepository(url, key);
  return new LocalChessStateRepository();
}
