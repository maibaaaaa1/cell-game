import type { RandomEventConfig } from "../types/game";

export const RANDOM_EVENTS: RandomEventConfig[] = [
  {
    id: "sleepDebt",
    name: "熬夜",
    description: "攻击下降20%。",
    attackMultiplier: 0.8
  },
  {
    id: "exercise",
    name: "运动",
    description: "攻击增加20%。",
    attackMultiplier: 1.2
  },
  {
    id: "sugar",
    name: "高糖饮食",
    description: "敌人血量增加20%。",
    enemyMultiplier: 1.2
  },
  {
    id: "hyperbaric",
    name: "高压氧治疗",
    description: "全体细胞回血50%。",
    healPercent: 0.5
  },
  {
    id: "nmn",
    name: "NMN补给",
    description: "ATP恢复速度增加。",
    atpRegenMultiplier: 1.3
  },
  {
    id: "akg",
    name: "AKG补给",
    description: "攻速增加。",
    attackRateMultiplier: 1.18
  }
];
