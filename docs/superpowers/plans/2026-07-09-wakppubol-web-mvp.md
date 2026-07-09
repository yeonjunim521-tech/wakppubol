# Wakppubol Web MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first web MVP of "왁뿌볼": a mobile-first click/tap ASMR toy where one wax-coated ball cracks, breaks, reveals a squishy inside, and can be reset for repeat play.

**Architecture:** Use a static web app with one HTML page, one CSS file, and one JavaScript module. Keep the game state as small pure functions in `app.js` so Node's built-in test runner can verify the core logic without a browser. Use DOM code only for rendering, pointer interaction, simple sound playback, and local session feedback.

**Tech Stack:** HTML, CSS, vanilla JavaScript ES modules, Node.js built-in `node:test`, static hosting.

## Global Constraints

- Build A안 only: "click ASMR toy MVP"; B안 collection mode and C안 score/ranking mode are future phases and must not be implemented now.
- No framework, no bundler, no server, no login, no database, no payments.
- Mobile portrait is the primary layout; desktop should show the same experience centered at a comfortable width.
- Input is mouse click and mobile tap through Pointer Events.
- Monetization in MVP is ad space only: bottom banner slot and reset-area ad slot. Do not add live ad network scripts until the user supplies an approved account and publisher code.
- Sound assets must be commercial-use and no-attribution: Pixabay, Mixkit, or Freesound CC0 only. Do not use CC-BY, CC-NC, or free ZapSplat assets.
- Keep code short and direct. Add helper functions only when they reduce duplicated state or keep browser code from mixing with pure game rules.
- Update `progress.html` in Korean when the implementation reaches a new visible stage.
- Current workspace is not a git repository. Initialize git at the start of implementation if `git status` fails.

---

## File Structure

- Create: `index.html`
  - App shell, visible Korean UI text, one ball button, reset button, ad slots, sound notice.
- Create: `styles.css`
  - Mobile-first layout, ball visuals, crack stages, broken state, squish state, ad slot styling.
- Create: `app.js`
  - Pure state functions exported for tests.
  - Browser initialization guarded by `typeof document !== "undefined"`.
  - Pointer handling, render updates, sound playback, session event logging.
- Create: `tests/game-state.test.mjs`
  - Node built-in tests for crack progression, break transition, squish clicks, and reset behavior.
- Create: `assets/sounds/`
  - `crack-1.mp3`, `crack-2.mp3`, `squish-1.mp3` after license-safe sourcing.
- Create: `assets/sounds/SOURCES.md`
  - Exact source URL and license note for each committed sound file.
- Modify: `progress.html`
  - Korean progress board should say implementation plan exists, then implementation status in the next session.

---

### Task 0: Project Guardrails

**Files:**
- Modify: none

**Interfaces:**
- Consumes: current workspace path `C:\Users\giro0\Desktop\Codex\project\왁뿌볼`
- Produces: a git-tracked workspace ready for small commits

- [ ] **Step 1: Check repository status**

Run:

```bash
git status --short --branch
```

Expected if git is not initialized:

```text
fatal: not a git repository (or any of the parent directories): .git
```

- [ ] **Step 2: Initialize git if the previous command failed**

Run:

```bash
git init
git status --short --branch
```

Expected:

```text
## No commits yet on main
```

- [ ] **Step 3: Create required directories**

Run:

```bash
mkdir -p tests assets/sounds
```

Expected: command exits 0.

- [ ] **Step 4: Commit existing planning artifacts if they are uncommitted**

Run:

```bash
git add progress.html docs/superpowers/plans/2026-07-09-wakppubol-web-mvp.md
git commit -m "docs: add wakppubol mvp plan"
```

Expected: a commit is created. If the files are already committed, `git status --short` should be clean and this step can be recorded as already satisfied.

---

### Task 1: Pure Game State

**Files:**
- Create: `tests/game-state.test.mjs`
- Create: `app.js`

**Interfaces:**
- Produces: `MAX_CRACKS: number`
- Produces: `createGame(now?: number): GameState`
- Produces: `clickWax(game: GameState, now?: number): GameState`
- Produces: `clickSquish(game: GameState): GameState`
- Produces: `resetGame(previous?: GameState, now?: number): GameState`
- Produces: `getCrackLevel(game: GameState): number`

`GameState` is a plain object:

```js
{
  phase: "wax" | "squish",
  cracks: number,
  squishCount: number,
  plays: number,
  startedAt: number,
  brokenAt: number | null
}
```

