import type { BattleSystem } from "../types/battle";

export class FeedbackSystem implements BattleSystem {
  readonly name = "FeedbackSystem";

  update(): void {}

  cleanup(): void {}
}
