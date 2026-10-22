/**
 * Account initialization is the source-owned gate for loading Chess's app.
 * In particular, an OAuth callback must finish before modules that can read
 * owner-specific state are evaluated.
 */
export type ChessStartupOutcome = "ready" | "redirecting" | "unavailable";

export async function runChessStartup(
  initializeAccount: () => Promise<"ready" | "redirecting">,
  loadApp: () => Promise<void>,
): Promise<ChessStartupOutcome> {
  try {
    const disposition = await initializeAccount();
    if (disposition === "redirecting") return "redirecting";
    await loadApp();
    return "ready";
  } catch {
    // No account identity is guessed and no application state is written.
    // The entrypoint displays a manual reload action for transient failures.
    return "unavailable";
  }
}
