import Phaser from "phaser";
import { ENEMY_CONFIGS } from "../configs/enemies";
import type { EnemyKind } from "../types/game";

export class Enemy extends Phaser.GameObjects.Container {
  readonly kind: EnemyKind;
  readonly lane: number;
  readonly reward: number;
  readonly damageToCore: number;
  readonly isVirus: boolean;
  readonly isCancer: boolean;
  readonly baseSpeed: number;

  maxHealth: number;
  health: number;
  lastCloneAt = 0;
  nextFakeDeathAt = 0;
  fakeDeathUntil = 0;
  berserk = false;
  shieldUntil = 0;

  private readonly avatar: Phaser.GameObjects.Graphics;
  private readonly hpBack: Phaser.GameObjects.Rectangle;
  private readonly hpBar: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, kind: EnemyKind, lane: number, x: number, y: number, healthMultiplier: number) {
    const config = ENEMY_CONFIGS[kind];
    super(scene, x, y);

    this.kind = kind;
    this.lane = lane;
    this.maxHealth = Math.round(config.health * healthMultiplier);
    this.health = this.maxHealth;
    this.reward = config.reward;
    this.damageToCore = config.damage;
    this.isVirus = Boolean(config.isVirus);
    this.isCancer = Boolean(config.isCancer);
    this.baseSpeed = config.speed * 38;

    const radius = kind === "cancerKing" ? 32 : kind === "cancerCell" ? 24 : 18;
    this.avatar = scene.add.graphics();
    this.drawAvatar(radius);

    this.label = scene.add.text(0, -3, this.getShortName(kind), {
      fontFamily: "system-ui",
      fontSize: kind === "cancerKing" ? "13px" : "11px",
      fontStyle: "900",
      color: "#ffffff"
    });
    this.label.setOrigin(0.5);

    const barWidth = kind === "cancerKing" ? 64 : 42;
    this.hpBack = scene.add.rectangle(0, -radius - 8, barWidth, 5, 0xffffff, 0.9).setOrigin(0.5);
    this.hpBar = scene.add.rectangle(-barWidth / 2, -radius - 8, barWidth, 5, 0x22c55e, 1).setOrigin(0, 0.5);

    this.add([this.avatar, this.label, this.hpBack, this.hpBar]);
    scene.add.existing(this);

    this.nextFakeDeathAt = scene.time.now + Phaser.Math.Between(6500, 10500);
    if (kind === "cancerCell" || kind === "cancerKing") {
      scene.tweens.add({
        targets: this.avatar,
        scale: 1.16,
        yoyo: true,
        repeat: -1,
        duration: kind === "cancerKing" ? 520 : 760
      });
    }
  }

  step(deltaSeconds: number, speedMultiplier: number): void {
    if (this.isFakeDead()) {
      return;
    }

    this.x += this.baseSpeed * speedMultiplier * deltaSeconds;
  }

  isFakeDead(): boolean {
    return this.scene.time.now < this.fakeDeathUntil;
  }

  beginFakeDeath(milliseconds: number): void {
    this.fakeDeathUntil = this.scene.time.now + milliseconds;
    this.nextFakeDeathAt = this.fakeDeathUntil + Phaser.Math.Between(6500, 10500);
    this.setAlpha(0.42);
    this.scene.time.delayedCall(milliseconds, () => {
      if (this.active) {
        this.setAlpha(1);
      }
    });
  }

  triggerBerserk(): void {
    if (this.berserk) {
      return;
    }
    this.berserk = true;
    this.setScale(1.18);
    this.avatar.lineStyle(4, 0xfff1f2, 1);
  }

  takeDamage(amount: number, crit = false): boolean {
    const config = ENEMY_CONFIGS[this.kind];
    if (this.scene.time.now < this.shieldUntil) {
      amount *= 0.35;
    }

    const armor = config.armor ?? 0;
    const finalDamage = Math.max(1, amount * (1 - armor));
    this.health = Math.max(0, this.health - finalDamage);
    this.updateHealthBar();

    if (crit) {
      this.scene.tweens.add({
        targets: this.avatar,
        scale: 1.26,
        yoyo: true,
        duration: 80
      });
    }

    return this.health <= 0;
  }

  heal(percent: number): void {
    this.health = Math.min(this.maxHealth, this.health + this.maxHealth * percent);
    this.updateHealthBar();
  }

  activateShield(seconds: number): void {
    this.shieldUntil = this.scene.time.now + seconds * 1000;
    this.avatar.lineStyle(4, 0xfacc15, 1);
    this.scene.time.delayedCall(seconds * 1000, () => {
      if (this.active) {
        this.avatar.lineStyle(3, 0xffffff, 0.85);
      }
    });
  }

  private drawAvatar(radius: number): void {
    const config = ENEMY_CONFIGS[this.kind];
    this.avatar.clear();
    this.avatar.lineStyle(3, 0xffffff, 0.86);
    this.avatar.fillStyle(config.color, 1);

    if (this.kind === "bacteria") {
      this.avatar.fillCircle(0, 0, radius);
      this.avatar.strokeCircle(0, 0, radius);
      this.avatar.fillStyle(0xd9f99d, 0.95);
      this.avatar.fillCircle(-6, -5, 5);
      this.avatar.fillCircle(8, 7, 4);
      return;
    }

    if (this.kind === "fluVirus" || this.kind === "mutantVirus" || this.kind === "miniVirus") {
      const points: Phaser.Types.Math.Vector2Like[] = [];
      const spikeCount = this.kind === "miniVirus" ? 8 : 10;
      const outer = this.kind === "miniVirus" ? radius + 6 : radius + 10;
      for (let i = 0; i < spikeCount * 2; i += 1) {
        const r = i % 2 === 0 ? outer : radius * 0.74;
        const angle = -Math.PI / 2 + (i * Math.PI) / spikeCount;
        points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
      }
      this.avatar.fillPoints(points, true);
      this.avatar.strokePoints(points, true);
      this.avatar.fillStyle(0xffffff, 0.72);
      this.avatar.fillCircle(0, 0, Math.max(5, radius * 0.38));
      return;
    }

    if (this.kind === "resistantBacteria") {
      this.avatar.fillRoundedRect(-23, -18, 46, 36, 7);
      this.avatar.strokeRoundedRect(-23, -18, 46, 36, 7);
      this.avatar.lineStyle(2, 0xcbd5e1, 0.9);
      this.avatar.lineBetween(-17, -7, 17, -7);
      this.avatar.lineBetween(-17, 7, 17, 7);
      return;
    }

    this.avatar.fillStyle(this.kind === "cancerKing" ? 0x450a0a : 0x7f1d1d, 1);
    this.avatar.fillCircle(0, 0, radius);
    this.avatar.lineStyle(4, 0xfb7185, 1);
    this.avatar.strokeCircle(0, 0, radius);
    this.avatar.fillStyle(0xff1744, 0.78);
    this.avatar.fillCircle(-radius * 0.25, -radius * 0.18, radius * 0.38);
    this.avatar.fillStyle(0x111827, 0.78);
    this.avatar.fillCircle(radius * 0.24, radius * 0.16, radius * 0.46);
    this.avatar.lineStyle(2, 0xffb4c2, 0.72);
    this.avatar.lineBetween(-radius, 0, radius, 0);
    this.avatar.lineBetween(0, -radius, 0, radius);
  }

  private updateHealthBar(): void {
    const ratio = Phaser.Math.Clamp(this.health / this.maxHealth, 0, 1);
    this.hpBar.scaleX = ratio;
    this.hpBar.fillColor = ratio > 0.45 ? 0x22c55e : ratio > 0.18 ? 0xf59e0b : 0xef4444;
  }

  private getShortName(kind: EnemyKind): string {
    const names: Record<EnemyKind, string> = {
      normalVirus: "普毒",
      fastVirus: "快毒",
      bacteria: "菌",
      fluVirus: "毒",
      resistantBacteria: "耐",
      mutantVirus: "变",
      miniVirus: "小",
      cancerCell: "癌",
      cancerKing: "癌王",
      mutantVirusCluster: "毒团"
    };

    return names[kind];
  }
}
