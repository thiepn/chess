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
  private worker: Worker;
  private readyPromise: Promise<void>;
  private search: PendingSearch | null = null;
  readonly name: string;

  private constructor(worker: Worker, name: string) {
    this.worker = worker;
    this.name = name;
    this.readyPromise = this.initialize();
  }

  static async create(): Promise<StockfishBrowserEngine> {
    const response = await fetch("/engine/manifest.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Stockfish engine assets are not installed.");
    }

    const manifest = (await response.json()) as EngineManifest;
    if (!manifest.script) throw new Error("Invalid Stockfish engine manifest.");

    const worker = new Worker(`/engine/${manifest.script}`);
    return new StockfishBrowserEngine(worker, manifest.engine || "Stockfish");
  }

  private initialize() {
    return new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        reject(new Error("Stockfish initialization timed out."));
      }, 12_000);

      const onMessage = (event: MessageEvent) => {
        const text = String(event.data ?? "");
        for (const line of text.split("\n")) {
          if (line.trim() === "uciok") {
            this.worker.removeEventListener("message", onMessage);
            this.worker.postMessage("setoption name Hash value 16");
            this.worker.postMessage("isready");

            const onReady = (readyEvent: MessageEvent) => {
              if (String(readyEvent.data ?? "").includes("readyok")) {
                window.clearTimeout(timeout);
                this.worker.removeEventListener("message", onReady);
                this.worker.addEventListener("message", this.handleMessage);
                resolve();
              }
            };

            this.worker.addEventListener("message", onReady);
            break;
          }
        }
      };

      this.worker.addEventListener("message", onMessage);
      this.worker.addEventListener(
        "error",
        () => {
          window.clearTimeout(timeout);
          reject(new Error("Stockfish worker failed to load."));
        },
        { once: true },
      );
      this.worker.postMessage("uci");
    });
  }

  private handleMessage = (event: MessageEvent) => {
    const activeSearch = this.search;
    if (!activeSearch) return;

    const text = String(event.data ?? "");
    for (const rawLine of text.split("\n")) {
      const line = rawLine.trim();
      if (!line) continue;

      if (line.startsWith("info ")) {
        const parsed = parseInfo(line);
        if (
          parsed &&
          (!activeSearch.last || parsed.depth >= activeSearch.last.depth)
        ) {
          activeSearch.last = parsed;
        }
      }

      if (line.startsWith("bestmove ")) {
        const move = line.split(/\s+/)[1] ?? "(none)";
        const result = activeSearch.last ?? {
          scoreCp: 0,
          bestMove: move,
          pv: move === "(none)" ? [] : [move],
          depth: 0,
        };

        result.bestMove = move === "(none)" ? result.bestMove : move;
        window.clearTimeout(activeSearch.timeout);
        activeSearch.resolve(result);
        if (this.search === activeSearch) this.search = null;
      }
    }
  };

  private async searchPosition(
    fen: string,
    depth: number,
    skillLevel: number,
  ): Promise<EngineEvaluation> {
    await this.readyPromise;

    if (this.search) {
      throw new Error("Stockfish is already analyzing another position.");
    }

    return new Promise<EngineEvaluation>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        this.worker.postMessage("stop");
        if (this.search) {
          this.search = null;
          reject(new Error("Stockfish analysis timed out."));
        }
      }, 15_000);

      this.search = { resolve, reject, timeout };
      this.worker.postMessage(
        `setoption name Skill Level value ${Math.min(20, Math.max(0, Math.round(skillLevel)))}`,
      );
      this.worker.postMessage(`position fen ${fen}`);
      this.worker.postMessage(`go depth ${Math.min(18, Math.max(1, Math.round(depth)))}`);
    });
  }

  async evaluate(fen: string, depth = 11): Promise<EngineEvaluation> {
    return this.searchPosition(fen, depth, 20);
  }

  async chooseMove(
    fen: string,
    options: EnginePlayOptions,
  ): Promise<EngineEvaluation> {
    return this.searchPosition(
      fen,
      options.depth,
      options.skillLevel,
    );
  }

  quit() {
    if (this.search) {
      window.clearTimeout(this.search.timeout);
      this.search.reject(new Error("Stockfish analysis was cancelled."));
      this.search = null;
    }
    this.worker.terminate();
  }
}
