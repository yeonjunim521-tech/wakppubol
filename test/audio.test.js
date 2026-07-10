import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
import test from "node:test";
import { AUDIO_MANIFEST, getRecordedMix } from "../audio.js";

test("squish bank contains three short sticky variants", async () => {
  assert.equal(AUDIO_MANIFEST.squish.length, 3);
  for (const relative of AUDIO_MANIFEST.squish) {
    const path = new URL(`../${relative.replace(/^\.\//, "")}`, import.meta.url);
    const info = await stat(path);
    assert.ok(info.size < 36_000, `${relative} should be a short contact transient`);
  }
});

test("squish pitch variation stays subtle and audible", () => {
  const low = getRecordedMix("squish", 0);
  const high = getRecordedMix("squish", 1);
  assert.deepEqual([low.playbackRate, high.playbackRate], [0.97, 1.04]);
  assert.ok(low.gain >= 0.98 && high.gain <= 1.08);
});
