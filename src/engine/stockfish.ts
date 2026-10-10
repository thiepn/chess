import type { EngineEvaluation } from "../games/types";

interface EngineManifest {
  engine: string;
  script: string;
  wasm: string;
  license: string;
}

interface PendingSearch {
  resolve: (value: EngineEvaluation) => void;
  reject: (reason: Error) => void;
  last?: EngineEvaluation;
  timeout: number;
}

export interface EnginePlayOptions {
  skillLevel: number;
  depth: number;
  /** Maximum engine thought time in milliseconds. No clock manipulation. */
  moveTimeMs?: number;
}

function scoreToCentipawns(type: string, value: number) {
  if (type === "cp") return value;
  const sign = Math.sign(value) || 1;
  return sign * (100_000 - Math.min(99, Math.abs(value)) * 1_000);
}

function parseInfo(line: string): EngineEvaluation | null {
  const depth = Number(line.match(/\bdepth (\d+)/)?.[1] ?? 0);
  const score = line.match(/\bscore (cp|mate) (-?\d+)/);
  const pvText = line.match(/\bpv (.+)$/)?.[1];

  if (!score || !pvText) return null;

  const pv = pvText.trim().split(/\s+/);
  return {
    scoreCp: scoreToCentipawns(score[1], Number(score[2])),
    mate: score[1] === "mate" ? Number(score[2]) : undefined,
    bestMove: pv[0] ?? "(none)",
    pv,
    depth,
  };
}

export class StockfishBrowserEngine {
  private readonly worker: Worker;
  private readonly readyPromise: Promise<void>;
  private search: PendingSearch | null = null;
  private startupReject: ((reason: Error) => void) | null = null;
  private cleanupStartup: (() => void) | null = null;
  private unavailable: Error | null = null;
  readonly name: string;

  private constructor(worker: Worker, name: string) {
    this.worker = worker;
    this.name = name;
    this.worker.addEventListener("error", this.onWorkerError);
    this.readyPromise = this.initialize();
  }

  static async create(): Promise<StockfishBrowserEngine> {
    const response = await fetch("/engine/manifest.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Stockfish engine assets are not installed.");
    const manifest = (await response.json()) as EngineManifest;
    if (!manifest.script || !/^[\w.-]+\.js$/.test(manifest.script)) {
      throw new Error("Invalid Stockfish engine manifest.");
    }
    const instance = new StockfishBrowserEngine(
      new Worker(`/engine/${manifest.script}`),
      manifest.engine || "Stockfish",
    );
    // "Ready" must mean UCI and readiness handshake completed, not merely a
    // constructed Worker. Timed games must not count local engine startup.
    await instance.readyPromise;
    return instance;
  }

  private onWorkerError = () => {
    this.invalidate(new Error("Stockfish worker crashed."));
  };

  private invalidate(reason: Error) {
    if (this.unavailable) return;
    this.unavailable = reason;
    this.cleanupStartup?.();
    this.startupReject?.(reason);
    this.startupReject = null;
    if (this.search) {
      const current = this.search;
      this.search = null;
      globalThis.clearTimeout(current.timeout);
      current.reject(reason);
    }
    this.worker.terminate();
  }

  private initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.startupReject = reject;
      let stage: "uci" | "ready" = "uci";
      const onMessage = (event: MessageEvent) => {
        const line = String(event.data ?? "");
        if (stage === "uci" && line.includes("uciok")) {
          stage = "ready";
          this.worker.postMessage("setoption name Hash value 16");
          this.worker.postMessage("isready");
        } else if (stage === "ready" && line.includes("readyok")) {
          cleanup();
          this.startupReject = null;
          this.worker.addEventListener("message", this.handleMessage);
          resolve();
        }
      };
      const timeout = globalThis.setTimeout(
        () => this.invalidate(new Error("Stockfish startup timed out.")),
        12_000,
      );
      const cleanup = () => {
        globalThis.clearTimeout(timeout);
        this.worker.removeEventListener("message", onMessage);
        this.cleanupStartup = null;
      };
      this.cleanupStartup = cleanup;
      this.worker.addEventListener("message", onMessage);
      try { this.worker.postMessage("uci"); }
      catch { this.invalidate(new Error("Stockfish failed to start.")); }
    });
  }

  private handleMessage = (event: MessageEvent) => {
    const active = this.search;
    if (!active) return;
    for (const raw of String(event.data ?? "").split("\n")) {
      const line = raw.trim();
      if (line.startsWith("info ")) {
        const parsed = parseInfo(line);
        if (parsed && (!active.last || parsed.depth >= active.last.depth)) {
          active.last = parsed;
        }
      }
      if (!line.startsWith("bestmove ")) continue;
      if (this.search !== active) return;
      const bestMove = line.split(/\s+/)[1] || "(none)";
      globalThis.clearTimeout(active.timeout);
      this.search = null;
      active.resolve({
        ...(active.last ?? { scoreCp: 0, depth: 0, pv: bestMove === "(none)" ? [] : [bestMove] }),
        bestMove,
      });
    }
  };

  private async searchPosition(
    fen: string,
    depth: number,
    skillLevel: number,
    moveTimeMs?: number,
  ): Promise<EngineEvaluation> {
    await this.readyPromise;
    if (this.unavailable) throw this.unavailable;
    if (this.search) throw new Error("Engine busy.");
    const safeDepth = Math.min(18, Math.max(1, Math.round(depth) || 8));
    const safeSkill = Math.min(20, Math.max(0, Math.round(skillLevel) || 0));
    const safeTime = moveTimeMs === undefined ? null
      : Math.min(4000, Math.max(150, Math.round(moveTimeMs) || 900));

    return new Promise<EngineEvaluation>((resolve, reject) => {
      const timeout = globalThis.setTimeout(
        () => this.invalidate(new Error("Engine timed out.")),
        safeTime === null ? 15_000 : Math.max(4000, safeTime + 3000),
      );
      this.search = { resolve, reject, timeout };
      try {
        this.worker.postMessage(`setoption name Skill Level value ${safeSkill}`);
        this.worker.postMessage(`position fen ${fen}`);
        this.worker.postMessage(
          `go depth ${safeDepth}${safeTime === null ? "" : ` movetime ${safeTime}`}`,
        );
      } catch {
        this.invalidate(new Error("Worker unavailable."));
      }
    });
  }

  evaluate(fen: string, depth = 11): Promise<EngineEvaluation> {
    return this.searchPosition(fen, depth, 20);
  }

  chooseMove(fen: string, options: EnginePlayOptions): Promise<EngineEvaluation> {
    return this.searchPosition(fen, options.depth, options.skillLevel, options.moveTimeMs);
  }

  /** Cancellation terminates this worker. Recreate before another search. */
  quit() {
    this.invalidate(new Error("Stockfish analysis was cancelled."));
  }
}
