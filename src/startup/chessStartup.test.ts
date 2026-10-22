import { describe, expect, it } from "vitest";
import { runChessStartup } from "./chessStartup";

describe("Account-first Chess application bootstrap", () => {
  it("does not load Chess app modules before Account initialization resolves", async () => {
    let finishAccount!: (value: "ready" | "redirecting") => void;
    const account = new Promise<"ready" | "redirecting">(resolve => { finishAccount = resolve; });
    const events: string[] = [];
    const pending = runChessStartup(
      async () => { events.push("account-start"); const result = await account; events.push("account-end"); return result; },
      async () => { events.push("app-load"); },
    );
    expect(events).toEqual(["account-start"]);
    finishAccount("ready");
    expect(await pending).toBe("ready");
    expect(events).toEqual(["account-start", "account-end", "app-load"]);
  });

  it("never evaluates app modules while Account redirects an OAuth login", async () => {
    let appLoads = 0;
    const outcome = await runChessStartup(
      async () => "redirecting",
      async () => { appLoads += 1; },
    );
    expect(outcome).toBe("redirecting");
    expect(appLoads).toBe(0);
  });

  it("returns a recoverable unavailable state for missing offline lesson assets", async () => {
    expect(await runChessStartup(
      async () => "ready",
      async () => { throw new Error("Authored P116 lesson source failed to load"); },
    )).toBe("unavailable");
  });

  it("does not load app modules if account initialization itself fails", async () => {
    let appLoads = 0;
    expect(await runChessStartup(
      async () => { throw new Error("Unexpected auth environment failure"); },
      async () => { appLoads += 1; },
    )).toBe("unavailable");
    expect(appLoads).toBe(0);
  });
});