- [ ] **Step 1: Write failing tests**

Create `tests/game-state.test.mjs`:

```js
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
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
node --test tests/game-state.test.mjs
```

Expected: FAIL because `../app.js` or the named exports do not exist.

- [ ] **Step 3: Implement minimal state functions**

Create `app.js`:

```js
export const MAX_CRACKS = 7;

export function createGame(now = Date.now()) {
  return {
    phase: "wax",
    cracks: 0,
    squishCount: 0,
    plays: 0,
    startedAt: now,
    brokenAt: null,
  };
}

export function clickWax(game, now = Date.now()) {
  if (game.phase === "squish") return game;

  const cracks = Math.min(MAX_CRACKS, game.cracks + 1);
  const isBroken = cracks >= MAX_CRACKS;

  return {
    ...game,
    cracks,
    phase: isBroken ? "squish" : "wax",
    brokenAt: isBroken ? now : game.brokenAt,
  };
}

export function clickSquish(game) {
  if (game.phase !== "squish") return game;

  return {
    ...game,
    squishCount: game.squishCount + 1,
  };
}

export function resetGame(previous = createGame(), now = Date.now()) {
  return {
    ...createGame(now),
    plays: previous.plays + 1,
  };
}

export function getCrackLevel(game) {
  return Math.min(5, Math.floor((game.cracks / MAX_CRACKS) * 5));
}

export function initApp() {
}

if (typeof document !== "undefined") {
  initApp();
}
```

- [ ] **Step 4: Run tests and verify pass**

Run:

```bash
node --test tests/game-state.test.mjs
```

Expected: PASS for all six tests.

- [ ] **Step 5: Commit**

Run:

```bash
git add app.js tests/game-state.test.mjs
git commit -m "test: add wakppubol state rules"
```

Expected: commit created.

---

### Task 2: Mobile-First Static UI

**Files:**
- Create: `index.html`
- Create: `styles.css`

**Interfaces:**
- Consumes: `app.js` through `<script type="module" src="./app.js"></script>`
- Produces: DOM elements selected by `data-ball`, `data-reset`, `data-status`, `data-counter`, and `data-app`

- [ ] **Step 1: Create the HTML shell**

Create `index.html`:

```html
<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="클릭해서 왁스가 빠각 깨지는 왁뿌볼 웹 ASMR">
  <title>왁뿌볼</title>
  <link rel="stylesheet" href="./styles.css">
</head>
<body>
  <main class="app" data-app>
    <section class="stage" aria-labelledby="title">
      <p class="eyebrow">웹으로 부수는 ASMR</p>
      <h1 id="title">왁뿌볼</h1>
      <p class="status" data-status>클릭해서 왁스를 깨보세요</p>

      <button class="ball" type="button" data-ball aria-label="왁뿌볼 누르기">
        <span class="wax"></span>
        <span class="crack c1"></span>
        <span class="crack c2"></span>
        <span class="crack c3"></span>
        <span class="crack c4"></span>
        <span class="inside"></span>
        <span class="burst" aria-hidden="true">빠각!</span>
      </button>

      <p class="counter" data-counter>0 / 7</p>
    </section>

    <section class="actions" aria-label="다시하기와 광고">
      <button class="reset" type="button" data-reset>다시하기</button>
      <div class="ad ad-inline" aria-label="광고 영역">광고 영역</div>
    </section>

    <div class="ad ad-bottom" aria-label="하단 광고 영역">하단 광고 영역</div>
  </main>
  <script type="module" src="./app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create responsive styles**

Create `styles.css`:

```css
:root {
  color-scheme: light;
  --paper: #fff8e8;
  --ink: #201c17;
  --muted: #70685d;
  --mint: #9be7ce;
  --coral: #ff7a68;
  --lemon: #f7df5d;
  --wax: #ffb4cf;
  --wax-shadow: #e8699d;
  --inside: #8bd6ff;
}

* {
  box-sizing: border-box;
}

html,
body {
  min-height: 100%;
}

