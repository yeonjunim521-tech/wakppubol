# Realistic Wax Break and ASMR Audio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 왁뿌볼의 7단계 파손을 SVG 기반으로 정교화하고, CC0 실제 파열 샘플과 Web Audio 합성음을 혼합한 자연스러운 ASMR 피드백을 제공한다.

**Architecture:** 현재 정적 HTML/CSS/JS 구조를 유지한다. 상태 로직과 오디오 선택 로직은 테스트 가능한 순수 함수로 분리하고, SVG 균열·파편은 기존 `data-cracks` 상태와 터치 좌표 CSS 변수로 제어한다. 실제 샘플이 준비되지 않거나 디코딩에 실패하면 합성음으로 자동 대체한다.

**Tech Stack:** HTML5, CSS, inline SVG, ES modules, Web Audio API, Node.js built-in test runner

## Global Constraints

- 기존 7회 터치 후 내부 말랑이가 드러나는 흐름을 유지한다.
- CC0 또는 명확한 Public Domain 음원만 저장소에 포함한다.
- 외부 YouTube 음원을 추출하거나 복제하지 않는다.
- 모바일 pointer 입력, 키보드 Enter/Space, `prefers-reduced-motion`을 유지한다.
- 음원 실패가 게임 상태와 그래픽 진행을 막지 않아야 한다.
- 새로운 런타임 프레임워크나 서버 의존성을 추가하지 않는다.

---

## File Map

- `index.html`: SVG fracture layer, impact layer, shell fragment markup
- `styles.css`: wax microtexture, staged SVG crack reveal, fragment motion, impact-position styling
- `app.js`: pointer normalization, render state, audio preload and playback orchestration
- `audio.js`: pure sample-selection helpers and Web Audio sample bank
- `test/game.test.js`: game progression and pointer normalization tests
- `test/audio.test.js`: sample selection and fallback decision tests
- `assets/audio/*.wav`: short mono CC0/Public Domain source samples
- `assets/audio/LICENSES.md`: source URL, creator, license, verification date

### Task 1: Add a zero-dependency test harness and pure interaction helpers

**Files:**
- Create: `package.json`
- Create: `test/game.test.js`
- Modify: `app.js`

**Interfaces:**
- Produces: `normalizePointer(clientX, clientY, rect) -> { x: number, y: number }`
- Produces: existing `createGame`, `clickWax`, `clickSquish`, `getCrackLevel`

- [ ] **Step 1: Write failing state and pointer tests**

Create `package.json`:

```json
{
  "name": "wakppubol",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
```

Create `test/game.test.js`:

```js
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
```

- [ ] **Step 2: Run tests and verify the new helper test fails**

Run: `npm test`

Expected: FAIL because `normalizePointer` is not exported.

- [ ] **Step 3: Add the minimal pointer helper**

Add to `app.js`:

```js
export function normalizePointer(clientX, clientY, rect) {
  const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
  const y = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
  return { x: Math.round(x), y: Math.round(y) };
}
```

Before `pressBall()` changes state, call the helper for pointer events and set:

```js
ball.style.setProperty("--impact-x", `${point.x}%`);
ball.style.setProperty("--impact-y", `${point.y}%`);
```

- [ ] **Step 4: Run tests**

Run: `npm test`

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add package.json test/game.test.js app.js
git commit -m "test: cover wax progression and pointer position"
```

### Task 2: Replace flat crack lines with staged SVG fractures and fragments

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Test: `test/game.test.js`

**Interfaces:**
- Consumes: `data-cracks="0..7"`, `data-crack-level="0..5"`, `--impact-x`, `--impact-y`
- Produces: `.fracture-svg`, `.fracture-path[data-stage]`, `.wax-fragment[data-stage]`, `.impact-bloom`

- [ ] **Step 1: Add a failing static contract test**

Append to `test/game.test.js`:

```js
import { readFile } from "node:fs/promises";

test("markup exposes staged SVG fracture and fragment layers", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /class="fracture-svg"/);
  assert.match(html, /data-stage="7"/);
  assert.match(html, /class="impact-bloom"/);
});
```

- [ ] **Step 2: Run the test and verify failure**

Run: `npm test`

Expected: FAIL because `.fracture-svg` is absent.

- [ ] **Step 3: Add SVG layers**

Inside `[data-ball]`, add an inline SVG with a `0 0 100 100` viewBox. Define at least eight irregular paths grouped into stages 1 through 6, and eight polygon fragments assigned to stages 4 through 7. Add `<span class="impact-bloom">`.

Each fracture path must use `vector-effect="non-scaling-stroke"` and `pathLength="1"` so CSS can animate a normalized dash.

- [ ] **Step 4: Implement staged material styling**

In `styles.css`:

- Set default `--impact-x: 50%` and `--impact-y: 50%`.
- Add two microtexture layers: irregular 1–3 px wax bloom and subtle translucent grain.
- Style fracture paths with a dark core plus a warm bright edge using duplicated SVG path classes or drop shadows.
- Reveal `[data-stage]` at matching `data-cracks` values with opacity and `stroke-dashoffset`.
- Reveal fragments from stages 4–7 with distinct translate/rotate values.
- Make `.impact-bloom` originate from `var(--impact-x) var(--impact-y)`.
- Under reduced motion, remove fragment travel but preserve final visibility.

- [ ] **Step 5: Run tests and manually inspect states**

Run: `npm test`

Expected: all tests pass.

Manual: open `index.html`, press 1–7 times, verify each state is visibly distinct and the seventh reveals the inner ball.

- [ ] **Step 6: Commit**

```bash
git add index.html styles.css test/game.test.js
git commit -m "feat: add staged SVG wax fractures"
```

### Task 3: Add deterministic audio selection and synthesized fallback

**Files:**
- Create: `audio.js`
- Create: `test/audio.test.js`
- Modify: `app.js`

**Interfaces:**
- Produces: `AUDIO_MANIFEST`
- Produces: `selectSample(kind, crackCount, randomValue) -> string | null`
- Produces: `createAudioEngine() -> { preload(): Promise<void>, play(kind, crackCount): void }`
- Consumes: kinds `"crack" | "break" | "squish"`

- [ ] **Step 1: Write failing audio policy tests**

Create `test/audio.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { AUDIO_MANIFEST, selectSample } from "../audio.js";

