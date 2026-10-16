import { skillById } from "../domain/curriculum";
import { originalAdvancedThemeMatch } from "./advancedThemeMatch";
import { sourceStudyKind, sourceStudyTheme } from "../calculation/studySkillAlignment";
import type { CalculationPosition } from "../calculation/types";
import type { EndgamePosition } from "../endgames/types";
import type { TransferMission } from "../review/gameTransfer";
import type { ReviewErrorType } from "../games/types";

/** Level 7–8 course-owned teaching *projections*, NOT chess optimality or new mastery authority. */
export const level78Guides: Readonly<Record<string,{prompts:readonly [string,string,string];masterPairIds:readonly string[]}>> =
{
  "practical.time": {
    "prompts": [
      "Identify where the actual clock use made a candidate calculation or plan unusually costly.",
      "Compare a useful quick safety scan against deeper analysis when the position is critical.",
      "Explain how you would allocate your next move's time without claiming an invented clock result."
    ],
    "masterPairIds": [
      "f4-or-queen-preparation",
      "rook-then-pawn-or-pawn-then-rook"
    ]
  },
  "practical.plan": {
    "prompts": [
      "Choose a plan based on pawn structure, weakest piece and opponent counterplay.",
      "Test the strongest opponent resource before committing your pieces to that plan.",
      "Name a measurable positional change that would make you revise the plan."
    ],
    "masterPairIds": [
      "a3-versus-c4-space",
      "f4-or-queen-preparation"
    ]
  },
  "practical.transition": {
    "prompts": [
      "Identify the concrete change in king safety, pawn structure or material that shifts the game phase.",
      "Describe which earlier opening or middlegame rule no longer controls this board.",
      "Reassess the plan after the transition instead of applying a memorized rule."
    ],
    "masterPairIds": [
      "central-break-or-setup",
      "rook-then-pawn-or-pawn-then-rook"
    ]
  },
  "practical.post-move-check": {
    "prompts": [
      "Before acting, name the opponent's checks, captures and direct threats on the current board.",
      "After the imagined move, recalculate which enemy piece or square becomes newly active.",
      "Describe a legal alternative if the final board fails the safety scan."
    ],
    "masterPairIds": [
      "capturing-before-defending",
      "knight-defense-under-pressure"
    ]
  },
  "practical.resilience": {
    "prompts": [
      "After a real mistake, identify the new evaluation-relevant threats rather than trying to undo history.",
      "Find practical defensive choices and name how the opponent may resist each one.",
      "Choose a next-game repair exercise and distinguish a clean delayed return from a repeated guess."
    ],
    "masterPairIds": [
      "checks-and-counterattack",
      "queen-threat-versus-king-retreat"
    ]
  },
  "tactics.combinations": {
    "prompts": [
      "Compare two forcing first moves and locate the shared tactical motif that connects them.",
      "Calculate the opponent's recorded forcing reply before extending the combination.",
      "Explain how a different defender or move order would invalidate the tempting pattern."
    ],
    "masterPairIds": [
      "bishop-sacrifice-and-rook-invasion",
      "pin-versus-sacrifice-pressure"
    ]
  },
  "tactics.defensive-resources": {
    "prompts": [
      "Search for counterchecks, intermediate captures and exchanges before accepting a tactical loss.",
      "Play through the original attacker's strongest recorded reply to your defense.",
      "Describe the exact resource a passive defense misses and when the tactical defense fails."
    ],
    "masterPairIds": [
      "checks-and-counterattack",
      "knight-defense-under-pressure"
    ]
  },
  "calculation.branching": {
    "prompts": [
      "Write down at least two serious candidate moves and their first opposing replies.",
      "Follow the legal branches to distinct final positions before judging either candidate.",
      "Compare material, king safety and initiative; do not equate an authored line with unique optimality."
    ],
    "masterPairIds": [
      "bishop-sacrifice-and-rook-invasion",
      "capturing-before-defending"
    ]
  },
  "calculation.evaluation": {
    "prompts": [
      "Identify a stable stopping point after checks and forcing replies are resolved.",
      "Evaluate the resulting position by king safety, piece quality, material, structure and threats.",
      "Explain which missing opponent resource would force calculation to continue."
    ],
    "masterPairIds": [
      "rook-then-pawn-or-pawn-then-rook",
      "queen-takes-versus-queen-repositions"
    ]
  },
  "strategy.imbalances": {
    "prompts": [
      "Rank the most consequential imbalance rather than treating every piece feature equally.",
      "Identify a legal counterplan that attacks the same weakness or compensates elsewhere.",
      "Choose a transformation that improves the imbalance without granting a stronger one."
    ],
    "masterPairIds": [
      "a3-versus-c4-space",
      "minor-piece-influence"
    ]
  },
  "strategy.bishop-vs-knight": {
    "prompts": [
      "Evaluate open and closed diagonals, pawn colors, outpost access and king location.",
      "What pawn change could reverse which minor piece is better in this exact structure?",
      "Explain a tempting bishop-versus-knight exchange that removes a useful defender."
    ],
    "masterPairIds": [
      "bishop-retreat-versus-knight-route",
      "minor-piece-influence"
    ]
  },
  "strategy.exchanges": {
    "prompts": [
      "Describe the imbalance and targets that a concrete exchange will change.",
      "Calculate the opponent's recapture and the resulting pawn or piece ending.",
      "Reject exchanges that simplify away your only active plan or expose a new weakness."
    ],
    "masterPairIds": [
      "two-bishop-captures",
      "capturing-before-defending"
    ]
  },
  "strategy.restriction": {
    "prompts": [
      "Identify one square, pawn break or file the opponent needs for counterplay.",
      "Choose a candidate restriction and test the active reply it still allows.",
      "Explain how an overrestrictive move can leave your own pieces without useful squares."
    ],
    "masterPairIds": [
      "minor-piece-influence",
      "a-pawn-tempo-tradeoff"
    ]
  },
  "strategy.coordination": {
    "prompts": [
      "Choose a concrete target that two or more pieces can support together.",
      "What legal defensive move breaks the cooperation before the final move lands?",
      "Compare improving your least active piece with chasing a target using an already active one."
    ],
    "masterPairIds": [
      "piece-invasion-versus-file-control",
      "rook-then-pawn-or-pawn-then-rook"
    ]
  },
  "pawns.iqp": {
    "prompts": [
      "Evaluate the isolated pawn's dynamic central breaks against its static weakness.",
      "Name the defender's blockade or exchange plan if the isolated pawn cannot advance.",
      "Compare an active piece-based initiative with entering an unfavorable pawn ending."
    ],
    "masterPairIds": [
      "central-break-or-setup",
      "two-f5-different-centers"
    ]
  },
  "pawns.hanging": {
    "prompts": [
      "Identify the connected c- and d-pawn levers and the pieces backing them.",
      "Calculate how the opponent would blockade or attack the remaining pawn after one advances.",
      "Explain why maintaining tension can be stronger than a premature isolated advance."
    ],
    "masterPairIds": [
      "central-break-or-setup",
      "two-f5-different-centers"
    ]
  },
  "pawns.minority": {
    "prompts": [
      "Locate the queenside majority and the potential fixed pawn target created by a minority attack.",
      "Name the opponent's pawn break, piece exchange or kingside counterplay.",
      "Explain when continuing minority-pawn pushes would abandon necessary king safety."
    ],
    "masterPairIds": [
      "a3-versus-c4-space",
      "a-pawn-tempo-tradeoff"
    ]
  },
  "strategy.repertoire-middlegames": {
    "prompts": [
      "Identify the original opening structure and the recurring plan rather than memorizing move order.",
      "Compare the opponent's available central break with your preferred piece placements.",
      "Choose a middle-game plan consistent with the actual pawn contact and king positions."
    ],
    "masterPairIds": [
      "castle-or-claim-space",
      "central-break-or-setup"
    ]
  },
  "endgames.rook-checks": {
    "prompts": [
      "Compare side checks, rear checks and a king cutoff from the given rook position.",
      "Identify the king's legal shelter and whether the defender has enough checking distance.",
      "Explain when a seemingly active rook check actually loses the pawn or cutoff."
    ],
    "masterPairIds": [
      "rooks-on-different-ranks",
      "rook-then-pawn-or-pawn-then-rook"
    ]
  },
  "endgames.opposite-bishops": {
    "prompts": [
      "Identify the bishops' square colors and which pawns each side can blockade.",
      "Check whether a passed pawn can force a breakthrough or be safely stopped on its color.",
      "Explain why a material advantage may not convert if the defender holds key color squares."
    ],
    "masterPairIds": [
      "two-bishop-directions",
      "bishop-retreat-versus-knight-route"
    ]
  },
  "endgames.minor-piece": {
    "prompts": [
      "Compare knight outposts, bishop diagonals and the kings' routes to pawn targets.",
      "Find the defender's active king move or pawn lever before simplifying the pieces.",
      "Describe how a small structural change alters the right minor-piece plan."
    ],
    "masterPairIds": [
      "bishop-retreat-versus-knight-route",
      "minor-piece-influence"
    ]
  },
  "conversion.two-weaknesses": {
    "prompts": [
      "Locate the fully defended first weakness and a feasible second entry point.",
      "Calculate whether the defender can meet both threats by exchanging or switching pieces.",
      "Explain why attacking the original weakness harder may not improve the position."
    ],
    "masterPairIds": [
      "queen-invasion-or-pawn-gain",
      "queen-invasion-or-retreat"
    ]
  },
  "practical.complications": {
    "prompts": [
      "Compare objective candidate quality with clock pressure and genuine opponent resources.",
      "Find a simplification and a forcing complication, then calculate both defender replies.",
      "State when deliberate complexity helps practical survival without mistaking hope for chess value."
    ],
    "masterPairIds": [
      "checks-and-counterattack",
      "bishop-sacrifice-and-rook-invasion"
    ]
  }
} as const;

