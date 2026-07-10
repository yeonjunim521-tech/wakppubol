export const AUDIO_MANIFEST = Object.freeze({
  waxTap: Object.freeze([
    "./assets/audio/wax-tap-1.wav",
    "./assets/audio/wax-tap-2.wav",
    "./assets/audio/wax-tap-3.wav",
    "./assets/audio/wax-tap-4.wav",
    "./assets/audio/wax-tap-5.wav",
  ]),
  squish: Object.freeze([
    "./assets/audio/squish-1.wav",
    "./assets/audio/squish-2.wav",
    "./assets/audio/squish-3.wav",
  ]),
});

export function selectSample(kind, crackCount, randomValue) {
  let bank;
  if (kind === "crack" || kind === "break") {
    bank = AUDIO_MANIFEST.waxTap;
  } else if (kind === "squish") {
    bank = AUDIO_MANIFEST.squish;
  } else {
    return null;
  }

  const index = Math.min(bank.length - 1, Math.max(0, Math.floor(randomValue * bank.length)));
  return bank[index];
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

export function getRecordedMix(kind, randomValue = Math.random()) {
  const value = Math.min(1, Math.max(0, randomValue));
  if (kind === "squish") {
    return {
      playbackRate: 0.96 + value * 0.08,
      gain: 0.94 + value * 0.1,
    };
  }
  return {
    playbackRate: 0.94 + value * 0.12,
    gain: 0.94 + value * 0.14,
  };
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
    } else {
      const wobble = Math.sin(progress * 18) * 0.08;
      data[i] = ((Math.random() * 2 - 1) * 0.42 + wobble) * Math.pow(fade, 1.55);
    }
  }

  return buffer;
}

function playTone(context, output, start, frequency, duration, volume, type = "triangle", options = {}) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(
    Math.max(40, frequency * (options.endFrequencyRatio ?? 0.42)),
    start + duration,
  );
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + (options.attack ?? 0.006));
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(output);
  oscillator.start(start);
  oscillator.stop(start + duration + (options.releaseTail ?? 0.02));
}

function playFilteredNoise(context, output, start, duration, volume, frequency, options = {}) {
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  source.buffer = makeNoiseBuffer(context, duration, options.profile);
  source.playbackRate.setValueAtTime(options.playbackRate ?? 1, start);
  filter.type = options.filterType ?? "bandpass";
  filter.frequency.setValueAtTime(frequency, start);
  filter.Q.setValueAtTime(options.q ?? 7, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + (options.attack ?? 0.0015));
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(output);
  source.start(start);
}

function playCrackleBurst(context, output, start, kind) {
  const isBreak = kind === "break";
  const burstCount = isBreak ? 9 : 5;
  for (let i = 0; i < burstCount; i += 1) {
    const offset = i * randomBetween(0.006, 0.013) + randomBetween(0, isBreak ? 0.012 : 0.007);
    playFilteredNoise(
      context,
      output,
      start + offset,
      randomBetween(0.02, isBreak ? 0.08 : 0.052),
      isBreak ? randomBetween(0.13, 0.21) : randomBetween(0.08, 0.13),
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
        output,
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
  playTone(context, output, start + 0.012, isBreak ? 112 : 158, isBreak ? 0.18 : 0.12, isBreak ? 0.11 : 0.065, "triangle", {
    attack: 0.0028,
    endFrequencyRatio: isBreak ? 0.62 : 0.7,
    releaseTail: 0.018,
  });
  if (isBreak) {
    playFilteredNoise(context, output, start + 0.024, 0.14, 0.11, 980, {
      filterType: "bandpass",
      q: 1.4,
      playbackRate: 0.88,
      profile: "crackle",
      attack: 0.0012,
    });
    playTone(context, output, start + 0.024, 86, 0.16, 0.042, "triangle", {
      attack: 0.0034,
      endFrequencyRatio: 0.78,
      releaseTail: 0.03,
    });
  }
}

function playSquish(context, output, start) {
  playTone(context, output, start, 118, 0.18, 0.032, "sine", {
    attack: 0.018,
    endFrequencyRatio: 0.82,
    releaseTail: 0.04,
  });
  playFilteredNoise(context, output, start, 0.18, 0.025, 310, {
    filterType: "lowpass",
    q: 0.5,
    playbackRate: 0.76,
    profile: "soft",
    attack: 0.018,
  });
}

export function createAudioEngine({ onBlocked = () => {} } = {}) {
  const buffers = new Map();
  let context = null;
  let master = null;

  function ensureGraph() {
    if (context || typeof window === "undefined") return context;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    try {
      context = new AudioContextClass();
      master = context.createGain();
      const compressor = context.createDynamicsCompressor();
      master.gain.value = 0.72;
      compressor.threshold.value = -18;
      compressor.knee.value = 18;
      compressor.ratio.value = 8;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.18;
      master.connect(compressor);
      compressor.connect(context.destination);
    } catch {
      context = null;
      master = null;
    }
    return context;
  }

  async function preload() {
    const audioContext = ensureGraph();
    if (!audioContext || typeof fetch !== "function") return;
    const paths = Object.values(AUDIO_MANIFEST).flat();
    await Promise.all(paths.map(async (path) => {
      try {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`Audio request failed: ${response.status}`);
        const buffer = await audioContext.decodeAudioData(await response.arrayBuffer());
        buffers.set(path, buffer);
      } catch {
        buffers.delete(path);
      }
    }));
  }

  function play(kind, crackCount) {
    const audioContext = ensureGraph();
    if (!audioContext) return;
    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {
        try {
          onBlocked(kind);
        } catch {
          // Audio diagnostics must never interrupt gameplay.
        }
      });
    }

    const now = audioContext.currentTime;
    const selectedPath = selectSample(kind, crackCount, Math.random());
    const recordedBuffer = selectedPath ? buffers.get(selectedPath) : null;
    if (recordedBuffer) {
      const source = audioContext.createBufferSource();
      const gain = audioContext.createGain();
      const mix = getRecordedMix(kind);
      source.buffer = recordedBuffer;
      source.playbackRate.setValueAtTime(mix.playbackRate, now);
      gain.gain.setValueAtTime(mix.gain, now);
      source.connect(gain);
      gain.connect(master);
      source.start(now);
    }

    if (kind === "squish") playSquish(audioContext, master, now);
    else playCrackleBurst(audioContext, master, now, kind);
  }

  return { preload, play };
}
