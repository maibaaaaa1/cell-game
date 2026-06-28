import Phaser from "phaser";
import { ASSET_CONFIG, getCellVisualAsset, getEnemyOrBossVisualAsset, type VisualAssetConfig } from "../configs/assetConfig.ts";
import { BATTLE_BALANCE_CONFIG } from "../configs/balanceConfig.ts";
import { CELL_CONFIG } from "../configs/cellConfig.ts";
import { FIRST_LEVEL_CELL_ORDER, FIRST_LEVEL_ROUTE_IDS, FIRST_LEVEL_WAVE_SET_ID } from "../configs/firstLevelConfig.ts";
import { ROUTE_CONFIG } from "../configs/routeConfig.ts";
import { DEPLOY_SLOT_VISUAL_RADIUS, findDeploySlotAtPoint, type DeploySlotHitArea } from "../game/deploySlotHitTest.ts";
import { shouldShowDebugOverlay } from "../game/firstLevelPresentation.ts";
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

type SlotView = DeploySlotHitArea;

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
  private readonly debugEnabled = typeof window !== "undefined" && shouldShowDebugOverlay(window.location.search);

  constructor(level: LevelConfig, onSaveChanged: () => void, soundEnabled: boolean) {
    super("BattleScene");
    this.level = level;
    this.onSaveChanged = onSaveChanged;
    this.audio = new AudioCueSystem({ enabled: soundEnabled });
  }

  preload(): void {
    for (const asset of this.firstLevelVisualAssets()) {
      this.load.image(asset.sprite.key, asset.sprite.path);
      if (asset.icon) {
        this.load.image(asset.icon.key, asset.icon.path);
      }
    }
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

  private firstLevelVisualAssets(): VisualAssetConfig[] {
    return [
      ...Object.values(ASSET_CONFIG.cells),
      ...Object.values(ASSET_CONFIG.enemies),
      ...Object.values(ASSET_CONFIG.bosses)
    ];
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
      const slot = this.getSlotAt(x, y);
      this.runtime.message = this.debugEnabled && slot ? `Debug命中：${slot.id}` : "先选择巨噬细胞或NK细胞。";
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
    this.cameras.main.setBackgroundColor(0xfff8ef);
    this.add.rectangle(this.centerX, this.centerY, this.width, this.height, 0xfffbf4, 1).setDepth(0);
    this.add.ellipse(this.centerX, this.height * 0.18, this.width * 0.92, this.height * 0.34, 0xdff7ff, 0.82).setDepth(0);
    this.add.ellipse(this.centerX, this.height * 0.58, this.width * 1.18, this.height * 0.62, 0xf0fffb, 0.78).setDepth(0);
    this.add.rectangle(this.centerX, this.centerY, this.width - 22, this.height - 18, 0xffffff, 0.12).setStrokeStyle(2, 0x8be8ff, 0.24).setDepth(0);
    this.drawRoutes();
    this.drawCore();
    this.drawSlots();
  }

  private drawRoutes(): void {
    for (const routeId of FIRST_LEVEL_ROUTE_IDS) {
      this.drawRouteChannel(routeId);
    }
  }

  private drawRouteChannel(routeId: string): void {
    const route = ROUTE_CONFIG[routeId];
    const shadow = this.add.graphics().setDepth(1);
    const base = this.add.graphics().setDepth(2);
    const inner = this.add.graphics().setDepth(3);
    const highlight = this.add.graphics().setDepth(4);

    this.strokeRoutePath(shadow, route.points, 52, 0x6b7280, 0.16, 0, 9);
    this.strokeRoutePath(base, route.points, 48, 0xb6f4ea, 0.88);
    this.strokeRoutePath(inner, route.points, 28, 0xeefffb, 0.78);
    this.strokeRoutePath(highlight, route.points, 5, 0x49ddff, 0.48, -4, -4);
    this.strokeRoutePath(highlight, route.points, 3, 0x0694a2, 0.28, 5, 5);
  }

  private strokeRoutePath(
    graphics: Phaser.GameObjects.Graphics,
    points: Array<{ x: number; y: number }>,
    width: number,
    color: number,
    alpha: number,
    offsetX = 0,
    offsetY = 0
  ): void {
    graphics.lineStyle(width, color, alpha);
    points.forEach((point, index) => {
      const world = this.toWorld(point.x, point.y);
      if (index === 0) {
        graphics.beginPath();
        graphics.moveTo(world.x + offsetX, world.y + offsetY);
        return;
      }
      graphics.lineTo(world.x + offsetX, world.y + offsetY);
    });
    graphics.strokePath();
  }

  private drawCore(): void {
    this.add.ellipse(this.centerX, this.height - 22, this.width * 0.74, 42, 0x7f1d1d, 0.14).setDepth(5);
    const core = this.add.rectangle(this.centerX, this.height - 24, this.width * 0.62, 34, 0xff7aa2, 0.9).setDepth(6);
    core.setStrokeStyle(3, 0xffffff, 0.9);
    this.add
      .text(this.centerX, this.height - 24, "核心组织防线", {
        fontFamily: "system-ui",
        fontSize: "13px",
        fontStyle: "900",
        align: "center",
        color: "#7f1d1d"
      })
      .setOrigin(0.5)
      .setDepth(7);
  }

  private drawSlots(): void {
    this.slots = ROUTE_CONFIG.noseLeft.cellSlots.map((slot) => {
      const world = this.toWorld(slot.x, slot.y);
      const radius = DEPLOY_SLOT_VISUAL_RADIUS;
      this.add.ellipse(world.x, world.y + 5, radius * 2.35, radius * 1.1, 0x075985, 0.16).setDepth(8);
      const view = this.add.circle(world.x, world.y, radius, 0x38bdf8, 0.2).setDepth(9);
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
      view.setDepth(46 + world.y / 18);
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
      const floatOffset = enemy.kind === "mutantVirusCluster" ? Math.sin(this.time.now / 360) * 1.6 : Math.sin(this.time.now / 240 + enemy.progress * 9) * 2.2;
      view.setPosition(world.x, world.y + floatOffset);
      view.setDepth(32 + world.y / 16);
      this.updateEnemyVisualMotion(view, enemy);
      const hp = view.getByName("hp") as Phaser.GameObjects.Rectangle | null;
      if (hp) {
        hp.scaleX = Math.max(0, enemy.health / enemy.maxHealth);
      }
      if (enemy.kind === "mutantVirusCluster" && enemy.bossSplitTriggered && !view.getData("splitFlashPlayed")) {
        view.setData("splitFlashPlayed", true);
        this.playBossSplitFlash(world.x, world.y);
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
        view.setDepth(58);
        this.projectileViews.set(projectile.id, view);
      }
      view.setPosition(world.x, world.y);
    }
  }

  private createCellView(cell: RuntimeCell, x: number, y: number): Phaser.GameObjects.Container {
    const asset = getCellVisualAsset(cell.kind);
    const size = asset?.displaySize ?? (cell.kind === "macrophage" ? 82 : 78);
    const shadow = this.createSoftShadow(size * 0.68, size * 0.22, 0.2);
    shadow.setPosition(0, size * 0.3);
    const glow = this.add.circle(0, 0, size * 0.4, cell.kind === "macrophage" ? 0xffb454 : 0x8b5cf6, 0.12);
    const visual = asset && this.textures.exists(asset.sprite.key)
      ? this.add.image(0, 0, asset.sprite.key).setDisplaySize(asset.displaySize, asset.displaySize)
      : this.createCellFallbackShape(cell.kind, asset);
    visual.setName("visual");
    const label = this.add
      .text(0, size * 0.43, cell.kind === "macrophage" ? "巨噬" : "NK", {
        fontFamily: "system-ui",
        fontSize: "11px",
        fontStyle: "900",
        color: "#ffffff",
        backgroundColor: "rgba(7,17,35,0.58)",
        padding: { left: 5, right: 5, top: 2, bottom: 2 }
      })
      .setOrigin(0.5);
    return this.add.container(x, y, [shadow, glow, visual, label]);
  }

  private createEnemyView(enemy: RuntimeEnemy, x: number, y: number): Phaser.GameObjects.Container {
    const asset = getEnemyOrBossVisualAsset(enemy.kind);
    const size = asset?.displaySize ?? (enemy.kind === "mutantVirusCluster" ? 132 : enemy.kind === "bacteria" ? 64 : enemy.kind === "miniVirus" ? 36 : 48);
    const radius = size / 2;
    const children: Phaser.GameObjects.GameObject[] = [];
    const shadow = this.createSoftShadow(
      enemy.kind === "mutantVirusCluster" ? size * 0.74 : enemy.kind === "bacteria" ? size * 0.72 : size * 0.58,
      enemy.kind === "mutantVirusCluster" ? size * 0.22 : size * 0.18,
      enemy.kind === "mutantVirusCluster" ? 0.28 : 0.18
    );
    shadow.setPosition(0, radius * 0.48);
    children.push(shadow);
    if (enemy.kind === "fastVirus") {
      children.push(this.createFastVirusTrail(size));
    }
    if (enemy.kind === "mutantVirusCluster") {
      const aura = this.add.circle(0, 0, radius * 0.78, 0xff3d2e, 0.14);
      aura.setStrokeStyle(4, 0xff9f1c, 0.28);
      children.push(aura);
    }
    const visual = asset && this.textures.exists(asset.sprite.key)
      ? this.add.image(0, 0, asset.sprite.key).setDisplaySize(enemy.kind === "fastVirus" ? size * 1.14 : size, enemy.kind === "fastVirus" ? size * 0.92 : size)
      : this.createEnemyFallbackShape(enemy.kind, asset, radius);
    visual.setName("visual");
    if (enemy.kind === "fastVirus") {
      visual.setRotation(0.16);
    }
    children.push(visual);

    const hpWidth = enemy.kind === "mutantVirusCluster" ? radius * 1.65 : radius * 1.45;
    const hpHeight = enemy.kind === "mutantVirusCluster" ? 8 : 5;
    const hpBack = this.add.rectangle(0, -radius - 11, hpWidth, hpHeight, 0xffffff, 0.94);
    const hp = this.add.rectangle(-hpWidth / 2, -radius - 11, hpWidth, hpHeight, enemy.kind === "mutantVirusCluster" ? 0xef4444 : 0x22c55e, 1).setOrigin(0, 0.5).setName("hp");
    hpBack.setStrokeStyle(1, 0x071123, 0.18);
    children.push(hpBack, hp);

    if (enemy.kind === "mutantVirusCluster") {
      const label = this.add
        .text(0, -radius - 25, "BOSS", {
          fontFamily: "system-ui",
          fontSize: "13px",
          fontStyle: "900",
          color: "#7f1d1d",
          stroke: "#ffffff",
          strokeThickness: 4
        })
        .setOrigin(0.5);
      children.push(label);
    }

    const container = this.add.container(x, y, children);
    if (enemy.kind === "mutantVirusCluster") {
      this.playBossSpawnFeedback(container);
    }
    if (enemy.kind === "miniVirus") {
      this.playMiniVirusPop(container);
    }
    return container;
  }

  private createSoftShadow(width: number, height: number, alpha: number): Phaser.GameObjects.Ellipse {
    return this.add.ellipse(0, 0, width, height, 0x071123, alpha);
  }

  private createFastVirusTrail(size: number): Phaser.GameObjects.Ellipse {
    const trail = this.add.ellipse(-size * 0.34, size * 0.1, size * 0.74, size * 0.22, 0xff7a1a, 0.24);
    trail.setName("fast-virus-trail");
    return trail;
  }

  private updateEnemyVisualMotion(view: Phaser.GameObjects.Container, enemy: RuntimeEnemy): void {
    const visual = view.getByName("visual") as Phaser.GameObjects.Image | Phaser.GameObjects.Shape | null;
    if (!visual) {
      return;
    }
    if (enemy.kind === "fastVirus") {
      visual.setRotation(0.18 + Math.sin(this.time.now / 130) * 0.08);
      view.setScale(1 + Math.sin(this.time.now / 120) * 0.025, 1);
      return;
    }
    if (enemy.kind === "bacteria") {
      visual.setRotation(Math.sin(this.time.now / 520 + enemy.progress * 8) * 0.035);
      return;
    }
    if (enemy.kind === "mutantVirusCluster") {
      const pulse = 1 + Math.sin(this.time.now / 420) * 0.035;
      visual.setScale(pulse);
    }
  }

  private playBossSpawnFeedback(view: Phaser.GameObjects.Container): void {
    view.setScale(0.82);
    this.cameras.main.shake(150, 0.004);
    this.tweens.add({
      targets: view,
      scale: 1,
      duration: 420,
      ease: "Back.easeOut"
    });
  }

  private playMiniVirusPop(view: Phaser.GameObjects.Container): void {
    view.setScale(0.58);
    this.tweens.add({
      targets: view,
      scale: 1,
      duration: 300,
      ease: "Back.easeOut"
    });
  }

  private playBossSplitFlash(x: number, y: number): void {
    const flash = this.add.circle(x, y, 44, 0xff3d2e, 0.34).setDepth(70);
    flash.setStrokeStyle(5, 0xffb454, 0.55);
    this.effectViews.add(flash);
    this.tweens.add({
      targets: flash,
      scale: 2.6,
      alpha: 0,
      duration: 520,
      ease: "Cubic.easeOut",
      onComplete: () => {
        flash.destroy();
        this.effectViews.delete(flash);
      }
    });
  }

  private createCellFallbackShape(kind: CellKind, asset?: VisualAssetConfig): Phaser.GameObjects.Shape {
    const color = asset?.fallbackColor ?? (kind === "macrophage" ? 0xff9f1c : 0x7c3aed);
    const radius = (asset?.displaySize ?? (kind === "macrophage" ? 82 : 78)) * 0.38;
    const shape = kind === "macrophage"
      ? this.add.circle(0, 0, radius, color, 1)
      : this.add.star(0, 0, 7, radius * 0.42, radius, color, 1);
    shape.setStrokeStyle(3, 0xffffff, 0.95);
    return shape;
  }

  private createEnemyFallbackShape(kind: EnemyKind, asset: VisualAssetConfig | undefined, radius: number): Phaser.GameObjects.Shape {
    const color = asset?.fallbackColor ?? 0xff6b3d;
    const shape = kind === "bacteria"
      ? this.add.ellipse(0, 0, radius * 2.2, radius * 1.55, color, 1)
      : this.add.star(0, 0, kind === "mutantVirusCluster" ? 13 : 9, radius * 0.58, radius, color, 1);
    shape.setStrokeStyle(kind === "mutantVirusCluster" ? 4 : 3, 0xffffff, 0.9);
    return shape;
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
    return findDeploySlotAtPoint(this.slots, x, y);
  }

  private toWorld(x: number, y: number): { x: number; y: number } {
    return {
      x: x * this.width,
      y: y * this.height
    };
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
