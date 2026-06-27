import type { BossConfig } from "../types/config";

export const BOSS_CONFIG: Record<string, BossConfig> = {
  cancerKing: {
    id: "cancerKing",
    name: "癌王",
    phases: [
      { healthBelow: 0.7, skills: ["summon"] },
      { healthBelow: 0.45, skills: ["shield", "heal"] },
      { healthBelow: 0.2, skills: ["split", "berserk"] }
    ]
  }
};
