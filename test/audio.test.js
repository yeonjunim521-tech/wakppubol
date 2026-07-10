import test from "node:test";
import assert from "node:assert/strict";
import { AUDIO_MANIFEST, createAudioEngine, getRecordedMix, selectSample } from "../audio.js";

function makeAudioParam() {
  return {
    value: 0,
    setValueAtTime() {},
    exponentialRampToValueAtTime() {},
  };
}

class FakeAudioContext {
  constructor() {
    this.currentTime = 0;
    this.destination = {};
    this.oscillatorTypes = [];
    this.sampleRate = 100;
    this.state = "running";
  }

  createGain() {
    return { gain: makeAudioParam(), connect() {} };
  }

  createDynamicsCompressor() {
    return {
      threshold: makeAudioParam(),
      knee: makeAudioParam(),
      ratio: makeAudioParam(),
      attack: makeAudioParam(),
      release: makeAudioParam(),
      connect() {},
    };
  }

  createBuffer() {
    return { getChannelData: () => new Float32Array(10) };
  }

  createBufferSource() {
    return { playbackRate: makeAudioParam(), connect() {}, start() {} };
  }

  createBiquadFilter() {
    return { frequency: makeAudioParam(), Q: makeAudioParam(), connect() {} };
  }

  createOscillator() {
    const context = this;
    return {
      frequency: makeAudioParam(),
      connect() {},
      start() { context.oscillatorTypes.push(this.type); },
      stop() {},
      type: "sine",
    };
  }
}

test("every recorded sample is a local asset", () => {
  for (const paths of Object.values(AUDIO_MANIFEST)) {
    for (const path of paths) assert.match(path, /^\.\/assets\/audio\//);
  }
});

test("early and late cracks use the same crunchy bank", () => {
  assert.equal(selectSample("crack", 1, 0), selectSample("crack", 6, 0));
  assert.match(selectSample("crack", 1, 0), /wax-tap-/);
  assert.match(selectSample("break", 7, 0.5), /wax-tap-/);
});

test("selection clamps a random value at the upper boundary", () => {
  const selected = selectSample("break", 7, 1);
  assert.equal(selected, AUDIO_MANIFEST.waxTap.at(-1));
});

test("squish layers a recorded soft slime sample", () => {
  assert.match(selectSample("squish", 0, 0.5), /squish-/);
});

test("squish recording is mixed at wax-break loudness", () => {
  const squish = getRecordedMix("squish", 0);
  const crack = getRecordedMix("crack", 0);
  assert.ok(squish.gain >= crack.gain * 0.95);
  assert.ok(squish.playbackRate >= 0.94);
});

test("a crack layers short triangle tones beneath every rich burst except the last", () => {
  const previousWindow = globalThis.window;
  const context = new FakeAudioContext();
  globalThis.window = { AudioContext: class { constructor() { return context; } } };
  try {
    createAudioEngine().play("crack", 1);
    assert.equal(context.oscillatorTypes.filter((type) => type === "triangle").length, 5);
  } finally {
    globalThis.window = previousWindow;
  }
});

test("resume failure is reported without throwing from play", async () => {
  const previousWindow = globalThis.window;
  const context = new FakeAudioContext();
  const blockedKinds = [];
  context.state = "suspended";
  context.resume = () => Promise.reject(new Error("blocked"));
  globalThis.window = { AudioContext: class { constructor() { return context; } } };
  try {
    createAudioEngine({ onBlocked: (kind) => blockedKinds.push(kind) }).play("crack", 1);
    await Promise.resolve();
    await Promise.resolve();
    assert.deepEqual(blockedKinds, ["crack"]);
  } finally {
    globalThis.window = previousWindow;
  }
});
