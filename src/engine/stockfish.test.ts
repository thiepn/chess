import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Chess } from "chess.js";
import { StockfishBrowserEngine } from "./stockfish";

class ControlledWorker {
  static instances: ControlledWorker[] = [];
  static automaticHandshake = true;
  readonly messages: string[] = [];
  private readonly subscribers = new Map<string, Set<(event: MessageEvent) => void>>();
  terminated = false;
  constructor(_url: string) { ControlledWorker.instances.push(this); }
  addEventListener(type: string, cb: (event: MessageEvent) => void) {
    const group = this.subscribers.get(type) ?? new Set();
    group.add(cb);
    this.subscribers.set(type, group);
  }
  removeEventListener(type: string, cb: (event: MessageEvent) => void) {
    this.subscribers.get(type)?.delete(cb);
  }
  postMessage(text: string) {
    this.messages.push(text);
    if (!ControlledWorker.automaticHandshake) return;
    if (text === "uci") queueMicrotask(() => this.send("uciok"));
    if (text === "isready") queueMicrotask(() => this.send("readyok"));
  }
  send(data: string) {
    if (this.terminated) return;
    for (const listener of this.subscribers.get("message") ?? []) {
      listener({ data } as MessageEvent);
    }
  }
  crash() {
    for (const listener of this.subscribers.get("error") ?? []) {
      listener({} as MessageEvent);
    }
  }
  terminate() { this.terminated = true; }
}
const standardFen = new Chess().fen();
beforeEach(() => {
  ControlledWorker.instances = [];
  ControlledWorker.automaticHandshake = true;
  vi.stubGlobal("Worker", ControlledWorker);
  vi.stubGlobal("fetch", vi.fn(async () => ({
    ok: true, json: async () => ({ engine: "Stockfish Test", script: "stockfish.js" }),
  })));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("P83 real browser UCI engine wrapper", () => {
  it("does not claim the worker is ready until UCI and readyok both complete", async () => {
    ControlledWorker.automaticHandshake = false;
    const resolving = StockfishBrowserEngine.create();
    await vi.waitFor(() => expect(ControlledWorker.instances[0]?.messages).toContain("uci"));
    const worker = ControlledWorker.instances[0];
    expect(worker).toBeDefined();
    let ready = false;
    void resolving.then(() => { ready = true; });
    worker.send("uciok");
    await Promise.resolve();
    expect(ready).toBe(false);
    expect(worker.messages).toContain("isready");
    worker.send("readyok");
    const engine = await resolving;
    expect(ready).toBe(true);
    engine.quit();
  });

  it("bounds strength and time while preserving the legal engine best move", async () => {
    const engine = await StockfishBrowserEngine.create();
    const worker = ControlledWorker.instances[0];
    const choice = engine.chooseMove(standardFen, {
      skillLevel: -123, depth: 99, moveTimeMs: 100,
    });
    await Promise.resolve();
    expect(worker.messages).toContain("setoption name Skill Level value 0");
    expect(worker.messages).toContain("go depth 18 movetime 150");
    worker.send("info depth 4 score cp 29 pv e2e4 e7e5");
    worker.send("bestmove e2e4 ponder e7e5");
    const result = await choice;
    expect(result.bestMove).toBe("e2e4");
    expect(result.scoreCp).toBe(29);
    expect(new Chess(standardFen).move({
      from: result.bestMove.slice(0, 2),
      to: result.bestMove.slice(2, 4),
    })).toBeTruthy();
    engine.quit();
  });

  it("does not reuse a stale search after the worker crashes", async () => {
    const engine = await StockfishBrowserEngine.create();
    const worker = ControlledWorker.instances[0];
    const active = engine.chooseMove(standardFen, { skillLevel: 7, depth: 8 });
    await Promise.resolve();
    worker.crash();
    await expect(active).rejects.toThrow(/worker crashed/);
    expect(worker.terminated).toBe(true);
    await expect(engine.chooseMove(standardFen, { skillLevel: 7, depth: 8 }))
      .rejects.toThrow(/worker crashed/);
  });

  it("cancels a pending search promptly with no late bestmove or duplicate completion", async () => {
    const engine = await StockfishBrowserEngine.create();
    const worker = ControlledWorker.instances[0];
    const active = engine.chooseMove(standardFen, { skillLevel: 13, depth: 11, moveTimeMs: 900 });
    await Promise.resolve();
    engine.quit();
    await expect(active).rejects.toThrow(/cancelled/);
    worker.send("bestmove e2e4");
    expect(worker.terminated).toBe(true);
    engine.quit();
  });

  it("fails closed on engine timeout and terminates the search worker", async () => {
    const engine = await StockfishBrowserEngine.create();
    const worker = ControlledWorker.instances[0];
    vi.useFakeTimers();
    const active = engine.chooseMove(standardFen, { skillLevel: 3, depth: 7, moveTimeMs: 250 });
    await Promise.resolve();
    const rejected = expect(active).rejects.toThrow(/timed out/);
    await vi.advanceTimersByTimeAsync(4100);
    await rejected;
    expect(worker.terminated).toBe(true);
  });

  it("refuses a missing engine asset before constructing a worker", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false })));
    await expect(StockfishBrowserEngine.create()).rejects.toThrow(/not installed/);
    expect(ControlledWorker.instances).toHaveLength(0);
  });
});
