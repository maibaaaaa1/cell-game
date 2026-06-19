import Phaser from "phaser";
import { CELL_CONFIGS } from "../configs/cells";
import type { CellKind } from "../types/game";

export class CellTower extends Phaser.GameObjects.Container {
  readonly kind: CellKind;
  readonly row: number;
  readonly col: number;
  readonly maxHealth: number;

  level = 1;
  health: number;
  lastAttackAt = 0;
  expiresAt?: number;

  private readonly avatar: Phaser.GameObjects.Graphics;
  private readonly levelText: Phaser.GameObjects.Text;
  private readonly label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, kind: CellKind, row: number, col: number, x: number, y: number) {
    const config = CELL_CONFIGS[kind];
    super(scene, x, y);

    this.kind = kind;
    this.row = row;
    this.col = col;
    this.health = config.health;
    this.maxHealth = config.health;

    this.avatar = scene.add.graphics();
    this.drawAvatar();

    this.label = scene.add.text(0, -3, this.shortName, {
      fontFamily: "system-ui",
      fontSize: "12px",
      fontStyle: "900",
      color: "#ffffff"
    });
    this.label.setOrigin(0.5);

    this.levelText = scene.add.text(20, 16, "1", {
      fontFamily: "system-ui",
      fontSize: "11px",
      fontStyle: "900",
      color: "#0f172a",
      backgroundColor: "#ffffff"
    });
    this.levelText.setOrigin(0.5);

    this.add([this.avatar, this.label, this.levelText]);
    scene.add.existing(this);
  }

  get config() {
    return CELL_CONFIGS[this.kind];
  }

  get attack(): number {
    return this.config.levels[this.level - 1]?.attack ?? this.config.baseAttack;
  }

  get upgradeCost(): number {
    return this.config.levels[this.level - 1]?.upgradeCost ?? 0;
  }

  get isMaxLevel(): boolean {
    return this.level >= 3;
  }

  upgrade(): void {
    if (this.isMaxLevel) {
      return;
    }

    this.level += 1;
    this.levelText.setText(String(this.level));
    this.scene.tweens.add({
      targets: this,
      scale: 1.18,
      yoyo: true,
      duration: 130
    });
  }

  heal(percent: number): void {
    this.health = Math.min(this.maxHealth, this.health + this.maxHealth * percent);
  }

  pulse(): void {
    this.scene.tweens.add({
      targets: this.avatar,
      scale: 1.16,
      yoyo: true,
      duration: 90
    });
  }

  private drawAvatar(): void {
    const color = this.config.color;
    this.avatar.clear();
    this.avatar.lineStyle(3, 0xffffff, 1);
    this.avatar.fillStyle(color, 0.96);

    if (this.kind === "macrophage") {
      this.avatar.fillCircle(0, 0, 24);
      this.avatar.strokeCircle(0, 0, 24);
      this.avatar.fillStyle(0xffffff, 0.34);
      this.avatar.fillCircle(-8, -7, 7);
      this.avatar.fillStyle(0x7c2d12, 0.7);
      this.avatar.fillCircle(8, 5, 8);
      return;
    }

    if (this.kind === "nk") {
      this.drawStar(0, 0, 14, 27, 7, color);
      this.avatar.fillStyle(0xffffff, 0.86);
      this.avatar.fillCircle(0, 0, 7);
      return;
    }

    if (this.kind === "bcell") {
      this.avatar.fillEllipse(0, 0, 54, 36);
      this.avatar.strokeEllipse(0, 0, 54, 36);
      this.avatar.lineStyle(3, 0xffffff, 0.75);
      this.avatar.strokeCircle(-12, -2, 7);
      this.avatar.strokeCircle(12, 2, 7);
      return;
    }

    if (this.kind === "cd4") {
      this.avatar.fillCircle(0, 0, 20);
      this.avatar.strokeCircle(0, 0, 20);
      this.avatar.lineStyle(4, 0xfef3c7, 0.86);
      this.avatar.strokeCircle(0, 0, 30);
      return;
    }

    if (this.kind === "cd8") {
      this.avatar.fillTriangle(0, -29, 27, 20, -27, 20);
      this.avatar.strokeTriangle(0, -29, 27, 20, -27, 20);
      this.avatar.fillStyle(0xffffff, 0.9);
      this.avatar.fillTriangle(0, -15, 11, 12, -11, 12);
      return;
    }

    this.avatar.fillCircle(0, 0, 18);
    this.avatar.strokeCircle(0, 0, 18);
    this.avatar.lineStyle(4, color, 0.75);
    for (let i = 0; i < 8; i += 1) {
      const angle = (Math.PI * 2 * i) / 8;
      this.avatar.lineBetween(Math.cos(angle) * 16, Math.sin(angle) * 16, Math.cos(angle) * 31, Math.sin(angle) * 31);
    }
  }

  private drawStar(x: number, y: number, inner: number, outer: number, points: number, color: number): void {
    const vertices: Phaser.Types.Math.Vector2Like[] = [];
    for (let i = 0; i < points * 2; i += 1) {
      const radius = i % 2 === 0 ? outer : inner;
      const angle = -Math.PI / 2 + (i * Math.PI) / points;
      vertices.push({ x: x + Math.cos(angle) * radius, y: y + Math.sin(angle) * radius });
    }
    this.avatar.fillStyle(color, 0.96);
    this.avatar.fillPoints(vertices, true);
    this.avatar.strokePoints(vertices, true);
  }

  private get shortName(): string {
    const names: Record<CellKind, string> = {
      macrophage: "巨",
      dendritic: "树",
      nk: "NK",
      bcell: "B",
      cd4: "CD4",
      cd8: "CD8"
    };

    return names[this.kind];
  }
}
