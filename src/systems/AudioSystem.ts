import { AudioCueSystem } from "./AudioCueSystem";
import type { BattleSystem } from "../types/battle";

export class AudioSystem implements BattleSystem {
  readonly name = "AudioSystem";
  private readonly audio: AudioCueSystem;

  constructor(audio: AudioCueSystem) {
    this.audio = audio;
  }

  cleanup(): void {
    void this.audio.dispose();
  }
}
