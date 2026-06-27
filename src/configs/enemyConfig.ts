import type { EnemyRuntimeConfig } from "../types/config";

export const ENEMY_CONFIG: Record<string, EnemyRuntimeConfig> = {
  bacteria: { id: "bacteria", health: 50, speed: 1, reward: 10, damage: 1 },
  fluVirus: { id: "fluVirus", health: 80, speed: 2, reward: 15, damage: 1 },
  resistantBacteria: { id: "resistantBacteria", health: 300, speed: 0.78, reward: 35, damage: 2 },
  mutantVirus: { id: "mutantVirus", health: 160, speed: 1.65, reward: 30, damage: 2 },
  miniVirus: { id: "miniVirus", health: 35, speed: 2.35, reward: 5, damage: 1 },
  cancerCell: { id: "cancerCell", health: 650, speed: 0.55, reward: 50, damage: 5 },
  cancerKing: { id: "cancerKing", health: 10000, speed: 0.25, reward: 500, damage: 10 }
};
export const ENEMY_CONFIG_VERSION = "v0.1";
