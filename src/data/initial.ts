import type { UserState } from "../domain/types";

// Real new users begin with no demonstrated chess knowledge.
// The example player in data/demo.ts is used only by tests and fixtures.
export const emptyChessState: UserState = {
  mastery: {},
  weaknesses: [],
  recentDomainMinutes: {},
};
