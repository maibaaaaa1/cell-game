import Phaser from "phaser";
import { BATTLE_BALANCE_CONFIG } from "../configs/balanceConfig.ts";
import { CELL_CONFIG } from "../configs/cellConfig.ts";
import { FIRST_LEVEL_CELL_ORDER, FIRST_LEVEL_ROUTE_IDS, FIRST_LEVEL_WAVE_SET_ID } from "../configs/firstLevelConfig.ts";
import { ROUTE_CONFIG } from "../configs/routeConfig.ts";
import { AudioCueSystem } from "../systems/AudioCueSystem.ts";
import { ATPSystem } from "../systems/ATPSystem.ts";
import { BattleLoopSystem } from "../systems/BattleLoopSystem.ts";
import { createBattleRuntimeState, type BattleRuntimeState, type RuntimeCell, type RuntimeEnemy } from "../systems/BattleRuntimeState.ts";
import { BossSystem } from "../systems/BossSystem.ts";
import { CellSystem } from "../systems/CellSystem.ts";
import { DamageSystem } from "../systems/DamageSystem.ts";
import { EnemySystem } from "../systems/EnemySystem.ts";
import { emitBattleState, onBattleCommand } from "../systems/gameBus";
import { ProjectileSystem } from "../systems/ProjectileSystem.ts";
import { TargetingSystem } from "../systems/TargetingSystem.ts";
import { WaveSystem } from "../systems/WaveSystem.ts";
import type { BattleState, CellKind, EnemyKind, LevelConfig, SkillKind } from "../types/game.ts";

type SlotView = { id: string; x: number; y: number; radius: number };

const PLAYABLE_CELLS = FIRST_LEVEL_CELL_ORDER;

export class BattleScene extends Phaser.Scene {
  private readonly level: LevelConfig;
  private readonly onSaveChanged: () => void;
  private readonly audio: AudioCueSystem;
  private runtime: BattleRuntimeState = createBattleRuntimeState();
  private loop?: BattleLoopSystem;
  private atp?: ATPSystem;
  private cells?: CellSystem;
  private cleanupCommands?: () => void;
  private selectedCell?: CellKind;
  private lastStateEmit = 0;
  private paused = false;
  private finishShown = false;
  private slots: SlotView[] = [];
  private readonly slotDiscs = new Map<string, Phaser.GameObjects.Arc>();
  private rangePreview?: Phaser.GameObjects.Arc;
  private readonly enemyViews = new Map<string, Phaser.GameObjects.Container>();
  private readonly cellViews = new Map<string, Phaser.GameObjects.Container>();
  private readonly projectileViews = new Map<string, Phaser.GameObjects.Arc>();
  private readonly effectViews = new Set<Phaser.GameObjects.GameObject>();

  constructor(level: LevelConfig, onSaveChanged: () => void, soundEnabled: boolean) {
    super("BattleScene");
    this.level = level;
    this.onSaveChanged = onSaveChanged;
    this.audio = new AudioCueSystem({ enabled: soundEnabled });
  }

  create(): void {
    this.createRuntime();
    this.drawBattlefield();
    this.bindCommands();
    this.emitState(true);
  }

  update(time: number, delta: number): void {
    if (!this.paused && this.runtime.status === "playing") {
      this.loop?.update(time, delta);
      this.checkFinish();
    }

    this.renderRuntime();
    this.emitState();
  }

  private createRuntime(): void {
    this.resetSceneState();
    this.runtime = createBattleRuntimeState({ maxWave: 9 });
    const enemies = new EnemySystem(this.runtime);
    const damage = new DamageSystem(this.runtime);
    const targeting = new TargetingSystem(this.runtime);
    const projectiles = new ProjectileSystem(this.runtime, damage);
    this.atp = new ATPSystem(this.runtime);
    this.cells = new CellSystem(this.runtime, this.atp);
    this.cells.wireCombat(targeting, projectiles);
    const boss = new BossSystem(this.runtime, enemies);
    const waves = new WaveSystem(FIRST_LEVEL_WAVE_SET_ID, this.runtime, enemies);
    this.loop = new BattleLoopSystem([this.atp, waves, enemies, boss, this.cells, projectiles]);
  }

