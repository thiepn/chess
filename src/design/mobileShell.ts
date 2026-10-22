import type { AppPageId } from "../routing/appRouter";

export interface MobileShellRoute {
  mode: "browse" | "focus" | "session";
  title: string;
  returnPath: string | null;
  showPrimaryNav: boolean;
}

const titles: Record<AppPageId, string> = {
  train: "Train",
  learn: "Learn",
  play: "Play",
  review: "Review",
  library: "Library",
  progress: "Progress",
  settings: "Settings",
};

/** Screen geometry is a route property, never inferred from CSS :has or viewport width. */
export function mobileShellRoute(
  page: AppPageId,
  path: string,
  trainingOpen: boolean,
  gameOpen: boolean,
): MobileShellRoute {
  if (trainingOpen || gameOpen) {
    return { mode: "session", title: trainingOpen ? "Training" : "Game", returnPath: null, showPrimaryNav: false };
  }

  const nestedLesson = page === "learn" && path !== "/learn";
  const analyzedGame = page === "review" && path !== "/review";
  const studyWorkspace =
    page === "library" &&
    (path === "/library/workspace" ||
      /^\/library\/(studies|games|references|repertoire)\/[^/]+/.test(path));

  if (nestedLesson || analyzedGame || studyWorkspace) {
    return {
      mode: "focus",
      title: nestedLesson ? "Learn" : analyzedGame ? "Game review" : "Study",
      returnPath: nestedLesson ? "/learn" : analyzedGame ? "/review" : "/library",
      showPrimaryNav: false,
    };
  }

  return { mode: "browse", title: titles[page], returnPath: null, showPrimaryNav: true };
}
