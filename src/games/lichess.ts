export function extractLichessGameId(input: string) {
  const value = input.trim();

  const urlMatch = value.match(
    /(?:https?:\/\/)?(?:www\.)?lichess\.org\/(?:game\/)?([A-Za-z0-9]{8,12})/,
  );
  if (urlMatch) return urlMatch[1].slice(0, 8);

  if (/^[A-Za-z0-9]{8,12}$/.test(value)) return value.slice(0, 8);
  return null;
}

export async function fetchLichessPgn(input: string) {
  const id = extractLichessGameId(input);
  if (!id) throw new Error("Enter a valid Lichess game URL or game ID.");

  const response = await fetch(`https://lichess.org/game/export/${id}`, {
    headers: {
      Accept: "application/x-chess-pgn",
    },
  });

  if (!response.ok) {
    throw new Error(`Lichess returned ${response.status} while exporting the game.`);
  }

  const pgn = await response.text();
  if (!pgn.trim()) throw new Error("Lichess returned an empty PGN.");
  return pgn;
}
