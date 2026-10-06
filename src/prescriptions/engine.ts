import { buildRealGameDiagnostics } from "../analytics/cohorts";
import type {
  PracticalDiagnostic,
  RealGameDiagnostics,
} from "../analytics/types";
import { skillById } from "../domain/curriculum";
import type { UserState } from "../domain/types";
import type { ImportedGame } from "../games/types";
import { openingIdentityForGame } from "../openings/match";
import { openingNodes } from "../openings/repertoire";
import type {
  TrainingPrescription,
  TrainingPrescriptionAction,
} from "./types";

function humanGames(state: UserState) {
  return [...(state.games ?? [])]
    .filter(
      (game) =>
        game.source === "lichess" &&
        Boolean(game.analyzedAt) &&
        Boolean(game.practicalMetrics),
    )
    .sort((a, b) => b.importedAt.localeCompare(a.importedAt));
}

function focusedAction(
  skillId: string,
  label?: string,
): TrainingPrescriptionAction | undefined {
  const skill = skillById[skillId];
  if (!skill) return undefined;

  return {
    id: `focus:${skillId}`,
    kind: "focused-practice",
    skillId,
    label: label ?? `Train ${skill.title}`,
  };
}

function latestHumanMistake(
  state: UserState,
  skillId: string,
) {
  return [...(state.mistakes ?? [])]
    .filter(
      (mistake) =>
        mistake.gameSource === "lichess" &&
        mistake.skillIds.includes(skillId),
    )
    .sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    )[0];
}

function mistakeActions(
  state: UserState,
  skillId: string,
) {
  const actions: TrainingPrescriptionAction[] = [];
  const mistake = latestHumanMistake(state, skillId);

  if (mistake) {
    actions.push({
      id: `replay:${mistake.id}`,
      kind: "mistake-replay",
      mistakeId: mistake.id,
      skillId,
      label: "Replay the latest human-game position",
    });
  }

  const focus = focusedAction(skillId);
  if (focus) actions.push(focus);
  return actions;
}

function openingGames(
  games: ImportedGame[],
  cohortKey: string,
) {
  return games.filter(
    (game) =>
      openingIdentityForGame(game).key === cohortKey,
  );
}

function dominantColor(games: ImportedGame[]) {
  const white = games.filter(
    (game) => game.playerColor === "w",
  ).length;
  const black = games.length - white;
  return black > white ? "b" : "w";
}

function openingRepairTarget(
  label: string,
  color: "w" | "b",
) {
  const name = label.toLocaleLowerCase();

  if (color === "b") {
    if (name.includes("caro-kann")) {
      return {
        repertoireId: "black-caro",
        openingNodeId: "black-caro-e4",
        scenarioId: "opening-caro",
      };
    }

    if (
      name.includes("queen") ||
      name.includes("qgd") ||
      name.includes("d4")
    ) {
      return {
        repertoireId: "black-qgd",
        openingNodeId: "black-qgd-d4",
      };
    }
  }

  if (color === "w") {
    if (
      name.includes("italian") ||
      name.includes("open game")
    ) {
      return {
        repertoireId: "white-e4-simple",
        openingNodeId: "italian-nc6",
        scenarioId: "opening-italian",
      };
    }
    if (name.includes("sicilian")) {
      return {
        repertoireId: "white-e4-simple",
        openingNodeId: "sicilian",
      };
    }
    if (name.includes("caro-kann")) {
      return {
        repertoireId: "white-e4-simple",
        openingNodeId: "caro",
      };
    }
    if (name.includes("french")) {
      return {
        repertoireId: "white-e4-simple",
        openingNodeId: "french",
      };
    }
  }

  return undefined;
}

function openingPrescription(
  state: UserState,
  diagnostic: PracticalDiagnostic,
  diagnostics: RealGameDiagnostics,
): TrainingPrescription | undefined {
  if (!diagnostic.cohortKey) return undefined;
  const cohort = diagnostics.openings.find(
    (item) => item.key === diagnostic.cohortKey,
  );
  if (!cohort) return undefined;

  const matchingGames = openingGames(
    humanGames(state),
    cohort.key,
  );
  const color = dominantColor(matchingGames);
  const target = openingRepairTarget(
    cohort.label,
    color,
  );
  const actions: TrainingPrescriptionAction[] = [];

  if (target) {
    actions.push({
      id: `opening:${target.repertoireId}:${target.openingNodeId}`,
      kind: "opening-recall",
      repertoireId: target.repertoireId,
      openingNodeId: target.openingNodeId,
      skillId: "openings.principles",
      label: `Repair ${cohort.label} from the repertoire position`,
    });

    if (target.scenarioId) {
      actions.push({
        id: `scenario:${target.scenarioId}`,
        kind: "scenario",
        scenarioId: target.scenarioId,
        skillId: "openings.principles",
        label: "Prove the repair in a resistant practice game",
      });
    }
  }

  const principles = focusedAction(
    "openings.principles",
    "Drill opening decisions and king safety",
  );
  if (principles) actions.push(principles);

  const node = target
    ? openingNodes[target.openingNodeId]
    : undefined;
  const plan = [
    node?.purpose ??
      `Reach a healthy ${cohort.label} position before looking for tactics.`,
    ...(node?.plans ?? [
      "Finish development before starting an attack.",
      "Use a final blunder check before committing to a forcing line.",
    ]).slice(0, 2),
  ].slice(0, 3);

  return {
    id: `prescription:opening:${cohort.key}`,
    kind: "opening-repair",
    title: `Repair ${cohort.label}`,
    rationale: `${cohort.games} human games are ${Math.abs(
      Math.round(cohort.deltaVsBaseline),
    )} practical points below your baseline.`,
    gamePlan: plan,
    priority:
      diagnostic.severity === "priority" ? 1 : .76,
    confidence: diagnostic.confidence,
    evidenceGames: diagnostic.games,
    diagnosticIds: [diagnostic.id],
    composerEligible:
      diagnostic.games >= 3 &&
      diagnostic.confidence >= 50,
    actions,
  };
}

