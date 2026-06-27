import type { BattleSystem } from "../types/battle";

export class BossSystem implements BattleSystem {
  readonly name = "BossSystem";

  update(): void {}

  cleanup(): void {}
}
