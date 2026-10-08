import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialUserState } from "../data/demo";
import { SupabaseChessStateRepository } from "./persistence";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getUser: vi.fn(),
  upsert: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createClient,
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

const localKey = "thiepn.chess.user-state.v1";
const pendingKey = "thiepn.chess.user-state.pending-sync.v1";
const laterState = {
  ...initialUserState,
  recentDomainMinutes: { tactics: 83, fundamentals: 26, openings: 8, endgames: 2 },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("localStorage", makeStorage());
  mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  mocks.upsert.mockResolvedValue({ error: null });
  mocks.maybeSingle.mockResolvedValue({ data: { state: initialUserState }, error: null });
  mocks.createClient.mockReturnValue({
    auth: { getUser: mocks.getUser },
    from: () => ({
      upsert: mocks.upsert,
      select: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }),
    }),
  });
});

describe("P60 cloud/local state recovery", () => {
  it("mirrors successful cloud edits locally, including later offline loads", async () => {
    const repo = new SupabaseChessStateRepository("https://example.supabase.co", "anon");
    await repo.save(laterState);
    expect(JSON.parse(localStorage.getItem(localKey) ?? "null")).toEqual(laterState);
    expect(localStorage.getItem(pendingKey)).toBeNull();

    mocks.getUser.mockRejectedValueOnce(new Error("offline"));
    expect(await repo.load(initialUserState)).toEqual(laterState);
  });

  it("refuses to replace pending offline edits with stale server data", async () => {
    const repo = new SupabaseChessStateRepository("https://example.supabase.co", "anon");
    mocks.upsert.mockResolvedValueOnce({ error: { message: "network disconnected" } });
    await repo.save(laterState);
    expect(localStorage.getItem(pendingKey)).toBe("1");
    expect(await repo.load(initialUserState)).toEqual(laterState);
    expect(mocks.maybeSingle).not.toHaveBeenCalled();

    await repo.save(laterState);
    expect(localStorage.getItem(pendingKey)).toBeNull();
    expect(mocks.upsert).toHaveBeenCalledTimes(2);
  });

  it("queues remote upserts in order and clears dirty only after the last save", async () => {
    const repo = new SupabaseChessStateRepository("https://example.supabase.co", "anon");
    let finishFirst!: (value: { error: null }) => void;
    const first = new Promise<{ error: null }>((resolve) => { finishFirst = resolve; });
    mocks.upsert.mockImplementationOnce(() => first);
    mocks.upsert.mockResolvedValue({ error: null });
    const originalSave = repo.save(initialUserState);
    const latestSave = repo.save(laterState);
    for (let i = 0; i < 5 && mocks.upsert.mock.calls.length === 0; i += 1) await Promise.resolve();
    expect(mocks.upsert).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(pendingKey)).toBe("1");
    finishFirst({ error: null });
    await Promise.all([originalSave, latestSave]);
    expect(mocks.upsert).toHaveBeenCalledTimes(2);
    expect(mocks.upsert.mock.calls[0][0].state).toEqual(initialUserState);
    expect(mocks.upsert.mock.calls[1][0].state).toEqual(laterState);
    expect(localStorage.getItem(pendingKey)).toBeNull();
    expect(JSON.parse(localStorage.getItem(localKey) ?? "null")).toEqual(laterState);
  });

  it("refreshes the local fallback after a successful authenticated cloud load", async () => {
    const repo = new SupabaseChessStateRepository("https://example.supabase.co", "anon");
    mocks.maybeSingle.mockResolvedValueOnce({ data: { state: laterState }, error: null });
    expect(await repo.load(initialUserState)).toEqual(laterState);
    expect(JSON.parse(localStorage.getItem(localKey) ?? "null")).toEqual(laterState);
    expect(localStorage.getItem(pendingKey)).toBeNull();
  });

  it("retains local edits when authentication is unavailable", async () => {
    const repo = new SupabaseChessStateRepository("https://example.supabase.co", "anon");
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    await repo.save(laterState);
    expect(await repo.load(initialUserState)).toEqual(laterState);
    expect(localStorage.getItem(pendingKey)).toBe("1");
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
});
