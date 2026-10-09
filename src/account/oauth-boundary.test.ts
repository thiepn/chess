import { describe, expect, it, vi } from "vitest";
import { createThiepnAccountSession, readThiepnOAuthCallback } from "./sdk/index";
import {
  CHESS_ACCOUNT_TOKEN_STORAGE_KEY,
  isChessAccountTokenStorageChange,
} from "./chessSession";

const CLIENT = "d2234af4-8c81-4ae3-8793-e249dc8ac6b1"; // fixture only
const STATE = "A".repeat(43);
function callback(query: string) {
  const href = "https://chess.thiepn.dev/auth/callback/?" + query;
  return { href, hash: "" };
}
function storage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear() { values.clear(); },
    getItem(key) { return values.get(key) ?? null; },
    key(index) { return [...values.keys()][index] ?? null; },
    removeItem(key) { values.delete(key); },
    setItem(key, value) { values.set(key, value); },
  };
}

describe("P69B PKCE callback and Chess-only cross-tab session boundary", () => {
  it("recognizes only Chess token rotations/signouts, never tokens of other THIEPN apps", () => {
    expect(isChessAccountTokenStorageChange(CHESS_ACCOUNT_TOKEN_STORAGE_KEY)).toBe(true);
    expect(isChessAccountTokenStorageChange(null)).toBe(true);
    expect(isChessAccountTokenStorageChange("thiepn:library:account-session:v1:tokens")).toBe(false);
    expect(isChessAccountTokenStorageChange("thiepn:chess:account-session:v1:pending")).toBe(false);
  });
  it("parses an exact one-code-one-state callback with no fragment", () => {
    expect(readThiepnOAuthCallback(callback("code=one-time-code&state=" + STATE))).toEqual({
      code: "one-time-code", state: STATE,
    });
    for (const query of [
      "code=one&code=two&state=" + STATE,
      "code=one&state=" + STATE + "&state=" + STATE,
      "code=one&state=short",
      "code=one&state=" + STATE + "&redirect_uri=https://evil.example",
      "access_token=x&code=one&state=" + STATE,
    ]) expect(readThiepnOAuthCallback(callback(query))).toBeNull();
    expect(readThiepnOAuthCallback({
      href: callback("code=one&state=" + STATE).href + "#token",
      hash: "#token",
    })).toBeNull();
  });
  it("refuses an unsolicited callback without PKCE state; never exchanges an attacker code", async () => {
    const transport = vi.fn();
    const session = createThiepnAccountSession({
      issuer: "https://hycegznamzjhwinegaai.supabase.co",
      publishableKey: "sb_publishable_test_not_a_secret_123456",
      clientId: CLIENT,
      redirectUri: "https://chess.thiepn.dev/auth/callback/",
      storageKey: "thiepn:chess:oauth-fixture:v1",
      authPolicy: "guest-first",
      localStorage: storage(),
      sessionStorage: storage(),
      fetch: transport,
    });
    expect(await session.completeCallback(callback("code=attacker&state=" + STATE))).toEqual({
      status: "unavailable", code: "ACCOUNT_CALLBACK_INVALID",
    });
    expect(transport).not.toHaveBeenCalled();
  });
});
