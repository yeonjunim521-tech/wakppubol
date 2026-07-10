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

let audioContext;

function pick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
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

function makeNoiseBuffer(context, seconds, profile = "soft") {
  const length = Math.max(1, Math.floor(context.sampleRate * seconds));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < length; i += 1) {
    const progress = i / length;
    const fade = 1 - progress;
    if (profile === "crackle") {
      const impulse = Math.random() < 0.05 ? (Math.random() * 2 - 1) * randomBetween(0.65, 1.25) : 0;
      const grain = (Math.random() * 2 - 1) * 0.24;
      const chatter = Math.sin(progress * 180) * (Math.random() * 2 - 1) * 0.07;
      data[i] = Math.max(-1, Math.min(1, (impulse + grain + chatter) * Math.pow(fade, 1.8)));
      continue;
    }

    const wobble = Math.sin(progress * 18) * 0.08;
    data[i] = ((Math.random() * 2 - 1) * 0.42 + wobble) * Math.pow(fade, 1.55);
  }

  return buffer;
}

function playTone(context, start, frequency, duration, volume, type = "triangle", options = {}) {
  const attack = options.attack ?? 0.006;
  const endFrequencyRatio = options.endFrequencyRatio ?? 0.42;
  const releaseTail = options.releaseTail ?? 0.02;
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, frequency * endFrequencyRatio), start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + releaseTail);
}

function playFilteredNoise(context, start, duration, volume, frequency, options = {}) {
  const filterType = options.filterType ?? "bandpass";
  const q = options.q ?? 7;
  const playbackRate = options.playbackRate ?? 1;
  const profile = options.profile ?? "soft";
  const attack = options.attack ?? 0.0015;
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();

  source.buffer = makeNoiseBuffer(context, duration, profile);
  source.playbackRate.setValueAtTime(playbackRate, start);
  filter.type = filterType;
  filter.frequency.setValueAtTime(frequency, start);
  filter.Q.setValueAtTime(q, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  source.start(start);
}

function playCrackleBurst(context, start, kind) {
  const isBreak = kind === "break";
  const burstCount = isBreak ? 6 : 3;

  for (let i = 0; i < burstCount; i += 1) {
    const offset = i * randomBetween(0.006, 0.013) + randomBetween(0, isBreak ? 0.012 : 0.007);
    playFilteredNoise(
      context,
      start + offset,
      randomBetween(0.02, isBreak ? 0.065 : 0.038),
      isBreak ? randomBetween(0.11, 0.18) : randomBetween(0.065, 0.105),
      randomBetween(isBreak ? 1250 : 1650, isBreak ? 2450 : 3150),
      {
        filterType: i % 2 === 0 ? "highpass" : "bandpass",
        q: randomBetween(0.9, 4.5),
        playbackRate: randomBetween(0.84, 1.18),
        profile: "crackle",
        attack: 0.0008,
      },
    );

    if (i < burstCount - 1) {
      playTone(
        context,
        start + offset,
        randomBetween(isBreak ? 290 : 420, isBreak ? 560 : 880),
        randomBetween(0.014, 0.028),
        isBreak ? 0.022 : 0.016,
        "triangle",
        {
          attack: 0.0015,
          endFrequencyRatio: randomBetween(0.5, 0.72),
          releaseTail: 0.01,
        },
      );
    }
  }

  playTone(
    context,
    start + 0.012,
    isBreak ? 124 : 176,
    isBreak ? 0.13 : 0.085,
    isBreak ? 0.075 : 0.045,
    "sine",
    {
      attack: 0.0028,
      endFrequencyRatio: isBreak ? 0.62 : 0.7,
      releaseTail: 0.018,
    },
  );

  if (isBreak) {
    playFilteredNoise(context, start + 0.024, 0.09, 0.082, 980, {
      filterType: "bandpass",
      q: 1.4,
      playbackRate: 0.88,
      profile: "crackle",
      attack: 0.0012,
    });
    playTone(context, start + 0.024, 86, 0.16, 0.042, "triangle", {
      attack: 0.0034,
      endFrequencyRatio: 0.78,
      releaseTail: 0.03,
    });
  }
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
    playTone(context, now, 148, 0.11, 0.082, "sine", {
      attack: 0.003,
      endFrequencyRatio: 0.74,
      releaseTail: 0.025,
    });
    playTone(context, now + 0.019, 92, 0.16, 0.05, "triangle", {
      attack: 0.004,
      endFrequencyRatio: 0.82,
      releaseTail: 0.028,
    });
    playFilteredNoise(context, now, 0.12, 0.052, 420, {
      filterType: "lowpass",
      q: 0.65,
      playbackRate: 0.9,
      profile: "soft",
      attack: 0.004,
    });
    return;
  }

  playCrackleBurst(context, now, kind);
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

  function pressBall(event) {
    if (event?.type === "pointerdown") {
      const point = normalizePointer(event.clientX, event.clientY, ball.getBoundingClientRect());
      ball.style.setProperty("--impact-x", `${point.x}%`);
      ball.style.setProperty("--impact-y", `${point.y}%`);
    }

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
