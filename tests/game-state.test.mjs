import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_CRACKS,
  clickSquish,
  clickWax,
  createGame,
  getCrackLevel,
  resetGame,
} from "../app.js";

test("wax clicks increase cracks without mutating previous state", () => {
  const first = createGame(100);
  const second = clickWax(first, 120);

  assert.equal(first.cracks, 0);
  assert.equal(first.phase, "wax");
  assert.equal(second.cracks, 1);
  assert.equal(second.phase, "wax");
  assert.equal(second.startedAt, 100);
});

test("wax breaks into squish phase at the max crack count", () => {
  let game = createGame(100);

  for (let i = 0; i < MAX_CRACKS; i += 1) {
    game = clickWax(game, 200 + i);
  }

  assert.equal(game.cracks, MAX_CRACKS);
  assert.equal(game.phase, "squish");
  assert.equal(game.brokenAt, 200 + MAX_CRACKS - 1);
});

test("extra wax clicks after breaking do not add more cracks", () => {
  let game = createGame(100);

  for (let i = 0; i < MAX_CRACKS + 3; i += 1) {
    game = clickWax(game, 200 + i);
  }

  assert.equal(game.cracks, MAX_CRACKS);
  assert.equal(game.phase, "squish");
});

test("squish clicks only count after wax has broken", () => {
  const wax = createGame(100);
  const unchanged = clickSquish(wax);

  let broken = wax;
  for (let i = 0; i < MAX_CRACKS; i += 1) {
    broken = clickWax(broken, 200 + i);
  }
  const squished = clickSquish(broken);

  assert.equal(unchanged.squishCount, 0);
  assert.equal(squished.squishCount, 1);
});

test("reset starts a fresh wax ball and increments play count", () => {
  const first = createGame(100);
  const second = resetGame(first, 500);

  assert.equal(second.phase, "wax");
  assert.equal(second.cracks, 0);
  assert.equal(second.squishCount, 0);
  assert.equal(second.plays, 1);
  assert.equal(second.startedAt, 500);
});

test("crack level is stable between 0 and 5", () => {
  let game = createGame(100);

  assert.equal(getCrackLevel(game), 0);
  game = clickWax(game, 110);
  assert.equal(getCrackLevel(game) >= 1, true);

  for (let i = 0; i < MAX_CRACKS + 10; i += 1) {
    game = clickWax(game, 200 + i);
  }

  assert.equal(getCrackLevel(game), 5);
});
