import type { BattleSystem } from "../types/battle";

export class SkillSystem implements BattleSystem {
  readonly name = "SkillSystem";

  update(): void {}

  cleanup(): void {}
}
