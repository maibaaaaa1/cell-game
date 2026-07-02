import type { BattleSystem } from "../types/battle";

export class TutorialSystem implements BattleSystem {
  readonly name = "TutorialSystem";

  update(): void {}

  cleanup(): void {}
}