body {
  margin: 0;
  background: radial-gradient(circle at 50% 0%, #fff 0 22%, var(--paper) 58%, #f1ead6 100%);
  color: var(--ink);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

button {
  font: inherit;
}

.app {
  min-height: 100dvh;
  width: min(100%, 460px);
  margin: 0 auto;
  padding: 22px 16px 86px;
  display: grid;
  grid-template-rows: 1fr auto auto;
  gap: 18px;
}

.stage {
  display: grid;
  align-content: center;
  justify-items: center;
  text-align: center;
  min-height: 520px;
}

.eyebrow {
  margin: 0 0 6px;
  color: var(--muted);
  font-weight: 700;
}

h1 {
  margin: 0;
  font-size: clamp(44px, 16vw, 76px);
  line-height: 0.95;
  letter-spacing: 0;
}

.status {
  min-height: 28px;
  margin: 14px 0 24px;
  color: var(--muted);
  font-weight: 700;
}

.ball {
  position: relative;
  width: min(76vw, 310px);
  aspect-ratio: 1;
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transform: scale(var(--press, 1));
  transition: transform 90ms ease;
}

.ball:active {
  --press: 0.96;
}

.wax,
.inside {
  position: absolute;
  inset: 0;
  border-radius: 50%;
}

.wax {
  background:
    radial-gradient(circle at 35% 28%, #fff4fb 0 9%, transparent 10%),
    radial-gradient(circle at 62% 64%, #ffcce0 0 18%, transparent 19%),
    linear-gradient(145deg, var(--wax), var(--wax-shadow));
  box-shadow:
    inset -18px -22px 32px rgb(130 44 84 / 0.22),
    0 18px 38px rgb(79 58 33 / 0.24);
  transition: opacity 160ms ease, transform 140ms ease;
}

.inside {
  opacity: 0;
  background:
    radial-gradient(circle at 36% 28%, #ecfbff 0 10%, transparent 11%),
    linear-gradient(145deg, var(--inside), var(--mint));
  box-shadow:
    inset -14px -16px 24px rgb(28 94 115 / 0.22),
    0 16px 30px rgb(60 115 120 / 0.22);
  transform: scale(0.78);
  transition: opacity 180ms ease, transform 160ms ease;
}

.crack {
  position: absolute;
  width: 5px;
  height: 82px;
  border-radius: 999px;
  background: #5b2840;
  opacity: 0;
  transform-origin: center;
}

.c1 { top: 22%; left: 51%; transform: rotate(16deg); }
.c2 { top: 36%; left: 35%; height: 58px; transform: rotate(-38deg); }
.c3 { top: 42%; right: 30%; height: 70px; transform: rotate(44deg); }
.c4 { bottom: 25%; left: 48%; height: 54px; transform: rotate(-6deg); }

.burst {
  position: absolute;
  left: 50%;
  top: 12%;
  translate: -50% 0;
  padding: 8px 13px;
  border: 2px solid var(--ink);
  background: var(--lemon);
  border-radius: 999px;
  font-weight: 900;
  opacity: 0;
  transform: scale(0.8) rotate(-8deg);
}

.counter {
  min-height: 24px;
  margin: 20px 0 0;
  font-weight: 800;
}

[data-crack-level="1"] .c1,
[data-crack-level="2"] .c1,
[data-crack-level="2"] .c2,
[data-crack-level="3"] .c1,
[data-crack-level="3"] .c2,
[data-crack-level="3"] .c3,
[data-crack-level="4"] .c1,
[data-crack-level="4"] .c2,
[data-crack-level="4"] .c3,
[data-crack-level="4"] .c4,
[data-crack-level="5"] .crack {
  opacity: 0.9;
}

[data-phase="squish"] .wax {
  opacity: 0.16;
  transform: scale(1.08) rotate(8deg);
}

[data-phase="squish"] .inside {
  opacity: 1;
  transform: scale(var(--squish-scale, 1));
}

[data-phase="squish"] .burst {
  animation: burst 520ms ease both;
}

.actions {
  display: grid;
  gap: 10px;
}

.reset {
  min-height: 48px;
  border: 2px solid var(--ink);
  border-radius: 12px;
  background: var(--mint);
  color: var(--ink);
  font-weight: 900;
  cursor: pointer;
}

.ad {
  min-height: 48px;
  display: grid;
  place-items: center;
  border: 1px dashed #b9ab91;
  background: rgb(255 255 255 / 0.72);
  color: #7a705f;
  font-size: 13px;
}

.ad-bottom {
  position: fixed;
  left: 50%;
  bottom: 10px;
  width: min(calc(100% - 24px), 436px);
  translate: -50% 0;
}

@keyframes burst {
  0% { opacity: 0; transform: scale(0.74) rotate(-8deg); }
  35% { opacity: 1; transform: scale(1.12) rotate(4deg); }
  100% { opacity: 0; transform: scale(1) translateY(-18px); }
}

@media (min-width: 700px) {
  .app {
    padding-top: 30px;
  }
}
```

- [ ] **Step 3: Smoke test the static shell**

Run:

```bash
python -m http.server 4173
```

Open:

```text
http://localhost:4173/
```

Expected: a centered mobile-width page with title "왁뿌볼", a large pink ball, `다시하기`, one inline ad area, and one fixed bottom ad area.

- [ ] **Step 4: Commit**

Run:

```bash
git add index.html styles.css
git commit -m "feat: add wakppubol static shell"
```

Expected: commit created.

---

### Task 3: Pointer Interaction and Rendering

**Files:**
- Modify: `app.js`

**Interfaces:**
- Consumes: DOM elements from `index.html`
- Consumes: state functions from Task 1
- Produces: visible crack levels through `data-crack-level`
- Produces: visible phase through `data-phase`

- [ ] **Step 1: Add browser rendering code**

Replace the empty `initApp()` in `app.js` with this implementation. Keep the pure exports from Task 1 unchanged.

```js
const messages = {
  wax: ["파삭", "빠각", "오도독", "쩌적"],
  squish: ["말랑", "꾹", "물컹"],
  broken: "빠각!",
};

function pick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function logEvent(type, data = {}) {
  console.info("wakppubol", { type, ...data });
}

function formatCounter(game) {
  if (game.phase === "squish") return `말랑 ${game.squishCount}번`;
  return `${game.cracks} / ${MAX_CRACKS}`;
}

export function initApp(root = document) {
  const app = root.querySelector("[data-app]");
  const ball = root.querySelector("[data-ball]");
  const reset = root.querySelector("[data-reset]");
  const status = root.querySelector("[data-status]");
  const counter = root.querySelector("[data-counter]");

  if (!app || !ball || !reset || !status || !counter) return;

  let game = createGame();

  function render(message = "클릭해서 왁스를 깨보세요") {
    app.dataset.phase = game.phase;
    app.dataset.crackLevel = String(getCrackLevel(game));
    ball.style.setProperty("--squish-scale", game.squishCount % 2 === 0 ? "1" : "0.93");
    status.textContent = message;
    counter.textContent = formatCounter(game);
  }

  function pressBall() {
    if (game.phase === "wax") {
      const before = game.phase;
      game = clickWax(game);
      const justBroken = before === "wax" && game.phase === "squish";
      render(justBroken ? messages.broken : pick(messages.wax));
      logEvent(justBroken ? "break" : "crack", { cracks: game.cracks });
      return;
    }

    game = clickSquish(game);
    render(pick(messages.squish));
    logEvent("squish", { squishCount: game.squishCount });
  }

  function resetBall() {
    game = resetGame(game);
    render("새 왁뿌볼 준비");
    logEvent("reset", { plays: game.plays });
  }

  ball.addEventListener("pointerdown", pressBall);
  reset.addEventListener("click", resetBall);
  render();
}
```

After replacement, the bottom of `app.js` should still be:

```js
if (typeof document !== "undefined") {
  initApp();
}
```

- [ ] **Step 2: Run state tests**

Run:

```bash
node --test tests/game-state.test.mjs
```

Expected: PASS for all tests.

- [ ] **Step 3: Manual interaction smoke test**

Run:

```bash
python -m http.server 4173
```

Open:

```text
http://localhost:4173/
```

Expected:
- Clicking the ball increases the counter from `0 / 7` to `7 / 7`.
- Cracks visibly appear before the break.
- On the seventh click, the inside blue-green squish layer appears.
- After the break, more clicks change the counter to `말랑 1번`, `말랑 2번`, and so on.
- `다시하기` resets the ball to the wax phase.

- [ ] **Step 4: Commit**

Run:

```bash
git add app.js
git commit -m "feat: add wakppubol click interaction"
```

Expected: commit created.

---

### Task 4: License-Safe Sound Assets

**Files:**
- Create: `assets/sounds/crack-1.mp3`
- Create: `assets/sounds/crack-2.mp3`
- Create: `assets/sounds/squish-1.mp3`
- Create: `assets/sounds/SOURCES.md`
- Modify: `app.js`

**Interfaces:**
- Consumes: `playSound(kind)` from browser event handlers
- Produces: three no-attribution sound files committed with exact source evidence

- [ ] **Step 1: Search only approved sound sources**

Use these searches in order:

```text
https://pixabay.com/sound-effects/search/crack/
https://pixabay.com/sound-effects/search/crunch/
https://pixabay.com/sound-effects/search/plastic%20crack/
https://pixabay.com/sound-effects/search/squish/
https://mixkit.co/free-sound-effects/crack/
https://mixkit.co/free-sound-effects/pop/
https://mixkit.co/free-sound-effects/squish/
https://freesound.org/search/?q=crack
https://freesound.org/search/?q=squish
```

Selection rules:
- Prefer Pixabay first, then Mixkit, then Freesound CC0.
- Freesound files must show CC0 on the individual file page.
- Do not use files that require attribution.
- Do not use NonCommercial files.
- Do not use any file if the individual file page and license page disagree.

- [ ] **Step 2: Save selected files using fixed names**

Save the chosen files as:

```text
assets/sounds/crack-1.mp3
assets/sounds/crack-2.mp3
assets/sounds/squish-1.mp3
```

Expected:
- `crack-1.mp3` is a short light crackle.
- `crack-2.mp3` is a stronger break or crunch.
- `squish-1.mp3` is a soft press, pop, or slime-like squish.

- [ ] **Step 3: Record source evidence**

Create `assets/sounds/SOURCES.md` with one bullet per actual file. Each bullet must include the committed filename, actual asset title, actual source page URL, actual license page URL, and the exact reason it qualifies for commercial no-attribution use.

Do not commit `assets/sounds/SOURCES.md` while any bullet lacks a concrete URL. If a selected file is from Freesound, the bullet must include the file page's visible CC0 license label.

- [ ] **Step 4: Add sound playback code**

Add this block above `export function initApp` in `app.js`:

```js
const soundPaths = {
  crack: ["./assets/sounds/crack-1.mp3"],
  break: ["./assets/sounds/crack-2.mp3"],
  squish: ["./assets/sounds/squish-1.mp3"],
};

function playSound(kind) {
  const paths = soundPaths[kind];
  if (!paths) return;

  const audio = new Audio(pick(paths));
  audio.volume = kind === "squish" ? 0.55 : 0.72;
  audio.play().catch(() => {
  });
}
```

Then update `pressBall()` inside `initApp`:

```js
  function pressBall() {
    if (game.phase === "wax") {
      const before = game.phase;
      game = clickWax(game);
      const justBroken = before === "wax" && game.phase === "squish";
      playSound(justBroken ? "break" : "crack");
      render(justBroken ? messages.broken : pick(messages.wax));
      logEvent(justBroken ? "break" : "crack", { cracks: game.cracks });
      return;
    }

    game = clickSquish(game);
    playSound("squish");
    render(pick(messages.squish));
    logEvent("squish", { squishCount: game.squishCount });
  }
```

- [ ] **Step 5: Run tests**

Run:

```bash
node --test tests/game-state.test.mjs
```

Expected: PASS. The tests run in Node and do not call `playSound()`.

- [ ] **Step 6: Manual sound QA**

Run:

```bash
python -m http.server 4173
```

Open:

```text
http://localhost:4173/
```

Expected:
- First user click can play sound because it is triggered by a pointer event.
- Pre-break clicks play the lighter crack sound.
- Break click plays the stronger break sound.
- Squish clicks play the soft squish sound.
- If a browser blocks a sound once, clicking again should not break the UI.

- [ ] **Step 7: Commit**

Run:

```bash
git add app.js assets/sounds
git commit -m "feat: add wakppubol sound effects"
```

Expected: commit created only after `assets/sounds/SOURCES.md` contains exact source evidence for every sound file.

---

### Task 5: Ad Slots, Local Repeat Signals, and Copy Polish

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `app.js`

**Interfaces:**
- Consumes: reset flow from Task 3
- Produces: ad-ready DOM slots with stable dimensions
- Produces: local session signals in `console.info` for reset, crack, break, and squish events

- [ ] **Step 1: Verify ad slots are fixed and nonblocking**

Inspect `index.html` and `styles.css`. The implementation is correct when:
- `.ad-inline` is near `다시하기`.
- `.ad-bottom` is fixed at the bottom.
- Both slots have stable height before any ad script exists.
- The ball is still fully clickable on a 390px wide mobile viewport.

- [ ] **Step 2: Keep visible copy short**

Use these exact visible Korean strings:

```text
웹으로 부수는 ASMR
왁뿌볼
클릭해서 왁스를 깨보세요
다시하기
광고 영역
하단 광고 영역
```

Do not add tutorial paragraphs, feature explanations, or long onboarding text.

- [ ] **Step 3: Confirm local repeat signals**

The `logEvent()` calls in `app.js` should emit:

```text
wakppubol { type: "crack", cracks: number }
wakppubol { type: "break", cracks: 7 }
wakppubol { type: "squish", squishCount: number }
wakppubol { type: "reset", plays: number }
```

These console events are the MVP hook for later analytics. Do not add a third-party analytics script in this task.

- [ ] **Step 4: Manual ad layout QA**

Run:

```bash
python -m http.server 4173
```

Open:

```text
http://localhost:4173/
```

Expected:
- The bottom ad area does not cover the reset button.
- The inline ad area appears below `다시하기`.
- On desktop, the page remains centered and does not stretch into a wide game board.

- [ ] **Step 5: Commit**

Run:

```bash
git add index.html styles.css app.js
git commit -m "feat: prepare wakppubol ad slots"
```

Expected: commit created if any file changed.

---

### Task 6: Final Verification and Progress Board

**Files:**
- Modify: `progress.html`

**Interfaces:**
- Consumes: complete static app
- Produces: verified local URL and Korean progress status

- [ ] **Step 1: Run automated tests**

Run:

```bash
node --test tests/game-state.test.mjs
```

Expected: PASS.

- [ ] **Step 2: Start local preview**

Run:

```bash
python -m http.server 4173
```

Open:

```text
http://localhost:4173/
```

Expected: app loads without console errors except ordinary browser audio warnings caused by autoplay policy before user input.

- [ ] **Step 3: Mobile viewport manual QA**

Use a 390px by 844px viewport.

Expected:
- Ball fits without clipping.
- Text does not overlap.
- Seven taps break the wax.
- Squish taps continue after break.
- Reset starts a new wax ball.
- Bottom ad area is visible and does not block the ball or reset button.

- [ ] **Step 4: Desktop viewport manual QA**

Use a 1280px by 800px viewport.

Expected:
- App remains centered with mobile-like width.
- Mouse clicks behave the same as taps.
- Ad slots stay aligned with the app width.

- [ ] **Step 5: Update Korean progress board**

Modify `progress.html` so it says:

```text
현재 단계: MVP 로컬 구현 완료
확인된 상태: 순수 HTML/CSS/JS 정적 웹앱이 로컬에서 실행됩니다.
핵심 방향: 클릭해서 왁스가 깨지고, 깨진 뒤 말랑이를 계속 누를 수 있습니다.
다음 질문: 배포 전 실제 광고 계정, 도메인, 분석 도구를 정합니다.
대기 중: 정적 호스팅 배포, 광고 계정 연결, 실제 사용자 반응 확인
```

- [ ] **Step 6: Commit**

Run:

```bash
git add progress.html
git commit -m "docs: update wakppubol progress board"
```

Expected: commit created.

- [ ] **Step 7: Final implementation handoff**

Run:

```bash
git status --short
```

Expected: clean working tree. If sound files are still untracked, do not claim the sound task is complete.

Final handoff must include:
- Local preview URL.
- Test command and result.
- Manual QA summary for mobile and desktop.
- Sound asset source summary.
- Any pre-existing issue left alone.

---

## Future Phase Notes

B안 collection mode should start only after the A안 MVP is playable and repeat behavior is observed. Add 3 ball variants, but keep the same state machine.

C안 score/ranking mode should start only after there is evidence that users replay the toy. Add score, timer, and leaderboard only when a server or managed backend is deliberately chosen.

## Self-Review Checklist

- Spec coverage: The plan covers A안 click ASMR toy, mobile-first layout, no framework, no server, no live ads, no-attribution sounds, reset flow, repeat-play signals, and static hosting readiness.
- Scope control: The plan excludes login, ranking, collection mode, score mode, payments, server code, and live ad scripts.
- Test coverage: Pure game state has automated tests. Browser rendering, sound, and layout have manual QA gates because this static project has no browser test dependency.
- Ambiguity check: Sound asset selection is constrained by exact allowed source types and fixed committed filenames. Live ad network integration is explicitly out of scope.
