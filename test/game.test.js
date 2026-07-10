import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_CRACKS,
  clickSquish,
  createGame,
  hitWaxZone,
  resetGame,
} from "../app.js";

test("wax requires exactly 20 unique zones", () => {
  let game = createGame(0, 0);
  assert.equal(MAX_CRACKS, 20);
  for (let index = 0; index < 19; index += 1) {
    game = hitWaxZone(game, index, index + 1);
  }
  assert.equal(game.phase, "wax");
  assert.equal(game.cracks, 19);
  game = hitWaxZone(game, 19, 20);
  assert.equal(game.phase, "squish");
  assert.equal(game.cracks, 20);
});

test("repeated zone does not advance progress", () => {
  const once = hitWaxZone(createGame(0, 0), 4, 1);
  const twice = hitWaxZone(once, 4, 2);
  assert.equal(twice.cracks, 1);
  assert.equal(twice.lastHitWasNew, false);
  assert.deepEqual(twice.brokenZones, [4]);
});

test("squish remains playable after reset becomes available", () => {
  let game = createGame(0, 0);
  for (let index = 0; index < MAX_CRACKS; index += 1) game = hitWaxZone(game, index, index);
  for (let index = 0; index < 8; index += 1) game = clickSquish(game, index);
  assert.equal(game.squishCount, 8);
  assert.equal(game.completed, true);
});

test("reset selects a different design and clears broken zones", () => {
  const current = hitWaxZone(createGame(0, 0), 2, 1);
  const next = resetGame(current, 2, 0);
  assert.notEqual(next.design, current.design);
  assert.deepEqual(next.brokenZones, []);
  assert.equal(next.cracks, 0);
});

test("drag maps horizontal movement to yaw and clamps pitch", async () => {
  const { updateRotation } = await import("../app.js");
  const turned = updateRotation({ yaw: 0, pitch: 0 }, { x: 100, y: 400 }, 300);
  assert.ok(turned.yaw > 0);
  assert.ok(turned.pitch <= Math.PI * 0.42);
  assert.ok(turned.pitch >= -Math.PI * 0.42);
});
