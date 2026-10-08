import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialUserState } from "../data/demo";
import { SupabaseChessStateRepository } from "./persistence";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getUser: vi.fn(),
  rpc: vi.fn(),
  rpcSingle: vi.fn(),
  maybeSingle: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

function makeStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
    clear: () => values.clear(),
  };
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createClient,
}));

const legacyKey = "thiepn.chess.user-state.v1";
const guestKey = "thiepn.chess.user-state.v2.guest.state";
const accountKey = (user: string) => "thiepn.chess.user-state.v2.user." + user + ".state";
const dirtyKey = (user: string) => "thiepn.chess.user-state.v2.user." + user + ".pending";
const revKey = (user: string) => "thiepn.chess.user-state.v2.user." + user + ".revision";
const recoveryKey = (user: string) => "thiepn.chess.user-state.v2.user." + user + ".recovery";
const modifiedState = {
  ...initialUserState,
  recentDomainMinutes: { tactics: 83, fundamentals: 26, openings: 8, endgames: 2 },
};
const thirdState = {
  ...initialUserState,
  recentDomainMinutes: { tactics: 3, fundamentals: 50, openings: 7, endgames: 41 },
};
let account: string | null = "user-1";
let authCallback: ((event: string, session: { user: { id: string } } | null) => void) | undefined;

function repository() {
  return new SupabaseChessStateRepository("https://example.supabase.co", "anon-key");
}
function accept(revision: number) {
  return { data: { accepted: true, current_revision: revision, current_state: modifiedState }, error: null };
}
function remote(state = initialUserState, revision = 0) {
  return { data: { state, revision }, error: null };
}

beforeEach(() => {
  vi.clearAllMocks();
  account = "user-1";
  authCallback = undefined;
  vi.stubGlobal("localStorage", makeStorage());
  mocks.getUser.mockImplementation(async () => ({ data: { user: account ? { id: account } : null }, error: null }));
  mocks.maybeSingle.mockResolvedValue(remote());
  mocks.rpcSingle.mockResolvedValue(accept(1));
  mocks.rpc.mockImplementation(() => ({ single: mocks.rpcSingle }));
  mocks.onAuthStateChange.mockImplementation((cb) => {
    authCallback = cb;
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  });
  mocks.createClient.mockReturnValue({
    auth: { getUser: mocks.getUser, onAuthStateChange: mocks.onAuthStateChange },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }),
    }),
    rpc: mocks.rpc,
  });
});

