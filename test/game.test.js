import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  MAX_CRACKS,
  clickWax,
  clickSquish,
  createGame,
  getCrackLevel,
  initApp,
  normalizePointer,
} from "../app.js";

function makeElement() {
  const listeners = new Map();
  const properties = new Map();
  return {
    dataset: {},
    style: {
      setProperty(name, value) { properties.set(name, value); },
      getPropertyValue(name) { return properties.get(name) ?? ""; },
    },
    textContent: "",
    addEventListener(type, listener) { listeners.set(type, listener); },
    dispatch(type, event = {}) { listeners.get(type)?.({ type, button: 0, isPrimary: true, ...event }); },
    getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; },
  };
}

function makeAppRoot() {
  const elements = {
    "[data-app]": makeElement(),
    "[data-ball]": makeElement(),
    "[data-reset]": makeElement(),
    "[data-status]": makeElement(),
    "[data-live-status]": makeElement(),
  };
  return { elements, root: { querySelector: (selector) => elements[selector] ?? null } };
}

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

test("the fifth squish completes the toy without replacing it", () => {
  let game = { ...createGame(0), phase: "squish", cracks: MAX_CRACKS };
  for (let i = 0; i < 5; i += 1) game = clickSquish(game, i + 1);

  assert.equal(game.phase, "squish");
  assert.equal(game.squishCount, 5);
  assert.equal(game.completed, true);
  const continued = clickSquish(game, 99);
  assert.equal(continued.squishCount, 6);
  assert.equal(continued.completed, true);
});

test("pointer and native keyboard clicks each advance exactly once", () => {
  const { root, elements } = makeAppRoot();
  initApp(root);
  const ball = elements["[data-ball]"];

  ball.dispatch("pointerdown", { clientX: 73, clientY: 27 });
  ball.dispatch("click", { detail: 1 });
  assert.equal(elements["[data-app]"].dataset.cracks, "1");
  assert.equal(ball.style.getPropertyValue("--impact-x"), "73%");

  ball.dispatch("keydown", { key: "Enter", repeat: false, preventDefault() {} });
  ball.dispatch("click", { detail: 0 });
  assert.equal(elements["[data-app]"].dataset.cracks, "2");

  ball.dispatch("keydown", { key: " ", repeat: false, preventDefault() {} });
  ball.dispatch("click", { detail: 0 });
  assert.equal(elements["[data-app]"].dataset.cracks, "3");
});

test("non-primary, right-button, and canceled pointer gestures do not advance", () => {
  const { root, elements } = makeAppRoot();
  initApp(root);
  const ball = elements["[data-ball]"];

  ball.dispatch("pointerdown", { button: 0, isPrimary: false, clientX: 90, clientY: 90 });
  ball.dispatch("pointerdown", { button: 2, isPrimary: true, clientX: 90, clientY: 90 });
  ball.dispatch("click", { button: 2, detail: 1 });
  ball.dispatch("pointerdown", { button: 0, isPrimary: true, clientX: 20, clientY: 20 });
  ball.dispatch("pointercancel", { button: 0, isPrimary: true });

  assert.equal(elements["[data-app]"].dataset.cracks, "0");
  assert.equal(ball.style.getPropertyValue("--impact-x"), "20%");
});

test("markup exposes staged SVG fracture and fragment layers", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const fracturePaths = html.match(/<path\b[^>]*class="[^"]*fracture-path[^"]*"[^>]*>/g) ?? [];
  const fragments = html.match(/<path\b[^>]*class="[^"]*wax-fragment[^"]*"[^>]*>/g) ?? [];
  const holes = html.match(/<path\b[^>]*class="[^"]*break-hole[^"]*"[^>]*>/g) ?? [];

  assert.match(html, /class="fracture-svg"/);
  assert.ok(fracturePaths.length >= 8, "provides at least eight fracture paths");
  assert.ok(fragments.length >= 8, "provides at least eight wax fragments");
  assert.ok(holes.length >= 6, "provides irregular openings where shell pieces broke away");
  for (const stage of [1, 2, 3, 4, 5, 6]) {
    assert.ok(fracturePaths.some((path) => path.includes(`data-stage="${stage}"`)), `fracture paths cover stage ${stage}`);
  }
  for (const stage of [2, 3, 4, 5, 6]) {
    assert.ok(fragments.some((fragment) => fragment.includes(`data-stage="${stage}"`)), `fragments cover stage ${stage}`);
  }
  for (const path of fracturePaths) {
    assert.match(path, /vector-effect="non-scaling-stroke"/);
    assert.match(path, /pathLength="1"/);
    assert.match(path, /\sd="[^"]*[QC][^"]*"/, "fractures use curved organic segments");
  }
  assert.doesNotMatch(html, /<polygon\b[^>]*wax-fragment/);
  assert.match(html, /class="impact-bloom"/);
});

test("styles omit removed legacy fracture markup", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  assert.doesNotMatch(css, /(?:\.fracture-web|\.crack\b|\.c[1-4]\b|\.shell-chip|\.chip-[a-d]\b|@keyframes\s+crack-pop)/);
});

test("successive squish levels alternate animation names", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(css, /\[data-squish-level="1"\][^{]*\[data-squish-level="3"\][^{]*\{[^}]*animation:\s*squish-press-odd/s);
  assert.match(css, /\[data-squish-level="2"\][^{]*\[data-squish-level="4"\][^{]*\{[^}]*animation:\s*squish-press-even/s);
  assert.match(css, /@keyframes\s+squish-press-odd/);
  assert.match(css, /@keyframes\s+squish-press-even/);
  assert.match(css, /\[data-squish-level="1"\][^{]*\.squish-pulse[^\{]*\[data-squish-level="3"\][^{]*\.squish-pulse[^\{]*\{[^}]*animation:\s*squish-pulse-odd/s);
  assert.match(css, /\[data-squish-level="2"\][^{]*\.squish-pulse[^\{]*\[data-squish-level="4"\][^{]*\.squish-pulse[^\{]*\{[^}]*animation:\s*squish-pulse-even/s);
  assert.match(css, /@keyframes\s+squish-pulse-odd/);
  assert.match(css, /@keyframes\s+squish-pulse-even/);
});

test("completed state hides the wax shell and reveals reset only then", async () => {
  const [html, css] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../styles.css", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(html, /class="burst"/);
  assert.match(css, /\[data-phase="squish"\] \.wax\s*\{[^}]*opacity:\s*0/s);
  assert.match(css, /\[data-phase="squish"\] \.fracture-svg\s*\{[^}]*opacity:\s*0/s);
  assert.match(css, /\.reset\s*\{[^}]*display:\s*none/s);
  assert.match(css, /\[data-completed="true"\] \.reset\s*\{[^}]*display:\s*block/s);
});

test("six randomized wax and squish design themes are styled", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  for (const design of ["sunny", "berry", "mint", "grape", "mango", "marble"]) {
    assert.match(css, new RegExp(`\\[data-design="${design}"\\]`));
  }
});
