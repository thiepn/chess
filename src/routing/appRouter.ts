import { useCallback, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import {
  defaultAppPath,
  primaryAppPages,
  secondaryAppPages,
  type PrimaryAppPageId,
  type SecondaryAppPageId,
} from "../design/appArchitecture";

export type AppPageId = PrimaryAppPageId | SecondaryAppPageId;

export interface AppRoute {
  page: AppPageId;
  path: string;
  requestedPath: string;
  isFallback: boolean;
}

const pagePathById = Object.fromEntries(
  [...primaryAppPages, ...secondaryAppPages].map((page) => [
    page.id,
    page.path,
  ]),
) as Record<AppPageId, string>;

const validPages = new Set<AppPageId>(
  [...primaryAppPages, ...secondaryAppPages].map((page) => page.id),
);

function normalizePath(pathname: string) {
  const withSlash = pathname.startsWith("/")
    ? pathname
    : `/${pathname}`;
  const compact = withSlash.replace(/\/{2,}/g, "/");
  if (compact === "/") return "/";
  return compact.replace(/\/$/, "");
}

export function resolveAppRoute(pathname: string): AppRoute {
  const requestedPath = normalizePath(pathname);

  if (requestedPath === "/") {
    return {
      page: "train",
      path: defaultAppPath,
      requestedPath,
      isFallback: false,
    };
  }

  const segment = requestedPath.split("/").filter(Boolean)[0] as AppPageId | undefined;

  if (segment && validPages.has(segment)) {
    return {
      page: segment,
      path: requestedPath,
      requestedPath,
      isFallback: false,
    };
  }

  return {
    page: "train",
    path: defaultAppPath,
    requestedPath,
    isFallback: true,
  };
}

export function pathForPage(page: AppPageId) {
  return pagePathById[page] ?? defaultAppPath;
}

function normalizedBase() {
  const raw = import.meta.env.BASE_URL || "/";
  if (raw === "/") return "/";
  return `/${raw.replace(/^\/+|\/+$/g, "")}/`;
}

function stripBase(pathname: string) {
  const base = normalizedBase();
  if (base === "/") return normalizePath(pathname);
  if (!pathname.startsWith(base)) return normalizePath(pathname);
  return normalizePath(`/${pathname.slice(base.length)}`);
}

function browserPath(appPath: string) {
  const base = normalizedBase();
  const path = normalizePath(appPath);
  if (base === "/") return path;
  return `${base.replace(/\/$/, "")}${path}`;
}

const redirectStorageKey = "chess:spa-redirect";

function restoreStaticHostRedirect() {
  const redirect = window.sessionStorage.getItem(redirectStorageKey);
  if (!redirect) return;

  window.sessionStorage.removeItem(redirectStorageKey);
  const restored = new URL(redirect, window.location.origin);
  window.history.replaceState(
    null,
    "",
    `${browserPath(restored.pathname)}${restored.search}${restored.hash}`,
  );
}

type ViewTransitionCapableDocument = Document & {
  startViewTransition?: (update: () => void) => {
    finished: Promise<void>;
  };
};

function commitRouteUpdate(update: () => void) {
  const documentWithTransitions = document as ViewTransitionCapableDocument;
  const reduced = document.documentElement.dataset.motion === "reduced";

  if (!reduced && documentWithTransitions.startViewTransition) {
    documentWithTransitions.startViewTransition(() => {
      flushSync(update);
    });
    return;
  }

  update();
}

function readBrowserRoute() {
  restoreStaticHostRedirect();
  const route = resolveAppRoute(stripBase(window.location.pathname));

  if (
    route.isFallback ||
    stripBase(window.location.pathname) === "/"
  ) {
    window.history.replaceState(
      null,
      "",
      `${browserPath(route.path)}${window.location.search}${window.location.hash}`,
    );
  }

  return route;
}

export function useAppRouter() {
  const [route, setRoute] = useState<AppRoute>(() => readBrowserRoute());

  useEffect(() => {
    const onPopState = () => {
      commitRouteUpdate(() => setRoute(readBrowserRoute()));
      window.scrollTo({ top: 0, behavior: "auto" });
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = useCallback(
    (
      path: string,
      options?: {
        replace?: boolean;
        preserveScroll?: boolean;
      },
    ) => {
      const next = resolveAppRoute(path);
      const target = next.isFallback ? defaultAppPath : next.path;
      const method = options?.replace ? "replaceState" : "pushState";
      window.history[method](null, "", browserPath(target));
      commitRouteUpdate(() => setRoute(resolveAppRoute(target)));
      if (!options?.preserveScroll) {
        window.scrollTo({ top: 0, behavior: "auto" });
      }
    },
    [],
  );

  const navigatePage = useCallback(
    (page: AppPageId) => navigate(pathForPage(page)),
    [navigate],
  );

  return {
    route,
    navigate,
    navigatePage,
  };
}

export const spaRedirectStorageKey = redirectStorageKey;
