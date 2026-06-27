import type { BattleSystem } from "../types/battle";

export class FeverSystem implements BattleSystem {
  readonly name = "FeverSystem";
  temperature = 37;

  update(): void {}

  cleanup(): void {
    this.temperature = 37;
  }
}
