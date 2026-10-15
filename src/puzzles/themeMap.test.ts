import { describe, expect, it } from "vitest";
import sourceThemeMap from "./theme-map.json";

describe("G0 evidence-backed tactical mapping", () => {
  it("labels generic forks only as double attacks; source builder verifies knight identity", () => {
    expect(sourceThemeMap.fork).toEqual(["tactics.double-attack"]);
    expect(sourceThemeMap.fork).not.toContain("tactics.knight-fork");
  });

  it("does not infer an overloaded defender from a generic deflection tag", () => {
    expect(sourceThemeMap.deflection).toContain("tactics.deflection");
    expect(sourceThemeMap.deflection).not.toContain("tactics.overload");
    expect(sourceThemeMap.overloadedPiece).toContain("tactics.overload");
    expect(sourceThemeMap.skewer).toContain("tactics.skewer");
    expect(sourceThemeMap.capturingDefender).toContain("tactics.removing-defender");
    expect(sourceThemeMap.attraction).toContain("tactics.decoy");
    expect(sourceThemeMap.clearance).toContain("tactics.clearance");
  });

  it("does not convert game-phase and evaluation tags into specialist lesson evidence", () => {
    for (const tag of ["middlegame", "endgame", "opening", "crushing", "equality"] as const)
      expect(sourceThemeMap[tag]).toEqual([]);
    expect(sourceThemeMap.rookEndgame).not.toContain("endgames.lucena");
    expect(sourceThemeMap.rookEndgame).not.toContain("endgames.philidor");
    expect(sourceThemeMap.quietMove).not.toContain("defense.prophylaxis");
    expect(sourceThemeMap.defensiveMove).not.toContain("defense.exchange-attackers");
  });
});
