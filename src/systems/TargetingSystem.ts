import type { BattleSystem } from "../types/battle";

export class TargetingSystem implements BattleSystem {
  readonly name = "TargetingSystem";

  update(): void {}

  cleanup(): void {}
}
