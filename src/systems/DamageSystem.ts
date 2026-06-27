import type { BattleSystem } from "../types/battle";

export class DamageSystem implements BattleSystem {
  readonly name = "DamageSystem";

  update(): void {}

  cleanup(): void {}
}
