import { BATTLE_BALANCE_CONFIG } from "../configs/balanceConfig.ts";
import type { BattleRuntimeState } from "./BattleRuntimeState.ts";
import type { BattleSystem } from "../types/battle.ts";

export class ATPSystem implements BattleSystem {
  readonly name = "ATPSystem";
  private lastTickAt = 0;
  private readonly runtime?: BattleRuntimeState;
  private readonly onGain?: (amount: number) => void;

  constructor(runtimeOrGain?: BattleRuntimeState | ((amount: number) => void)) {
    if (typeof runtimeOrGain === "function") {
      this.onGain = runtimeOrGain;
      return;
    }
    this.runtime = runtimeOrGain;
  }

  spend(amount: number): boolean {
    if (!this.runtime) {
      return false;
    }
    if (this.runtime.atp < amount) {
      return false;
    }
    this.runtime.atp -= amount;
    return true;
  }

  gain(amount: number): void {
    if (this.runtime) {
      this.runtime.atp = Math.min(this.runtime.maxAtp, this.runtime.atp + amount);
      return;
    }
    this.onGain?.(amount);
  }

  update(time: number, delta = 0): void {
    if (this.runtime && delta > 0) {
      this.gain((BATTLE_BALANCE_CONFIG.resources.atpPerSecond * delta) / 1000);
      return;
    }

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
