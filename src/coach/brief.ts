import type {
  RealGameDiagnostics,
} from "../analytics/types";
import type {
  CoachEffectivenessInsight,
  CoachPolicyInsight,
  TrainingPrescription,
} from "../prescriptions/types";
import type {
  CoachBehaviorCheck,
  CoachBrief,
  CoachDecision,
  CoachEvidenceState,
} from "./types";

interface CoachBriefInput {
  humanGames: number;
  evidenceCount: number;
  diagnostics: RealGameDiagnostics;
  prescriptions: TrainingPrescription[];
  effectiveness: CoachEffectivenessInsight;
  policy: CoachPolicyInsight;
}

function confidenceLabel(
  state: CoachEvidenceState,
  confidence: number,
) {
  if (state === "cold-start") return "Not enough game evidence yet";
  if (state === "building") return "Early signal";
  if (confidence >= 78) return "Strong evidence";
  if (confidence >= 62) return "Useful evidence";
  return "Still learning";
}

function evidenceStateFor(
  input: CoachBriefInput,
): CoachEvidenceState {
  const top = input.prescriptions[0];

  if (
    input.humanGames < 3 &&
    (!top || top.evidenceGames < 3)
  ) {
    return "cold-start";
  }

  if (
    !top ||
    top.confidence < 60 ||
    top.evidenceGames < 3
  ) {
    return "building";
  }

  return "grounded";
}

function behaviorCheck(
  effectiveness: CoachEffectivenessInsight,
): CoachBehaviorCheck {
  const latestCompleted = effectiveness.history.find(
    (row) => row.completions > 0,
  );

  if (!latestCompleted) {
    return {
      state: "not-tested",
      label: "Not tested in later games yet",
      detail:
        "Finish a recommended repair, then analyze later human games. Training success alone is not counted as proof.",
      postGames: 0,
    };
  }

  if (
    latestCompleted.status === "untested" ||
    latestCompleted.status === "collecting"
  ) {
    const remaining = Math.max(
      0,
      3 - latestCompleted.postGames,
    );
    return {
      state: "waiting",
      label: "Waiting for real-game evidence",
      detail:
        remaining > 0
          ? `The repair was trained. Analyze ${remaining} more matching human game${remaining === 1 ? "" : "s"} before judging whether it transferred.`
          : "The repair was trained; the next matching human-game evidence is being evaluated.",
      target: latestCompleted.targetLabel,
      postGames: latestCompleted.postGames,
    };
  }

  if (latestCompleted.status === "improved") {
    return {
      state: "helping",
      label: "This repair is helping",
      detail:
        `Later matching games improved from the original baseline${latestCompleted.delta !== undefined ? ` by ${latestCompleted.delta >= 0 ? "+" : ""}${latestCompleted.delta} points` : ""}.`,
      target: latestCompleted.targetLabel,
      postGames: latestCompleted.postGames,
      delta: latestCompleted.delta,
    };
  }

  if (latestCompleted.status === "worsened") {
    return {
      state: "worsening",
      label: "This repair has not transferred",
      detail:
        `Later matching games are worse than the original baseline${latestCompleted.delta !== undefined ? ` (${latestCompleted.delta})` : ""}. The coach should change the intervention rather than repeat it blindly.`,
      target: latestCompleted.targetLabel,
      postGames: latestCompleted.postGames,
      delta: latestCompleted.delta,
    };
  }

  return {
    state: "unclear",
    label: "No clear change yet",
    detail:
      `Later matching games are roughly unchanged${latestCompleted.delta !== undefined ? ` (${latestCompleted.delta >= 0 ? "+" : ""}${latestCompleted.delta})` : ""}. Keep the idea under observation instead of claiming success.`,
    target: latestCompleted.targetLabel,
    postGames: latestCompleted.postGames,
    delta: latestCompleted.delta,
  };
}

