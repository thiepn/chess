import { describe, expect, it } from "vitest";
import { CHESS_ACCOUNT_CALLBACK, CHESS_ACCOUNT_ISSUER, checkChessAccountClient } from "./onboarding";

const CLIENT = "76e41661-f8a9-4181-b8b9-4084f2e2acbf"; // structurally valid sample, NOT Chess's client ID
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
