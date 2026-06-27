import type { WaveConfig, WaveSetConfig } from "../types/config.ts";
import type { EnemyKind } from "../types/game.ts";

type WaveEntry = [EnemyKind, number] | [EnemyKind, number, "left" | "right" | "mixed"];

function groups(wave: number, label: string, entries: WaveEntry[]): WaveConfig {
  return {
    wave,
    label,
    groups: entries.map(([enemy, count, route]) => ({ enemy, count, route }))
  };
}

export const WAVE_CONFIG: Record<string, WaveSetConfig> = {
  noseFirstLevel: {
    id: "noseFirstLevel",
    name: "鼻腔保卫战第一关",
    waves: [
      groups(1, "普通病毒 × 4", [["normalVirus", 4, "left"]]),
      groups(2, "普通病毒 × 6", [["normalVirus", 6, "left"]]),
      groups(3, "普通病毒与快速病毒", [["normalVirus", 5, "left"], ["fastVirus", 2, "left"]]),
      groups(4, "左右两路病毒", [["normalVirus", 5, "left"], ["normalVirus", 5, "right"]]),
      groups(5, "左右混合病毒", [["normalVirus", 6, "mixed"], ["fastVirus", 3, "mixed"]]),
      groups(6, "细菌压迫", [["bacteria", 3, "mixed"], ["normalVirus", 6, "mixed"]]),
      groups(7, "快速病毒群", [["fastVirus", 6, "mixed"], ["normalVirus", 8, "mixed"]]),
      groups(8, "Boss前压迫", [["normalVirus", 8, "mixed"], ["fastVirus", 4, "mixed"], ["bacteria", 3, "mixed"]]),
      groups(9, "Boss 变异病毒团", [["mutantVirusCluster", 1, "mixed"]])
    ]
  },
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
