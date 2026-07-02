import type { BattleSystem } from "../types/battle.ts";
import type { BattleRuntimeState, RuntimeCell, RuntimeEnemy } from "./BattleRuntimeState.ts";

export class TargetingSystem implements BattleSystem {
  readonly name = "TargetingSystem";
  private readonly runtime?: BattleRuntimeState;

  constructor(runtime?: BattleRuntimeState) {
    this.runtime = runtime;
  }

  findTarget(cell: RuntimeCell): RuntimeEnemy | null {
    if (!this.runtime) {
      return null;
    }

    const candidates = this.runtime.enemies
      .filter((enemy) => distance(cell.x, cell.y, enemy.x, enemy.y) <= cell.range)
      .sort((a, b) => b.progress - a.progress);

    if (cell.kind === "nk") {
      const virus = candidates.find((enemy) => enemy.kind !== "bacteria");
      if (virus) {
        return virus;
      }
    }

    return candidates[0] ?? null;
  }

  cleanup(): void {}
}

function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}
