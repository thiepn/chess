import type { CalculationPosition } from "../calculation/types";
import type { StudyQuestion } from "../calculation/studyDelivery";
import { skillById } from "../domain/curriculum";

/** Original-curriculum focus prompts. These are UNGRADED self-explanations,
 * never candidate move certificates or additional mastery events. */
export const level456StudyLenses: Readonly<Record<string, readonly [string,string,string]>> =
{
  "calculation.candidates": [
    "Before selecting a move, compare a forcing candidate with a quiet improvement and explain the concrete threats of each.",
    "What opponent resource would make your preferred candidate less attractive than the alternative?",
    "Which candidate would you now reject, and what board fact changes that judgment?"
  ],
  "calculation.reply": [
    "Name the most testing legal opponent reply before you commit to the idea shown in this case.",
    "After that reply, which threat or defensive duty changes in the position?",
    "Which tempting one-sided line failed because the opponent had a different reply?"
  ],
  "calculation.forcing-lines": [
    "List checks, captures and threats, and explain why their order matters on this board.",
    "What is the strongest defensive interposition, capture or king escape shown in the authored branch?",
    "What concrete forcing line must be recalculated if the defender chooses another legal move?"
  ],
  "calculation.move-order": [
    "Compare two possible first moves and state which reply each one allows.",
    "How can a change in move order give the opponent extra defensive time?",
    "Where would the proposed sequence fail if its first and second moves were reversed?"
  ],
  "calculation.visualization": [
    "Without moving pieces, visualize the board after the proposed move and first reply.",
    "After the reply, what squares become attacked, defended or vacant?",
    "Which imagined piece placement was wrong, and how does the legal continuation correct it?"
  ],
  "calculation.quiet": [
    "Identify a nonforcing candidate that improves coordination or restrains a counterplay resource.",
    "What active defense can the opponent use while you make a quiet improvement?",
    "Explain why an automatic check or capture could be less useful in this particular example."
  ],
  "strategy.open-files": [
    "Identify the open or half-open file and which rook can gain a meaningful entry.",
    "How can the defender challenge the entry square or exchange the active rook?",
    "Which apparent file invasion fails to improve the position because no target is accessible?"
  ],
  "strategy.outposts": [
    "Identify a stable square for a piece and the pawns that could challenge it.",
    "What pawn push or piece exchange would undermine the proposed outpost?",
    "How should your plan change if the square is not genuinely protected or durable?"
  ],
  "pawns.breaks": [
    "Identify the pawn lever that changes the structure and the pieces prepared to exploit it.",
    "What capture, blockade or counter-break can the opponent use immediately?",
    "When would advancing the pawn too early create a backward pawn or weak square?"
  ],
  "pawns.weaknesses": [
    "Identify a fixed pawn weakness and name the piece that could exert pressure on it.",
    "How can the defender release, exchange or protect the apparent pawn weakness before you attack it?",
    "Which target is only temporarily weak, and what would make a long-term attack unjustified?"
  ],
  "attack.king-safety": [
    "Map the king's shelter, open lines and legal flight squares before choosing an attacking candidate.",
    "What immediate defensive check, block or flight would interrupt the advertised attack?",
    "Which attack would be premature while a defender or escape square remains available?"
  ],
  "attack.open-lines": [
    "Find the file, diagonal or rank that gives the attackers contact with the king.",
    "How can the defender close the line, interpose or trade the attacking piece?",
    "Would opening the line also expose your own king or leave an attacker undefended?"
  ],
  "attack.defenders": [
    "Count concrete defenders around the target and identify which defensive duty is critical.",
    "What recapture or blocking move restores the defender's protective role?",
    "Why might removing a different defender fail to create a forcing continuation?"
  ],
  "attack.mating-net": [
    "List king escape squares and all legal defensive checks before claiming a mating net.",
    "Which interposition, capture or king move breaks the apparent net in the source?",
    "What evidence would be required before calling this sequence forced checkmate?"
  ],
  "attack.sacrifice": [
    "Identify the material offered, the resulting initiative and the defender's best practical choice.",
    "What happens if the opponent declines the offer or returns material to neutralize the threat?",
    "What would make this a speculative sacrifice rather than a demonstrated forcing gain?"
  ],
  "defense.prophylaxis": [
    "Name the opponent's next threat before choosing a preventative move.",
    "What changes if the opponent switches to a different forcing plan?",
    "Would the preventative move merely create a new weakness elsewhere on the board?"
  ],
  "defense.exchange-attackers": [
    "Identify which attacking piece most needs exchanging and the price of that trade.",
    "What recapture or zwischenzug changes the usefulness of the proposed exchange?",
    "Which trade relieves pressure, and which leaves the king without a necessary defender?"
  ],
  "defense.counterplay": [
    "Find a forcing counter-threat that makes the attacker respond instead of continuing the attack.",
    "Can the attacker ignore your counterplay and continue with checks or threats?",
    "Which slow defensive move would permit the attacker to increase pressure freely?"
  ],
  "endgames.queen-mate": [
    "Identify how the queen should restrict the king without creating stalemate.",
    "What legal king escape or stalemate risk changes the next restriction step?",
    "Why is bringing your own king closer necessary before finalizing the mate?"
  ],
  "endgames.rook-mate": [
    "Find a reliable rook cutoff and the supporting king route to restrict the defender.",
    "Which king move challenges the cutoff or approaches your exposed rook?",
    "Why do repeated checks without improving the cutoff fail to finish efficiently?"
  ],
  "endgames.opposition": [
    "Count whose move it is and whether the kings have direct or distant opposition.",
    "What king move changes access to key squares after your first choice?",
    "Would advancing the pawn now surrender the key tempo you need for opposition later?"
  ],
  "endgames.key-squares": [
    "Identify which entry squares the stronger king must reach before pushing the pawn.",
    "Which concrete defensive king route prevents your entry to those key squares?",
    "How can choosing the wrong king route turn a promising conversion into a draw?"
  ],
  "endgames.pawn-races": [
    "Count the exact tempi to promotion for both sides, including any forcing checks.",
    "Can the opponent promote with check, sacrifice or intercept your passer?",
    "Which assumed tempo advantage disappears if the opponent promotes first?"
  ],
  "pawns.passed": [
    "Identify the passer's advance square and which piece must support it.",
    "What concrete blockade, rook check or opposing counterpasser can delay conversion?",
    "Why can a rushed passed-pawn push lose support or expose a different pawn to attack?"
  ],
  "endgames.rook-activity": [
    "Compare active checking from the side with passive defense of the pawn.",
    "What checking distance, king cutoff or rook trade is available to the defender?",
    "Why can keeping the rook tied to a pawn be worse than active counterplay?"
  ],
  "endgames.lucena": [
    "Check whether the winning-side king and rook satisfy the Lucena-type setup before attempting a bridge.",
    "How can the defending rook check from the side or disrupt the bridge?",
    "What changes if the king is not sheltered on the right promotion square?"
  ],
  "endgames.philidor": [
    "Verify whether the defending rook can hold the third rank while the king guards promotion.",
    "What pawn advance or king entry forces the defender to switch to rear checks?",
    "Why does abandoning the rank too early risk losing the defensive setup?"
  ],
  "conversion.simplify": [
    "Before trading, identify the exact material and pawn ending that will remain.",
    "What tactical reply or pawn race becomes possible immediately after the exchange?",
    "Why is a favorable-looking exchange not necessarily a winning simplification?"
  ]
} as const;