test("every recorded sample is a local asset", () => {
  for (const paths of Object.values(AUDIO_MANIFEST)) {
    for (const path of paths) assert.match(path, /^\.\/assets\/audio\//);
  }
});

test("early and late cracks use different banks", () => {
  assert.notEqual(selectSample("crack", 1, 0), selectSample("crack", 6, 0));
});

test("selection clamps a random value at the upper boundary", () => {
  const selected = selectSample("break", 7, 1);
  assert.equal(selected, AUDIO_MANIFEST.break.at(-1));
});

test("squish intentionally uses synthesized audio only", () => {
  assert.equal(selectSample("squish", 0, 0.5), null);
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test`

Expected: FAIL because `audio.js` does not exist.

- [ ] **Step 3: Implement the manifest and pure selector**

Create `audio.js` with three manifest banks: `crackEarly`, `crackLate`, and `break`. Implement selection with `Math.min(length - 1, Math.floor(randomValue * length))`. Return null for squish.

Implement `createAudioEngine` so it:

- fetches and decodes each manifest file during `preload()`;
- stores successful buffers in a Map;
- catches individual fetch/decode failures;
- creates one master gain and dynamics compressor;
- plays a randomly selected buffer with playback rate 0.94–1.06;
- layers the existing synthesized crack or break transient;
- plays synthesis alone if the selected buffer is unavailable.

- [ ] **Step 4: Replace direct audio calls in app.js**

Create one audio engine in `initApp`, call `preload()` without blocking rendering, and replace `playSound(kind)` with `audio.play(kind, game.cracks)`.

- [ ] **Step 5: Run tests**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add audio.js app.js test/audio.test.js
git commit -m "feat: add hybrid ASMR audio engine"
```

### Task 4: Add verified CC0 assets and license record

**Files:**
- Create: `assets/audio/crack-early-1.wav`
- Create: `assets/audio/crack-early-2.wav`
- Create: `assets/audio/crack-late-1.wav`
- Create: `assets/audio/crack-late-2.wav`
- Create: `assets/audio/break-1.wav`
- Create: `assets/audio/break-2.wav`
- Create: `assets/audio/LICENSES.md`
- Modify: `audio.js`

**Interfaces:**
- Consumes: manifest paths from Task 3
- Produces: local mono WAV files and auditable license metadata

- [ ] **Step 1: Select source files**

Use only sources whose individual asset page explicitly states CC0 1.0 or Public Domain. Record the source page before downloading. Reject search-result summaries and unclear site-wide claims.

- [ ] **Step 2: Normalize short clips**

Trim silence, remove DC offset, fade the final 5–15 ms, convert to mono, and keep each clip under 500 ms. Do not normalize so aggressively that the transient clips.

- [ ] **Step 3: Write the license manifest**

For every file include:

```md
## crack-early-1.wav

- Source page: https://...
- Original title: ...
- Creator: ...
- License: CC0 1.0 Universal
- License URL: https://creativecommons.org/publicdomain/zero/1.0/
- Verified: 2026-07-10
- Edits: trimmed, mono conversion, short fade
```

- [ ] **Step 4: Verify paths and audio decoding**

Run: `npm test`

Expected: all tests pass.

Serve locally and verify the Network panel returns HTTP 200 for all six audio assets and no decode errors appear.

- [ ] **Step 5: Commit**

```bash
git add assets/audio audio.js
git commit -m "assets: add documented CC0 wax break sounds"
```

### Task 5: Final browser and regression verification

**Files:**
- Modify only files needed to fix discovered defects

**Interfaces:**
- Consumes: completed graphic and audio implementation
- Produces: verified release candidate on `master`

- [ ] **Step 1: Run automated verification**

Run: `npm test`

Expected: all tests pass with no warnings.

- [ ] **Step 2: Verify desktop interaction**

At 1440×900, press the ball seven times. Confirm staged cracks, touch-centered bloom, fragment separation, final inner ball reveal, sample variation, and reset.

- [ ] **Step 3: Verify mobile interaction**

At 390×844 with touch emulation, confirm one state transition per tap, no 300 ms delay, no page zoom, no clipped fragments, and audible feedback after the first gesture.

- [ ] **Step 4: Verify failure fallback**

Temporarily request one nonexistent asset path and confirm the press still advances, graphics render, and synthesized fallback plays. Restore the valid path before committing.

- [ ] **Step 5: Verify accessibility**

Confirm Enter and Space activate once, focus remains visible, screen-reader status updates, and reduced-motion removes travel animation without hiding fracture state.

- [ ] **Step 6: Commit verification fixes if required**

```bash
git add index.html styles.css app.js audio.js test assets/audio
git commit -m "fix: finalize wax break feedback QA"
```
