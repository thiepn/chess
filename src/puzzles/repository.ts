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

/** P93 mixed recognition uses actual source shards, one ID per puzzle. */
const MIXED_SKILLS=["tactics.double-attack","tactics.pin","tactics.skewer",
  "tactics.back-rank","tactics.deflection","tactics.decoy",
  "tactics.discovered","tactics.removing-defender","tactics.combinations",
  "tactics.clearance","tactics.overload"];
export async function loadMixedPuzzlesForSkill(skillId:string,now=new Date()) {
  const day=Math.floor(now.getTime()/86_400_000);
  const rotated=MIXED_SKILLS.map((_,i)=>MIXED_SKILLS[(i+day)%MIXED_SKILLS.length]);
  const skills=[...new Set([skillId,"tactics.defensive-resources",
    "calculation.quiet","defense.threats",...rotated.slice(0,5)])];
  const groups=await Promise.all(skills.map(loadPuzzlesForSkill));
  return [...new Map(groups.flat().map(p=>[p.id,p])).values()];
}
