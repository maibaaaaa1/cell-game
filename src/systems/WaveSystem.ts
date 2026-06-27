import type { EnemyKind } from "../types/game";
import { WAVE_CONFIG } from "../configs/waveConfig";

export class WaveSystem {
  readonly name = "WaveSystem";
  private readonly waveSetId: string;

  constructor(waveSetId = "legacyTwentyWave") {
    this.waveSetId = waveSetId;
  }

  get maxWave(): number {
    return this.waveSet.waves.length;
  }

  buildWave(wave: number): EnemyKind[] {
    const waveConfig = this.waveSet.waves.find((item) => item.wave === wave);
    if (!waveConfig) {
      return [];
    }

    return waveConfig.groups.flatMap((group) => this.repeat(group.enemy, group.count));
  }

  getWaveLabel(wave: number): string {
    return this.waveSet.waves.find((item) => item.wave === wave)?.label ?? "未知波次";
  }

  private repeat(kind: EnemyKind, count: number): EnemyKind[] {
    return Array.from({ length: count }, () => kind);
  }

  private get waveSet() {
    return WAVE_CONFIG[this.waveSetId] ?? WAVE_CONFIG.legacyTwentyWave;
  }

  cleanup(): void {}
}
