import { seedPuzzles } from "./seed";
import type { PuzzleManifest, PuzzleRecord } from "./types";

let manifestPromise: Promise<PuzzleManifest | null> | null = null;
const shardCache = new Map<string, Promise<PuzzleRecord[]>>();

async function loadManifest(): Promise<PuzzleManifest | null> {
  if (!manifestPromise) {
    manifestPromise = fetch("/data/puzzles/manifest.json")
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as PuzzleManifest;
      })
      .catch(() => null);
  }
  return manifestPromise;
}

function shardKey(skillId: string) {
  return skillId.replaceAll(".", "__");
}

export async function loadPuzzlesForSkill(skillId: string): Promise<PuzzleRecord[]> {
  const manifest = await loadManifest();
  const shard = manifest?.shards[skillId];

  if (!shard) {
    return seedPuzzles.filter((puzzle) => puzzle.skillIds.includes(skillId));
  }

  const key = shardKey(skillId);
  if (!shardCache.has(key)) {
    shardCache.set(
      key,
      fetch(`/data/puzzles/${shard.file}`)
        .then(async (response) => {
          if (!response.ok) throw new Error("Puzzle shard unavailable");
          return (await response.json()) as PuzzleRecord[];
        })
        .catch(() =>
          seedPuzzles.filter((puzzle) => puzzle.skillIds.includes(skillId)),
        ),
    );
  }

  return shardCache.get(key)!;
}

export function resetPuzzleRepositoryForTests() {
  manifestPromise = null;
  shardCache.clear();
}
