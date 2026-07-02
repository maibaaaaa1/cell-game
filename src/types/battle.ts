import type Phaser from "phaser";
import type { LevelConfig } from "./game";

export interface BattleHudSnapshot {
  atp: number;
  tissueIntegrity: number;
  wave: number;
  maxWave: number;
  feverTemperature: number;
  message: string;
}

export interface BattleSystem {
  readonly name: string;
  update?(time: number, delta: number): void;
  cleanup?(): void;
}

export interface BattleSystemContext {
  scene: Phaser.Scene;
  level: LevelConfig;
  emitHud: (snapshot: Partial<BattleHudSnapshot>) => void;
}
