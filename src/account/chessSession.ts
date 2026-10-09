import {
  createThiepnAccountSession,
  createThiepnBrowserSso,
} from "./sdk/index";
import { CHESS_ACCOUNT_ORIGIN, currentChessAccountClientReadiness } from "./onboarding";

// This is the audited SDK from thiepn/account@be0adad0, not an independent
// Google sign-in system. A Chess OAuth client MUST have been registered and
// bound to the exact Chess redirect before adding its public UUID to env.
const setup = currentChessAccountClientReadiness();
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const chessAccountSso = (() => {
  if (setup.status !== "configured" || !key) return null;
  const session = createThiepnAccountSession({
    issuer: import.meta.env.VITE_SUPABASE_URL,
    publishableKey: key,
    clientId: setup.clientId,
    redirectUri: import.meta.env.VITE_THIEPN_ACCOUNT_REDIRECT_URI,
    storageKey: "thiepn:chess:account-session:v1",
    authPolicy: "guest-first",
  });
  return createThiepnBrowserSso(session, { accountOrigin: CHESS_ACCOUNT_ORIGIN });
})();

let lastLoginError: string | null = null;
export function chessAccountLoginError() { return lastLoginError; }

/** Complete the one-use OAuth code before the app/router can show private
 * account data. Fail closed, strip the authorization code from browser history
 * and fall back to the guest/settings view on unsuccessful callbacks.
 */
export async function initializeChessAccount(): Promise<"ready" | "redirecting"> {
  if (!chessAccountSso) {
    if (window.location.pathname === "/auth/callback/") {
      lastLoginError = "Chess account connection has not been registered.";
      window.history.replaceState(null, "", "/settings");
    }
    return "ready";
  }
  if (window.location.pathname === "/auth/callback/") {
    try {
      const identity = await chessAccountSso.completeCallback(window.location);
      if (identity.status !== "signed-in") {
        lastLoginError = identity.status === "unavailable" ? identity.code : "Account sign-in was not completed.";
      }
    } catch {
      lastLoginError = "Account sign-in could not be completed.";
    }
    window.history.replaceState(null, "", "/settings");
    return "ready";
  }
  try {
    const state = await chessAccountSso.initialize();
    return state.status === "redirecting" ? "redirecting" : "ready";
  } catch {
    lastLoginError = "Account is temporarily unavailable; guest progress is still accessible.";
    return "ready";
  }
}
