import { ENEMY_CONFIG } from "../configs/enemyConfig.ts";
import { BATTLE_BALANCE_CONFIG } from "../configs/balanceConfig.ts";
import { ROUTE_CONFIG } from "../configs/routeConfig.ts";
import type { BattleSystem } from "../types/battle.ts";
import type { EnemyKind } from "../types/game.ts";
import { pushRuntimeEffect, type BattleRouteSide, type BattleRuntimeState, type RuntimeEnemy } from "./BattleRuntimeState.ts";

const ROUTE_BY_SIDE: Record<BattleRouteSide, string> = {
  left: "noseLeft",
  right: "noseRight"
};

export class EnemySystem implements BattleSystem {
  readonly name = "EnemySystem";
  private readonly runtime?: BattleRuntimeState;

  constructor(runtime?: BattleRuntimeState) {
    this.runtime = runtime;
  }

  spawn(kind: EnemyKind, routeId: BattleRouteSide = "left", progress = 0): RuntimeEnemy {
    if (!this.runtime) {
      throw new Error("EnemySystem requires runtime state to spawn enemies.");
    }

    const config = ENEMY_CONFIG[kind];
    if (!config) {
      throw new Error(`Missing enemy config: ${kind}`);
    }

    const position = this.positionOnRoute(routeId, progress);
    const enemy: RuntimeEnemy = {
      id: `enemy-${this.runtime.nextEnemyId}`,
      kind,
      routeId,
      health: config.health,
      maxHealth: config.health,
      speed: config.speed,
      reward: this.rewardFor(kind, config.reward),
      damage: config.damage,
      progress,
      x: position.x,
      y: position.y
    };
    this.runtime.nextEnemyId += 1;
    this.runtime.enemies.push(enemy);
    if (kind === "mutantVirusCluster") {
      this.runtime.message = "Boss 变异病毒团出现！";
      pushRuntimeEffect(this.runtime, {
        x: enemy.x,
        y: enemy.y,
        text: "Boss出现",
        tone: "boss"
      });
    }
    return enemy;
  }

  update(timeOrDelta = 0, maybeDelta?: number): void {
    if (!this.runtime || this.runtime.status !== "playing") {
      return;
    }

    const delta = maybeDelta ?? timeOrDelta;
    const speedScale = this.runtime.levelSpeedMultiplier * this.runtime.gameSpeed;
    const reached: RuntimeEnemy[] = [];
    for (const enemy of this.runtime.enemies) {
      enemy.progress = Math.min(1, enemy.progress + (enemy.speed * speedScale * delta) / 22000);
      const position = this.positionOnRoute(enemy.routeId, enemy.progress);
      enemy.x = position.x;
      enemy.y = position.y;
      if (enemy.progress >= 1) {
        reached.push(enemy);
      }
    }

    for (const enemy of reached) {
      this.runtime.tissueIntegrity = Math.max(0, this.runtime.tissueIntegrity - enemy.damage);
      pushRuntimeEffect(this.runtime, {
        x: enemy.x,
        y: enemy.y,
        text: `组织 -${enemy.damage}`,
        tone: "danger"
      });
      this.runtime.enemies = this.runtime.enemies.filter((item) => item.id !== enemy.id);
      this.runtime.message = `${this.nameFor(enemy.kind)}突破防线，组织耐久下降。`;
      if (this.runtime.tissueIntegrity <= 0) {
        this.runtime.status = "defeat";
        this.runtime.message = "组织耐久归零，鼻腔防线失守。";
      }
    }
  }

  cleanup(): void {
    if (this.runtime) {
      this.runtime.enemies = [];
    }
  }

  private positionOnRoute(routeId: BattleRouteSide, progress: number): { x: number; y: number } {
    const route = ROUTE_CONFIG[ROUTE_BY_SIDE[routeId]];
    const points = route.points;
    const scaled = Math.min(points.length - 1.0001, Math.max(0, progress) * (points.length - 1));
    const index = Math.floor(scaled);
    const local = scaled - index;
    const start = points[index] ?? points[0];
    const end = points[index + 1] ?? points[points.length - 1];
    return {
      x: start.x + (end.x - start.x) * local,
      y: start.y + (end.y - start.y) * local
    };
  }

  private nameFor(kind: EnemyKind): string {
    return ENEMY_CONFIG[kind]?.id ?? kind;
  }

  private rewardFor(kind: EnemyKind, fallback: number): number {
    const rewards = BATTLE_BALANCE_CONFIG.resources.firstLevelEnemyRewards;
    return rewards[kind as keyof typeof rewards] ?? fallback;
  }
}
