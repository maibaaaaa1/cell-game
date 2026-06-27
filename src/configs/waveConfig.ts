import type { EnemyKind } from "../types/game";
import type { WaveConfig, WaveSetConfig } from "../types/config";

function groups(wave: number, label: string, entries: Array<[EnemyKind, number]>): WaveConfig {
  return {
    wave,
    label,
    groups: entries.map(([enemy, count]) => ({ enemy, count }))
  };
}

export const WAVE_CONFIG: Record<string, WaveSetConfig> = {
  noseTraining: {
    id: "noseTraining",
    name: "鼻腔训练波次",
    waves: [
      groups(1, "细菌试探", [["bacteria", 5]]),
      groups(2, "细菌增援", [["bacteria", 7]]),
      groups(3, "快速病毒", [["bacteria", 5], ["fluVirus", 3]]),
      groups(4, "混合入侵", [["bacteria", 6], ["fluVirus", 5]]),
      groups(5, "小型压迫", [["bacteria", 8], ["fluVirus", 5], ["mutantVirus", 1]])
    ]
  },
  legacyTwentyWave: {
    id: "legacyTwentyWave",
    name: "旧版二十波兼容",
    waves: Array.from({ length: 20 }, (_, index) => {
      const wave = index + 1;
      if (wave >= 20) {
        return groups(wave, "Boss 癌王", [["cancerKing", 1]]);
      }
      if (wave <= 5) {
        return groups(wave, "普通细菌", [["bacteria", 4 + wave]]);
      }
      if (wave <= 10) {
        return groups(wave, "病毒来袭", [["bacteria", 4], ["fluVirus", wave - 3]]);
      }
      if (wave <= 15) {
        return groups(wave, "耐药菌压力", [
          ["fluVirus", 4],
          ["resistantBacteria", Math.max(2, wave - 10)],
          ["mutantVirus", Math.floor((wave - 9) / 2)]
        ]);
      }
      return groups(wave, "混合入侵", [
        ["bacteria", 6],
        ["fluVirus", 5],
        ["resistantBacteria", 3],
        ["mutantVirus", 3],
        ["cancerCell", wave - 15]
      ]);
    })
  }
};
