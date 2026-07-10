import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_CRACKS,
  clickWax,
  createGame,
  getCrackLevel,
  normalizePointer,
} from "../app.js";

test("wax reaches squish phase on the seventh press", () => {
  let game = createGame(0);
  for (let i = 0; i < MAX_CRACKS; i += 1) game = clickWax(game, i + 1);
  assert.equal(game.phase, "squish");
  assert.equal(game.cracks, 7);
});

test("pointer coordinates are clamped and normalized to percentages", () => {
  const rect = { left: 10, top: 20, width: 200, height: 100 };
  assert.deepEqual(normalizePointer(110, 70, rect), { x: 50, y: 50 });
  assert.deepEqual(normalizePointer(-20, 500, rect), { x: 0, y: 100 });
});

test("crack level remains within zero to five", () => {
  assert.equal(getCrackLevel(createGame(0)), 0);
  assert.equal(getCrackLevel({ ...createGame(0), cracks: 7 }), 5);
});