  private bindCommands(): void {
    this.releaseCommandListener();
    this.cleanupCommands = onBattleCommand((command) => {
      if (command.type === "select-cell") {
        if (!PLAYABLE_CELLS.includes(command.cell)) {
          this.runtime.message = "第一关只开放巨噬细胞和NK细胞。";
          this.emitState(true);
          return;
        }
        this.selectedCell = command.cell;
        this.runtime.selectedCell = command.cell;
        this.runtime.message = `已选择${command.cell === "macrophage" ? "巨噬细胞" : "NK细胞"}，点击发光驻点部署。`;
        this.updateRangePreview(undefined);
        this.updateSlotHighlights();
        this.emitState(true);
      }

      if (command.type === "place-selected") {
        this.placeSelectedAt(command.x, command.y);
      }

      if (command.type === "toggle-pause") {
        this.paused = !this.paused;
        this.runtime.message = this.paused ? "战斗已暂停。" : "战斗继续。";
        this.emitState(true);
      }

      if (command.type === "resume") {
        this.paused = false;
        this.runtime.message = "战斗继续。";
        this.emitState(true);
      }

      if (command.type === "restart") {
        this.cleanupBattleResources();
        this.scene.restart();
      }

      if (command.type === "use-skill") {
        this.rejectUnavailableSkill(command.skill);
      }
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanupBattleResources());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => {
      this.cleanupBattleResources();
      void this.audio.dispose();
    });
  }

  private releaseCommandListener(): void {
    this.cleanupCommands?.();
    this.cleanupCommands = undefined;
  }

  private placeSelectedAt(x: number, y: number): void {
    if (!this.selectedCell || !this.cells || this.runtime.status !== "playing") {
      this.runtime.message = "先选择巨噬细胞或NK细胞。";
      this.emitState(true);
      return;
    }

    const slot = this.getSlotAt(x, y);
    if (!slot) {
      this.selectedCell = undefined;
      this.runtime.selectedCell = undefined;
      this.runtime.message = "已取消选择。";
      this.updateRangePreview(undefined);
      this.updateSlotHighlights();
      this.emitState(true);
      return;
    }

    const cell = this.cells.deploy(this.selectedCell, slot.id);
    this.updateRangePreview(cell);
    this.updateSlotHighlights();
    if (cell) {
      this.playDeployFeedback(cell);
    }
    this.emitState(true);
  }

  private rejectUnavailableSkill(_skill: SkillKind): void {
    this.runtime.message = "第一关教学阶段暂未开放免疫支援技能。";
    this.emitState(true);
  }

  private drawBattlefield(): void {
    this.cameras.main.setBackgroundColor(0xf0fdfa);
    this.add.rectangle(this.centerX, this.centerY, this.width, this.height, 0xf8fbff, 1);
    this.drawRoutes();
    this.drawCore();
    this.drawSlots();
  }

  private drawRoutes(): void {
    const graphics = this.add.graphics();
    for (const routeId of FIRST_LEVEL_ROUTE_IDS) {
      const route = ROUTE_CONFIG[routeId];
      graphics.lineStyle(34, 0xccfbf1, 1);
      route.points.forEach((point, index) => {
        const world = this.toWorld(point.x, point.y);
        if (index === 0) {
          graphics.beginPath();
          graphics.moveTo(world.x, world.y);
          return;
        }
        graphics.lineTo(world.x, world.y);
      });
      graphics.strokePath();
      graphics.lineStyle(4, 0x14b8a6, 0.42);
      route.points.forEach((point, index) => {
        const world = this.toWorld(point.x, point.y);
        if (index === 0) {
          graphics.beginPath();
          graphics.moveTo(world.x, world.y);
          return;
        }
        graphics.lineTo(world.x, world.y);
      });
      graphics.strokePath();
    }
  }

  private drawCore(): void {
    const core = this.add.rectangle(this.width - 24, this.centerY, 30, this.height * 0.56, 0xff7aa2, 0.9);
    core.setStrokeStyle(3, 0xffffff, 0.9);
    this.add
      .text(this.width - 24, this.centerY, "核心\n组织", {
        fontFamily: "system-ui",
        fontSize: "13px",
        fontStyle: "900",
        align: "center",
        color: "#7f1d1d"
      })
      .setOrigin(0.5);
  }

