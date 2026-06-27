import type { BattleSystem } from "../types/battle";

export class ProjectileSystem implements BattleSystem {
  readonly name = "ProjectileSystem";

  update(): void {}

  cleanup(): void {}
}
