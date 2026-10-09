import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialUserState } from "../data/demo";
import { SupabaseChessStateRepository } from "./persistence";
import type { ThiepnBrowserSso } from "../account/sdk/index";

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


describe("P69B app-scoped Chess OAuth identity separation", () => {
  it("injects a short-lived app token into RLS queries without populating Supabase Auth", async () => {
    const identity = { status: "signed-in" as const, id: "user-1", email: null };
    const getAccessToken = vi.fn(async () => "app-only-access-token");
    const verify = vi.fn(async () => identity);
    const sso = {
      verify, getAccessToken,
      subscribe: (listener: (value: typeof identity) => void) => {
        listener(identity);
        return () => {};
      },
    } as unknown as ThiepnBrowserSso;
    const repo = new SupabaseChessStateRepository("https://example.supabase.co", "public-key", sso);
    repo.subscribeIdentity(() => {});
    await repo.load(initialUserState);
    expect(repo.getProfileId()).toBe("user.user-1");
    expect(mocks.createClient).toHaveBeenCalledWith(
      "https://example.supabase.co", "public-key",
      { accessToken: expect.any(Function) },
    );
    const options = mocks.createClient.mock.calls.at(-1)?.[2] as { accessToken: () => Promise<string> };
    expect(await options.accessToken()).toBe("app-only-access-token");
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(getAccessToken).toHaveBeenCalledTimes(1);
  });

  it("switches user A to user B to guest without loading another account's state", async () => {
    type Identity = { status: "signed-in"; id: string; email: null } | { status: "signed-out" };
    let current: Identity = { status: "signed-in", id: "user-1", email: null };
    let send!: (identity: Identity) => void;
    const sso = {
      verify: vi.fn(async () => current),
      getAccessToken: vi.fn(async () => "account-oauth-token"),
      subscribe: (listener: (identity: Identity) => void) => {
        send = listener;
        listener(current);
        return () => {};
      },
    } as unknown as ThiepnBrowserSso;
    const repo = new SupabaseChessStateRepository("https://example.supabase.co", "public-key", sso);
    const refresh = vi.fn();
    repo.subscribeIdentity(refresh);
    await repo.load(initialUserState);
    await repo.save(modifiedState);
    expect(repo.getProfileId()).toBe("user.user-1");

    current = { status: "signed-in", id: "user-2", email: null };
    send(current);
    expect(refresh).toHaveBeenCalledTimes(1);
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    expect(await repo.load(initialUserState)).toEqual(initialUserState);
    expect(repo.getProfileId()).toBe("user.user-2");
    expect(localStorage.getItem(accountKey("user-2"))).toBeNull();
    expect(JSON.parse(localStorage.getItem(accountKey("user-1")) ?? "null")).toEqual(modifiedState);

    current = { status: "signed-out" };
    send(current);
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(await repo.load(initialUserState)).toEqual(initialUserState);
    expect(repo.getProfileId()).toBe("guest");
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  it("does not adopt a legacy Supabase user from getSession when Chess OAuth verification is unavailable", async () => {
    const sso = {
      verify: vi.fn(async () => ({ status: "unavailable" as const, code: "ACCOUNT_REFRESH_UNAVAILABLE" })),
      getAccessToken: vi.fn(async () => null),
      subscribe: () => () => {},
    } as unknown as ThiepnBrowserSso;
    const fakeGetSession = vi.fn(async () => ({
      data: { session: { user: { id: "another-user" } } },
    }));
    mocks.createClient.mockReturnValueOnce({
      auth: { getUser: mocks.getUser, getSession: fakeGetSession, onAuthStateChange: mocks.onAuthStateChange },
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }) }),
      rpc: mocks.rpc,
    });
    const repo = new SupabaseChessStateRepository("https://example.supabase.co", "public-key", sso);
    await repo.load(initialUserState);
    expect(repo.getProfileId()).toBe("guest");
    expect(fakeGetSession).not.toHaveBeenCalled();
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});


describe("P69C Account revoke/offline write safety", () => {
  it("blocks an in-flight app-scoped cloud save when the user disconnects before verification resolves", async () => {
    type Identity = { status: "signed-in"; id: string; email: null } | { status: "signed-out" };
    let current: Identity = { status: "signed-in", id: "user-1", email: null };
    let listener!: (value: Identity) => void;
    let finishVerify!: (value: Identity) => void;
    let blockNext = false;
    const verify = vi.fn(async (): Promise<Identity> => {
      if (blockNext) {
        blockNext = false;
        return new Promise((resolve) => { finishVerify = resolve; });
      }
      return current;
    });
    const sso = {
      verify,
      getAccessToken: vi.fn(async () => "app-oauth-token"),
      subscribe: (cb: (value: Identity) => void) => {
        listener = cb;
        cb(current);
        return () => {};
      },
    } as unknown as ThiepnBrowserSso;
    const repo = new SupabaseChessStateRepository("https://example.supabase.co", "public-key", sso);
    repo.subscribeIdentity(() => {});
    await repo.load(initialUserState);
    blockNext = true;
    const save = repo.save(modifiedState);
    for (let i = 0; i < 25 && !finishVerify; i++) await Promise.resolve();
    expect(finishVerify).toBeDefined();
    current = { status: "signed-out" };
    listener(current);
    finishVerify({ status: "signed-in", id: "user-1", email: null });
    await save;
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(localStorage.getItem(dirtyKey("user-1"))).toBe("1");
    expect(await repo.load(initialUserState)).toEqual(initialUserState);
    expect(repo.getProfileId()).toBe("guest");
  });

  it("retains an offline account-scoped edit but refuses a backend call when app token validation is unavailable", async () => {
    type Identity = { status: "signed-in"; id: string; email: null }
      | { status: "unavailable"; code: string };
    let current: Identity = { status: "signed-in", id: "user-1", email: null };
    let listener!: (value: Identity) => void;
    const sso = {
      verify: vi.fn(async () => current),
      getAccessToken: vi.fn(async () => null),
      subscribe: (cb: (value: Identity) => void) => {
        listener = cb; cb(current); return () => {};
      },
    } as unknown as ThiepnBrowserSso;
    const repo = new SupabaseChessStateRepository("https://example.supabase.co", "public-key", sso);
    repo.subscribeIdentity(() => {});
    await repo.load(initialUserState);
    current = { status: "unavailable", code: "ACCOUNT_REFRESH_UNAVAILABLE" };
    listener(current);
    await repo.save(modifiedState);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(localStorage.getItem(dirtyKey("user-1"))).toBe("1");
    expect(JSON.parse(localStorage.getItem(accountKey("user-1")) ?? "null")).toEqual(modifiedState);
    expect(repo.getStatus().phase).toBe("pending");
  });
});
