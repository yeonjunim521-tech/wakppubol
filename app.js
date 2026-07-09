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

const messages = {
  wax: ["톡", "빠각", "조금 더", "찌직"],
  squish: ["말랑", "꾸욱", "물컹"],
  broken: "빠각!",
};

let audioContext;

function pick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function logEvent(type, data = {}) {
  console.info("wakppubol", { type, ...data });
}

function formatCounter(game) {
  if (game.phase === squishPhase) {
    return `말랑 ${game.squishCount} / ${MAX_SQUISHES}`;
  }

  return `${game.cracks} / ${MAX_CRACKS}`;
}

function getAudioContext() {
  if (typeof window === "undefined") {
    return null;
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioContextClass();
  }

  return audioContext;
}

function makeNoiseBuffer(context, seconds) {
  const length = Math.max(1, Math.floor(context.sampleRate * seconds));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < length; i += 1) {
    const fade = 1 - i / length;
    data[i] = (Math.random() * 2 - 1) * fade;
  }

  return buffer;
}

function playTone(context, start, frequency, duration, volume, type = "triangle") {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, frequency * 0.42), start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function playFilteredNoise(context, start, duration, volume, frequency) {
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();

  source.buffer = makeNoiseBuffer(context, duration);
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(frequency, start);
  filter.Q.setValueAtTime(7, start);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  source.start(start);
}

function playSound(kind) {
  const context = getAudioContext();
  if (!context) {
    return;
  }

  if (context.state === "suspended") {
    context.resume().catch(() => {
      logEvent("sound-blocked", { kind });
    });
  }

  const now = context.currentTime;
  if (kind === "squish") {
    playTone(context, now, 180, 0.12, 0.12, "sine");
    playTone(context, now + 0.025, 90, 0.15, 0.08, "sine");
    playFilteredNoise(context, now, 0.11, 0.07, 680);
    return;
  }

  const hitCount = kind === "break" ? 4 : 2;
  for (let i = 0; i < hitCount; i += 1) {
    const offset = i * 0.022 + Math.random() * 0.006;
    playTone(context, now + offset, 1800 - i * 190, 0.045, kind === "break" ? 0.16 : 0.11, "square");
    playFilteredNoise(context, now + offset, 0.052, kind === "break" ? 0.13 : 0.08, 2600 - i * 220);
  }

  playTone(context, now + 0.018, kind === "break" ? 138 : 180, 0.08, kind === "break" ? 0.12 : 0.07, "triangle");
}

export function initApp(root = document) {
  const app = root.querySelector("[data-app]");
  const ball = root.querySelector("[data-ball]");
  const reset = root.querySelector("[data-reset]");
  const status = root.querySelector("[data-status]");
  const counter = root.querySelector("[data-counter]");
  const liveStatus = root.querySelector("[data-live-status]");

  if (!app || !ball || !reset || !status || !counter) {
    return;
  }

  let game = createGame();

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
    counter.textContent = countText;
    if (liveStatus) {
      liveStatus.textContent = `${message}. ${countText}`;
    }
  }

  function pressBall() {
    if (game.phase === initialPhase) {
      const before = game.phase;
      game = clickWax(game);
      const justBroken = before === initialPhase && game.phase === squishPhase;
      playSound(justBroken ? "break" : "crack");
      render(justBroken ? messages.broken : pick(messages.wax));
      logEvent(justBroken ? "break" : "crack", { cracks: game.cracks });
      return;
    }

    const before = game.phase;
    game = clickSquish(game);
    playSound("squish");
    const autoReset = before === squishPhase && game.phase === initialPhase;
    render(autoReset ? "새 왁뿌볼 준비" : pick(messages.squish));
    logEvent(autoReset ? "auto-reset" : "squish", { squishCount: game.squishCount, plays: game.plays });
  }

  function resetBall() {
    game = resetGame(game);
    render("새 왁뿌볼 준비");
    logEvent("reset", { plays: game.plays });
  }

  ball.addEventListener("pointerdown", pressBall);
  ball.addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && !event.repeat) {
      event.preventDefault();
      pressBall();
    }
  });
  ball.addEventListener("click", (event) => {
    if (event.detail === 0) {
      pressBall();
    }
  });
  reset.addEventListener("click", resetBall);
  render();
}

if (typeof document !== "undefined") {
  initApp();
}
