export type AudioCueKind = "combo" | "boss" | "clear" | "heartbeat" | "drop" | "micro";

export class AudioCueSystem {
  private context?: AudioContext;

  play(kind: AudioCueKind, intensity = 1): void {
    const audioContext = this.getContext();
    if (!audioContext) {
      return;
    }

    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    const volume = Math.min(0.08, 0.025 + intensity * 0.012);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + this.durationFor(kind));

    oscillator.type = kind === "boss" || kind === "heartbeat" ? "sine" : "triangle";
    oscillator.frequency.setValueAtTime(this.frequencyFor(kind, intensity), now);
    if (kind === "combo") {
      oscillator.frequency.exponentialRampToValueAtTime(760 + intensity * 45, now + 0.11);
    }
    if (kind === "clear") {
      oscillator.frequency.exponentialRampToValueAtTime(980, now + 0.18);
    }

    oscillator.start(now);
    oscillator.stop(now + this.durationFor(kind));
  }

  private getContext(): AudioContext | undefined {
    if (typeof window === "undefined") {
      return undefined;
    }

    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextClass) {
      return undefined;
    }

    this.context ??= new AudioContextClass();
    return this.context;
  }

  private frequencyFor(kind: AudioCueKind, intensity: number): number {
    if (kind === "boss") {
      return 72;
    }
    if (kind === "heartbeat") {
      return 48;
    }
    if (kind === "clear") {
      return 420;
    }
    if (kind === "drop") {
      return 620;
    }
    if (kind === "micro") {
      return 520;
    }
    return 360 + intensity * 42;
  }

  private durationFor(kind: AudioCueKind): number {
    if (kind === "boss") {
      return 0.7;
    }
    if (kind === "heartbeat") {
      return 0.16;
    }
    if (kind === "clear") {
      return 0.28;
    }
    return 0.14;
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