export function level456Lens(skillId:string | undefined): readonly [string,string,string] | null {
  const id=skillId??"";
  const stage=skillById[id]?.stage;
  if (stage!=="thinking" && stage!=="fight" && stage!=="finish") return null;
  return level456StudyLenses[id] ?? null;
}

export function level456FocusedQuestions(position:CalculationPosition, skillId:string | undefined):StudyQuestion[] {
  const lens=level456Lens(skillId);
  if (!lens || position.source!=="authored") return [];
  const sourceIdea=position.explanation?.trim();
  const defenderIdea=position.defensiveStudy?.defenderIdea?.trim() ||
    position.replyReason?.trim() || sourceIdea;
  const originalMistake=position.defensiveStudy?.misconception?.trim() ||
    position.defensiveStudy?.reflection?.trim() || sourceIdea;
  if (!sourceIdea || !defenderIdea || !originalMistake) return [];
  const sourceDisclaimer="This is an authored example of a legally replayable line; it does not certify a unique best move or theoretical outcome.";
  return [
    {prompt:lens[0],answer:sourceIdea+" "+sourceDisclaimer,
      repair:"Name the exact move, threat and target in this original board. A familiar motif alone does not verify a continuation."},
    {prompt:lens[1],answer:defenderIdea+" "+sourceDisclaimer,
      repair:position.defensiveStudy?.misconception || "Compare the original defensive reply with your assumed reply before evaluating the plan."},
    {prompt:lens[2],answer:originalMistake+" "+sourceDisclaimer,
      repair:"Explain a concrete refutation or limitation from the source before claiming success. Alternative legal moves remain unjudged."},
  ];
}
