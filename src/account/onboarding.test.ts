import { describe, expect, it } from "vitest";
import { CHESS_ACCOUNT_CALLBACK, CHESS_ACCOUNT_ISSUER, checkChessAccountClient } from "./onboarding";

const CLIENT = "d2234af4-8c81-4ae3-8793-e249dc8ac6b1"; // fixture only: NOT an issued OAuth client
const valid = { issuer: CHESS_ACCOUNT_ISSUER, redirectUri: CHESS_ACCOUNT_CALLBACK, clientId: CLIENT };

describe("P69 Chess Account OAuth onboarding", () => {
  it("does not invent a client ID when Chess has no registration", () => {
    expect(checkChessAccountClient({}).status).toBe("unregistered");
  });
  it("rejects partial onboarding instead of silently allowing a different issuer", () => {
    expect(checkChessAccountClient({ issuer: CHESS_ACCOUNT_ISSUER }).status).toBe("invalid");
    expect(checkChessAccountClient({ ...valid, issuer: "https://evil.example" }).status).toBe("invalid");
  });
  it("requires the exact HTTPS Chess callback with no query, fragment or sibling origin", () => {
    for (const redirectUri of [
      "http://chess.thiepn.dev/auth/callback/",
      "https://chess.thiepn.dev/auth/callback",
      "https://chess.thiepn.dev/auth/callback/?code=x",
      "https://thiepn.dev/chess/auth/callback/",
    ]) expect(checkChessAccountClient({ ...valid, redirectUri }).status).toBe("invalid");
  });
  it("rejects client IDs already assigned to other THIEPN apps", () => {
    for (const clientId of [
      "76e41661-f8a9-4181-b8b9-4084f2e2acbf",
      "c4522235-beb3-4f48-94fb-e274e92b7c84",
      "7b5663cb-ac37-4f90-8d00-6317206c9027",
    ]) expect(checkChessAccountClient({ ...valid, clientId }).status).toBe("invalid");
  });
  it("requires a real UUID-shaped client ID", () => {
    expect(checkChessAccountClient({ ...valid, clientId: "" }).status).toBe("invalid");
    expect(checkChessAccountClient({ ...valid, clientId: "chess" }).status).toBe("invalid");
  });
  it("reports configuration as a prerequisite, never successful SSO", () => {
    const result = checkChessAccountClient(valid);
    expect(result.status).toBe("configured");
    expect(result.reason).toMatch(/still require release acceptance/i);
  });
});
