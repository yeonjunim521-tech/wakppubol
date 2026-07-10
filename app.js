import { createAudioEngine } from "./audio.js";
import {
  SURFACE_ZONE_COUNT,
  classifyGesture,
  createSurfaceZones,
  screenPointToLocalVector,
  selectZone,
} from "./surface.js";
import { createWaxRenderer } from "./wax-renderer.js";

export const MAX_CRACKS = SURFACE_ZONE_COUNT;
export const MAX_SQUISHES = 5;
export const DESIGNS = Object.freeze(["sunny", "berry", "mint", "grape", "mango", "marble"]);

const initialPhase = "wax";
const squishPhase = "squish";

export function selectDesign(previous, randomValue = Math.random()) {
  const choices = DESIGNS.filter((design) => design !== previous);
  const index = Math.min(choices.length - 1, Math.max(0, Math.floor(randomValue * choices.length)));
  return choices[index];
}

export function createGame(now = Date.now(), randomValue = Math.random()) {
  return {
    phase: initialPhase,
    cracks: 0,
    brokenZones: [],
    lastHitWasNew: false,
    squishCount: 0,
    completed: false,
    plays: 0,
    startedAt: now,
    brokenAt: null,
    design: selectDesign(null, randomValue),
  };
}

export function hitWaxZone(game, zoneIndex, now = Date.now()) {
  if (game.phase !== initialPhase || game.brokenZones.includes(zoneIndex)) {
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
    phase: isBroken ? squishPhase : initialPhase,
    brokenAt: isBroken ? now : game.brokenAt,
  };
}

export function clickWax(game, now = Date.now()) {
  const zoneIndex = Array.from({ length: MAX_CRACKS }, (_, index) => index)
    .find((index) => !game.brokenZones.includes(index));
  return zoneIndex === undefined ? game : hitWaxZone(game, zoneIndex, now);
}

export function clickSquish(game) {
  if (game.phase !== squishPhase) return game;
  return {
    ...game,
    squishCount: game.squishCount + 1,
    completed: game.squishCount + 1 >= MAX_SQUISHES,
  };
}

export function resetGame(previous = createGame(), now = Date.now(), randomValue = Math.random()) {
  return {
    ...createGame(now, randomValue),
    design: selectDesign(previous.design, randomValue),
    plays: previous.plays + 1,
  };
}

export function getCrackLevel(game) {
  if (game.cracks === 0) return 0;
  return Math.min(5, Math.ceil((game.cracks / MAX_CRACKS) * 5));
}

export function normalizePointer(clientX, clientY, rect) {
  const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
  const y = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
  return { x: Math.round(x), y: Math.round(y) };
}

export function updateRotation(current, delta, size) {
  return {
    yaw: current.yaw + (delta.x / size) * Math.PI,
    pitch: Math.max(
      -Math.PI * 0.42,
      Math.min(Math.PI * 0.42, current.pitch + (delta.y / size) * Math.PI),
    ),
  };
}

const messages = {
  wax: ["다른 곳도 깨보세요", "볼을 돌려 남은 왁스를 찾아보세요", "표면이 조금씩 벗겨지고 있어요"],
  squish: ["부드럽게 눌러보세요", "계속 가지고 놀 수 있어요", "쫀득하게 눌렸어요"],
  broken: "왁스가 모두 벗겨졌어요",
};

function pick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function logEvent(type, data = {}) {
  console.info("wakppubol", { type, ...data });
}

function playAudio(audio, kind, crackCount) {
  try {
    audio.play(kind, crackCount);
  } catch {
    logEvent("sound-blocked", { kind });
  }
}

function formatCounter(game) {
  if (game.phase === squishPhase) {
    return game.completed ? `말랑 ${game.squishCount}` : `말랑 ${game.squishCount} / ${MAX_SQUISHES}`;
  }
  return `깨진 표면 ${game.cracks} / ${MAX_CRACKS}`;
}