function mistakePrescription(
  state: UserState,
  diagnostic: PracticalDiagnostic,
  diagnostics: RealGameDiagnostics,
): TrainingPrescription | undefined {
  const skillId =
    diagnostic.cohortKey ??
    diagnostic.id.replace(/^mistake:/, "");
  const skill = skillById[skillId];
  const family = diagnostics.mistakeFamilies.find(
    (item) => item.skillId === skillId,
  );
  if (!skill || !family) return undefined;

  return {
    id: `prescription:mistake:${skillId}`,
    kind: "mistake-repair",
    title: `Stop repeating: ${skill.title}`,
    rationale: `${family.occurrences} human-game mistakes across ${family.games} games point to the same curriculum skill.`,
    gamePlan: [
      skill.description,
      "Pause before committing and identify the opponent's strongest forcing reply.",
      "If the position resembles a previous miss, choose safety and clarity before speed.",
    ],
    priority:
      diagnostic.severity === "priority" ? 1 : .82,
    confidence: diagnostic.confidence,
    evidenceGames: family.games,
    diagnosticIds: [diagnostic.id],
    composerEligible:
      family.games >= 3 &&
      diagnostic.confidence >= 50,
    actions: mistakeActions(state, skillId),
  };
}

function phaseSkill(
  phase: string,
  diagnostics: RealGameDiagnostics,
) {
  const recurring = diagnostics.mistakeFamilies[0]?.skillId;

  if (phase === "opening") return "openings.principles";
  if (phase === "endgame") {
    const endgame = diagnostics.mistakeFamilies.find(
      (item) => item.skillId.startsWith("endgames."),
    );
    return endgame?.skillId ?? "practical.transition";
  }

  return recurring ?? "practical.plan";
}

function phasePrescription(
  state: UserState,
  diagnostic: PracticalDiagnostic,
  diagnostics: RealGameDiagnostics,
): TrainingPrescription | undefined {
  const phase = diagnostic.cohortKey;
  if (!phase) return undefined;
  const skillId = phaseSkill(phase, diagnostics);
  const skill = skillById[skillId];
  if (!skill) return undefined;

  const planByPhase: Record<string, string[]> = {
    opening: [
      "Finish development and king safety before creating complications.",
      "When the opening leaves known territory, switch from memory to principles.",
      "Run a full blunder check on the first irreversible move.",
    ],
    middlegame: [
      "Name the opponent's threat before choosing your own plan.",
      "Generate forcing candidates first, then improve the worst piece if none work.",
      "Do not commit a pawn break until the resulting piece activity is clear.",
    ],
    endgame: [
      "Activate the king before hunting pawns.",
      "Identify the correct transition before exchanging pieces.",
      "Calculate pawn races and forcing checks before relying on general rules.",
    ],
  };

  return {
    id: `prescription:phase:${phase}`,
    kind: "phase-repair",
    title: `Stabilize the ${phase}`,
    rationale: diagnostic.detail,
    gamePlan:
      planByPhase[phase] ?? [
        skill.description,
        "Slow the decision down at the phase transition.",
        "Use the same repeatable thinking process every move.",
      ],
    priority:
      diagnostic.severity === "priority" ? .94 : .72,
    confidence: diagnostic.confidence,
    evidenceGames: diagnostic.games,
    diagnosticIds: [diagnostic.id],
    composerEligible:
      diagnostic.games >= 3 &&
      diagnostic.confidence >= 50,
    actions: mistakeActions(state, skillId),
  };
}

function conditionSkill(
  diagnostic: PracticalDiagnostic,
  diagnostics: RealGameDiagnostics,
) {
  if (diagnostic.dimension === "timeControl") {
    return "practical.time";
  }

  if (diagnostic.dimension === "opponent") {
    if (diagnostic.cohortKey === "stronger") {
      return "defense.threats";
    }
    if (diagnostic.cohortKey === "weaker") {
      return "practical.post-move-check";
    }
    return "practical.plan";
  }

  if (diagnostic.dimension === "positionType") {
    if (diagnostic.cohortKey === "tactical") {
      return "calculation.candidates";
    }
    if (diagnostic.cohortKey === "opening-sensitive") {
      return "openings.principles";
    }
    if (diagnostic.cohortKey === "endgame-heavy") {
      return "practical.transition";
    }
    if (diagnostic.cohortKey === "long-middlegame") {
      return "strategy.worst-piece";
    }
  }

  return (
    diagnostics.mistakeFamilies[0]?.skillId ??
    "practical.plan"
  );
}

