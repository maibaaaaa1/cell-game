import Phaser from "phaser";
import { Enemy } from "./Enemy";

export class Projectile extends Phaser.GameObjects.Arc {
  readonly target: Enemy;
  readonly damage: number;
  readonly crit: boolean;

  private readonly speed: number;

  constructor(scene: Phaser.Scene, x: number, y: number, target: Enemy, damage: number, color: number, crit: boolean) {
    super(scene, x, y, 7, 0, 360, false, color, 1);
    this.target = target;
    this.damage = damage;
    this.crit = crit;
    this.speed = 520;
    this.setStrokeStyle(2, 0xffffff, 0.9);
    scene.add.existing(this);
  }

  step(deltaSeconds: number): boolean {
    if (!this.target.active) {
      this.destroy();
      return false;
    }

    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
    this.x += Math.cos(angle) * this.speed * deltaSeconds;
    this.y += Math.sin(angle) * this.speed * deltaSeconds;

    if (Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y) < 18) {
      this.destroy();
      return true;
    }

    return false;
  }
}