export function initApp(root = document) {
  const app = root.querySelector("[data-app]");
  const ball = root.querySelector("[data-ball]");
  const reset = root.querySelector("[data-reset]");
  const status = root.querySelector("[data-status]");
  const liveStatus = root.querySelector("[data-live-status]");
  const waxCanvas = root.querySelector("[data-wax-canvas]");
  if (!app || !ball || !reset || !status) return;

  let game = createGame();
  let showSquish = false;
  let pointer = null;
  let rotation = { yaw: 0, pitch: 0 };
  const zones = createSurfaceZones(MAX_CRACKS);
  const audio = createAudioEngine({
    onBlocked: (kind) => logEvent("sound-blocked", { kind }),
  });
  void audio.preload();
  const waxRenderer = waxCanvas ? createWaxRenderer(waxCanvas) : null;

  function render(message = "짧게 터치해 왁스를 깨고, 드래그해 볼을 돌려보세요") {
    const visualPhase = game.phase === squishPhase && !showSquish ? "breaking" : game.phase;
    app.dataset.phase = visualPhase;
    app.dataset.cracks = String(game.cracks);
    app.dataset.crackLevel = String(getCrackLevel(game));
    app.dataset.squishLevel = String(game.squishCount === 0 ? 0 : ((game.squishCount - 1) % 4) + 1);
    app.dataset.completed = String(game.completed);
    app.dataset.design = game.design;
    ball.style.setProperty("--damage", String(game.cracks / MAX_CRACKS));
    ball.style.setProperty("--squish-scale", game.squishCount % 2 === 0 ? "1.03" : "0.9");
    ball.style.setProperty("--squish-tilt", game.squishCount % 2 === 0 ? "-3deg" : "4deg");
    status.textContent = message;
    if (liveStatus) liveStatus.textContent = `${message}. ${formatCounter(game)}`;
  }

  function pressSquish() {
    if (game.phase !== squishPhase || !showSquish) return;
    game = clickSquish(game);
    playAudio(audio, "squish", game.cracks);
    render(game.completed ? "다시하기를 누르거나 계속 말랑이를 눌러보세요" : pick(messages.squish));
    logEvent(game.completed ? "complete" : "squish", { squishCount: game.squishCount, plays: game.plays });
  }

  function captureImpact(event) {
    const point = normalizePointer(event.clientX, event.clientY, ball.getBoundingClientRect());
    ball.style.setProperty("--impact-x", `${point.x}%`);
    ball.style.setProperty("--impact-y", `${point.y}%`);
    ball.classList.remove("is-impacting");
    void ball.offsetWidth;
    ball.classList.add("is-impacting");
    globalThis.setTimeout(() => ball.classList.remove("is-impacting"), 300);
  }

  function breakAtPoint(clientX, clientY) {
    if (game.phase !== initialPhase) {
      pressSquish();
      return;
    }
    const rect = ball.getBoundingClientRect();
    const localVector = screenPointToLocalVector(
      {
        x: clientX - (rect.left + rect.width / 2),
        y: clientY - (rect.top + rect.height / 2),
      },
      rect.width / 2,
      rotation,
    );
    const zoneIndex = selectZone(zones, localVector);
    game = hitWaxZone(game, zoneIndex);
    if (!game.lastHitWasNew) {
      render("이미 깨진 곳이에요. 볼을 돌려보세요");
      logEvent("repeat-zone", { zoneIndex, cracks: game.cracks });
      return;
    }

    waxRenderer?.breakZone(zoneIndex);
    const justBroken = game.phase === squishPhase;
    playAudio(audio, justBroken ? "break" : "crack", game.cracks);
    render(justBroken ? "남은 왁스가 아래로 떨어지고 있어요" : pick(messages.wax));
    logEvent(justBroken ? "break" : "crack", { cracks: game.cracks, zoneIndex });
    if (justBroken) {
      waxRenderer?.collapse();
      globalThis.setTimeout(() => {
        showSquish = true;
        render(messages.broken);
      }, 320);
    }
  }

  function onPointerDown(event) {
    if (event.button !== 0 || event.isPrimary === false || app.dataset.phase === "breaking") return;
    pointer = {
      id: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
      last: { x: event.clientX, y: event.clientY },
      dragging: false,
    };
    ball.setPointerCapture?.(event.pointerId);
    captureImpact(event);
  }

  function onPointerMove(event) {
    if (!pointer || event.pointerId !== pointer.id || game.phase !== initialPhase) return;
    const current = { x: event.clientX, y: event.clientY };
    if (classifyGesture(pointer.start, current, 8) === "drag") pointer.dragging = true;
    if (pointer.dragging) {
      const rect = ball.getBoundingClientRect();
      rotation = updateRotation(rotation, {
        x: current.x - pointer.last.x,
        y: current.y - pointer.last.y,
      }, rect.width);
      waxRenderer?.setRotation(rotation);
      app.dataset.dragging = "true";
      event.preventDefault();
    }
    pointer.last = current;
  }

  function finishPointer(event, cancelled = false) {
    if (!pointer || event.pointerId !== pointer.id) return;
    const session = pointer;
    pointer = null;
    app.dataset.dragging = "false";
    ball.releasePointerCapture?.(event.pointerId);
    if (cancelled) return;
    const end = { x: event.clientX, y: event.clientY };
    if (classifyGesture(session.start, end, 8) === "tap") {
      captureImpact(event);
      breakAtPoint(event.clientX, event.clientY);
    }
  }

  function resetBall() {
    game = resetGame(game);
    showSquish = false;
    rotation = { yaw: 0, pitch: 0 };
    render("새 왁뿌볼 준비. 짧게 터치하고 드래그해 돌려보세요");
    waxRenderer?.reset();
    logEvent("reset", { plays: game.plays });
  }

  ball.addEventListener("pointerdown", onPointerDown);
  ball.addEventListener("pointermove", onPointerMove);
  ball.addEventListener("pointerup", (event) => finishPointer(event));
  ball.addEventListener("pointercancel", (event) => finishPointer(event, true));
  reset.addEventListener("click", resetBall);
  render();
  waxRenderer?.resize();
  if (typeof ResizeObserver === "function" && waxCanvas) {
    const observer = new ResizeObserver(() => waxRenderer?.resize());
    observer.observe(waxCanvas);
  }
}

if (typeof document !== "undefined") initApp();