function conditionPrescription(
  state: UserState,
  diagnostic: PracticalDiagnostic,
  diagnostics: RealGameDiagnostics,
): TrainingPrescription | undefined {
  const skillId = conditionSkill(
    diagnostic,
    diagnostics,
  );
  const skill = skillById[skillId];
  if (!skill) return undefined;

  const cue =
    diagnostic.dimension === "timeControl"
      ? "Use a fixed think-time budget: spend time on irreversible and forcing decisions, not routine recaptures."
      : diagnostic.dimension === "opponent" &&
          diagnostic.cohortKey === "stronger"
        ? "Against stronger opposition, solve the threat first and make them prove the advantage."
        : diagnostic.dimension === "opponent" &&
            diagnostic.cohortKey === "weaker"
          ? "Against lower-rated opposition, do not speed up just because the position feels easy."
          : diagnostic.dimension === "color"
            ? "Use the same pre-move process regardless of color; do not let the opening move order dictate your thinking quality."
            : "Recognize the position type early and switch to the matching thinking process.";

  return {
    id: `prescription:condition:${diagnostic.dimension}:${diagnostic.cohortKey ?? "general"}`,
    kind: "condition-plan",
    title: diagnostic.headline.replace(
      " are underperforming",
      " repair plan",
    ),
    rationale: diagnostic.detail,
    gamePlan: [
      cue,
      skill.description,
      "After the game, review the first decision where the plan broke—not only the final blunder.",
    ],
    priority:
      diagnostic.severity === "priority" ? .9 : .68,
    confidence: diagnostic.confidence,
    evidenceGames: diagnostic.games,
    diagnosticIds: [diagnostic.id],
    composerEligible:
      diagnostic.games >= 3 &&
      diagnostic.confidence >= 50,
    actions: mistakeActions(state, skillId),
  };
}

function formPrescription(
  state: UserState,
  diagnostic: PracticalDiagnostic,
): TrainingPrescription {
  const skillId = "practical.resilience";
  return {
    id: "prescription:form:reset",
    kind: "form-reset",
    title: "Reset the practical process",
    rationale: diagnostic.detail,
    gamePlan: [
      "Judge the position in front of you, not the result of the previous game.",
      "Before every irreversible move: threat, forcing candidates, final blunder check.",
      "Play the next human game for decision quality rather than rating recovery.",
    ],
    priority: .7,
    confidence: diagnostic.confidence,
    evidenceGames: diagnostic.games,
    diagnosticIds: [diagnostic.id],
    composerEligible:
      diagnostic.games >= 3 &&
      diagnostic.confidence >= 60,
    actions: mistakeActions(state, skillId),
  };
}

function prescriptionForDiagnostic(
  state: UserState,
  diagnostic: PracticalDiagnostic,
  diagnostics: RealGameDiagnostics,
) {
  if (diagnostic.severity === "strength") return undefined;

  if (diagnostic.id.startsWith("mistake:")) {
    return mistakePrescription(
      state,
      diagnostic,
      diagnostics,
    );
  }

  if (diagnostic.dimension === "opening") {
    return openingPrescription(
      state,
      diagnostic,
      diagnostics,
    );
  }

  if (diagnostic.dimension === "phase") {
    return phasePrescription(
      state,
      diagnostic,
      diagnostics,
    );
  }

  if (
    diagnostic.dimension === "color" ||
    diagnostic.dimension === "timeControl" ||
    diagnostic.dimension === "opponent" ||
    diagnostic.dimension === "positionType"
  ) {
    return conditionPrescription(
      state,
      diagnostic,
      diagnostics,
    );
  }

  if (
    diagnostic.dimension === "form" &&
    diagnostic.id === "form:declining"
  ) {
    return formPrescription(state, diagnostic);
  }

  return undefined;
}

export function buildTrainingPrescriptions(
  state: UserState,
  diagnostics = buildRealGameDiagnostics(state),
): TrainingPrescription[] {
  const prescriptions = diagnostics.diagnostics
    .map((diagnostic) =>
      prescriptionForDiagnostic(
        state,
        diagnostic,
        diagnostics,
      ),
    )
    .filter(
      (value): value is TrainingPrescription =>
        Boolean(value) && Boolean(value?.actions.length),
    );

  const seen = new Set<string>();

  return prescriptions
    .sort(
      (a, b) =>
        b.priority * (b.confidence / 100) -
        a.priority * (a.confidence / 100),
    )
    .filter((item) => {
      const first = item.actions[0];
      const signature =
        first.skillId ??
        first.repertoireId ??
        item.id;
      if (seen.has(signature)) return false;
      seen.add(signature);
      return true;
    })
    .slice(0, 5);
}
