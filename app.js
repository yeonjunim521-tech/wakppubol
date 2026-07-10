import { createAudioEngine } from "./audio.js";

export const MAX_CRACKS = 7;
export const MAX_SQUISHES = 5;

const initialPhase = "wax";
const squishPhase = "squish";

export function createGame(now = Date.now()) {
  return {
    phase: initialPhase,
    cracks: 0,
    squishCount: 0,
    plays: 0,
    startedAt: now,
    brokenAt: null,
  };
}

export function clickWax(game, now = Date.now()) {
  if (game.phase === squishPhase) {
    return game;
  }

  const cracks = Math.min(MAX_CRACKS, game.cracks + 1);
  const isBroken = cracks >= MAX_CRACKS;

  return {
    ...game,
    cracks,
    phase: isBroken ? squishPhase : initialPhase,
    brokenAt: isBroken ? now : game.brokenAt,
  };
}

export function clickSquish(game, now = Date.now()) {
  if (game.phase !== squishPhase) {
    return game;
  }

  const squishCount = game.squishCount + 1;
  if (squishCount >= MAX_SQUISHES) {
    return resetGame(game, now);
  }

  return {
    ...game,
    squishCount,
  };
}

export function resetGame(previous = createGame(), now = Date.now()) {
  return {
    ...createGame(now),
    plays: previous.plays + 1,
  };
}

export function getCrackLevel(game) {
  if (game.cracks === 0) {
    return 0;
  }

  return Math.min(5, Math.ceil((game.cracks / MAX_CRACKS) * 5));
}

export function normalizePointer(clientX, clientY, rect) {
  const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
  const y = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
  return { x: Math.round(x), y: Math.round(y) };
}

const messages = {
  wax: ["톡", "빠각", "조금 더", "찌직"],
  squish: ["말랑", "꾸욱", "물컹"],
  broken: "빠각!",
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
    return `말랑 ${game.squishCount} / ${MAX_SQUISHES}`;
  }

  return `${game.cracks} / ${MAX_CRACKS}`;
}

export function initApp(root = document) {
  const app = root.querySelector("[data-app]");
  const ball = root.querySelector("[data-ball]");
  const reset = root.querySelector("[data-reset]");
  const status = root.querySelector("[data-status]");
  const liveStatus = root.querySelector("[data-live-status]");

  if (!app || !ball || !reset || !status) {
    return;
  }

  let game = createGame();
  const audio = createAudioEngine({
    onBlocked: (kind) => logEvent("sound-blocked", { kind }),
  });
  void audio.preload();

  function render(message = "클릭해서 왁스를 깨보세요") {
    app.dataset.phase = game.phase;
    app.dataset.cracks = String(game.cracks);
    app.dataset.crackLevel = String(getCrackLevel(game));
    app.dataset.squishLevel = String(Math.min(game.squishCount, MAX_SQUISHES));
    ball.style.setProperty("--damage", String(game.cracks / MAX_CRACKS));
    ball.style.setProperty("--squish-scale", game.squishCount % 2 === 0 ? "1.03" : "0.9");
    ball.style.setProperty("--squish-tilt", game.squishCount % 2 === 0 ? "-3deg" : "4deg");
    const countText = formatCounter(game);
    status.textContent = message;
    if (liveStatus) {
      liveStatus.textContent = `${message}. ${countText}`;
    }
  }

  function pressBall() {
    if (game.phase === initialPhase) {
      const before = game.phase;
      game = clickWax(game);
      const justBroken = before === initialPhase && game.phase === squishPhase;
      playAudio(audio, justBroken ? "break" : "crack", game.cracks);
      render(justBroken ? messages.broken : pick(messages.wax));
      logEvent(justBroken ? "break" : "crack", { cracks: game.cracks });
      return;
    }

    const before = game.phase;
    game = clickSquish(game);
    playAudio(audio, "squish", game.cracks);
    const autoReset = before === squishPhase && game.phase === initialPhase;
    render(autoReset ? "새 왁뿌볼 준비" : pick(messages.squish));
    logEvent(autoReset ? "auto-reset" : "squish", { squishCount: game.squishCount, plays: game.plays });
  }

  function captureImpact(event) {
    if (event.button !== 0 || event.isPrimary === false) return;
    const point = normalizePointer(event.clientX, event.clientY, ball.getBoundingClientRect());
    ball.style.setProperty("--impact-x", `${point.x}%`);
    ball.style.setProperty("--impact-y", `${point.y}%`);
  }

  function resetBall() {
    game = resetGame(game);
    render("새 왁뿌볼 준비");
    logEvent("reset", { plays: game.plays });
  }

  ball.addEventListener("pointerdown", captureImpact);
  ball.addEventListener("click", (event) => {
    if (event.button === 0) pressBall();
  });
  reset.addEventListener("click", resetBall);
  render();
}

if (typeof document !== "undefined") {
  initApp();
}