function plainDecision(
  prescription: TrainingPrescription,
): CoachDecision {
  const action = prescription.actions[0];
  const cue = prescription.gamePlan[0];

  return {
    id: prescription.id,
    title: prescription.title.replace(/^Escalate:\s*/i, ""),
    why: prescription.rationale,
    confidence: prescription.confidence,
    evidenceLabel:
      prescription.evidenceGames === 1
        ? "Seen in 1 human game"
        : `Seen across ${prescription.evidenceGames} human games`,
    ...(cue ? { nextGameCue: cue } : {}),
    prescriptionId: prescription.id,
    ...(action ? { action } : {}),
    ...(prescription.outcome
      ? { outcomeStatus: prescription.outcome.status }
      : {}),
  };
}

function fallbackDecision(
  input: CoachBriefInput,
  state: CoachEvidenceState,
): CoachDecision {
  if (state === "cold-start") {
    return {
      id: "coach:cold-start",
      title: "Build a reliable baseline",
      why:
        "There are not enough analyzed human games to separate a real recurring weakness from normal game-to-game noise.",
      confidence: 0,
      evidenceLabel:
        input.humanGames === 0
          ? "No analyzed human games yet"
          : `${input.humanGames}/3 human games analyzed`,
      nextGameCue:
        "Train normally, then import or sync your next human games so the coach can compare repeated decisions.",
    };
  }

  const topDiagnostic =
    input.diagnostics.diagnostics.find(
      (item) => item.severity !== "strength",
    );

  if (topDiagnostic) {
    return {
      id: `coach:diagnostic:${topDiagnostic.id}`,
      title: topDiagnostic.headline,
      why: topDiagnostic.detail,
      confidence: topDiagnostic.confidence,
      evidenceLabel:
        topDiagnostic.games === 1
          ? "Early signal from 1 game"
          : `Early signal from ${topDiagnostic.games} games`,
      nextGameCue:
        "Keep training the recommended session while more human-game evidence accumulates.",
    };
  }

  return {
    id: "coach:building",
    title: "Keep building the player model",
    why:
      "The app has useful training evidence, but no human-game pattern is stable enough to deserve a specific repair plan yet.",
    confidence: Math.min(
      55,
      Math.round(
        input.policy.learningConfidence * .7,
      ),
    ),
    evidenceLabel:
      input.humanGames
        ? `${input.humanGames} human games analyzed`
        : `${input.evidenceCount} training observations`,
    nextGameCue:
      "Use Train now and keep reviewing real games. The coach will become specific only when a pattern repeats.",
  };
}

export function buildCoachBrief(
  input: CoachBriefInput,
): CoachBrief {
  const evidenceState =
    evidenceStateFor(input);
  const top = input.prescriptions[0];
  const confidence = top
    ? top.confidence
    : evidenceState === "cold-start"
      ? 0
      : Math.min(
          55,
          input.policy.learningConfidence,
        );

  const decisions =
    input.prescriptions
      .slice(0, 3)
      .map(plainDecision);

  if (!decisions.length) {
    decisions.push(
      fallbackDecision(
        input,
        evidenceState,
      ),
    );
  }

  const headline =
    evidenceState === "cold-start"
      ? "I don’t know your practical weaknesses yet."
      : evidenceState === "building"
        ? top
          ? `Early signal: ${top.title.replace(/^Escalate:\s*/i, "")}`
          : "I’m still learning which problems repeat."
        : top
          ? top.title.replace(/^Escalate:\s*/i, "")
          : "Keep training what matters most.";

  const summary =
    evidenceState === "cold-start"
      ? "The coach will not invent a diagnosis from one game or from training scores alone."
      : evidenceState === "building"
        ? "There is enough evidence to guide practice, but not enough to treat the current pattern as settled."
        : top
          ? `${top.rationale} The coach will check later matching human games before deciding whether the repair worked.`
          : "The current recommendation is based on repeated training and game evidence.";

  return {
    evidenceState,
    headline,
    summary,
    confidence,
    confidenceLabel:
      confidenceLabel(
        evidenceState,
        confidence,
      ),
    humanGames: input.humanGames,
    decisions,
    behaviorCheck:
      behaviorCheck(
        input.effectiveness,
      ),
  };
}
