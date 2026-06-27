import type { BattleSystem } from "../types/battle";

export class EnemySystem implements BattleSystem {
  readonly name = "EnemySystem";

  update(): void {}

  cleanup(): void {}
}
