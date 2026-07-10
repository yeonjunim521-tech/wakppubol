# Rotatable 20-Zone Wax Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fixed seven-step shell with a rotatable spherical wax surface that requires 20 unique hit zones, renders touch-local irregular fractures with gravity-only debris, and uses short sticky slime audio.

**Architecture:** Keep the existing static game inside `public/game`, but split spherical math and rendering from UI state. A pure `surface.js` module owns Fibonacci zones, projection, hit testing, drag classification, and deterministic fracture geometry; `wax-renderer.js` owns Canvas drawing and falling chips; `app.js` coordinates gestures, state, audio, and the wax-to-squish transition.

**Tech Stack:** Browser ES modules, Canvas 2D, Pointer Events, Web Audio API, Node.js built-in test runner, Vinext/Sites build.

## Global Constraints

- Exactly 20 unique surface zones are required before the squish phase.
- Repeated taps on an already broken zone do not advance progress and do not play a crack sound.
- Pointer movement under 8 CSS pixels is a tap; movement at or above 8 CSS pixels is rotation only.
- Existing damage remains fixed to sphere-local coordinates while the ball rotates.
- Chip vertical velocity begins at or below the screen direction (`vy >= 0`) and gravity always increases downward displacement.
- The shell is fully hidden before squish input is accepted.
- The reset button still appears after five squish presses, while squish remains playable indefinitely.
- No new runtime dependency is added.

---

## File Map

- Create `public/game/surface.js`: pure spherical geometry, zone selection, deterministic fracture shapes, drag classification, and gravity position.
- Create `public/game/wax-renderer.js`: Canvas resolution, wax sphere painting, projected damage, chips, rotation updates, and collapse animation.
- Modify `public/game/app.js`: 20-zone state machine and pointer gesture controller.
- Modify `public/game/index.html`: replace fixed fracture SVG with a wax Canvas.
- Modify `public/game/styles.css`: Canvas shell layout, rotation cursor, shell transition, and remove seven-stage selectors.
- Modify `public/game/audio.js`: sticky squish bank and tighter playback mix.
- Create `tests/surface.test.mjs`: pure geometry and physics tests.
- Create `tests/game-state.test.mjs`: unique-zone progress and phase transition tests.
- Create `tests/audio-contract.test.mjs`: audio manifest and mix constraints.
- Modify `tests/rendered-html.test.mjs`: deployed HTML asset contract.
- Modify `public/game/assets/audio/LICENSES.md`: document the derived sticky squish files.
- Replace `public/game/assets/audio/squish-1.wav` through `squish-3.wav`: short processed sticky transients.

---

### Task 1: Spherical Surface Geometry

**Files:**
- Create: `public/game/surface.js`
- Test: `tests/surface.test.mjs`

**Interfaces:**
- Produces: `createSurfaceZones(count)`, `screenPointToLocalVector(point, radius, rotation)`, `selectZone(zones, vector)`, `classifyGesture(start, end, threshold)`, `createFracture(zoneIndex)`, and `gravityPosition(fragment, elapsedSeconds)`.
- Consumes: no project module.

- [ ] **Step 1: Write the failing geometry tests**

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyGesture,
  createFracture,
  createSurfaceZones,
  gravityPosition,
  screenPointToLocalVector,
  selectZone,
} from "../public/game/surface.js";

test("creates exactly 20 normalized, distinct spherical zones", () => {
  const zones = createSurfaceZones(20);
  assert.equal(zones.length, 20);
  assert.equal(new Set(zones.map((z) => `${z.x.toFixed(4)}:${z.y.toFixed(4)}:${z.z.toFixed(4)}`)).size, 20);
  for (const zone of zones) assert.ok(Math.abs(Math.hypot(zone.x, zone.y, zone.z) - 1) < 1e-9);
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
  const a = createFracture(6);
  const b = createFracture(6);
  assert.deepEqual(a, b);
  assert.ok(a.rim.length >= 7 && a.rim.length <= 11);
  assert.ok(new Set(a.rim.map((p) => p.radius.toFixed(3))).size >= 4);
  assert.ok(a.branches.length >= 2 && a.branches.length <= 4);
});