describe("P61 user-scoped persistence", () => {
  it("does not claim another person's unscoped browser history for a signed-in account", async () => {
    localStorage.setItem(legacyKey, JSON.stringify(modifiedState));
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const repo = repository();
    expect(await repo.load(initialUserState)).toEqual(initialUserState);
    expect(localStorage.getItem(accountKey("user-1"))).toBeNull();
    expect(localStorage.getItem(legacyKey)).not.toBeNull();
    expect(repo.legacyRecovery()).toBeNull();
  });

  it("quarantines unscoped legacy progress in account mode until guest explicitly recovers it", async () => {
    account = null;
    localStorage.setItem(legacyKey, JSON.stringify(modifiedState));
    const repo = repository();
    expect(await repo.load(initialUserState)).toEqual(initialUserState);
    expect(localStorage.getItem(guestKey)).toBeNull();
    expect(localStorage.getItem(legacyKey)).not.toBeNull();
    expect(repo.legacyRecovery()).toEqual(modifiedState);
    await repo.save(thirdState);
    expect(JSON.parse(localStorage.getItem(guestKey) ?? "null")).toEqual(thirdState);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("switches account scopes without exposing old account data", async () => {
    const repo = repository();
    const callback = vi.fn();
    const stop = repo.subscribeIdentity(callback);
    expect(await repo.load(initialUserState)).toEqual(initialUserState);
    await repo.save(modifiedState);
    expect(localStorage.getItem(accountKey("user-1"))).not.toBeNull();

    account = "user-2";
    authCallback?.("SIGNED_IN", { user: { id: "user-2" } });
    expect(callback).toHaveBeenCalledTimes(1);
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    expect(await repo.load(initialUserState)).toEqual(initialUserState);
    expect(localStorage.getItem(accountKey("user-2"))).toBeNull();
    expect(repo.legacyRecovery()).toBeNull();
    await repo.save(thirdState);
    expect(JSON.parse(localStorage.getItem(accountKey("user-1")) ?? "null")).toEqual(modifiedState);
    expect(JSON.parse(localStorage.getItem(accountKey("user-2")) ?? "null")).toEqual(thirdState);

    account = null;
    authCallback?.("SIGNED_OUT", null);
    expect(await repo.load(initialUserState)).toEqual(initialUserState);
    stop();
  });

  it("passes the loaded cloud revision to an atomic conditional save", async () => {
    mocks.maybeSingle.mockResolvedValueOnce(remote(initialUserState, 7));
    mocks.rpcSingle.mockResolvedValueOnce(accept(8));
    const repo = repository();
    await repo.load(initialUserState);
    await repo.save(modifiedState);
    expect(mocks.rpc).toHaveBeenCalledWith("chess_save_state", {
      p_state: modifiedState,
      p_expected_revision: 7,
    });
    expect(localStorage.getItem(revKey("user-1"))).toBe("8");
    expect(localStorage.getItem(dirtyKey("user-1"))).toBeNull();
    expect(repo.getStatus().phase).toBe("synced");
    await repo.save(modifiedState);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });

  it("serializes concurrent writes and advances revisions in order", async () => {
    const repo = repository();
    await repo.load(initialUserState);
    let finish!: (value: ReturnType<typeof accept>) => void;
    const first = new Promise<ReturnType<typeof accept>>((resolve) => { finish = resolve; });
    mocks.rpcSingle.mockImplementationOnce(() => first).mockResolvedValueOnce(accept(2));
    const a = repo.save(modifiedState);
    const b = repo.save(thirdState);
    for (let i = 0; i < 10 && mocks.rpc.mock.calls.length === 0; i++) await Promise.resolve();
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    finish(accept(1));
    await Promise.all([a, b]);
    expect(mocks.rpc.mock.calls.map((x) => x[1].p_expected_revision)).toEqual([0, 1]);
    expect(JSON.parse(localStorage.getItem(accountKey("user-1")) ?? "null")).toEqual(thirdState);
    expect(localStorage.getItem(dirtyKey("user-1"))).toBeNull();
  });

  it("keeps a conflicting local snapshot and explicitly restores cloud with a recovery copy", async () => {
    const repo = repository();
    await repo.load(initialUserState);
    mocks.rpcSingle.mockResolvedValueOnce({
      data: { accepted: false, current_revision: 4, current_state: thirdState }, error: null,
    });
    await repo.save(modifiedState);
    expect(repo.getStatus().phase).toBe("conflict");
    expect(localStorage.getItem(dirtyKey("user-1"))).toBe("1");
    expect(JSON.parse(localStorage.getItem(accountKey("user-1")) ?? "null")).toEqual(modifiedState);
    mocks.maybeSingle.mockResolvedValueOnce(remote(thirdState, 4));
    expect(await repo.resolveConflict("use-cloud")).toEqual(thirdState);
    expect(JSON.parse(localStorage.getItem(recoveryKey("user-1")) ?? "null")).toEqual(modifiedState);
    expect(repo.archivedRecovery()).toEqual(modifiedState);
    expect(localStorage.getItem(revKey("user-1"))).toBe("4");
    expect(localStorage.getItem(dirtyKey("user-1"))).toBeNull();
  });

  it("requires a fresh compare-and-swap even for intentional local override", async () => {
    const repo = repository();
    await repo.load(initialUserState);
    mocks.rpcSingle
      .mockResolvedValueOnce({ data: { accepted: false, current_revision: 5, current_state: thirdState }, error: null })
      .mockResolvedValueOnce(accept(6));
    await repo.save(modifiedState);
    expect(repo.getStatus().phase).toBe("conflict");
    expect(await repo.resolveConflict("keep-local")).toEqual(modifiedState);
    expect(mocks.rpc.mock.calls[1][1].p_expected_revision).toBe(5);
    expect(repo.getStatus().phase).toBe("synced");
  });

  it("detects an offline conflict on reload instead of automatically overwriting newer cloud progress", async () => {
    localStorage.setItem(accountKey("user-1"), JSON.stringify(modifiedState));
    localStorage.setItem(dirtyKey("user-1"), "1");
    localStorage.setItem(revKey("user-1"), "2");
    mocks.maybeSingle.mockResolvedValueOnce(remote(thirdState, 3));
    const repo = repository();
    expect(await repo.load(initialUserState)).toEqual(modifiedState);
    expect(repo.getStatus().phase).toBe("conflict");
    await repo.retryPending();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("keeps failed writes pending and retries the latest local snapshot", async () => {
    const repo = repository();
    await repo.load(initialUserState);
    mocks.rpcSingle.mockResolvedValueOnce({ data: null, error: { message: "offline" } })
      .mockResolvedValueOnce(accept(1));
    await repo.save(modifiedState);
    expect(repo.getStatus().phase).toBe("pending");
    expect(localStorage.getItem(dirtyKey("user-1"))).toBe("1");
    await repo.retryPending();
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem(dirtyKey("user-1"))).toBeNull();
    await repo.retryPending();
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
  });

  it("does not upload a queued snapshot into a different account on sign-in", async () => {
    const repo = repository();
    repo.subscribeIdentity(() => {});
    await repo.load(initialUserState);
    let resolveFirst!: (value: { data: { user: { id: string } }; error: null }) => void;
    mocks.getUser.mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }));
    const save = repo.save(modifiedState);
    for (let i = 0; i < 10 && !resolveFirst; i++) await Promise.resolve();
    account = "user-2";
    authCallback?.("SIGNED_IN", { user: { id: "user-2" } });
    resolveFirst({ data: { user: { id: "user-1" } }, error: null });
    await save;
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(localStorage.getItem(dirtyKey("user-1"))).toBe("1");
  });
});
