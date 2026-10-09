/** Reviewed first-party Chess OAuth registration contract.
 * The runtime uses the pinned upstream Account SDK, but it must never
 * initialize a client until one exists in THIEPN Account's OAuth registry.
 */
export const CHESS_ACCOUNT_ORIGIN = "https://account.thiepn.dev";
export const CHESS_APP_ORIGIN = "https://chess.thiepn.dev/";
export const CHESS_ACCOUNT_CALLBACK = "https://chess.thiepn.dev/auth/callback/";
export const CHESS_ACCOUNT_ISSUER = "https://hycegznamzjhwinegaai.supabase.co";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type AccountClientConfiguration = {
  issuer?: string;
  clientId?: string;
  redirectUri?: string;
};

export type AccountClientReadiness =
  | { status: "unregistered"; reason: string }
  | { status: "invalid"; reason: string }
  | { status: "configured"; clientId: string; reason: string };

/** Only structural readiness; a configured value is never proof of live SSO. */
export function checkChessAccountClient(
  config: AccountClientConfiguration,
): AccountClientReadiness {
  const values = [config.issuer, config.clientId, config.redirectUri];
  if (values.every((value) => !value)) {
    return {
      status: "unregistered",
      reason: "Chess first-party sign-in is pending Account OAuth client registration.",
    };
  }
  if (config.issuer !== CHESS_ACCOUNT_ISSUER ||
      config.redirectUri !== CHESS_ACCOUNT_CALLBACK ||
      !UUID.test(config.clientId ?? "")) {
    return {
      status: "invalid",
      reason: "Chess Account OAuth settings do not match its verified issuer, client UUID and exact HTTPS callback.",
    };
  }
  return {
    status: "configured",
    clientId: config.clientId!,
    reason: "OAuth client configuration present. Real sign-in and account isolation still require release acceptance.",
  };
}

export function currentChessAccountClientReadiness(): AccountClientReadiness {
  return checkChessAccountClient({
    issuer: import.meta.env.VITE_SUPABASE_URL,
    clientId: import.meta.env.VITE_THIEPN_ACCOUNT_CLIENT_ID,
    redirectUri: import.meta.env.VITE_THIEPN_ACCOUNT_REDIRECT_URI,
  });
}
