import type { EnemyRuntimeConfig } from "../types/config";

export const ENEMY_CONFIG: Record<string, EnemyRuntimeConfig> = {
  normalVirus: { id: "normalVirus", health: 60, speed: 1, reward: 7, damage: 5 },
  fastVirus: { id: "fastVirus", health: 45, speed: 1.45, reward: 8, damage: 4 },
  bacteria: { id: "bacteria", health: 110, speed: 0.8, reward: 10, damage: 8 },
  fluVirus: { id: "fluVirus", health: 80, speed: 2, reward: 15, damage: 1 },
  resistantBacteria: { id: "resistantBacteria", health: 300, speed: 0.78, reward: 35, damage: 2 },
  mutantVirus: { id: "mutantVirus", health: 160, speed: 1.65, reward: 30, damage: 2 },
  miniVirus: { id: "miniVirus", health: 30, speed: 1.55, reward: 4, damage: 3 },
  cancerCell: { id: "cancerCell", health: 650, speed: 0.55, reward: 50, damage: 5 },
  cancerKing: { id: "cancerKing", health: 10000, speed: 0.25, reward: 500, damage: 10 },
  mutantVirusCluster: { id: "mutantVirusCluster", health: 800, speed: 0.45, reward: 35, damage: 25 }
};
export const ENEMY_CONFIG_VERSION = "v0.1";
