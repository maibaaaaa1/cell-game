import type { BattleSystem } from "../types/battle.ts";
import { pushRuntimeEffect, type BattleRuntimeState } from "./BattleRuntimeState.ts";
import type { EnemySystem } from "./EnemySystem.ts";

export class BossSystem implements BattleSystem {
  readonly name = "BossSystem";
  private readonly runtime?: BattleRuntimeState;
  private readonly enemies?: EnemySystem;

  constructor(runtime?: BattleRuntimeState, enemies?: EnemySystem) {
    this.runtime = runtime;
    this.enemies = enemies;
  }

  update(): void {
    if (!this.runtime || !this.enemies) {
      return;
    }

    const boss = this.runtime.enemies.find((enemy) => enemy.kind === "mutantVirusCluster");
    if (!boss || boss.bossSplitTriggered || boss.health > boss.maxHealth / 2) {
      return;
    }

    boss.bossSplitTriggered = true;
    for (let index = 0; index < 6; index += 1) {
      const routeId = index % 2 === 0 ? "left" : "right";
      this.enemies.spawn("miniVirus", routeId, Math.max(0, boss.progress - 0.035 + index * 0.006));
    }
    this.runtime.message = "变异病毒团开始分裂，小病毒正在扩散！";
    pushRuntimeEffect(this.runtime, {
      x: boss.x,
      y: boss.y,
      text: "分裂！",
      tone: "boss"
    });
  }

  cleanup(): void {}
}
