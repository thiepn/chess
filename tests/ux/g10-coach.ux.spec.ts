import { expect, test } from "@playwright/test";
import type { LearningAnalyticsEvent } from "../../src/analytics/types";
import type { PersonalMistake } from "../../src/games/types";
import { recordReviewAttempt } from "../../src/review/practiceLoop";
import { FIXED_TIME, visualGameId, visualUserState } from "../visual/fixtures";

test("G10 source-backed coached Review shows verified training evidence and opens original practice", async ({page}) => {
  await page.clock.setFixedTime(new Date(FIXED_TIME));
  const game = structuredClone(visualUserState.games![0]);
  const moment = game.reviewStory!.moments[0];
  const originalMove = game.moves.find(item => item.ply === moment.ply)!;
  const mistakeId = "g10-authored-visual-mistake";
  moment.mistakeId = mistakeId;
  game.criticalMomentIds = [mistakeId];
  const mistake: PersonalMistake = {
    id: mistakeId, gameId: game.id, ply: moment.ply,
    moveNumber: moment.moveNumber, playerColor: originalMove.color,
    positionFen: originalMove.beforeFen, actualMove: originalMove.uci,
    actualSan: originalMove.san, bestMove: moment.bestMove,
    principalVariation: [...moment.principalVariation],
    evaluationBefore: moment.evaluationBefore,
    evaluationAfter: moment.evaluationAfter,
    centipawnLoss: moment.centipawnLoss, severity:"mistake",
    skillIds: [...moment.skillIds], explanation:moment.summary,
    createdAt:"2026-10-07T12:00:00Z",
    nextReviewAt:"2026-10-07T12:00:00Z",
    attempts:0,successes:0,resolved:false,
  };
  const history = recordReviewAttempt([], mistake, game, {
    playedMove:mistake.bestMove,triedMoves:[mistake.bestMove],
    succeeded:true,quality:1,hintsUsed:0,wrongAttempts:0,
  },new Date("2026-10-07T13:00:00Z"));
  expect(history).toHaveLength(1);
  const evidence: LearningAnalyticsEvent = {
    id:"original-guided-evidence",kind:"evidence",
    skillId:moment.skillIds[0],stageId:"learn",domain:"openings",
    occurredAt:"2026-10-07T14:00:00Z",evidenceSource:"guided",
    intervention:"manual",success:true,quality:1,
    masteryBefore:12,masteryAfter:15,
    retentionBefore:3,retentionAfter:4,
    transferBefore:0,transferAfter:0,
    confidenceBefore:10,confidenceAfter:13,
    stabilityBefore:1,stabilityAfter:1,
  };
  const state = {
    ...visualUserState,
    games:[game],
    mistakes:[mistake],
    reviewPracticeHistory:history,
    analytics:{version:1 as const,startedAt:"2026-10-07T10:00:00Z",events:[evidence]},
  };
  await page.addInitScript((saved) => {
    try { localStorage.setItem("thiepn.chess.user-state.v1", JSON.stringify(saved)); }
    catch { /* Only the app's origin has storage. */ }
  },state);
  await page.goto(`/review/${encodeURIComponent(visualGameId)}`,{waitUntil:"domcontentloaded"});
  await expect(page.locator(".review-workstation")).toBeVisible();
  await page.locator(".moment-coach-primary").click();
  await expect(page.locator(".review-coach")).toBeVisible();
  await page.locator(".review-thought-grid button").first().click();
  await page.getByRole("button",{name:"Retry before seeing the answer"}).click();
  await page.getByRole("button",{name:"Show best"}).click();

  await expect(page.locator(".review-coach-handoff")).toContainText("Original review: 1 clean unaided");
  await expect(page.locator(".review-coach-handoff")).toContainText(
    "Recorded lesson/guided evidence: 1 successful of 1",
  );
  await expect(page.locator(".review-coach-transfer-route")).toHaveCount(0);
  // No matching composer-authorized prescription exists in this single-game
  // source fixture. The coach must not invent a repair or a plan-launch action.
  await expect(page.locator(".review-coach-prescription")).toHaveCount(0);
  await expect(page.getByRole("button",{name:"Open prescribed training plan"})).toHaveCount(0);
  await expect(page.getByText("After clean recall on a different game position")).toHaveCount(0);
  await page.locator(".review-coach-handoff").getByRole("button",{
    name:/Review due game position|Practice this game position/,
  }).click();
  await expect(page.locator(".train-runtime-page")).toBeVisible();
  await expect(page).toHaveURL(/\/train\/session\//);
});

test("G12 original completed repair offers actual game-position recall, not a fabricated evaluation", async ({page}) => {
  await page.clock.setFixedTime(new Date(FIXED_TIME));
  const originalGame = structuredClone(visualUserState.games![0]);
  const moment = originalGame.reviewStory!.moments[0];
  const move = originalGame.moves.find(item => item.ply === moment.ply)!;
  const mistakeId = "g12-original-human-mistake";
  moment.mistakeId = mistakeId;
  originalGame.criticalMomentIds = [mistakeId];
  const mistake: PersonalMistake = {
    id: mistakeId, gameId: originalGame.id, ply: moment.ply,
    moveNumber: moment.moveNumber, playerColor: move.color,
    positionFen: move.beforeFen, actualMove: move.uci,
    actualSan: move.san, bestMove: moment.bestMove,
    principalVariation: [...moment.principalVariation],
    evaluationBefore: moment.evaluationBefore,
    evaluationAfter: moment.evaluationAfter,
    centipawnLoss: moment.centipawnLoss, severity: "mistake",
    skillIds: [...moment.skillIds], explanation: moment.summary,
    createdAt: "2026-10-07T07:00:00Z",
    nextReviewAt: "2026-10-07T07:00:00Z",
    attempts: 0, successes: 0, resolved: false,
  };
  const tracking = {
    id: "g12-original-completed-record",
    prescriptionId: "prescription:opening:development",
    kind: "opening-repair" as const,
    title: "Review your opening development",
    target: { dimension: "mistake" as const, key: moment.skillIds[0],
      label: "Opening development", skillId: moment.skillIds[0] },
    issuedAt: "2026-10-07T07:00:00Z",
    baseline: { capturedAt: "2026-10-07T07:00:00Z",
      games: 3, score: 45 },
    starts: 1, completions: 1,
    lastStartedAt: "2026-10-07T07:30:00Z",
    lastCompletedAt: "2026-10-07T08:00:00Z",
    completedActionIds: ["original-training-action"],
    trainingSuccesses: 1, trainingQualityTotal: 1,
  };
  const state = {
    ...visualUserState,
    games: [originalGame], mistakes: [mistake],
    reviewPracticeHistory: [],
    prescriptionHistory: [tracking],
  };
  await page.addInitScript(saved => {
    try { localStorage.setItem("thiepn.chess.user-state.v1", JSON.stringify(saved)); }
    catch { /* Original app storage is origin-scoped. */ }
  }, state);
  await page.goto(`/review/${encodeURIComponent(visualGameId)}`,{
    waitUntil: "domcontentloaded",
  });
  await expect(page.locator(".review-workstation")).toBeVisible();
  await page.locator(".moment-coach-primary").click();
  await page.locator(".review-thought-grid button").first().click();
  await page.getByRole("button",{name:"Retry before seeing the answer"}).click();
  await page.getByRole("button",{name:"Show best"}).click();
  const repair = page.locator(".review-coach-post-training");
  await expect(repair).toContainText("Completed repair: Review your opening development");
  await expect(repair).toContainText("Original game Review: 0 clean unaided");
  await expect(repair).toContainText("Recorded game evaluation: untested");
  await expect(repair.getByRole("button",{name:"Review original game position"})).toBeVisible();
  await expect(page.getByRole("button",{name:"Review analyzed human game"})).toHaveCount(0);
  await repair.getByRole("button",{name:"Review original game position"}).click();
  await expect(page).toHaveURL(/\\/train\\/session\\//);
  await expect(page.locator(".train-runtime-page")).toBeVisible();
});
