export const primaryAppPages = [
  { id: "train", label: "Train", path: "/train", mobile: true },
  { id: "learn", label: "Learn", path: "/learn", mobile: true },
  { id: "play", label: "Play", path: "/play", mobile: true },
  { id: "review", label: "Review", path: "/review", mobile: true },
  { id: "library", label: "Library", path: "/library", mobile: true },
] as const;

export const secondaryAppPages = [
  { id: "progress", label: "Progress", path: "/progress" },
  { id: "settings", label: "Settings", path: "/settings" },
] as const;

export const defaultAppPath = "/train" as const;

export const routeFamilies = {
  trainSession: "/train/session/:id",
  learnLesson: "/learn/:domain/:lessonId",
  playGame: "/play/game/:id",
  reviewGame: "/review/:gameId",
  repertoire: "/library/repertoire/:id",
  modelGames: "/library/model-games",
  studies: "/library/studies",
} as const;

export const chessDesignContract = {
  routineHeadingMaxPx: 32,
  desktopTopbarPx: 58,
  minimumTouchTargetPx: 44,
  preferredTouchTargetPx: 48,
  permanentGenericSidebar: false,
  giantSentenceHeroByDefault: false,
  primaryWorkflowsUseFullPageRoutes: true,
  boardIsPrimaryWhenPositionActive: true,
} as const;

export type PrimaryAppPageId = (typeof primaryAppPages)[number]["id"];
export type SecondaryAppPageId = (typeof secondaryAppPages)[number]["id"];
