import { BATTLE_BALANCE_CONFIG } from "../configs/balanceConfig";
import type { BattleSystem } from "../types/battle";

export class ATPSystem implements BattleSystem {
  readonly name = "ATPSystem";
  private lastTickAt = 0;
  private readonly onGain?: (amount: number) => void;

  constructor(onGain?: (amount: number) => void) {
    this.onGain = onGain;
  }

  update(time: number): void {
    if (!this.onGain || time - this.lastTickAt < BATTLE_BALANCE_CONFIG.resources.atpTickMs) {
      return;
    }

    this.lastTickAt = time;
    this.onGain(BATTLE_BALANCE_CONFIG.resources.atpPerTick);
  }

  cleanup(): void {
    this.lastTickAt = 0;
  }
}
