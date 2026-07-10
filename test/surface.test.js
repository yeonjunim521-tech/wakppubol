import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyGesture,
  createFracture,
  createSurfaceZones,
  gravityPosition,
  screenPointToLocalVector,
  selectZone,
} from "../surface.js";

test("creates exactly 20 normalized, distinct spherical zones", () => {
  const zones = createSurfaceZones(20);
  assert.equal(zones.length, 20);
  assert.equal(new Set(zones.map((zone) => `${zone.x.toFixed(4)}:${zone.y.toFixed(4)}:${zone.z.toFixed(4)}`)).size, 20);
  for (const zone of zones) {
    assert.ok(Math.abs(Math.hypot(zone.x, zone.y, zone.z) - 1) < 1e-9);
  }
});

test("inverse rotation maps the same visible point to another local zone", () => {
  const zones = createSurfaceZones(20);
  const front = screenPointToLocalVector({ x: 0, y: 0 }, 1, { yaw: 0, pitch: 0 });
  const turned = screenPointToLocalVector({ x: 0, y: 0 }, 1, { yaw: Math.PI, pitch: 0 });
  assert.notEqual(selectZone(zones, front), selectZone(zones, turned));
});

test("movement below 8px is tap and 8px is drag", () => {
  assert.equal(classifyGesture({ x: 0, y: 0 }, { x: 7.9, y: 0 }, 8), "tap");
  assert.equal(classifyGesture({ x: 0, y: 0 }, { x: 8, y: 0 }, 8), "drag");
});

test("fracture geometry is deterministic and irregular", () => {
  const first = createFracture(6);
  const second = createFracture(6);
  assert.deepEqual(first, second);
  assert.ok(first.rim.length >= 7 && first.rim.length <= 11);
  assert.ok(new Set(first.rim.map((point) => point.radius.toFixed(3))).size >= 4);
  assert.ok(first.branches.length >= 2 && first.branches.length <= 4);
});

test("gravity fragments never move upward", () => {
  const fragment = { x: 0, y: 10, vx: 3, vy: 0, gravity: 680, rotation: 0, spin: 1 };
  const early = gravityPosition(fragment, 0.1);
  const later = gravityPosition(fragment, 0.2);
  assert.ok(early.y >= fragment.y);
  assert.ok(later.y > early.y);
});

test("renderer creates downward-only chips for a new break", async () => {
  const { createWaxRenderer } = await import("../wax-renderer.js");
  const gradient = { addColorStop() {} };
  const context = new Proxy({}, {
    get: (target, key) => {
      if (key in target) return target[key];
      if (key === "createRadialGradient" || key === "createLinearGradient") return () => gradient;
      return () => {};
    },
    set: (target, key, value) => {
      target[key] = value;
      return true;
    },
  });
  const canvas = {
    width: 300,
    height: 300,
    clientWidth: 300,
    clientHeight: 300,
    getContext: () => context,
  };
  const renderer = createWaxRenderer(canvas, {
    devicePixelRatio: 1,
    requestFrame: () => 0,
    cancelFrame: () => {},
  });
  renderer.breakZone(2);
  const state = renderer.getDebugState();
  assert.deepEqual(state.brokenZones, [2]);
  assert.ok(state.fragments.length >= 2);
  assert.ok(state.fragments.every((fragment) => fragment.vy >= 0 && fragment.gravity > 0));
});
