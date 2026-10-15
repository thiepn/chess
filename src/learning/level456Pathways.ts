import type { CalculationPosition } from "../calculation/types";
import { sourceStudyKind, sourceStudyTheme } from "../calculation/studySkillAlignment";
import { skillById } from "../domain/curriculum";
import type { EndgamePosition } from "../endgames/types";

/**
 * Read-only course discovery of genuine native training cases for Levels 4–6.
 * Direct skill matches are labelled direct; related original studies are labelled
 * contextual. Do not modify original skill IDs or fabricate mastery evidence.
 */
export type DeepSource =
  | { kind: "calculation"; id: string; title: string; topic: string; assessed: boolean; direct: boolean; position: CalculationPosition }
  | { kind: "endgame"; id: string; title: string; topic: string; assessed: true; direct: true; position: EndgamePosition };

const attackSkills = new Set([
  "attack.king-safety", "attack.open-lines", "attack.defenders",
  "attack.mating-net", "attack.sacrifice",
]);
const defenseSkills = new Set([
  "defense.prophylaxis", "defense.exchange-attackers", "defense.counterplay",
]);

/** Only original study families/themes are eligible for *contextual* course
 * discovery. They retain their own source IDs and cannot inherit target-skill
 * grading when used in a different course. */
function contextual(skillId:string, position:CalculationPosition) {
  const kind=sourceStudyKind(position);
  const theme=sourceStudyTheme(position).toLowerCase();
  if(!kind||!theme)return false;
  switch(skillId){
    case "strategy.open-files":
      return (kind==="pieceCoordinationStudy" && /open.file rook penetration|open file and pawn.conversion timing/.test(theme)) ||
        (kind==="strategicImbalanceStudy" && /open files and rook access/.test(theme));
    case "strategy.outposts":
      return kind==="pieceCoordinationStudy" && /knight outpost versus bishop|knight blockades and king coordination/.test(theme);
    case "pawns.breaks":
      return (kind==="pawnStructureStudy" && /central pawn chains and levers|practical middlegame pawn breaks/.test(theme)) ||
        (kind==="openingTransitionStudy" && /central tension|d4 break/.test(theme));
    case "pawns.weaknesses":
      return (kind==="pawnStructureStudy" && /doubled and backward pawns|pawn islands and wing targets|fixed color complexes/.test(theme)) ||
        (kind==="strategicImbalanceStudy" && /pawn weaknesses and compensation/.test(theme));
  }
  if(attackSkills.has(skillId) && kind==="kingAttackStudy"){
    if(skillId==="attack.king-safety")return true;
    if(skillId==="attack.open-lines")return /open.file|open a.file|long diagonal|a.file pressure/.test(theme);
    if(skillId==="attack.defenders")return /interposition|blocks|shelter|escape squares|flight squares|defensive/.test(theme);
    if(skillId==="attack.mating-net")return /rook net|checks|flights|escape squares|corner/.test(theme);
    if(skillId==="attack.sacrifice")return /initiative at material cost|poisoned|material cost/.test(theme);
  }
  if(defenseSkills.has(skillId)){
    if(kind==="defensiveTechniqueStudy"){
      if(skillId==="defense.prophylaxis")return /king flight|fortress|material.first active rook|shield|interposition/.test(theme);
      if(skillId==="defense.exchange-attackers")return /rook trade|knight trade|queen trade|exchange|recapture/.test(theme);
      return true;
    }
    if(skillId==="defense.prophylaxis" && kind==="prophylaxisStudy")return true;
  }
  return false;
}

function sourceFamily(id:string) {
  return id.split("-")[0].replace(/^calc:/,"");
}

export function level456Pathways(
  skillId:string,
  positions:readonly CalculationPosition[],
  endgames:readonly EndgamePosition[],
  maximum=12,
):DeepSource[] {
  const stage=skillById[skillId]?.stage;
  if (!["thinking","fight","finish"].includes(stage??"")) return [];
  const cap=Math.min(12,Math.max(0,Math.floor(maximum)));
  const endgame:DeepSource[]=stage==="finish"
    ? endgames.filter(p=>p.skillId===skillId).map(position=>({
      kind:"endgame" as const,id:position.id,title:position.title,
      topic:position.objective,assessed:true as const,direct:true as const,position,
    }))
    : [];
  const positionsFound:DeepSource[]=positions.flatMap(position=>{
    // Private game-derived calculation remains in owner-scoped Review, not public curriculum.
    if(position.source!=="authored")return [];
    const direct=position.skillIds.includes(skillId);
    if (!direct && !contextual(skillId,position)) return [];
    const kind=sourceStudyKind(position);
    const assessed=position.assessmentStatus!=="instructional-only";
    return [{
      kind:"calculation" as const,id:position.id,title:position.title,
      topic:kind ? sourceStudyTheme(position) : position.prompt,
      assessed:direct && assessed,direct,position,
    }];
  });
  // Keep authentic endgame execution first. Then prefer direct skill-matched
  // positions, but sample across distinct original P-series case families.
  const candidates=[...endgame,...positionsFound.filter(p=>p.direct),
    ...positionsFound.filter(p=>!p.direct)];
  const chosen:DeepSource[]=[], used=new Set<string>(), familyCounts=new Map<string,number>();
  for (const pass of [1,3,Infinity]) {
    for (const candidate of candidates) {
      if (chosen.length>=cap) break;
      if (used.has(candidate.id)) continue;
      const family=sourceFamily(candidate.id);
      if ((familyCounts.get(family)??0)>=pass) continue;
      // Do not duplicate the exact same source position under different IDs.
      if (chosen.some(p=>p.position.fen===candidate.position.fen)) continue;
      chosen.push(candidate);used.add(candidate.id);
      familyCounts.set(family,(familyCounts.get(family)??0)+1);
    }
    if (chosen.length>=cap) break;
  }
  return chosen;
}
