import type Phaser from "phaser";
import type { BattleSystem } from "../types/battle";

export class EffectSystem implements BattleSystem {
  readonly name = "EffectSystem";
  private readonly scene?: Phaser.Scene;

  constructor(scene?: Phaser.Scene) {
    this.scene = scene;
  }

  update(): void {}

  cleanup(): void {
    this.scene?.tweens.killAll();
  }
}
