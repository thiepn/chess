import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ChessPiece, chessPieceNames } from "./ChessPiece";

describe("P39 chess piece SVG system", () => {
  it("defines all six standard piece names", () => {
    expect(Object.keys(chessPieceNames).sort()).toEqual(["b", "k", "n", "p", "q", "r"]);
  });

  it("renders a deterministic SVG instead of a Unicode glyph", () => {
    const markup = renderToStaticMarkup(<ChessPiece color="w" type="n" />);
    expect(markup).toContain("<svg");
    expect(markup).toContain("White knight");
    expect(markup).toContain("chess-piece-w");
    expect(markup).not.toContain("♘");
  });

  it("uses the same geometry system for black pieces", () => {
    const markup = renderToStaticMarkup(<ChessPiece color="b" type="q" />);
    expect(markup).toContain("Black queen");
    expect(markup).toContain("chess-piece-b");
  });
});
