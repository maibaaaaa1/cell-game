import type { BattleSystem } from "../types/battle.ts";
import { BATTLE_BALANCE_CONFIG } from "../configs/balanceConfig.ts";
import type { CellKind } from "../types/game.ts";
import { pushRuntimeEffect, type BattleRuntimeState } from "./BattleRuntimeState.ts";

export class DamageSystem implements BattleSystem {
  readonly name = "DamageSystem";
  private readonly runtime?: BattleRuntimeState;

  constructor(runtime?: BattleRuntimeState) {
    this.runtime = runtime;
  }

  apply(enemyId: string, amount: number, sourceCellKind?: CellKind): boolean {
    if (!this.runtime) {
      return false;
    }

    const enemy = this.runtime.enemies.find((item) => item.id === enemyId);
    if (!enemy) {
      return false;
    }

    const finalDamage = this.damageFor(enemy.kind, amount, sourceCellKind);
    enemy.health = Math.max(0, enemy.health - finalDamage);
    if (enemy.health > 0) {
      return false;
    }

    this.runtime.enemies = this.runtime.enemies.filter((item) => item.id !== enemyId);
    this.runtime.atp = Math.min(this.runtime.maxAtp, this.runtime.atp + enemy.reward);
    pushRuntimeEffect(this.runtime, {
      x: enemy.x,
      y: enemy.y,
      text: `+${enemy.reward} ATP`,
      tone: "gain"
    });
    if (enemy.kind === "mutantVirusCluster") {
      this.runtime.defeatedBoss = true;
    }
    this.runtime.message = `击杀目标，获得${enemy.reward} ATP。`;
    return true;
  }

  cleanup(): void {}

  private damageFor(enemyKind: string, amount: number, sourceCellKind?: CellKind): number {
    if (enemyKind !== "mutantVirusCluster" || !sourceCellKind) {
      return amount;
    }

    const multipliers = BATTLE_BALANCE_CONFIG.combat.firstLevelBossDamageTaken;
    return amount * (multipliers[sourceCellKind as keyof typeof multipliers] ?? 1);
  }
}