test("gravity fragments never move upward", () => {
  const fragment = { x: 0, y: 10, vx: 3, vy: 0, gravity: 680, rotation: 0, spin: 1 };
  const a = gravityPosition(fragment, 0.1);
  const b = gravityPosition(fragment, 0.2);
  assert.ok(a.y >= fragment.y);
  assert.ok(b.y > a.y);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/surface.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `public/game/surface.js`.

- [ ] **Step 3: Implement the pure geometry module**

Implement `surface.js` with these rules:

```js
export const SURFACE_ZONE_COUNT = 20;

export function createSurfaceZones(count = SURFACE_ZONE_COUNT) {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: count }, (_, index) => {
    const y = 1 - ((index + 0.5) / count) * 2;
    const radius = Math.sqrt(1 - y * y);
    const angle = index * goldenAngle;
    return Object.freeze({ index, x: Math.cos(angle) * radius, y, z: Math.sin(angle) * radius });
  });
}

function rotateX(point, angle) {
  const c = Math.cos(angle), s = Math.sin(angle);
  return { x: point.x, y: point.y * c - point.z * s, z: point.y * s + point.z * c };
}

function rotateY(point, angle) {
  const c = Math.cos(angle), s = Math.sin(angle);
  return { x: point.x * c + point.z * s, y: point.y, z: -point.x * s + point.z * c };
}

export function screenPointToLocalVector(point, radius, rotation) {
  const x = Math.max(-radius, Math.min(radius, point.x)) / radius;
  const y = Math.max(-radius, Math.min(radius, point.y)) / radius;
  const z = Math.sqrt(Math.max(0, 1 - x * x - y * y));
  return rotateY(rotateX({ x, y, z }, -rotation.pitch), -rotation.yaw);
}

export function selectZone(zones, vector) {
  let bestIndex = 0;
  let bestDot = -Infinity;
  for (const zone of zones) {
    const dot = zone.x * vector.x + zone.y * vector.y + zone.z * vector.z;
    if (dot > bestDot) { bestDot = dot; bestIndex = zone.index; }
  }
  return bestIndex;
}

export function classifyGesture(start, end, threshold = 8) {
  return Math.hypot(end.x - start.x, end.y - start.y) < threshold ? "tap" : "drag";
}

function seeded(index) {
  let value = (index + 1) * 0x9e3779b1;
  return () => {
    value ^= value << 13; value ^= value >>> 17; value ^= value << 5;
    return (value >>> 0) / 4294967296;
  };
}

export function createFracture(zoneIndex) {
  const random = seeded(zoneIndex);
  const count = 7 + Math.floor(random() * 5);
  const rim = Array.from({ length: count }, (_, index) => ({
    angle: (index / count) * Math.PI * 2 + (random() - 0.5) * 0.24,
    radius: 0.7 + random() * 0.46,
  }));
  const branches = Array.from({ length: 2 + Math.floor(random() * 3) }, (_, index) => ({
    angle: (index / 4) * Math.PI * 2 + random() * 0.72,
    length: 1.08 + random() * 0.74,
    bend: (random() - 0.5) * 0.58,
  }));
  return { rim, branches };
}

export function gravityPosition(fragment, elapsedSeconds) {
  return {
    x: fragment.x + fragment.vx * elapsedSeconds,
    y: fragment.y + Math.max(0, fragment.vy) * elapsedSeconds + 0.5 * fragment.gravity * elapsedSeconds ** 2,
    rotation: fragment.rotation + fragment.spin * elapsedSeconds,
  };
}
```

- [ ] **Step 4: Run geometry tests and verify GREEN**

Run: `node --test tests/surface.test.mjs`

Expected: 5 tests pass, 0 fail.

- [ ] **Step 5: Commit**

```bash
git add public/game/surface.js tests/surface.test.mjs
git commit -m "feat: add spherical wax surface geometry"
```

---

### Task 2: Unique 20-Zone Game State

**Files:**
- Modify: `public/game/app.js`
- Test: `tests/game-state.test.mjs`

**Interfaces:**
- Consumes: `SURFACE_ZONE_COUNT` from `surface.js`.
- Produces: `createGame()`, `hitWaxZone(game, zoneIndex, now)`, `clickSquish()`, and `resetGame()`.

- [ ] **Step 1: Write failing state tests**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { MAX_CRACKS, createGame, hitWaxZone } from "../public/game/app.js";

test("wax requires exactly 20 unique zones", () => {
  let game = createGame(0, 0);
  assert.equal(MAX_CRACKS, 20);
  for (let index = 0; index < 19; index += 1) game = hitWaxZone(game, index, index + 1);
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
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/game-state.test.mjs`

Expected: FAIL because `MAX_CRACKS` is 7 and `hitWaxZone` is not exported.

- [ ] **Step 3: Implement the 20-zone state**

Change `MAX_CRACKS` to `SURFACE_ZONE_COUNT`, add `brokenZones: []` and `lastHitWasNew: false` to the initial state, and replace `clickWax` with:

```js
export function hitWaxZone(game, zoneIndex, now = Date.now()) {
  if (game.phase !== "wax" || game.brokenZones.includes(zoneIndex)) {
    return { ...game, lastHitWasNew: false };
  }
  const brokenZones = [...game.brokenZones, zoneIndex];
  const cracks = brokenZones.length;
  const isBroken = cracks === MAX_CRACKS;
  return {
    ...game,
    brokenZones,
    cracks,
    lastHitWasNew: true,
    phase: isBroken ? "squish" : "wax",
    brokenAt: isBroken ? now : game.brokenAt,
  };
}
```

Keep unlimited squish presses and the five-press reset visibility behavior unchanged. Update counters to `깨진 표면 ${game.cracks} / 20`.

- [ ] **Step 4: Run state and existing tests**

Run: `node --test tests/game-state.test.mjs tests/surface.test.mjs`

Expected: 7 tests pass, 0 fail.

- [ ] **Step 5: Commit**

```bash
git add public/game/app.js tests/game-state.test.mjs
git commit -m "feat: require 20 unique wax zones"
```

---

### Task 3: Canvas Wax Renderer and Gravity Chips

**Files:**
- Create: `public/game/wax-renderer.js`
- Modify: `tests/surface.test.mjs`

**Interfaces:**
- Consumes: zones, `createFracture`, and `gravityPosition` from `surface.js`.
- Produces: `createWaxRenderer(canvas, options)` returning `{ resize, setRotation, breakZone, collapse, render, destroy }`.

- [ ] **Step 1: Extend the failing renderer contract test**

Add a source contract test that imports `wax-renderer.js`, passes a minimal fake Canvas context, calls `breakZone(2)`, and asserts its debug state contains one damage item and every chip has `vy >= 0` and `gravity > 0`.

```js
test("renderer creates downward-only chips for a new break", async () => {
  const { createWaxRenderer } = await import("../public/game/wax-renderer.js");
  const context = new Proxy({}, { get: (target, key) => target[key] ?? (() => {}) });
  const canvas = { width: 300, height: 300, clientWidth: 300, clientHeight: 300, getContext: () => context };
  const renderer = createWaxRenderer(canvas, { devicePixelRatio: 1, requestFrame: () => 0, cancelFrame: () => {} });
  renderer.breakZone(2);
  const state = renderer.getDebugState();
  assert.deepEqual(state.brokenZones, [2]);
  assert.ok(state.fragments.length >= 2);
  assert.ok(state.fragments.every((fragment) => fragment.vy >= 0 && fragment.gravity > 0));
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/surface.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `wax-renderer.js`.

- [ ] **Step 3: Implement the renderer**

Implement a renderer that:

- scales the backing store by `devicePixelRatio`;
- paints an asymmetric radial wax gradient and deterministic pore texture clipped to a circle;
- rotates every zone by yaw then pitch and culls projected zones with `z <= 0`;
- sorts visible damage by depth;
- draws each hole from `createFracture(zoneIndex)` as a 7–11 point path with dark inner depth, light broken rim, and 2–4 bent crack branches;
- seeds 2–4 fragments per new zone with `vy` in `[0, 28]`, `gravity` in `[620, 780]`, and lifetime `900ms`;
- uses `gravityPosition` for every frame and removes expired fragments;
- performs final collapse by creating fragments for all still-visible shell pieces, then sets `shellOpacity` to zero after 180ms;
- exposes `getDebugState()` only as immutable copied diagnostic data for tests.

Use a single animation loop while fragments or collapse are active; otherwise draw only after resize, rotation, theme, or damage changes.

- [ ] **Step 4: Run and verify GREEN**

Run: `node --test tests/surface.test.mjs`

Expected: all surface and renderer tests pass.

- [ ] **Step 5: Commit**

```bash
git add public/game/wax-renderer.js tests/surface.test.mjs
git commit -m "feat: render touch-local wax fractures on canvas"
```

---

### Task 4: Drag-to-Rotate and Tap-to-Break Controller

**Files:**
- Modify: `public/game/app.js`
- Modify: `tests/game-state.test.mjs`

**Interfaces:**
- Consumes: `classifyGesture`, `screenPointToLocalVector`, `selectZone`, `createSurfaceZones`, and `createWaxRenderer`.
- Produces: pointer behavior on `[data-ball]`.

- [ ] **Step 1: Add failing gesture tests**

Export and test a pure `updateRotation(rotation, delta, size)` helper:

```js
test("drag maps horizontal movement to yaw and clamps pitch", async () => {
  const { updateRotation } = await import("../public/game/app.js");
  const turned = updateRotation({ yaw: 0, pitch: 0 }, { x: 100, y: 400 }, 300);
  assert.ok(turned.yaw > 0);
  assert.ok(turned.pitch <= Math.PI * 0.42);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/game-state.test.mjs`

Expected: FAIL because `updateRotation` is missing.

- [ ] **Step 3: Implement Pointer Events**

Use one pointer session with this data:

```js
let pointer = null;
const rotation = { yaw: 0, pitch: 0 };

export function updateRotation(current, delta, size) {
  return {
    yaw: current.yaw + (delta.x / size) * Math.PI,
    pitch: Math.max(-Math.PI * 0.42, Math.min(Math.PI * 0.42, current.pitch + (delta.y / size) * Math.PI)),
  };
}
```

On `pointerdown`, store the start, last point, pointer ID, and start time and call `setPointerCapture`. On `pointermove`, rotate only after total movement reaches 8px, update the renderer, and set `data-dragging=true`. On `pointerup`, if the gesture is a tap and the game phase is wax, convert the point relative to the ball center to a local vector, select the nearest zone, and call `hitWaxZone`. Play crack audio and call `renderer.breakZone` only when `lastHitWasNew` is true. Otherwise render `이미 깨진 곳이에요. 볼을 돌려보세요`. On the 20th unique hit call `renderer.collapse()` and delay enabling the squish phase UI by 300ms. On `pointercancel`, clear the session without breaking wax.

- [ ] **Step 4: Run controller and state tests**

Run: `node --test tests/game-state.test.mjs tests/surface.test.mjs`

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add public/game/app.js tests/game-state.test.mjs
git commit -m "feat: rotate and break wax at touch position"
```

---

### Task 5: Replace Fixed SVG Shell in Markup and CSS

**Files:**
- Modify: `public/game/index.html`
- Modify: `public/game/styles.css`
- Modify: `tests/rendered-html.test.mjs`

**Interfaces:**
- Consumes: `[data-wax-canvas]` from the renderer and existing `.inside`/`.squish-pulse` elements.
- Produces: responsive ball shell presentation.

- [ ] **Step 1: Add failing static asset assertions**

Extend the rendered asset test to read `public/game/index.html` and assert:

```js
assert.match(gameHtml, /<canvas[^>]*data-wax-canvas/);
assert.doesNotMatch(gameHtml, /fracture-svg/);
assert.match(gameHtml, /깨진 표면 0 \/ 20/);
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test`

Expected: FAIL because the old SVG remains and Canvas is absent.

- [ ] **Step 3: Replace the shell markup and styles**

Inside `.ball`, keep `.inside` first, then add:

```html
<canvas class="wax-canvas" data-wax-canvas aria-hidden="true"></canvas>
<span class="impact-bloom" aria-hidden="true"></span>
<span class="squish-pulse" aria-hidden="true"></span>
```

Update initial accessible status to `깨진 표면 0 / 20`. Remove `.fracture-svg`, `.fracture-path`, `.break-hole`, `.wax-fragment`, and all `[data-cracks="1"]` through `[data-cracks="7"]` rules. Add `.wax-canvas` as an absolute circular layer with `touch-action: none`, `cursor: grab`, and a grabbing cursor when `data-dragging=true`. Use `opacity` and `transform` transitions for final shell collapse. Retain the existing inside/slime design, reset visibility, responsive sizing, and reduced-motion override.

- [ ] **Step 4: Run and verify GREEN**

Run: `npm test`

Expected: build and all static contract tests pass.

- [ ] **Step 5: Commit**

```bash
git add public/game/index.html public/game/styles.css tests/rendered-html.test.mjs
git commit -m "feat: present rotatable canvas wax shell"
```

---

### Task 6: Short Sticky Squish ASMR

**Files:**
- Modify: `public/game/audio.js`
- Replace: `public/game/assets/audio/squish-1.wav`
- Replace: `public/game/assets/audio/squish-2.wav`
- Replace: `public/game/assets/audio/squish-3.wav`
- Modify: `public/game/assets/audio/LICENSES.md`
- Create: `tests/audio-contract.test.mjs`

**Interfaces:**
- Consumes: existing source squish recordings already credited in `LICENSES.md`.
- Produces: three PCM WAV sticky transients and squish playback mix.

- [ ] **Step 1: Add failing audio contract tests**

```js
import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
import test from "node:test";
import { AUDIO_MANIFEST, getRecordedMix } from "../public/game/audio.js";

test("squish bank contains three short sticky variants", async () => {
  assert.equal(AUDIO_MANIFEST.squish.length, 3);
  for (const relative of AUDIO_MANIFEST.squish) {
    const info = await stat(new URL(`../public/game/${relative.replace(/^\.\//, "")}`, import.meta.url));
    assert.ok(info.size < 80_000, `${relative} should be a short transient`);
  }
});

test("squish pitch variation stays subtle and audible", () => {
  const low = getRecordedMix("squish", 0);
  const high = getRecordedMix("squish", 1);
  assert.deepEqual([low.playbackRate, high.playbackRate], [0.97, 1.04]);
  assert.ok(low.gain >= 0.98 && high.gain <= 1.08);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/audio-contract.test.mjs`

Expected: FAIL because the existing long recordings exceed the size limit and playback range is 0.96–1.04.

- [ ] **Step 3: Produce the three short transients**

Use `ffmpeg` as a media transformation, not application code, to derive three 120–320ms contact transients from the already licensed squish recordings. For each output apply: silence trim, `highpass=f=180`, `lowpass=f=4200`, a fast noise gate, 5ms fade-in, 20ms fade-out, mono 48kHz PCM, and loudness normalization near the wax samples. Keep only contact peaks with no sustained water-like tail. Update `LICENSES.md` to state the files are processed derivatives of the same credited CC0 source.

- [ ] **Step 4: Tighten the playback mix**

Change squish mix to:

```js
return {
  playbackRate: 0.97 + value * 0.07,
  gain: 0.98 + value * 0.1,
};
```

Replace `playSquish` with one 90ms low sine body plus a 55ms band-passed sticky release; keep both below the recorded transient so the sample remains dominant.

- [ ] **Step 5: Run and verify GREEN**

Run: `node --test tests/audio-contract.test.mjs`

Expected: 2 tests pass, 0 fail.

- [ ] **Step 6: Commit**

```bash
git add public/game/audio.js public/game/assets/audio/squish-*.wav public/game/assets/audio/LICENSES.md tests/audio-contract.test.mjs
git commit -m "feat: replace watery squish with sticky ASMR"
```

---

### Task 7: Full Integration, Performance, and Deployment

**Files:**
- Modify only files found faulty during verification.

**Interfaces:**
- Consumes: completed game, renderer, sound, and Sites checkout.
- Produces: verified public checkpoint deployment.

- [ ] **Step 1: Run all automated tests**

Run: `npm test && node --test tests/surface.test.mjs tests/game-state.test.mjs tests/audio-contract.test.mjs`

Expected: all tests and Vinext build pass with 0 failures.

- [ ] **Step 2: Run source and artifact checks**

Run: `node --check public/game/app.js && node --check public/game/surface.js && node --check public/game/wax-renderer.js && node --check public/game/audio.js && npm run validate:artifact && git diff --check`

Expected: every command exits 0.

- [ ] **Step 3: Verify the interaction in agent preview when available**

Check a mobile viewport and confirm: drag rotates without damage, tap creates damage at the pointer, a repeated hit does not advance, old holes rotate with the sphere, every chip falls downward, the 20th unique hit reveals only the squish, squish remains playable after five presses, reset creates a new random design, and audio levels are comparable.

- [ ] **Step 4: Commit any verification fixes**

```bash
git add public/game tests
git commit -m "fix: polish rotatable wax shell interaction"
```

Skip this commit when Step 3 finds no issue.

- [ ] **Step 5: Create one Sites checkpoint**

Run the Sites lifecycle checkpoint command from the checkout with message `Deploy rotatable 20-zone wax shell`.

Expected: local build succeeds and the deployment reaches `succeeded`.

- [ ] **Step 6: Confirm public access and hand off**

Call the Sites deployment status tool directly in the main conversation, retain the existing public access mode, and return the verified production URL.

