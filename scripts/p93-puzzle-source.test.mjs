import fs from "node:fs";
import { it } from "vitest";
import assert from "node:assert/strict";

it("P93 retains 11000 distinct genuine source IDs without altering original baseline",()=>{
  const baseline=fs.readFileSync("scripts/data/lichess-production-baseline.csv","utf8").trim().split(/\r?\n/);
  const added=fs.readFileSync("scripts/data/lichess-p93-expansion.csv","utf8").trim().split(/\r?\n/);
  const heading="PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags";
  assert.ok(baseline[0].startsWith(heading));
  assert.equal(added[0],heading);
  assert.equal(baseline.length-1,2000);
  assert.equal(added.length-1,9000);
  const ids=new Set();
  const kinds=new Set(),bands=new Set();
  for(const row of [...baseline.slice(1),...added.slice(1)]){
    const fields=row.split(",");
    assert.ok(fields.length>=10);
    assert.match(fields[0],/^[A-Za-z0-9]+$/);
    assert.ok(!ids.has(fields[0]),"duplicate PuzzleId "+fields[0]);
    ids.add(fields[0]);
    assert.match(fields[1],/\//);
    assert.match(fields[2],/^[a-h][1-8][a-h][1-8][qrbn]?( [a-h][1-8][a-h][1-8][qrbn]?)+$/);
    const rating=Number(fields[3]);
    assert.ok(Number.isFinite(rating));
    bands.add(Math.floor(rating/200));
    for(const motif of fields[7].split(" "))kinds.add(motif);
    assert.ok(fields[8].startsWith("https://lichess.org/"));
  }
  assert.equal(ids.size,11000);
  assert.ok(bands.size>=8);
  for(const motif of ["defensiveMove","quietMove","fork","pin","skewer","mateIn2"])
    assert.ok(kinds.has(motif),motif);
});
