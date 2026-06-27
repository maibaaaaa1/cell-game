import type { BattleSystem } from "../types/battle";

export class CellSystem implements BattleSystem {
  readonly name = "CellSystem";

  update(): void {}

  cleanup(): void {}
}