  private drawSlots(): void {
    this.slots = ROUTE_CONFIG.noseLeft.cellSlots.map((slot) => {
      const world = this.toWorld(slot.x, slot.y);
      const radius = 24;
      const view = this.add.circle(world.x, world.y, radius, 0x38bdf8, 0.2);
      view.setStrokeStyle(3, 0x38bdf8, 0.72);
      this.slotDiscs.set(slot.id, view);
      return { id: slot.id, x: world.x, y: world.y, radius };
    });
    this.updateSlotHighlights();
  }

  private updateSlotHighlights(): void {
    for (const slot of this.slots) {
      const disc = this.slotDiscs.get(slot.id);
      if (!disc) {
        continue;
      }
      const occupied = this.runtime.cells.some((cell) => cell.slotId === slot.id);
      if (occupied) {
        disc.setFillStyle(0xffffff, 0.12);
        disc.setStrokeStyle(2, 0x94a3b8, 0.32);
      } else if (this.selectedCell) {
        disc.setFillStyle(0x22d3ee, 0.34);
        disc.setStrokeStyle(4, 0x06b6d4, 0.95);
      } else {
        disc.setFillStyle(0x38bdf8, 0.2);
        disc.setStrokeStyle(3, 0x38bdf8, 0.72);
      }
    }
  }

  private renderRuntime(): void {
    this.renderCells();
    this.renderEnemies();
    this.renderProjectiles();
    this.renderEffects();
  }

  private renderCells(): void {
    const liveIds = new Set(this.runtime.cells.map((cell) => cell.id));
    for (const [id, view] of this.cellViews) {
      if (!liveIds.has(id)) {
        view.destroy();
        this.cellViews.delete(id);
      }
    }

    for (const cell of this.runtime.cells) {
      let view = this.cellViews.get(cell.id);
      const world = this.toWorld(cell.x, cell.y);
      if (!view) {
        view = this.createCellView(cell, world.x, world.y);
        this.cellViews.set(cell.id, view);
      }
      view.setPosition(world.x, world.y);
    }
  }

  private renderEnemies(): void {
    const liveIds = new Set(this.runtime.enemies.map((enemy) => enemy.id));
    for (const [id, view] of this.enemyViews) {
      if (!liveIds.has(id)) {
        view.destroy();
        this.enemyViews.delete(id);
      }
    }

    for (const enemy of this.runtime.enemies) {
      let view = this.enemyViews.get(enemy.id);
      const world = this.toWorld(enemy.x, enemy.y);
      if (!view) {
        view = this.createEnemyView(enemy, world.x, world.y);
        this.enemyViews.set(enemy.id, view);
      }
      view.setPosition(world.x, world.y);
      const hp = view.getByName("hp") as Phaser.GameObjects.Rectangle | null;
      if (hp) {
        hp.scaleX = Math.max(0, enemy.health / enemy.maxHealth);
      }
    }
  }

  private renderProjectiles(): void {
    const liveIds = new Set(this.runtime.projectiles.map((projectile) => projectile.id));
    for (const [id, view] of this.projectileViews) {
      if (!liveIds.has(id)) {
        view.destroy();
        this.projectileViews.delete(id);
      }
    }

    for (const projectile of this.runtime.projectiles) {
      let view = this.projectileViews.get(projectile.id);
      const world = this.toWorld(projectile.x, projectile.y);
      if (!view) {
        view = this.add.circle(world.x, world.y, 5, 0x22d3ee, 1);
        view.setStrokeStyle(2, 0xffffff, 0.9);
        this.projectileViews.set(projectile.id, view);
      }
      view.setPosition(world.x, world.y);
    }
  }

  private createCellView(cell: RuntimeCell, x: number, y: number): Phaser.GameObjects.Container {
    const color = cell.kind === "macrophage" ? 0xff9f43 : 0x7c3aed;
    const shape =
      cell.kind === "macrophage"
        ? this.add.circle(0, 0, 22, color, 1)
        : this.add.star(0, 0, 7, 10, 24, color, 1);
    shape.setStrokeStyle(3, 0xffffff, 0.95);
    const label = this.add
      .text(0, 0, cell.kind === "macrophage" ? "巨" : "NK", {
        fontFamily: "system-ui",
        fontSize: "12px",
        fontStyle: "900",
        color: "#ffffff"
      })
      .setOrigin(0.5);
    return this.add.container(x, y, [shape, label]);
  }

