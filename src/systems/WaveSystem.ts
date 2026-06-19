import type { EnemyKind } from "../types/game";

export class WaveSystem {
  readonly maxWave = 20;

  buildWave(wave: number): EnemyKind[] {
    if (wave >= 20) {
      return ["cancerKing"];
    }

    if (wave <= 5) {
      return this.repeat("bacteria", 4 + wave);
    }

    if (wave <= 10) {
      return [...this.repeat("bacteria", 4), ...this.repeat("fluVirus", wave - 3)];
    }

    if (wave <= 15) {
      return [
        ...this.repeat("fluVirus", 4),
        ...this.repeat("resistantBacteria", Math.max(2, wave - 10)),
        ...this.repeat("mutantVirus", Math.floor((wave - 9) / 2))
      ];
    }

    return [
      ...this.repeat("bacteria", 6),
      ...this.repeat("fluVirus", 5),
      ...this.repeat("resistantBacteria", 3),
      ...this.repeat("mutantVirus", 3),
      ...this.repeat("cancerCell", wave - 15)
    ];
  }

  getWaveLabel(wave: number): string {
    if (wave <= 5) {
      return "普通细菌";
    }

    if (wave <= 10) {
      return "病毒来袭";
    }

    if (wave <= 15) {
      return "耐药菌压力";
    }

    if (wave <= 19) {
      return "混合入侵";
    }

    return "Boss 癌王";
  }

  private repeat(kind: EnemyKind, count: number): EnemyKind[] {
    return Array.from({ length: count }, () => kind);
  }
}
