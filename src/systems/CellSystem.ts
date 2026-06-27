import { CELL_CONFIG } from "../configs/cellConfig.ts";
import { ROUTE_CONFIG } from "../configs/routeConfig.ts";
import type { BattleSystem } from "../types/battle.ts";
import type { CellKind } from "../types/game.ts";
import type { ATPSystem } from "./ATPSystem.ts";
import type { BattleRuntimeState, RuntimeCell } from "./BattleRuntimeState.ts";
import type { ProjectileSystem } from "./ProjectileSystem.ts";
import type { TargetingSystem } from "./TargetingSystem.ts";

export class CellSystem implements BattleSystem {
  readonly name = "CellSystem";
  private readonly runtime?: BattleRuntimeState;
  private readonly atp?: ATPSystem;
  private targeting?: TargetingSystem;
  private projectiles?: ProjectileSystem;

  constructor(runtime?: BattleRuntimeState, atp?: ATPSystem) {
    this.runtime = runtime;
    this.atp = atp;
  }

  wireCombat(targeting: TargetingSystem, projectiles: ProjectileSystem): void {
    this.targeting = targeting;
    this.projectiles = projectiles;
  }

  deploy(kind: CellKind, slotId: string): RuntimeCell | null {
    if (!this.runtime || !this.atp) {
      return null;
    }
    if (kind !== "macrophage" && kind !== "nk") {
      this.runtime.message = "第一关暂未开放该免疫细胞。";
      return null;
    }

    const config = CELL_CONFIG[kind];
    const slot = this.findSlot(slotId);
    if (!slot) {
      this.runtime.message = "请选择发光的免疫驻点部署。";
      return null;
    }
    if (this.runtime.cells.some((cell) => cell.slotId === slotId)) {
      this.runtime.message = "该免疫驻点已有细胞。";
      return null;
    }
    if (!this.atp.spend(config.cost)) {
      this.runtime.message = `ATP不足，部署${kind === "macrophage" ? "巨噬细胞" : "NK细胞"}需要${config.cost}。`;
      return null;
    }

    const cell: RuntimeCell = {
      id: `cell-${this.runtime.nextCellId}`,
      kind,
      slotId,
      routeId: slot.y < 0.46 ? "left" : "right",
      x: slot.x,
      y: slot.y,
      range: config.range,
      attack: config.attack,
      attackCooldownMs: 1000 / Math.max(0.1, config.attackRate),
      lastAttackAt: 0
    };
    this.runtime.nextCellId += 1;
    this.runtime.cells.push(cell);
    this.runtime.message = `${kind === "macrophage" ? "巨噬细胞" : "NK细胞"}已部署。`;
    return cell;
  }

  update(time = 0): void {
    if (!this.runtime || !this.targeting || !this.projectiles || this.runtime.status !== "playing") {
      return;
    }

    for (const cell of this.runtime.cells) {
      if (time - cell.lastAttackAt < cell.attackCooldownMs) {
        continue;
      }
      const target = this.targeting.findTarget(cell);
      if (!target) {
        continue;
      }
      cell.lastAttackAt = time;
      this.projectiles.fire(cell, target);
    }
  }

  cleanup(): void {
    if (this.runtime) {
      this.runtime.cells = [];
    }
  }

  private findSlot(slotId: string) {
    return ROUTE_CONFIG.noseLeft.cellSlots.find((slot) => slot.id === slotId);
  }
}