  private createEnemyView(enemy: RuntimeEnemy, x: number, y: number): Phaser.GameObjects.Container {
    const color = enemy.kind === "bacteria" ? 0x84cc16 : enemy.kind === "fastVirus" ? 0x0ea5e9 : enemy.kind === "mutantVirusCluster" ? 0x7c3aed : 0x38bdf8;
    const radius = enemy.kind === "mutantVirusCluster" ? 30 : enemy.kind === "bacteria" ? 20 : 16;
    const shape = enemy.kind === "bacteria" ? this.add.circle(0, 0, radius, color, 1) : this.add.star(0, 0, 9, radius * 0.6, radius, color, 1);
    shape.setStrokeStyle(3, 0xffffff, 0.9);
    const hpBack = this.add.rectangle(0, -radius - 9, radius * 2, 5, 0xffffff, 0.92);
    const hp = this.add.rectangle(-radius, -radius - 9, radius * 2, 5, 0x22c55e, 1).setOrigin(0, 0.5).setName("hp");
    const label = this.add
      .text(0, 0, this.enemyLabel(enemy.kind), {
        fontFamily: "system-ui",
        fontSize: "11px",
        fontStyle: "900",
        color: "#ffffff"
      })
      .setOrigin(0.5);
    return this.add.container(x, y, [shape, label, hpBack, hp]);
  }

  private updateRangePreview(cell?: RuntimeCell | null): void {
    this.rangePreview?.destroy();
    this.rangePreview = undefined;
    if (!cell) {
      return;
    }
    const world = this.toWorld(cell.x, cell.y);
    this.rangePreview = this.add.circle(world.x, world.y, cell.range * this.width, 0x22c55e, 0.08);
    this.rangePreview.setStrokeStyle(2, 0x22c55e, 0.35);
  }

  private playDeployFeedback(cell: RuntimeCell): void {
    const world = this.toWorld(cell.x, cell.y);
    const burst = this.add.circle(world.x, world.y, 16, 0x22c55e, 0.28);
    burst.setStrokeStyle(3, 0x22c55e, 0.65);
    this.effectViews.add(burst);
    this.tweens.add({
      targets: burst,
      scale: 2.1,
      alpha: 0,
      duration: 360,
      ease: "Cubic.easeOut",
      onComplete: () => {
        burst.destroy();
        this.effectViews.delete(burst);
      }
    });
  }

  private renderEffects(): void {
    const effects = this.runtime.effects.splice(0);
    for (const effect of effects) {
      const world = this.toWorld(effect.x, effect.y);
      if (effect.tone === "hit") {
        const hit = this.add.circle(world.x, world.y, 10, 0xffffff, 0.52);
        this.effectViews.add(hit);
        this.tweens.add({
          targets: hit,
          scale: 1.5,
          alpha: 0,
          duration: 160,
          onComplete: () => {
            hit.destroy();
            this.effectViews.delete(hit);
          }
        });
        continue;
      }

      const color = effect.tone === "danger" ? "#be123c" : effect.tone === "boss" ? "#7c2d12" : "#0f766e";
      const label = this.add
        .text(world.x, world.y - 22, effect.text, {
          fontFamily: "system-ui",
          fontSize: effect.tone === "boss" ? "24px" : "16px",
          fontStyle: "900",
          color,
          stroke: "#ffffff",
          strokeThickness: 4
        })
        .setOrigin(0.5);
      this.effectViews.add(label);
      this.tweens.add({
        targets: label,
        y: label.y - 30,
        alpha: 0,
        duration: 720,
        ease: "Cubic.easeOut",
        onComplete: () => {
          label.destroy();
          this.effectViews.delete(label);
        }
      });
    }
  }

  private checkFinish(): void {
    if (this.finishShown || this.runtime.status === "playing") {
      return;
    }

    this.finishShown = true;
    this.loop?.cleanup();
    this.destroyRuntimeViews();
    const victory = this.runtime.status === "victory";
    this.add.rectangle(this.centerX, this.centerY, this.width * 0.84, 178, 0xffffff, 0.94).setStrokeStyle(4, victory ? 0x22c55e : 0xef4444, 1);
    this.add
      .text(this.centerX, this.centerY - 35, victory ? "防线胜利" : "组织失守", {
        fontFamily: "system-ui",
        fontSize: "36px",
        fontStyle: "900",
        color: victory ? "#15803d" : "#b91c1c"
      })
      .setOrigin(0.5);
    this.add
      .text(this.centerX, this.centerY + 28, victory ? "鼻腔保卫战完成。" : "点击重新开始再战。", {
        fontFamily: "system-ui",
        fontSize: "17px",
        fontStyle: "800",
        color: "#334155"
      })
      .setOrigin(0.5);
    this.emitState(true);
  }

