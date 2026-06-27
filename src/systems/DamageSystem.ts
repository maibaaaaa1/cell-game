import type { BattleSystem } from "../types/battle.ts";
import type { BattleRuntimeState } from "./BattleRuntimeState.ts";

export class DamageSystem implements BattleSystem {
  readonly name = "DamageSystem";
  private readonly runtime?: BattleRuntimeState;

  constructor(runtime?: BattleRuntimeState) {
    this.runtime = runtime;
  }

  apply(enemyId: string, amount: number): boolean {
    if (!this.runtime) {
      return false;
    }

    const enemy = this.runtime.enemies.find((item) => item.id === enemyId);
    if (!enemy) {
      return false;
    }

    enemy.health = Math.max(0, enemy.health - amount);
    if (enemy.health > 0) {
      return false;
    }

    this.runtime.enemies = this.runtime.enemies.filter((item) => item.id !== enemyId);
    this.runtime.atp = Math.min(this.runtime.maxAtp, this.runtime.atp + enemy.reward);
    if (enemy.kind === "mutantVirusCluster") {
      this.runtime.defeatedBoss = true;
    }
    this.runtime.message = `击杀目标，获得${enemy.reward} ATP。`;
    return true;
  }

  cleanup(): void {}
}
