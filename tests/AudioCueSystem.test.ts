import assert from "node:assert/strict";
import test from "node:test";
import { AudioCueSystem } from "../src/systems/AudioCueSystem.ts";

class FakeAudioParam {
  setValueAtTime(): void {}
  exponentialRampToValueAtTime(): void {}
}

class FakeOscillator {
  readonly frequency = new FakeAudioParam();
  type = "sine";

  connect(): void {}
  disconnect(): void {}
  start(): void {}
  stop(): void {}
}

class FakeGain {
  readonly gain = new FakeAudioParam();

  connect(): void {}
  disconnect(): void {}
}

class FakeAudioContext {
  readonly currentTime = 1;
  readonly destination = {};
  oscillatorCount = 0;
  closeCount = 0;

  createOscillator(): FakeOscillator {
    this.oscillatorCount += 1;
    return new FakeOscillator();
  }

  createGain(): FakeGain {
    return new FakeGain();
  }

  async close(): Promise<void> {
    this.closeCount += 1;
  }
}

function installAudioContext(context: FakeAudioContext): void {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      AudioContext: class {
        constructor() {
          return context;
        }
      }
    }
  });
}

test("does not allocate audio nodes when sound is disabled", () => {
  const context = new FakeAudioContext();
  installAudioContext(context);
  const audio = new AudioCueSystem({ enabled: false });

  audio.play("combo", 10);

  assert.equal(context.oscillatorCount, 0);
});

test("limits oscillator allocation during a burst of combo events", () => {
  const context = new FakeAudioContext();
  installAudioContext(context);
  const audio = new AudioCueSystem({ enabled: true, maxVoices: 4 });

  for (let index = 0; index < 30; index += 1) {
    audio.play("combo", 10);
  }

  assert.ok(context.oscillatorCount <= 4, `created ${context.oscillatorCount} oscillators`);
});

test("dispose releases the audio context and blocks future sounds", async () => {
  const context = new FakeAudioContext();
  installAudioContext(context);
  const audio = new AudioCueSystem({ enabled: true });

  audio.play("micro");
  assert.equal(typeof audio.dispose, "function", "audio system must expose dispose");
  await audio.dispose();
  audio.play("micro");

  assert.equal(context.closeCount, 1);
  assert.equal(context.oscillatorCount, 1);
});