export function level78Guide(skillId:string) {
  return ["practical","advanced"].includes(skillById[skillId]?.stage??"")
    ? level78Guides[skillId]??null : null;
}
export function pairIdsForSkill(skillId?:string):readonly string[] {
  return skillId ? level78Guide(skillId)?.masterPairIds??[] : [];
}
export type AdvancedCase =
  | {kind:"calculation";id:string;title:string;topic:string;assessed:boolean;direct:boolean;position:CalculationPosition}
  | {kind:"endgame";id:string;title:string;topic:string;assessed:boolean;direct:boolean;position:EndgamePosition};
/** Source-owned positional scenarios for the five Level 7 PRACTICAL skills.
 * This identifies applicable ORIGINAL boards only. It does not make clock
 * observations, infer a real blunder or award new proficiency evidence. */
export function originalPracticalSourceMatch(skillId:string, position:CalculationPosition):boolean {
  if(position.source!=="authored")return false;
  // P94 is the original candidate-move/defender decision family. Its boards
  // can support a simulated time-allocation decision, NOT actual clock history.
  if(skillId==="practical.time")
    return /^calc:p94-\d+$/.test(position.id) &&
      position.skillIds.includes("calculation.candidates") &&
      position.principalVariation.length>=3;
  const kind=sourceStudyKind(position);
  const theme=sourceStudyTheme(position).toLowerCase();
  if(!kind || !theme)return false;
  switch(skillId){
    case "practical.plan":
      return (kind==="pieceCoordinationStudy" &&
          /choosing among strategic plans|prophylaxis before expansion|converting space into initiative|improving the least active piece/.test(theme)) ||
        (kind==="strategicImbalanceStudy" &&
          /coordination and revising a plan|material versus activity|space and timely breaks/.test(theme));
    case "practical.transition":
      return kind==="openingTransitionStudy" || kind==="endgameDecisionStudy";
    case "practical.post-move-check":
      return (kind==="kingAttackStudy" &&
          /check|interposition|rook|queen|shelter|flight|escape/.test(theme)) ||
        (kind==="defensiveTechniqueStudy" &&
          /interposition|rook threat|checking|queen|king flight/.test(theme));
    case "practical.resilience":
      return (kind==="defensiveTechniqueStudy" &&
          /active rook defense|fortress|counter|trade|interposition|shield/.test(theme)) ||
        (kind==="prophylaxisStudy" &&
          /revision after unexpected defense|flexible defensive coordination|prevention versus counterattack/.test(theme));
    default:
      return false;
  }
}
export function level78AdvancedCases(
 skillId:string,positions:readonly CalculationPosition[],
 endings:readonly EndgamePosition[],limit=12,
):AdvancedCase[] {
  const stage=skillById[skillId]?.stage;
  if(stage!=="advanced" && stage!=="practical")return [];
  const practical=stage==="practical";
  const max=Math.min(12,Math.max(0,Math.floor(limit)));
  const choice:AdvancedCase[]=[];
  const endingsDirect=practical?[]:endings.filter(p=>p.skillId===skillId).map(position=>({
    kind:"endgame" as const,id:position.id,title:position.title,topic:position.objective,
    assessed:true,direct:true,position,
  }));
  const scored=positions.flatMap(position=>{
    if(position.source!=="authored")return [];
    const direct=!practical && position.skillIds.includes(skillId);
    if(!direct && !(practical
      ? originalPracticalSourceMatch(skillId,position)
      : originalAdvancedThemeMatch(skillId,position)))return [];
    const kind=position.strategicImbalanceStudy?.theme ??
      position.prophylaxisStudy?.theme ??
      position.endgameDecisionStudy?.family ??
      position.openingTransitionStudy?.theme ?? position.title;
    const topic=(practical
      ? skillId==="practical.time"
        ? "Simulated time-allocation choice · no recorded clock data · "
        : "Unscored practical decision transfer · "
      : "")+kind+" · "+position.prompt;
    return [{kind:"calculation" as const,id:position.id,title:position.title,topic,
      assessed:!practical && direct && position.assessmentStatus!=="instructional-only",direct,position}];
  });
  // Explicitly source qualified; direct first, endgame technique before related studies.
  const candidates=[...endingsDirect,...scored.filter(p=>p.direct),...scored.filter(p=>!p.direct)];
  const used=new Set<string>(),families=new Set<string>();
  for(const pass of [true,false])for(const c of candidates){
    if(choice.length>=max)break;
    if(used.has(c.id)||choice.some(x=>x.position.fen===c.position.fen))continue;
    const family=c.id.split("-")[0];
    if(pass&&families.has(family))continue;
    used.add(c.id);families.add(family);choice.push(c);
  }
  return choice;
}
function missionRelated(skillId:string,m:TransferMission) {
  if(m.skillIds.includes(skillId))return true;
  const error=m.errorType as ReviewErrorType;
  if(skillId==="practical.time")return error==="time-management";
  if(skillId==="practical.plan")return error==="strategic-plan";
  if(skillId==="practical.transition")return error==="opening-deviation" || m.lane==="endgame";
  if(skillId==="practical.post-move-check")return error==="tactical-miss"||error==="calculation-failure";
  if(skillId==="practical.resilience")return m.missedReturns>0||m.due;
  if(skillId==="practical.complications")return error==="time-management"||error==="calculation-failure";
  if(skillId.startsWith("calculation.")||skillId.startsWith("tactics."))return m.lane==="calculation"||m.lane==="tactics";
  if(skillId.startsWith("endgames.")||skillId.startsWith("conversion."))return m.lane==="endgame";
  if(skillId.startsWith("strategy.")||skillId.startsWith("pawns."))return m.lane==="strategy";
  return false;
}
/** Owner-derived missions are still verified by original Review; related != mastery evidence. */
export function level78GameMissions(skillId:string,missions:readonly TransferMission[],limit=3) {
  if(!level78Guide(skillId))return [];
  const ranked=missions.filter(m=>missionRelated(skillId,m)).map(m=>({
    mission:m,direct:m.skillIds.includes(skillId),
  })).sort((a,b)=>Number(b.direct)-Number(a.direct)||
    Number(b.mission.due)-Number(a.mission.due)||
    b.mission.priority-a.mission.priority||
    a.mission.mistakeId.localeCompare(b.mission.mistakeId));
  return ranked.slice(0,Math.min(8,Math.max(0,Math.floor(limit))));
}
