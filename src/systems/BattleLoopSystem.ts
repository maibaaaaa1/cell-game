import type { BattleSystem } from "../types/battle";

export const BATTLE_SYSTEMS = [
  "ATPSystem",
  "FeverSystem",
  "WaveSystem",
  "EnemySystem",
  "BossSystem",
  "CellSystem",
  "TargetingSystem",
  "DamageSystem",
  "ProjectileSystem",
  "SkillSystem",
  "EffectSystem",
  "FeedbackSystem",
  "TutorialSystem",
  "AudioSystem"
] as const;

export class BattleLoopSystem implements BattleSystem {
  readonly name = "BattleLoopSystem";
  private readonly systems: BattleSystem[];

  constructor(systems: BattleSystem[]) {
    this.systems = systems;
  }

  update(time: number, delta: number): void {
    for (const system of this.systems) {
      system.update?.(time, delta);
    }
  }

  cleanup(): void {
    for (const system of this.systems) {
      system.cleanup?.();
    }
  }
}