  private emitState(force = false): void {
    if (!force && this.time.now - this.lastStateEmit < BATTLE_BALANCE_CONFIG.combat.stateEmitIntervalMs) {
      return;
    }
    this.lastStateEmit = this.time.now;
    emitBattleState(this.buildBattleState());
  }

  private buildBattleState(): BattleState {
    return {
      life: this.runtime.tissueIntegrity,
      tissueIntegrity: this.runtime.tissueIntegrity,
      atp: Math.floor(this.runtime.atp),
      wave: this.runtime.wave,
      maxWave: this.runtime.maxWave,
      feverTemperature: 37,
      selectedCell: this.selectedCell,
      result: this.runtime.status === "playing" ? undefined : this.runtime.status,
      paused: this.paused,
      pauseMenuOpen: this.paused,
      message: this.runtime.message,
      combo: 0,
      comboTier: "none",
      stormActive: false,
      dangerLevel: Math.max(0, ...this.runtime.enemies.map((enemy) => enemy.progress)),
      activeBuffs: [],
      skillCooldowns: { fever: 0, vaccine: 0, cart: 0 },
      kills: this.emptyKills()
    };
  }

  private emptyKills(): Record<EnemyKind, number> {
    return {
      normalVirus: 0,
      fastVirus: 0,
      bacteria: 0,
      fluVirus: 0,
      resistantBacteria: 0,
      mutantVirus: 0,
      miniVirus: 0,
      cancerCell: 0,
      cancerKing: 0,
      mutantVirusCluster: 0
    };
  }

  private cleanupBattleResources(): void {
    this.releaseCommandListener();
    this.loop?.cleanup();
    this.loop = undefined;
    this.destroyRuntimeViews();
    this.runtime.cleanup();
    this.time.removeAllEvents();
    this.tweens.killAll();
  }

  private resetSceneState(): void {
    this.selectedCell = undefined;
    this.lastStateEmit = 0;
    this.paused = false;
    this.finishShown = false;
    this.slots = [];
    this.slotDiscs.clear();
    this.rangePreview = undefined;
    this.enemyViews.clear();
    this.cellViews.clear();
    this.projectileViews.clear();
    this.effectViews.clear();
  }

  private destroyRuntimeViews(): void {
    this.rangePreview?.destroy();
    this.rangePreview = undefined;
    for (const view of this.enemyViews.values()) {
      view.destroy();
    }
    for (const view of this.cellViews.values()) {
      view.destroy();
    }
    for (const view of this.projectileViews.values()) {
      view.destroy();
    }
    for (const view of this.effectViews.values()) {
      view.destroy();
    }
    this.enemyViews.clear();
    this.cellViews.clear();
    this.projectileViews.clear();
    this.effectViews.clear();
  }

  private getSlotAt(x: number, y: number): SlotView | null {
    return this.slots.find((slot) => Phaser.Math.Distance.Between(x, y, slot.x, slot.y) <= slot.radius + 8) ?? null;
  }

  private toWorld(x: number, y: number): { x: number; y: number } {
    return {
      x: x * this.width,
      y: y * this.height
    };
  }

  private enemyLabel(kind: EnemyKind): string {
    if (kind === "bacteria") {
      return "菌";
    }
    if (kind === "fastVirus") {
      return "快";
    }
    if (kind === "miniVirus") {
      return "小";
    }
    if (kind === "mutantVirusCluster") {
      return "Boss";
    }
    return "毒";
  }

  private get width(): number {
    return BATTLE_BALANCE_CONFIG.canvas.width;
  }

  private get height(): number {
    return BATTLE_BALANCE_CONFIG.canvas.height;
  }

  private get centerX(): number {
    return this.width / 2;
  }

  private get centerY(): number {
    return this.height / 2;
  }
}
