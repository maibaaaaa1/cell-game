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

function pacedWave(wave: number, label: string, minDurationMs: number, groups: WaveConfig["groups"], preWaveMessage?: string): WaveConfig {
  return {
    wave,
    label,
    minDurationMs,
    preWaveMessage,
    groups
  };
}

export const WAVE_CONFIG: Record<string, WaveSetConfig> = {
  noseFirstLevel: {
    id: "noseFirstLevel",
    name: "鼻腔保卫战第一关",
    initialPreparationMs: 8000,
    initialMessage: "鼻腔黏膜遭遇病毒入侵，部署免疫细胞守住防线。",
    tutorialMessageMs: 3000,
    tutorialMessage: "选择下方巨噬细胞，点击蓝色免疫驻点部署。",
    normalPreparationMs: 2500,
    bossPreparationMs: 10000,
    waves: [
      pacedWave(1, "教学波：左路病毒", 6000, [
        { enemy: "normalVirus", count: 3, route: "left", delayMs: 0, intervalMs: 2000 },
        { enemy: "normalVirus", count: 3, route: "left", delayMs: 6000, intervalMs: 2000 }
      ]),
      pacedWave(2, "左路强化", 6500, [
        { enemy: "normalVirus", count: 4, route: "left", delayMs: 0, intervalMs: 1800 },
        { enemy: "normalVirus", count: 4, route: "left", delayMs: 7000, intervalMs: 1800 }
      ]),
      pacedWave(3, "快速病毒出现", 7000, [
        { enemy: "normalVirus", count: 6, route: "left", delayMs: 0, intervalMs: 1700 },
        { enemy: "fastVirus", count: 4, route: "left", delayMs: 8000, intervalMs: 1600 }
      ]),
      pacedWave(4, "首次双路线", 8000, [
        { enemy: "normalVirus", count: 6, route: "left", delayMs: 0, intervalMs: 1700 },
        { enemy: "normalVirus", count: 6, route: "right", delayMs: 5000, intervalMs: 1700 }
      ], "另一侧也出现病毒，注意双路线。"),
      pacedWave(5, "双路混合", 8500, [
        { enemy: "normalVirus", count: 5, route: "left", delayMs: 0, intervalMs: 1600 },
        { enemy: "fastVirus", count: 4, route: "right", delayMs: 4000, intervalMs: 1500 },
        { enemy: "normalVirus", count: 4, route: "left", delayMs: 10000, intervalMs: 1600 }
      ]),
      pacedWave(6, "普通细菌出现", 9000, [
        { enemy: "bacteria", count: 3, route: "left", delayMs: 0, intervalMs: 2200 },
        { enemy: "normalVirus", count: 6, route: "right", delayMs: 4000, intervalMs: 1600 },
        { enemy: "bacteria", count: 3, route: "left", delayMs: 12000, intervalMs: 2200 }
      ], "细菌更耐打，巨噬细胞适合拦截。"),
      pacedWave(7, "轻压迫", 10500, [
        { enemy: "fastVirus", count: 5, route: "left", delayMs: 0, intervalMs: 1500 },
        { enemy: "normalVirus", count: 6, route: "right", delayMs: 2000, intervalMs: 1500 },
        { enemy: "bacteria", count: 4, route: "right", delayMs: 10000, intervalMs: 2000 }
      ]),
      pacedWave(8, "Boss前综合波", 12500, [
        { enemy: "normalVirus", count: 7, route: "left", delayMs: 0, intervalMs: 1400 },
        { enemy: "fastVirus", count: 5, route: "right", delayMs: 3000, intervalMs: 1400 },
        { enemy: "bacteria", count: 3, route: "left", delayMs: 10000, intervalMs: 2000 },
        { enemy: "bacteria", count: 3, route: "right", delayMs: 14000, intervalMs: 2000 }
      ]),
      pacedWave(9, "Boss 变异病毒团", 30000, [
        { enemy: "mutantVirusCluster", count: 1, route: "mixed", delayMs: 0, intervalMs: 1000 }
      ], "大型变异病毒团正在靠近。")
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
