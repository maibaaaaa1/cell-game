import type { BattleSystem } from "../types/battle.ts";
import { pushRuntimeEffect, type BattleRuntimeState, type RuntimeCell, type RuntimeEnemy } from "./BattleRuntimeState.ts";
import type { DamageSystem } from "./DamageSystem.ts";

export class ProjectileSystem implements BattleSystem {
  readonly name = "ProjectileSystem";
  private readonly runtime?: BattleRuntimeState;
  private readonly damage?: DamageSystem;

  constructor(runtime?: BattleRuntimeState, damage?: DamageSystem) {
    this.runtime = runtime;
    this.damage = damage;
  }

  fire(cell: RuntimeCell, target: RuntimeEnemy): void {
    if (!this.runtime) {
      return;
    }

    this.runtime.projectiles.push({
      id: `projectile-${this.runtime.nextProjectileId}`,
      targetId: target.id,
      sourceCellKind: cell.kind,
      x: cell.x,
      y: cell.y,
      damage: cell.attack,
      speed: 1.8
    });
    this.runtime.nextProjectileId += 1;
  }

  update(timeOrDelta = 0, maybeDelta?: number): void {
    if (!this.runtime || !this.damage) {
      return;
    }

    const delta = maybeDelta ?? timeOrDelta;
    const remaining = [];
    for (const projectile of this.runtime.projectiles) {
      const target = this.runtime.enemies.find((enemy) => enemy.id === projectile.targetId);
      if (!target) {
        continue;
      }

      const distance = Math.hypot(target.x - projectile.x, target.y - projectile.y);
      const step = (projectile.speed * delta) / 1000;
      if (distance <= step || distance <= 0.015) {
        pushRuntimeEffect(this.runtime, {
          x: target.x,
          y: target.y,
          text: "",
          tone: "hit"
        });
        this.damage.apply(target.id, projectile.damage, projectile.sourceCellKind);
        continue;
      }
      projectile.x += ((target.x - projectile.x) / distance) * step;
      projectile.y += ((target.y - projectile.y) / distance) * step;
      remaining.push(projectile);
    }
    this.runtime.projectiles = remaining;
  }

  cleanup(): void {
    if (this.runtime) {
      this.runtime.projectiles = [];
    }
  }
}
