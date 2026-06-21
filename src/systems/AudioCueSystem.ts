export type AudioCueKind = "combo" | "boss" | "clear" | "heartbeat" | "drop" | "micro";

interface AudioCueOptions {
  enabled?: boolean;
  maxVoices?: number;
}

export class AudioCueSystem {
  private context?: AudioContext;
  private readonly enabled: boolean;
  private readonly maxVoices: number;
  private readonly lastPlayedAt = new Map<AudioCueKind, number>();
  private activeVoices = 0;
  private disposed = false;

  constructor(options: AudioCueOptions = {}) {
    this.enabled = options.enabled ?? true;
    this.maxVoices = Math.max(1, options.maxVoices ?? 4);
  }

  play(kind: AudioCueKind, intensity = 1): void {
    if (!this.enabled || this.disposed || this.activeVoices >= this.maxVoices) {
      return;
    }

    const audioContext = this.getContext();
    if (!audioContext) {
      return;
    }

    const now = audioContext.currentTime;
    const lastPlayedAt = this.lastPlayedAt.get(kind) ?? Number.NEGATIVE_INFINITY;
    if (now - lastPlayedAt < this.minimumIntervalFor(kind)) {
      return;
    }
    this.lastPlayedAt.set(kind, now);

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    const volume = Math.min(0.025, 0.009 + intensity * 0.002);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + this.durationFor(kind));

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(this.frequencyFor(kind, intensity), now);
    if (kind === "combo") {
      oscillator.frequency.exponentialRampToValueAtTime(760 + intensity * 45, now + 0.11);
    }
    if (kind === "clear") {
      oscillator.frequency.exponentialRampToValueAtTime(980, now + 0.18);
    }

    this.activeVoices += 1;
    oscillator.onended = () => {
      this.activeVoices = Math.max(0, this.activeVoices - 1);
      oscillator.disconnect();
      gain.disconnect();
    };

    try {
      oscillator.start(now);
      oscillator.stop(now + this.durationFor(kind));
    } catch {
      oscillator.onended = null;
      this.activeVoices = Math.max(0, this.activeVoices - 1);
      oscillator.disconnect();
      gain.disconnect();
    }
  }

  async dispose(): Promise<void> {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.lastPlayedAt.clear();
    const context = this.context;
    this.context = undefined;
    if (context && context.state !== "closed") {
      await context.close();
    }
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

  private minimumIntervalFor(kind: AudioCueKind): number {
    if (kind === "combo") {
      return 0.055;
    }
    if (kind === "heartbeat") {
      return 0.14;
    }
    return 0.08;
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
