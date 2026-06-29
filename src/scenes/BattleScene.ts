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
type BattlefieldLayerName =
  | "backgroundLayer"
  | "terrainLayer"
  | "routeBaseLayer"
  | "routeGlowLayer"
  | "slotPlatformLayer"
  | "shadowLayer"
  | "unitLayer"
  | "projectileLayer"
  | "effectLayer"
  | "labelLayer"
  | "debugLayer";

const PLAYABLE_CELLS = FIRST_LEVEL_CELL_ORDER;
const BATTLEFIELD_LAYER_DEPTHS: Record<BattlefieldLayerName, number> = {
  backgroundLayer: 0,
  terrainLayer: 10,
  routeBaseLayer: 20,
  routeGlowLayer: 30,
  slotPlatformLayer: 40,
  shadowLayer: 45,
  unitLayer: 50,
  projectileLayer: 60,
  effectLayer: 70,
  labelLayer: 80,
  debugLayer: 999
};

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
  private battlefieldLayers?: Record<BattlefieldLayerName, Phaser.GameObjects.Layer>;
  private readonly debugEnabled = typeof window !== "undefined" && shouldShowDebugOverlay(window.location.search);

  constructor(level: LevelConfig, onSaveChanged: () => void, soundEnabled: boolean) {
    super("BattleScene");
    this.level = level;
    this.onSaveChanged = onSaveChanged;
    this.audio = new AudioCueSystem({ enabled: soundEnabled });
  }

  preload(): void {
    const background = ASSET_CONFIG.backgrounds.battle01Nasal;
    if (background.enabled) {
      this.load.image(background.image.key, background.image.path);
    }
    for (const asset of this.firstLevelVisualAssets()) {
      this.load.image(asset.sprite.key, asset.sprite.path);
      if (asset.icon) {
        this.load.image(asset.icon.key, asset.icon.path);
      }
    }
  }

  create(): void {
    this.createRuntime();
    this.createBattlefieldLayers();
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

  private createBattlefieldLayers(): void {
    this.battlefieldLayers = Object.entries(BATTLEFIELD_LAYER_DEPTHS).reduce((layers, [name, depth]) => {
      const layerName = name as BattlefieldLayerName;
      layers[layerName] = this.add.layer().setName(layerName).setDepth(depth);
      return layers;
    }, {} as Record<BattlefieldLayerName, Phaser.GameObjects.Layer>);
  }

  private addToBattlefieldLayer<T extends Phaser.GameObjects.GameObject>(layerName: BattlefieldLayerName, object: T): T {
    this.battlefieldLayers?.[layerName].add(object);
    return object;
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
    this.cameras.main.setBackgroundColor(0xdff7ff);
    const background = ASSET_CONFIG.backgrounds.battle01Nasal;
    const hasFinalBackground = background.enabled && this.textures.exists(background.image.key);
    if (hasFinalBackground) {
      this.drawBackgroundImage(background.image.key, background.opacity);
    } else {
      this.drawNasalMucosaFallback();
      this.drawMucosaWalls();
      this.drawTissueTexture();
    }
    this.drawBackgroundEdgeBlend();
    this.drawBattlefieldAtmosphere(hasFinalBackground);
    this.drawSceneOcclusion();
    this.drawAirflowLines();
    this.drawRoutes();
    this.drawCore();
    this.drawSlots();
  }

  private drawBackgroundImage(textureKey: string, opacity: number): void {
    const image = this.addToBattlefieldLayer("backgroundLayer", this.add.image(this.centerX, this.centerY, textureKey).setAlpha(opacity));
    this.applyCoverCrop(image, textureKey);
    this.addToBattlefieldLayer("terrainLayer", this.add.rectangle(this.centerX, this.centerY, this.width, this.height, 0xffedf2, 0.1));
    this.addToBattlefieldLayer("terrainLayer", this.add.rectangle(this.centerX, this.centerY, this.width, this.height, 0x18071a, 0.12));
    this.addToBattlefieldLayer(
      "terrainLayer",
      this.add.rectangle(this.centerX, this.centerY, this.width - 18, this.height - 18, 0xffffff, 0.025).setStrokeStyle(2, 0x8be8ff, 0.1)
    );
  }

  private applyCoverCrop(image: Phaser.GameObjects.Image, textureKey: string): void {
    const source = this.textures.get(textureKey).getSourceImage() as { width?: number; height?: number };
    const sourceWidth = source.width ?? this.width;
    const sourceHeight = source.height ?? this.height;
    const targetRatio = this.width / this.height;
    const sourceRatio = sourceWidth / sourceHeight;

    if (sourceRatio > targetRatio) {
      const cropWidth = sourceHeight * targetRatio;
      image.setCrop((sourceWidth - cropWidth) / 2, 0, cropWidth, sourceHeight);
    } else {
      const cropHeight = sourceWidth / targetRatio;
      image.setCrop(0, Math.max(0, (sourceHeight - cropHeight) * 0.44), sourceWidth, cropHeight);
    }
    image.setDisplaySize(this.width, this.height);
  }

  private drawNasalMucosaFallback(): void {
    this.addToBattlefieldLayer("backgroundLayer", this.add.rectangle(this.centerX, this.centerY, this.width, this.height, 0xfdf6ee, 1));
    this.addToBattlefieldLayer("backgroundLayer", this.add.ellipse(this.centerX, this.height * 0.16, this.width * 1.08, this.height * 0.44, 0xcffafe, 0.78));
    this.addToBattlefieldLayer("backgroundLayer", this.add.ellipse(this.centerX, this.height * 0.5, this.width * 1.24, this.height * 0.72, 0xe8fff8, 0.84));
    this.addToBattlefieldLayer("backgroundLayer", this.add.ellipse(this.width * 0.1, this.height * 0.58, this.width * 0.34, this.height * 0.96, 0xffc7d5, 0.2));
    this.addToBattlefieldLayer("backgroundLayer", this.add.ellipse(this.width * 0.9, this.height * 0.58, this.width * 0.34, this.height * 0.96, 0xffc7d5, 0.2));
    this.addToBattlefieldLayer(
      "terrainLayer",
      this.add.rectangle(this.centerX, this.centerY, this.width - 22, this.height - 18, 0xffffff, 0.1).setStrokeStyle(2, 0x8be8ff, 0.22)
    );
  }

  private drawMucosaWalls(): void {
    const leftWall = this.addToBattlefieldLayer("terrainLayer", this.add.ellipse(-this.width * 0.06, this.height * 0.55, this.width * 0.44, this.height * 1.18, 0xffb7c7, 0.2));
    leftWall.setRotation(Phaser.Math.DegToRad(-5));
    const rightWall = this.addToBattlefieldLayer("terrainLayer", this.add.ellipse(this.width * 1.06, this.height * 0.55, this.width * 0.44, this.height * 1.18, 0xffb7c7, 0.18));
    rightWall.setRotation(Phaser.Math.DegToRad(5));
    this.addToBattlefieldLayer("terrainLayer", this.add.ellipse(this.width * 0.08, this.height * 0.5, this.width * 0.16, this.height * 0.9, 0xffffff, 0.09));
    this.addToBattlefieldLayer("terrainLayer", this.add.ellipse(this.width * 0.92, this.height * 0.5, this.width * 0.16, this.height * 0.9, 0xffffff, 0.09));
  }

  private drawBackgroundEdgeBlend(): void {
    const leftWall = this.addToBattlefieldLayer("terrainLayer", this.add.graphics());
    leftWall.fillStyle(0x6d173b, 0.46);
    leftWall.fillEllipse(-this.width * 0.05, this.height * 0.52, this.width * 0.42, this.height * 1.18);
    leftWall.fillStyle(0xff8fb1, 0.16);
    leftWall.fillEllipse(this.width * 0.04, this.height * 0.48, this.width * 0.22, this.height * 1.0);

    const rightWall = this.addToBattlefieldLayer("terrainLayer", this.add.graphics());
    rightWall.fillStyle(0x6d173b, 0.44);
    rightWall.fillEllipse(this.width * 1.05, this.height * 0.52, this.width * 0.42, this.height * 1.18);
    rightWall.fillStyle(0xff8fb1, 0.14);
    rightWall.fillEllipse(this.width * 0.96, this.height * 0.48, this.width * 0.22, this.height * 1.0);

    this.addToBattlefieldLayer("terrainLayer", this.add.rectangle(this.centerX, this.height * 0.09, this.width, this.height * 0.2, 0x071123, 0.1));
    this.addToBattlefieldLayer("terrainLayer", this.add.ellipse(this.centerX, this.height * 0.18, this.width * 0.78, this.height * 0.2, 0x67e8f9, 0.12));
  }

  private drawBattlefieldAtmosphere(hasFinalBackground: boolean): void {
    if (hasFinalBackground) {
      this.addToBattlefieldLayer("terrainLayer", this.add.ellipse(this.centerX, this.height * 0.16, this.width * 0.92, this.height * 0.22, 0x43e0c2, 0.1));
      this.addToBattlefieldLayer("terrainLayer", this.add.ellipse(this.centerX, this.height * 0.58, this.width * 0.72, this.height * 0.62, 0xffd6de, 0.08));
      this.addToBattlefieldLayer("terrainLayer", this.add.ellipse(-this.width * 0.03, this.centerY, this.width * 0.36, this.height * 1.08, 0x7f1d4d, 0.2));
      this.addToBattlefieldLayer("terrainLayer", this.add.ellipse(this.width * 1.03, this.centerY, this.width * 0.36, this.height * 1.08, 0x7f1d4d, 0.18));
      this.addToBattlefieldLayer("terrainLayer", this.add.rectangle(this.centerX, this.centerY, this.width, this.height, 0x071123, 0.06));
    }
    const vignette = this.addToBattlefieldLayer("terrainLayer", this.add.graphics());
    vignette.fillStyle(0x071123, hasFinalBackground ? 0.16 : 0.035);
    vignette.fillRect(0, 0, this.width, this.height);
    vignette.fillStyle(0xffffff, hasFinalBackground ? 0.08 : 0.08);
    vignette.fillEllipse(this.centerX, this.centerY * 1.03, this.width * 0.82, this.height * 0.72);
  }

  private drawSceneOcclusion(): void {
    const mist = this.addToBattlefieldLayer("terrainLayer", this.add.graphics());
    mist.fillStyle(0xffd6de, 0.1);
    mist.fillEllipse(this.centerX, this.height * 0.54, this.width * 0.62, this.height * 0.78);
    mist.fillStyle(0x071123, 0.18);
    mist.fillRect(0, 0, this.width * 0.08, this.height);
    mist.fillRect(this.width * 0.92, 0, this.width * 0.08, this.height);
  }

  private drawTissueTexture(): void {
    const strands = [
      [0.18, 0.16, 90, 26, 10],
      [0.74, 0.2, 120, 32, -8],
      [0.2, 0.46, 150, 34, -12],
      [0.82, 0.52, 130, 30, 12],
      [0.36, 0.78, 180, 38, 6],
      [0.72, 0.82, 120, 28, -10],
      [0.5, 0.34, 220, 34, 0],
      [0.5, 0.66, 240, 38, 0]
    ];
    for (const [x, y, width, height, rotation] of strands) {
      const world = this.toVisualWorld(x, y);
      const strand = this.addToBattlefieldLayer("terrainLayer", this.add.ellipse(world.x, world.y, width, height, 0xffffff, 0));
      strand.setStrokeStyle(2, 0x9debdc, 0.16);
      strand.setRotation(Phaser.Math.DegToRad(rotation));
    }
    for (const [x, y] of [[0.13, 0.32], [0.88, 0.36], [0.18, 0.68], [0.86, 0.72]]) {
      const world = this.toVisualWorld(x, y);
      this.addToBattlefieldLayer("terrainLayer", this.add.circle(world.x, world.y, 18, 0xffffff, 0.18));
    }
  }

  private drawAirflowLines(): void {
    const graphics = this.addToBattlefieldLayer("terrainLayer", this.add.graphics());
    const lanes = [
      [{ x: 0.43, y: 0.08 }, { x: 0.36, y: 0.28 }, { x: 0.42, y: 0.5 }, { x: 0.38, y: 0.72 }],
      [{ x: 0.57, y: 0.08 }, { x: 0.64, y: 0.28 }, { x: 0.58, y: 0.5 }, { x: 0.62, y: 0.72 }],
      [{ x: 0.5, y: 0.1 }, { x: 0.5, y: 0.34 }, { x: 0.5, y: 0.58 }, { x: 0.5, y: 0.82 }]
    ];
    lanes.forEach((lane, laneIndex) => {
      graphics.lineStyle(laneIndex === 2 ? 2 : 1, 0x7dd3fc, laneIndex === 2 ? 0.22 : 0.16);
      lane.forEach((point, index) => {
        const world = this.toVisualWorld(point.x, point.y);
        if (index === 0) {
          graphics.beginPath();
          graphics.moveTo(world.x, world.y);
          return;
        }
        graphics.lineTo(world.x, world.y);
      });
      graphics.strokePath();
    });
  }

  private drawRoutes(): void {
    for (const routeId of FIRST_LEVEL_ROUTE_IDS) {
      this.drawRouteChannel(routeId);
    }
  }

  private drawRouteChannel(routeId: string): void {
    const route = ROUTE_CONFIG[routeId];
    const shadow = this.addToBattlefieldLayer("routeBaseLayer", this.add.graphics());
    const base = this.addToBattlefieldLayer("routeBaseLayer", this.add.graphics());
    const inner = this.addToBattlefieldLayer("routeGlowLayer", this.add.graphics());
    const highlight = this.addToBattlefieldLayer("routeGlowLayer", this.add.graphics());

    this.drawIntegratedMucosaCorridor(route.points, shadow, base);
    this.strokeRoutePath(inner, route.points, 12, 0x5fe7ff, 0.12);
    this.strokeRoutePath(highlight, route.points, 5, 0xfff1f4, 0.16, -4, -5);
    this.strokeRoutePath(highlight, route.points, 3, 0x4ad6ee, 0.14, 4, 5);
    this.strokeRoutePath(highlight, route.points, 2, 0xa7f3d0, 0.18);
    this.drawRouteChannelGlow(route.points);
    this.drawRouteEnergyFlow(route.points);
  }

  private drawIntegratedMucosaCorridor(
    points: Array<{ x: number; y: number }>,
    shadow: Phaser.GameObjects.Graphics,
    base: Phaser.GameObjects.Graphics
  ): void {
    this.strokeRoutePath(shadow, points, 70, 0x170514, 0.22, 0, 12);
    this.strokeRoutePath(shadow, points, 62, 0x5b1233, 0.18, 0, 5);
    this.strokeRoutePath(base, points, 58, 0x8f3151, 0.22);
    this.strokeRoutePath(base, points, 49, 0xdb7488, 0.3);
    this.strokeRoutePath(base, points, 38, 0xffa9b8, 0.23);
    this.strokeRoutePath(base, points, 25, 0xffd7df, 0.12);

    for (const point of points) {
      const world = this.toVisualWorld(point.x, point.y);
      const width = this.perspectiveWidthForY(point.y, 52);
      base.fillStyle(0xdb7488, 0.2);
      base.fillEllipse(world.x, world.y + 3, width * 0.95, width * 0.36);
      base.fillStyle(0xffedf2, 0.1);
      base.fillEllipse(world.x, world.y - 5, width * 0.58, width * 0.16);
    }
  }

  private drawFleshyRouteBed(
    points: Array<{ x: number; y: number }>,
    shadow: Phaser.GameObjects.Graphics,
    base: Phaser.GameObjects.Graphics
  ): void {
    this.strokeRoutePath(shadow, points, 82, 0x240617, 0.26, 0, 13);
    this.strokeRoutePath(shadow, points, 72, 0x7f1d4d, 0.22, 0, 6);
    this.strokeRoutePath(base, points, 68, 0x9f3f63, 0.3);
    this.strokeRoutePath(base, points, 58, 0xf0a4b3, 0.42);
    this.strokeRoutePath(base, points, 47, 0xffd0d7, 0.4);
    this.strokeRoutePath(base, points, 30, 0xffedf0, 0.26);
  }

  private drawRouteChannelGlow(points: Array<{ x: number; y: number }>): void {
    for (const point of points) {
      const world = this.toVisualWorld(point.x, point.y);
      const radius = this.perspectiveWidthForY(point.y, 24);
      this.addToBattlefieldLayer("routeGlowLayer", this.add.ellipse(world.x, world.y + 2, radius * 1.0, radius * 0.32, 0x43e0c2, 0.04));
      this.addToBattlefieldLayer("routeGlowLayer", this.add.ellipse(world.x, world.y - 1, radius * 0.55, radius * 0.16, 0xffffff, 0.035));
    }
  }

  private drawRouteEnergyFlow(points: Array<{ x: number; y: number }>): void {
    const energy = this.addToBattlefieldLayer("routeGlowLayer", this.add.graphics());
    energy.lineStyle(2, 0x43e0c2, 0.16);
    points.forEach((point, index) => {
      const world = this.toVisualWorld(point.x, point.y);
      if (index === 0) {
        energy.beginPath();
        energy.moveTo(world.x, world.y);
        return;
      }
      energy.lineTo(world.x, world.y);
    });
    energy.strokePath();
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
    points.forEach((point, index) => {
      if (index === 0) {
        return;
      }
      const previous = points[index - 1];
      const midY = (previous.y + point.y) / 2;
      const from = this.toVisualWorld(previous.x, previous.y);
      const to = this.toVisualWorld(point.x, point.y);
      graphics.lineStyle(this.perspectiveWidthForY(midY, width), color, alpha);
      graphics.beginPath();
      graphics.moveTo(from.x + offsetX, from.y + offsetY);
      graphics.lineTo(to.x + offsetX, to.y + offsetY);
      graphics.strokePath();
    });
  }

  private perspectiveWidthForY(normalizedY: number, baseWidth: number): number {
    return baseWidth * (0.72 + normalizedY * 0.32);
  }

  private drawCore(): void {
    this.drawCoreEnergyBase();
    this.addToBattlefieldLayer(
      "labelLayer",
      this.add.text(this.centerX, this.height - 24, "核心组织防线", {
        fontFamily: "system-ui",
        fontSize: "12px",
        fontStyle: "900",
        align: "center",
        color: "#fff1f2",
        stroke: "#7f1d1d",
        strokeThickness: 3
      })
      .setOrigin(0.5)
    );
  }

  private drawCoreEnergyBase(): void {
    this.drawLifeCoreShield();
  }

  private drawLifeCoreShield(): void {
    this.addToBattlefieldLayer("slotPlatformLayer", this.add.ellipse(this.centerX, this.height - 8, this.width * 0.92, 72, 0x050816, 0.34));
    this.addToBattlefieldLayer("slotPlatformLayer", this.add.ellipse(this.centerX, this.height - 45, this.width * 0.72, 78, 0x5b1134, 0.32));
    this.addToBattlefieldLayer("slotPlatformLayer", this.add.ellipse(this.centerX, this.height - 56, this.width * 0.62, 54, 0x22d3ee, 0.16));
    const shield = this.addToBattlefieldLayer("slotPlatformLayer", this.add.ellipse(this.centerX, this.height - 54, this.width * 0.58, 62, 0xff7aa2, 0.28));
    shield.setStrokeStyle(3, 0xa7f3d0, 0.48);
    this.addToBattlefieldLayer("slotPlatformLayer", this.add.ellipse(this.centerX, this.height - 58, this.width * 0.38, 36, 0xffd0e8, 0.38));
    const crystal = this.addToBattlefieldLayer("slotPlatformLayer", this.add.star(this.centerX, this.height - 62, 6, 12, 28, 0xff4fb2, 0.72));
    crystal.setStrokeStyle(3, 0xffffff, 0.56);
    this.addToBattlefieldLayer("slotPlatformLayer", this.add.ellipse(this.centerX, this.height - 68, this.width * 0.3, 10, 0xffffff, 0.3));
    this.addToBattlefieldLayer("slotPlatformLayer", this.add.ellipse(this.centerX, this.height - 50, this.width * 0.68, 72, 0x22d3ee, 0).setStrokeStyle(3, 0x22d3ee, 0.42));
  }

  private drawSlots(): void {
    this.slots = ROUTE_CONFIG.noseLeft.cellSlots.map((slot) => {
      const world = this.toWorld(slot.x, slot.y);
      const radius = DEPLOY_SLOT_VISUAL_RADIUS;
      const view = this.drawBiologicalPlatform(world.x, world.y, radius);
      this.slotDiscs.set(slot.id, view);
      if (this.debugEnabled) {
        this.addToBattlefieldLayer(
          "debugLayer",
          this.add.text(world.x, world.y - radius - 6, slot.id, {
            fontFamily: "monospace",
            fontSize: "11px",
            color: "#0f172a",
            backgroundColor: "rgba(255,255,255,0.72)",
            padding: { left: 3, right: 3, top: 1, bottom: 1 }
          }).setOrigin(0.5)
        );
      }
      return { id: slot.id, x: world.x, y: world.y, radius };
    });
    this.updateSlotHighlights();
  }

  private drawBiologicalPlatform(x: number, y: number, radius: number): Phaser.GameObjects.Arc {
    this.drawPlatformSocket(x, y, radius);
    this.drawImmunePlatformRim(x, y, radius);
    const view = this.addToBattlefieldLayer("slotPlatformLayer", this.add.circle(x, y - 3, radius * 0.72, 0x22d3ee, 0.34));
    view.setStrokeStyle(3, 0xdffbff, 0.72);
    this.tweens.add({
      targets: view,
      alpha: { from: 0.72, to: 0.42 },
      scale: { from: 1, to: 1.08 },
      duration: 1350,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
    return view;
  }

  private drawPlatformSocket(x: number, y: number, radius: number): void {
    this.addToBattlefieldLayer("slotPlatformLayer", this.add.ellipse(x, y + 16, radius * 4.15, radius * 1.35, 0x050816, 0.36));
    this.addToBattlefieldLayer("slotPlatformLayer", this.add.ellipse(x, y + 9, radius * 3.45, radius * 1.1, 0x6d173b, 0.5));
    this.addToBattlefieldLayer("slotPlatformLayer", this.add.ellipse(x, y + 5, radius * 3.18, radius * 0.95, 0xff9eaa, 0.24));
  }

  private drawImmunePlatformRim(x: number, y: number, radius: number): void {
    const outer = this.addToBattlefieldLayer("slotPlatformLayer", this.add.ellipse(x, y + 2, radius * 3.0, radius * 0.94, 0xd89682, 0.64));
    outer.setStrokeStyle(4, 0xffd6a3, 0.58);
    this.addToBattlefieldLayer("slotPlatformLayer", this.add.ellipse(x, y - 1, radius * 2.38, radius * 0.7, 0x7c3f5a, 0.42).setStrokeStyle(3, 0x76e9ff, 0.5));
    this.addToBattlefieldLayer("slotPlatformLayer", this.add.ellipse(x, y - 4, radius * 1.62, radius * 0.45, 0xe0fbff, 0.44));
    this.addToBattlefieldLayer("slotPlatformLayer", this.add.ellipse(x, y - 7, radius * 1.02, radius * 0.24, 0xffffff, 0.36));
    this.addToBattlefieldLayer("slotPlatformLayer", this.add.circle(x, y - 5, radius * 0.34, 0x3ccbff, 0.72).setStrokeStyle(2, 0xffffff, 0.68));
  }

  private updateSlotHighlights(): void {
    for (const slot of this.slots) {
      const disc = this.slotDiscs.get(slot.id);
      if (!disc) {
        continue;
      }
      const occupied = this.runtime.cells.some((cell) => cell.slotId === slot.id);
      if (occupied) {
        disc.setFillStyle(0xffffff, 0.18);
        disc.setStrokeStyle(2, 0x43e0c2, 0.45);
      } else if (this.selectedCell) {
        disc.setFillStyle(0x22d3ee, 0.3);
        disc.setStrokeStyle(4, 0xa7f3d0, 0.95);
      } else {
        disc.setFillStyle(0x22d3ee, 0.16);
        disc.setStrokeStyle(3, 0x8be8ff, 0.68);
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
        this.destroyUnitView(view);
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
      const visualScale = this.depthScaleForY(cell.y, 0.045);
      view.setScale(visualScale);
      view.setDepth(46 + world.y / 18);
      this.syncUnitShadow(view, world.x, world.y, visualScale, 4000 + Math.round(world.y));
    }
  }

  private renderEnemies(): void {
    const liveIds = new Set(this.runtime.enemies.map((enemy) => enemy.id));
    for (const [id, view] of this.enemyViews) {
      if (!liveIds.has(id)) {
        this.destroyUnitView(view);
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
      if (!view.getData("introAnimating")) {
        const visualScale = this.depthScaleForY(enemy.y, enemy.kind === "mutantVirusCluster" ? 0.055 : 0.04);
        view.setScale(visualScale);
        this.syncUnitShadow(view, world.x, world.y, visualScale, 4000 + Math.round(world.y));
      }
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
        this.addToBattlefieldLayer("projectileLayer", view);
        this.projectileViews.set(projectile.id, view);
      }
      view.setPosition(world.x, world.y);
    }
  }

  private createCellView(cell: RuntimeCell, x: number, y: number): Phaser.GameObjects.Container {
    const asset = getCellVisualAsset(cell.kind);
    const size = asset?.displaySize ?? (cell.kind === "macrophage" ? 72 : 68);
    const shadow = this.createAssetShadow(asset, size);
    this.addToBattlefieldLayer("shadowLayer", shadow);
    shadow.setPosition(x, y + Number(shadow.getData("offsetY") ?? 0));
    const glow = this.add.ellipse(0, 1, size * 0.72, size * 0.2, cell.kind === "macrophage" ? 0xffb454 : 0x8b5cf6, 0.12);
    const visual = this.createBattleCellActor(cell.kind, asset);
    visual.setName("visual");
    const view = this.add.container(x, y, [glow, visual]);
    view.setData("shadow", shadow);
    this.addToBattlefieldLayer("unitLayer", view);
    return view;
  }

  private createEnemyView(enemy: RuntimeEnemy, x: number, y: number): Phaser.GameObjects.Container {
    const asset = getEnemyOrBossVisualAsset(enemy.kind);
    const size = asset?.displaySize ?? (enemy.kind === "mutantVirusCluster" ? 116 : enemy.kind === "bacteria" ? 58 : enemy.kind === "miniVirus" ? 34 : 42);
    const radius = size / 2;
    const displayWidth = asset?.displayWidth ?? size;
    const displayHeight = asset?.displayHeight ?? size;
    const children: Phaser.GameObjects.GameObject[] = [];
    const shadow = this.createAssetShadow(asset, size);
    this.addToBattlefieldLayer("shadowLayer", shadow);
    shadow.setPosition(x, y + Number(shadow.getData("offsetY") ?? 0));
    if (asset?.trail) {
      children.push(this.createFastVirusTrail(asset));
    }
    if (enemy.kind === "mutantVirusCluster") {
      const aura = this.add.ellipse(0, -displayHeight * 0.3, displayWidth * 0.9, displayHeight * 0.64, 0xff3d2e, 0.08);
      aura.setStrokeStyle(3, 0xff9f1c, 0.18);
      children.push(aura);
    }
    const visual = enemy.kind === "mutantVirusCluster"
      ? this.createBossBattleActor(asset)
      : this.createBattleEnemyActor(enemy.kind, asset, radius);
    visual.setName("visual");
    if (enemy.kind === "fastVirus") {
      visual.setRotation(0.16);
    }
    children.push(visual);

    const hpWidth = enemy.kind === "mutantVirusCluster" ? displayWidth * 0.78 : displayWidth * 0.72;
    const hpHeight = enemy.kind === "mutantVirusCluster" ? 8 : 5;
    const hpY = -displayHeight * (asset?.originY ?? 0.76) - (enemy.kind === "mutantVirusCluster" ? 14 : 7);
    const hpBack = this.add.rectangle(0, hpY, hpWidth, hpHeight, 0xffffff, 0.94);
    const hp = this.add.rectangle(-hpWidth / 2, hpY, hpWidth, hpHeight, enemy.kind === "mutantVirusCluster" ? 0xef4444 : 0x22c55e, 1).setOrigin(0, 0.5).setName("hp");
    hpBack.setStrokeStyle(1, 0x071123, 0.18);
    children.push(hpBack, hp);

    if (enemy.kind === "mutantVirusCluster") {
      const label = this.add
        .text(0, hpY - 16, "BOSS", {
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
    container.setData("shadow", shadow);
    this.addToBattlefieldLayer("unitLayer", container);
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

  private createAssetShadow(asset: VisualAssetConfig | undefined, size: number): Phaser.GameObjects.Ellipse {
    const shadow = asset?.shadow ?? { widthRatio: 0.66, heightRatio: 0.18, alpha: 0.18, offsetYRatio: 0.05 };
    const width = (asset?.displayWidth ?? size) * shadow.widthRatio;
    const height = (asset?.displayHeight ?? size) * shadow.heightRatio;
    const ellipse = this.createSoftShadow(width, height, shadow.alpha * 1.18);
    ellipse.setData("offsetY", size * shadow.offsetYRatio);
    return ellipse;
  }

  private syncUnitShadow(view: Phaser.GameObjects.Container, x: number, y: number, scale: number, depth: number): void {
    const shadow = view.getData("shadow") as Phaser.GameObjects.Ellipse | undefined;
    if (!shadow) {
      return;
    }
    shadow.setPosition(x, y + Number(shadow.getData("offsetY") ?? 0) * scale);
    shadow.setScale(scale);
    shadow.setDepth(depth);
  }

  private destroyUnitView(view: Phaser.GameObjects.Container): void {
    const shadow = view.getData("shadow") as Phaser.GameObjects.Ellipse | undefined;
    shadow?.destroy();
    view.destroy();
  }

  private createGroundedImage(asset: VisualAssetConfig): Phaser.GameObjects.Image {
    return this.add
      .image(0, 0, asset.sprite.key)
      .setOrigin(0.5, asset.originY)
      .setDisplaySize(asset.displayWidth ?? asset.displaySize, asset.displayHeight ?? asset.displaySize);
  }

  private createBattleCellActor(kind: CellKind, asset?: VisualAssetConfig): Phaser.GameObjects.Container {
    const size = asset?.displaySize ?? (kind === "macrophage" ? 72 : 68);
    const rootY = -size * ((asset?.originY ?? 0.84) - 0.5);
    const actor = this.add.container(0, rootY);
    const color = kind === "macrophage" ? 0xff9f1c : 0x7c3aed;
    const dark = kind === "macrophage" ? 0x7c2d12 : 0x312e81;
    const body = kind === "macrophage"
      ? this.add.circle(0, 0, size * 0.28, color, 1)
      : this.add.star(0, 0, 8, size * 0.16, size * 0.31, color, 1);
    body.setStrokeStyle(4, 0xfff7ed, 0.72);
    actor.add(body);
    actor.add(this.add.circle(-size * 0.08, -size * 0.1, size * 0.08, 0xffffff, 0.42));
    actor.add(this.add.circle(size * 0.06, -size * 0.04, size * 0.06, 0xffffff, 0.3));
    this.drawCellArmorDetails(actor, kind, size, dark);
    actor.add(this.add.ellipse(0, size * 0.24, size * 0.62, size * 0.14, 0x071123, 0.12));
    return actor;
  }

  private drawCellArmorDetails(actor: Phaser.GameObjects.Container, kind: CellKind, size: number, dark: number): void {
    if (kind === "macrophage") {
      const shield = this.add.ellipse(size * 0.28, size * 0.06, size * 0.27, size * 0.38, 0x475569, 0.92);
      shield.setStrokeStyle(3, 0xffd68a, 0.8);
      actor.add(shield);
      actor.add(this.add.circle(size * 0.28, size * 0.04, size * 0.08, 0xffc44d, 0.95));
      actor.add(this.add.rectangle(-size * 0.28, size * 0.02, size * 0.22, size * 0.13, dark, 0.92).setRotation(-0.35));
      actor.add(this.add.circle(-size * 0.38, -size * 0.03, size * 0.09, 0xffb454, 0.95));
      return;
    }
    actor.add(this.add.ellipse(-size * 0.25, size * 0.03, size * 0.16, size * 0.46, 0x312e81, 0.9).setRotation(-0.7));
    actor.add(this.add.ellipse(size * 0.25, size * 0.03, size * 0.16, size * 0.46, 0x312e81, 0.9).setRotation(0.7));
    actor.add(this.add.circle(-size * 0.1, -size * 0.05, size * 0.045, 0xe0e7ff, 0.9));
    actor.add(this.add.circle(size * 0.1, -size * 0.05, size * 0.045, 0xe0e7ff, 0.9));
    actor.add(this.add.ellipse(0, size * 0.12, size * 0.3, size * 0.1, dark, 0.82));
  }

  private createBattleEnemyActor(kind: EnemyKind, asset: VisualAssetConfig | undefined, radius: number): Phaser.GameObjects.Container {
    const size = asset?.displaySize ?? radius * 2;
    const y = -size * ((asset?.originY ?? 0.76) - 0.5);
    const actor = this.add.container(0, y);
    if (kind === "bacteria") {
      const body = this.add.ellipse(0, 0, radius * 2.15, radius * 1.42, 0x86a93b, 1);
      body.setStrokeStyle(3, 0xf4ffd2, 0.75);
      actor.add(body);
      actor.add(this.add.circle(-radius * 0.36, -radius * 0.18, radius * 0.16, 0xd9f99d, 0.8));
      actor.add(this.add.circle(radius * 0.28, radius * 0.14, radius * 0.12, 0x365314, 0.42));
      return actor;
    }
    const color = kind === "fastVirus" ? 0xff3d2e : kind === "miniVirus" ? 0xff735c : 0xd7192f;
    const spikes = kind === "fastVirus" ? 10 : 9;
    const body = this.add.star(0, 0, spikes, radius * 0.5, radius, color, 1);
    body.setStrokeStyle(3, 0xffe4e6, 0.82);
    actor.add(body);
    actor.add(this.add.circle(-radius * 0.2, -radius * 0.2, radius * 0.16, 0xffffff, 0.38));
    actor.add(this.add.circle(radius * 0.18, radius * 0.12, radius * 0.1, 0x7f1d1d, 0.36));
    return actor;
  }

  private createBossBattleActor(asset?: VisualAssetConfig): Phaser.GameObjects.Container {
    const size = asset?.displaySize ?? 116;
    const y = -size * ((asset?.originY ?? 0.8) - 0.5);
    const actor = this.add.container(0, y);
    const body = this.add.star(0, 0, 15, size * 0.27, size * 0.48, 0x6d28d9, 1);
    body.setStrokeStyle(5, 0xff6b6b, 0.78);
    actor.add(body);
    actor.add(this.add.circle(0, size * 0.02, size * 0.24, 0xef4444, 0.72));
    actor.add(this.add.circle(0, size * 0.02, size * 0.13, 0xffd166, 0.9));
    actor.add(this.add.circle(-size * 0.14, -size * 0.1, size * 0.045, 0xfff7ed, 0.9));
    actor.add(this.add.circle(size * 0.14, -size * 0.1, size * 0.045, 0xfff7ed, 0.9));
    actor.add(this.add.ellipse(0, size * 0.24, size * 0.72, size * 0.16, 0x071123, 0.15));
    return actor;
  }

  private createFastVirusTrail(asset: VisualAssetConfig): Phaser.GameObjects.Ellipse {
    const trailConfig = asset.trail ?? { color: 0xff7a1a, alpha: 0.2, widthRatio: 0.8, heightRatio: 0.2, offsetXRatio: -0.4, offsetYRatio: 0 };
    const width = (asset.displayWidth ?? asset.displaySize) * trailConfig.widthRatio;
    const height = (asset.displayHeight ?? asset.displaySize) * trailConfig.heightRatio;
    const trail = this.add.ellipse(
      asset.displaySize * trailConfig.offsetXRatio,
      asset.displaySize * trailConfig.offsetYRatio,
      width,
      height,
      trailConfig.color,
      trailConfig.alpha
    );
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
      visual.setY(Math.sin(this.time.now / 120) * -1.2);
      return;
    }
    if (enemy.kind === "bacteria") {
      visual.setRotation(Math.sin(this.time.now / 520 + enemy.progress * 8) * 0.035);
      return;
    }
    if (enemy.kind === "mutantVirusCluster") {
      const pulse = 1 + Math.sin(this.time.now / 420) * 0.035;
      visual.setScale(pulse);
      visual.setY(Math.sin(this.time.now / 360) * -1.4);
    }
  }

  private playBossSpawnFeedback(view: Phaser.GameObjects.Container): void {
    view.setData("introAnimating", true);
    view.setScale(0.82);
    this.cameras.main.shake(150, 0.004);
    this.tweens.add({
      targets: view,
      scale: 1,
      duration: 420,
      ease: "Back.easeOut",
      onComplete: () => view.setData("introAnimating", false)
    });
  }

  private playMiniVirusPop(view: Phaser.GameObjects.Container): void {
    view.setData("introAnimating", true);
    view.setScale(0.58);
    this.tweens.add({
      targets: view,
      scale: 1,
      duration: 300,
      ease: "Back.easeOut",
      onComplete: () => view.setData("introAnimating", false)
    });
  }

  private playBossSplitFlash(x: number, y: number): void {
    const flash = this.addToBattlefieldLayer("effectLayer", this.add.circle(x, y, 44, 0xff3d2e, 0.34));
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
    const size = asset?.displaySize ?? (kind === "macrophage" ? 72 : 68);
    const radius = size * 0.38;
    const shape = kind === "macrophage"
      ? this.add.circle(0, 0, radius, color, 1)
      : this.add.star(0, 0, 7, radius * 0.42, radius, color, 1);
    shape.setY(-size * ((asset?.originY ?? 0.84) - 0.5));
    shape.setStrokeStyle(3, 0xffffff, 0.95);
    return shape;
  }

  private createEnemyFallbackShape(kind: EnemyKind, asset: VisualAssetConfig | undefined, radius: number): Phaser.GameObjects.Shape {
    const color = asset?.fallbackColor ?? 0xff6b3d;
    const shape = kind === "bacteria"
      ? this.add.ellipse(0, 0, radius * 2.2, radius * 1.55, color, 1)
      : this.add.star(0, 0, kind === "mutantVirusCluster" ? 13 : 9, radius * 0.58, radius, color, 1);
    shape.setY(-(asset?.displaySize ?? radius * 2) * ((asset?.originY ?? 0.76) - 0.5));
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
    const burst = this.addToBattlefieldLayer("effectLayer", this.add.circle(world.x, world.y, 16, 0x22c55e, 0.28));
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
        const hit = this.addToBattlefieldLayer("effectLayer", this.add.circle(world.x, world.y, 10, 0xffffff, 0.52));
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
      const label = this.addToBattlefieldLayer(
        "labelLayer",
        this.add.text(world.x, world.y - 22, effect.text, {
          fontFamily: "system-ui",
          fontSize: effect.tone === "boss" ? "24px" : "16px",
          fontStyle: "900",
          color,
          stroke: "#ffffff",
          strokeThickness: 4
        })
        .setOrigin(0.5)
      );
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
    this.addToBattlefieldLayer(
      "effectLayer",
      this.add.rectangle(this.centerX, this.centerY, this.width * 0.84, 178, 0xffffff, 0.94).setStrokeStyle(4, victory ? 0x22c55e : 0xef4444, 1)
    );
    this.addToBattlefieldLayer(
      "labelLayer",
      this.add.text(this.centerX, this.centerY - 35, victory ? "防线胜利" : "组织失守", {
        fontFamily: "system-ui",
        fontSize: "36px",
        fontStyle: "900",
        color: victory ? "#15803d" : "#b91c1c"
      })
      .setOrigin(0.5)
    );
    this.addToBattlefieldLayer(
      "labelLayer",
      this.add.text(this.centerX, this.centerY + 28, victory ? "鼻腔保卫战完成。" : "点击重新开始再战。", {
        fontFamily: "system-ui",
        fontSize: "17px",
        fontStyle: "800",
        color: "#334155"
      })
      .setOrigin(0.5)
    );
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
    return this.toVisualWorld(x, y);
  }

  private toVisualWorld(x: number, y: number): { x: number; y: number } {
    const perspective = 0.82 + y * 0.18;
    return {
      x: this.centerX + (x - 0.5) * this.width * perspective,
      y: y * this.height
    };
  }

  private depthScaleForY(normalizedY: number, range: number): number {
    return 1 - range / 2 + normalizedY * range;
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
