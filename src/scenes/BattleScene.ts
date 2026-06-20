import Phaser from "phaser";
import { CELL_CONFIGS } from "../configs/cells";
import { ENEMY_CONFIGS } from "../configs/enemies";
import { SKILL_CONFIGS } from "../configs/skills";
import { CellTower } from "../entities/CellTower";
import { Enemy } from "../entities/Enemy";
import { Projectile } from "../entities/Projectile";
import { AudioCueSystem } from "../systems/AudioCueSystem";
import { BuffSystem } from "../systems/BuffSystem";
import { emitBattleState, onBattleCommand } from "../systems/gameBus";
import { GridSystem, type GridSlot } from "../systems/GridSystem";
import { RandomEventSystem } from "../systems/RandomEventSystem";
import { recordChapterClear, recordKill, unlockCodex } from "../systems/storage";
import { WaveSystem } from "../systems/WaveSystem";
import type {
  BattleState,
  CellKind,
  EnemyKind,
  LevelConfig,
  RandomEventConfig,
  SkillKind
} from "../types/game";

interface ActiveMultipliers {
  attack: number;
  enemyHealth: number;
  atpRegen: number;
  attackRate: number;
}

export class BattleScene extends Phaser.Scene {
  private readonly level: LevelConfig;
  private readonly onSaveChanged: () => void;
  private readonly grid = new GridSystem();
  private readonly waves = new WaveSystem();
  private readonly randomEvents = new RandomEventSystem();
  private readonly buffs = new BuffSystem();
  private readonly audio = new AudioCueSystem();

  private cells = new Map<string, CellTower>();
  private summons: CellTower[] = [];
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private selectedCell?: CellKind;
  private randomEvent?: RandomEventConfig;
  private cleanupCommands?: () => void;
  private destroyCleanupRegistered = false;
  private lastStateEmit = 0;
  private lastAtpTick = 0;
  private nextMicroRewardAt = 0;
  private lastKillAt = 0;
  private combo = 0;
  private stormUntil = 0;
  private lastDangerShakeAt = 0;
  private nextWaveAt = 0;
  private currentWave = 0;
  private spawnQueue: EnemyKind[] = [];
  private lastSpawnAt = 0;
  private isPaused = false;
  private isFinished = false;
  private feverUntil = 0;
  private vaccineUntil = 0;
  private flashOverlay?: Phaser.GameObjects.Rectangle;
  private dangerOverlay?: Phaser.GameObjects.Rectangle;
  private highlightGraphics?: Phaser.GameObjects.Graphics;
  private comboText?: Phaser.GameObjects.Text;
  private readonly cooldownUntil: Record<SkillKind, number> = {
    fever: 0,
    vaccine: 0,
    cart: 0
  };

  private state: BattleState = {
    life: 20,
    atp: 180,
    wave: 0,
    maxWave: 20,
    paused: false,
    pauseMenuOpen: false,
    message: "选择底部细胞卡牌，然后点击地图塔位部署。",
    combo: 0,
    comboTier: "none",
    stormActive: false,
    dangerLevel: 0,
    activeBuffs: [],
    skillCooldowns: {
      fever: 0,
      vaccine: 0,
      cart: 0
    },
    kills: {
      bacteria: 0,
      fluVirus: 0,
      resistantBacteria: 0,
      mutantVirus: 0,
      miniVirus: 0,
      cancerCell: 0,
      cancerKing: 0
    }
  };

  constructor(level: LevelConfig, onSaveChanged: () => void) {
    super("BattleScene");
    this.level = level;
    this.onSaveChanged = onSaveChanged;
  }

  create(): void {
    this.resetRuntime();
    this.grid.draw(this, this.level.mapKey);
    this.createFeedbackLayers();
    this.randomEvent = this.randomEvents.pick();
    this.applyRandomEventIntro();

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      this.updateSlotHighlight(pointer.worldX, pointer.worldY);
    });

    this.releaseCommandListener();
    this.cleanupCommands = onBattleCommand((command) => {
      if (command.type === "select-cell") {
        this.selectedCell = command.cell;
        this.state.selectedCell = command.cell;
        this.setMessage(`${CELL_CONFIGS[command.cell].name}待命，点击空塔位部署。`);
      }

      if (command.type === "place-selected") {
        this.handlePointer(command.x, command.y);
      }

      if (command.type === "use-skill") {
        this.useSkill(command.skill);
      }

      if (command.type === "toggle-pause") {
        this.isPaused = !this.isPaused;
        this.state.paused = this.isPaused;
        this.state.pauseMenuOpen = this.isPaused;
        this.setMessage(this.isPaused ? "战斗已暂停。" : "战斗继续。");
      }

      if (command.type === "resume") {
        this.isPaused = false;
        this.state.paused = false;
        this.state.pauseMenuOpen = false;
        this.setMessage("战斗继续。");
      }

      if (command.type === "restart") {
        this.scene.restart();
      }
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.releaseCommandListener);
    if (!this.destroyCleanupRegistered) {
      this.events.once(Phaser.Scenes.Events.DESTROY, this.releaseCommandListener);
      this.destroyCleanupRegistered = true;
    }

    this.nextWaveAt = this.time.now + 2800;
    this.nextMicroRewardAt = this.time.now + Phaser.Math.Between(5000, 10000);
    this.emitState(true);
  }

  private readonly releaseCommandListener = () => {
    this.cleanupCommands?.();
    this.cleanupCommands = undefined;
  };

  update(time: number, delta: number): void {
    this.updateCooldowns(time);
    this.updateComboTimeout(time);
    this.updateDangerPressure(time);
    this.emitState();

    if (this.isPaused || this.isFinished) {
      return;
    }

    const deltaSeconds = delta / 1000;
    this.tickAtp(time);
    this.tickMicroReward(time);
    this.updateWaves(time);
    this.updateEnemies(time, deltaSeconds);
    this.updateTowers(time);
    this.updateProjectiles(deltaSeconds);
    this.cleanupDestroyed();
    this.checkVictory();
  }

  private resetRuntime(): void {
    this.cells = new Map();
    this.summons = [];
    this.enemies = [];
    this.projectiles = [];
    this.selectedCell = undefined;
    this.currentWave = 0;
    this.spawnQueue = [];
    this.lastSpawnAt = 0;
    this.lastAtpTick = 0;
    this.nextWaveAt = 0;
    this.isPaused = false;
    this.isFinished = false;
    this.feverUntil = 0;
    this.vaccineUntil = 0;
    this.stormUntil = 0;
    this.nextMicroRewardAt = 0;
    this.lastKillAt = 0;
    this.combo = 0;
    this.lastDangerShakeAt = 0;
    this.buffs.clear();
    this.cooldownUntil.fever = 0;
    this.cooldownUntil.vaccine = 0;
    this.cooldownUntil.cart = 0;
    this.state = {
      life: 20,
      atp: 180,
      wave: 0,
      maxWave: this.waves.maxWave,
      paused: false,
      pauseMenuOpen: false,
      message: "选择底部细胞卡牌，然后点击地图塔位部署。",
      combo: 0,
      comboTier: "none",
      stormActive: false,
      dangerLevel: 0,
      activeBuffs: [],
      skillCooldowns: {
        fever: 0,
        vaccine: 0,
        cart: 0
      },
      kills: {
        bacteria: 0,
        fluVirus: 0,
        resistantBacteria: 0,
        mutantVirus: 0,
        miniVirus: 0,
        cancerCell: 0,
        cancerKing: 0
      }
    };
  }

  private applyRandomEventIntro(): void {
    if (!this.randomEvent) {
      return;
    }

    this.state.randomEventName = this.randomEvent.name;
    this.setMessage(`随机事件：${this.randomEvent.name}，${this.randomEvent.description}`);
  }

  private createFeedbackLayers(): void {
    this.highlightGraphics = this.add.graphics().setDepth(4);
    this.dangerOverlay = this.add.rectangle(480, 280, 960, 560, 0xbe123c, 0).setDepth(80);
    this.flashOverlay = this.add.rectangle(480, 280, 960, 560, 0xffffff, 0).setDepth(90);
    this.comboText = this.add
      .text(480, 36, "", {
        fontFamily: "system-ui",
        fontSize: "34px",
        fontStyle: "900",
        color: "#f97316",
        stroke: "#ffffff",
        strokeThickness: 5
      })
      .setOrigin(0.5)
      .setDepth(95);
  }

  private updateSlotHighlight(x: number, y: number): void {
    if (!this.highlightGraphics) {
      return;
    }

    this.highlightGraphics.clear();
    const slot = this.grid.getSlotAt(x, y);
    if (!slot || !this.selectedCell) {
      return;
    }

    const occupied = this.cells.has(slot.key);
    this.highlightGraphics.lineStyle(4, occupied ? 0xf97316 : 0x22c55e, 0.95);
    this.highlightGraphics.fillStyle(occupied ? 0xf97316 : 0x22c55e, 0.16);
    this.highlightGraphics.fillRoundedRect(slot.x - 28, slot.y - 28, 56, 56, 14);
    this.highlightGraphics.strokeRoundedRect(slot.x - 28, slot.y - 28, 56, 56, 14);
  }

  private updateComboTimeout(time: number): void {
    if (this.combo > 0 && time - this.lastKillAt > 2600) {
      this.combo = 0;
      this.state.combo = 0;
      this.state.comboTier = "none";
      this.updateComboBanner();
    }
  }

  private updateDangerPressure(time: number): void {
    const closestProgress = this.enemies.reduce((value, enemy) => {
      if (!enemy.active) {
        return value;
      }
      return Math.max(value, Phaser.Math.Clamp((enemy.x - 610) / (this.grid.coreX - 610), 0, 1));
    }, 0);

    const cancerPressure = this.enemies.some((enemy) => enemy.active && (enemy.kind === "cancerCell" || enemy.kind === "cancerKing"));
    const dangerLevel = Math.max(closestProgress, cancerPressure ? 0.22 : 0);
    this.state.dangerLevel = dangerLevel;

    if (this.dangerOverlay) {
      this.dangerOverlay.setAlpha(dangerLevel * 0.34);
    }

    if (dangerLevel > 0.62 && time - this.lastDangerShakeAt > 900) {
      this.lastDangerShakeAt = time;
      this.cameras.main.shake(130, 0.0028 + dangerLevel * 0.003);
    }
  }

  private flash(color: number, alpha: number, duration: number): void {
    if (!this.flashOverlay) {
      return;
    }

    this.flashOverlay.setFillStyle(color, alpha);
    this.flashOverlay.setAlpha(alpha);
    this.tweens.add({
      targets: this.flashOverlay,
      alpha: 0,
      duration,
      ease: "Quad.easeOut"
    });
  }

  private floatText(x: number, y: number, text: string, color: string, size = 18): void {
    const label = this.add
      .text(x, y, text, {
        fontFamily: "system-ui",
        fontSize: `${size}px`,
        fontStyle: "900",
        color,
        stroke: "#ffffff",
        strokeThickness: 4
      })
      .setOrigin(0.5)
      .setDepth(100);

    this.tweens.add({
      targets: label,
      y: y - 34,
      alpha: 0,
      duration: 850,
      ease: "Cubic.easeOut",
      onComplete: () => label.destroy()
    });
  }

  private updateComboBanner(): void {
    if (!this.comboText) {
      return;
    }

    if (this.combo <= 1) {
      this.comboText.setText("");
      return;
    }

    this.comboText.setText(`COMBO x${this.combo}`);
    this.comboText.setColor(this.combo >= 10 ? "#ea580c" : this.combo >= 5 ? "#7c3aed" : "#0891b2");
    this.tweens.add({
      targets: this.comboText,
      scale: 1.24,
      yoyo: true,
      duration: 110
    });
  }

  private cancerPressure(): void {
    this.cameras.main.shake(240, 0.006);
    this.flash(0x7f1d1d, 0.26, 280);
    this.tweens.add({
      targets: this.cameras.main,
      zoom: 1.012,
      yoyo: true,
      duration: 180
    });
  }

  private handlePointer(x: number, y: number): void {
    if (this.isFinished) {
      return;
    }

    const slot = this.grid.getSlotAt(x, y);
    if (!slot) {
      return;
    }

    const existing = this.cells.get(slot.key);
    if (existing) {
      this.tryUpgrade(existing);
      return;
    }

    if (!this.selectedCell) {
      this.setMessage("先从底部选择一种免疫细胞。");
      return;
    }

    this.placeCell(slot, this.selectedCell);
  }

  private placeCell(slot: GridSlot, kind: CellKind): void {
    const config = CELL_CONFIGS[kind];
    if (this.state.atp < config.cost) {
      this.setMessage(`ATP不足，部署${config.name}需要${config.cost}。`);
      return;
    }

    this.state.atp -= config.cost;
    const tower = new CellTower(this, kind, slot.row, slot.col, slot.x, slot.y);
    this.cells.set(slot.key, tower);
    unlockCodex(kind);
    this.onSaveChanged();
    this.sayForCell(kind);
    this.emitState(true);
  }

  private tryUpgrade(tower: CellTower): void {
    if (tower.isMaxLevel) {
      this.setMessage(`${tower.config.name}已达到Lv3。`);
      return;
    }

    if (this.state.atp < tower.upgradeCost) {
      this.setMessage(`升级需要${tower.upgradeCost} ATP。`);
      return;
    }

    this.state.atp -= tower.upgradeCost;
    tower.upgrade();
    const unlock = tower.config.levels[tower.level - 1]?.unlock;
    this.setMessage(`${tower.config.name}升级到Lv${tower.level}${unlock ? `，解锁${unlock}` : ""}。`);
    this.emitState(true);
  }

  private tickAtp(time: number): void {
    if (time - this.lastAtpTick < 5000) {
      return;
    }

    this.lastAtpTick = time;
    this.state.atp += Math.round(20 * this.getMultipliers().atpRegen);
  }

  private tickMicroReward(time: number): void {
    if (time < this.nextMicroRewardAt) {
      return;
    }

    const reward = Phaser.Math.Between(8, 18);
    const tips = ["免疫系统活跃", "白细胞强化", "抗体生成中", "细胞因子扩散"];
    const tip = Phaser.Utils.Array.GetRandom(tips);
    this.state.atp += reward;
    this.nextMicroRewardAt = time + Phaser.Math.Between(5000, 10000);
    this.cameras.main.shake(90, 0.0025);
    this.audio.play("micro", 1);
    this.floatText(480, 72, `${tip} +${reward} ATP`, "#0f766e", 24);
    this.setMessage(`${tip}：获得${reward} ATP。`);
  }

  private updateWaves(time: number): void {
    if (this.spawnQueue.length === 0 && this.enemies.length === 0 && this.currentWave < this.waves.maxWave) {
      if (time >= this.nextWaveAt) {
        this.startNextWave();
      }
    }

    if (this.spawnQueue.length > 0 && time - this.lastSpawnAt > 720) {
      const kind = this.spawnQueue.shift();
      if (kind) {
        this.spawnEnemy(kind);
        this.lastSpawnAt = time;
      }
    }
  }

  private startNextWave(): void {
    this.currentWave += 1;
    this.state.wave = this.currentWave;
    this.spawnQueue = Phaser.Utils.Array.Shuffle(this.waves.buildWave(this.currentWave));
    this.setMessage(`第${this.currentWave}波：${this.waves.getWaveLabel(this.currentWave)}。`);
    if (this.currentWave === this.waves.maxWave) {
      this.audio.play("boss", 1);
      this.cameras.main.shake(420, 0.006);
      this.flash(0xbe123c, 0.24, 420);
    }
  }

  private spawnEnemy(kind: EnemyKind, lane = Phaser.Math.Between(0, this.grid.rows - 1), x = this.grid.enemyStartX): Enemy {
    const enemy = new Enemy(this, kind, lane, x, this.grid.getLaneY(lane), this.getMultipliers().enemyHealth);
    this.enemies.push(enemy);
    unlockCodex(kind);
    if (kind === "cancerKing") {
      this.floatText(480, 250, "癌王出现", "#be123c", 42);
      this.cancerPressure();
    }
    return enemy;
  }

  private updateEnemies(time: number, deltaSeconds: number): void {
    for (const enemy of this.enemies) {
      if (!enemy.active) {
        continue;
      }

      const stormSlow = this.time.now < this.stormUntil ? 0.48 : 1;
      const berserkSpeed = enemy.berserk ? 1.78 : 1;
      enemy.step(deltaSeconds, stormSlow * berserkSpeed);

      if (enemy.kind === "cancerCell" && time - enemy.lastCloneAt > 20000) {
        enemy.lastCloneAt = time;
        this.spawnEnemy("cancerCell", enemy.lane, Math.max(this.grid.enemyStartX, enemy.x - 48));
        this.setMessage("癌细胞正在复制自己，优先清除！");
        this.audio.play("heartbeat", 1);
        this.cancerPressure();
      }

      if (enemy.kind === "cancerCell" && time > enemy.nextFakeDeathAt && enemy.health > enemy.maxHealth * 0.22) {
        enemy.beginFakeDeath(1450);
        this.floatText(enemy.x, enemy.y - 34, "假死", "#7f1d1d", 18);
        this.setMessage("癌细胞进入假死，短暂停止移动并迷惑防线。");
      }

      if ((enemy.kind === "cancerCell" || enemy.kind === "cancerKing") && !enemy.berserk && enemy.health < enemy.maxHealth * 0.32) {
        enemy.triggerBerserk();
        this.spawnEnemy(enemy.kind === "cancerKing" ? "cancerCell" : "miniVirus", enemy.lane, Math.max(this.grid.enemyStartX, enemy.x - 42));
        this.floatText(enemy.x, enemy.y - 42, "狂暴分裂", "#be123c", 20);
        this.cancerPressure();
      }

      if (enemy.kind === "cancerKing" && time - enemy.lastCloneAt > 8500) {
        enemy.lastCloneAt = time;
        enemy.heal(0.025);
        enemy.activateShield(2.5);
        this.spawnEnemy(Math.random() > 0.5 ? "cancerCell" : "mutantVirus", Phaser.Math.Between(0, this.grid.rows - 1));
        this.setMessage("癌王：我要无限分裂！");
        this.audio.play("heartbeat", 1.4);
        this.cancerPressure();
      }

      if (enemy.x >= this.grid.coreX) {
        this.state.life = Math.max(0, this.state.life - enemy.damageToCore);
        enemy.destroy();
        this.setMessage(`${ENEMY_CONFIGS[enemy.kind].name}突破防线，核心器官受损！`);
        if (this.state.life <= 0) {
          this.finish(false);
        }
      }
    }
  }

  private updateTowers(time: number): void {
    const towers = [...this.cells.values(), ...this.summons].filter((tower) => tower.active);

    for (const tower of towers) {
      if (tower.expiresAt && time > tower.expiresAt) {
        tower.destroy();
        continue;
      }

      if (tower.kind === "dendritic") {
        continue;
      }

      const interval = this.getAttackInterval(tower);
      if (time - tower.lastAttackAt < interval) {
        continue;
      }

      const target = this.findTarget(tower);
      if (!target) {
        continue;
      }

      tower.lastAttackAt = time;
      this.fireAt(tower, target);
    }
  }

  private getAttackInterval(tower: CellTower): number {
    const config = tower.config;
    const cd4Boost = 1 + Math.min(0.36, this.countCells("cd4") * 0.12);
    const rate = Math.max(0.15, config.attackRate * this.getMultipliers().attackRate * cd4Boost);
    return 1000 / rate;
  }

  private findTarget(tower: CellTower): Enemy | null {
    const config = tower.config;
    const candidates = this.enemies.filter((enemy) => {
      if (!enemy.active) {
        return false;
      }

      if (tower.kind === "bcell") {
        return enemy.lane === tower.row && enemy.x >= tower.x - 12;
      }

      if (tower.kind === "macrophage") {
        return enemy.lane === tower.row && Phaser.Math.Distance.Between(tower.x, tower.y, enemy.x, enemy.y) <= config.range;
      }

      return Phaser.Math.Distance.Between(tower.x, tower.y, enemy.x, enemy.y) <= config.range;
    });

    if (candidates.length === 0) {
      return null;
    }

    const priorities = config.priority ?? [];
    const priorityTarget = candidates
      .filter((enemy) => priorities.includes(enemy.kind))
      .sort((a, b) => b.x - a.x || b.health - a.health)[0];

    return priorityTarget ?? candidates.sort((a, b) => b.x - a.x || b.health - a.health)[0] ?? null;
  }

  private fireAt(tower: CellTower, target: Enemy): void {
    const multipliers = this.getMultipliers();
    const dendriticBoost = this.getDendriticBoost(tower);
    const feverBoost = this.time.now < this.feverUntil ? 1.5 : 1;
    const critChance = (tower.kind === "nk" ? 0.25 : 0) + (this.time.now < this.vaccineUntil ? 0.3 : 0);
    const crit = Math.random() < critChance;
    let damage = tower.attack * multipliers.attack * dendriticBoost * feverBoost * (crit ? 1.8 : 1);

    if (
      tower.kind === "macrophage" &&
      target.kind === "bacteria" &&
      Math.random() < (tower.level >= 3 ? 0.34 : 0.18)
    ) {
      damage = target.health;
      this.setMessage("巨噬细胞：吞掉你！");
    }

    tower.pulse();

    if (tower.kind === "macrophage") {
      const died = target.takeDamage(damage, crit);
      if (died) {
        this.handleEnemyDeath(target);
      }
      return;
    }

    const projectileColor = CELL_CONFIGS[tower.kind].color;
    this.projectiles.push(new Projectile(this, tower.x, tower.y, target, damage, projectileColor, crit));
  }

  private updateProjectiles(deltaSeconds: number): void {
    for (const projectile of this.projectiles) {
      if (!projectile.active) {
        continue;
      }

      const hit = projectile.step(deltaSeconds);
      if (hit) {
        const died = projectile.target.takeDamage(projectile.damage, projectile.crit);
        if (died) {
          this.handleEnemyDeath(projectile.target);
        }
      }
    }
  }

  private handleEnemyDeath(enemy: Enemy): void {
    if (!enemy.active) {
      return;
    }

    this.state.atp += enemy.reward;
    this.state.kills[enemy.kind] += 1;
    this.registerCombo(enemy);
    this.rollDrop(enemy);

    const config = ENEMY_CONFIGS[enemy.kind];
    recordKill(enemy.kind, { isVirus: config.isVirus, isCancer: config.isCancer });
    this.onSaveChanged();

    if (enemy.kind === "mutantVirus") {
      this.spawnEnemy("miniVirus", enemy.lane, enemy.x - 14);
      this.spawnEnemy("miniVirus", enemy.lane, enemy.x - 36);
      this.setMessage("变异病毒分裂成小病毒！");
    }

    enemy.destroy();
    this.emitState(true);
  }

  private registerCombo(enemy: Enemy): void {
    const now = this.time.now;
    this.combo = now - this.lastKillAt <= 2400 ? this.combo + 1 : 1;
    this.lastKillAt = now;
    this.state.combo = this.combo;
    this.state.comboTier = this.combo >= 10 ? "x10" : this.combo >= 5 ? "x5" : this.combo >= 3 ? "x3" : "none";

    this.audio.play("combo", Math.min(10, this.combo));
    this.floatText(enemy.x, enemy.y - 42, `Combo x${this.combo}`, this.combo >= 10 ? "#f97316" : "#7c3aed", 22);
    this.updateComboBanner();

    if (this.combo === 3) {
      this.state.atp += 20;
      this.flash(0xfef08a, 0.18, 180);
      this.floatText(480, 108, "x3 ATP奖励 +20", "#ca8a04", 24);
    }

    if (this.combo === 5) {
      this.state.atp += 35;
      this.buffs.add("comboSpeed", "Combo攻速", 1.22, now + 9000);
      this.cameras.main.shake(160, 0.004);
      this.floatText(480, 108, "x5 攻速提升", "#2563eb", 26);
    }

    if (this.combo >= 10 && this.combo % 10 === 0) {
      this.triggerImmuneStorm();
    }
  }

  private rollDrop(enemy: Enemy): void {
    const chance = enemy.kind === "cancerCell" || enemy.kind === "cancerKing" ? 0.55 : 0.32;
    if (Math.random() > chance) {
      return;
    }

    const now = this.time.now;
    const roll = Math.random();
    if (roll < 0.36) {
      const multiplier = Math.random() < 0.18 ? 5 : 2;
      const bonus = enemy.reward * multiplier;
      this.state.atp += bonus;
      this.audio.play("drop", multiplier);
      this.floatText(enemy.x, enemy.y - 26, `ATP暴击 x${multiplier}`, "#f59e0b", 20);
      this.setMessage(`随机掉落：ATP暴击 x${multiplier}，获得${bonus} ATP。`);
      return;
    }

    if (roll < 0.58) {
      this.buffs.add("dropSpeed", "掉落攻速", 1.28, now + 10000);
      this.floatText(enemy.x, enemy.y - 26, "攻速Buff", "#2563eb", 20);
      this.setMessage("随机掉落：攻速提升10秒。");
      return;
    }

    if (roll < 0.8) {
      this.buffs.add("dropDamage", "掉落伤害", 1.32, now + 10000);
      this.floatText(enemy.x, enemy.y - 26, "伤害Buff", "#dc2626", 20);
      this.setMessage("随机掉落：伤害提升10秒。");
      return;
    }

    this.cooldownUntil.fever = Math.max(now, this.cooldownUntil.fever - 7000);
    this.cooldownUntil.vaccine = Math.max(now, this.cooldownUntil.vaccine - 7000);
    this.cooldownUntil.cart = Math.max(now, this.cooldownUntil.cart - 7000);
    this.buffs.reduceCooldowns(now, 2500);
    this.floatText(enemy.x, enemy.y - 26, "冷却-7s", "#0891b2", 20);
    this.setMessage("随机掉落：所有主动技能冷却减少7秒。");
  }

  private triggerImmuneStorm(): void {
    const now = this.time.now;
    this.stormUntil = now + 9000;
    this.buffs.add("storm", "免疫风暴", 1.6, this.stormUntil);
    this.state.atp += 80;
    this.state.stormActive = true;
    this.flash(0xffffff, 0.86, 260);
    this.cameras.main.shake(360, 0.009);
    this.audio.play("clear", 2);
    this.floatText(480, 138, "免疫风暴模式", "#ea580c", 36);
    this.setMessage("Combo x10！免疫风暴：全屏攻速提升，敌人减速。");
  }

  private cleanupDestroyed(): void {
    this.enemies = this.enemies.filter((enemy) => enemy.active);
    this.projectiles = this.projectiles.filter((projectile) => projectile.active);
    this.summons = this.summons.filter((tower) => tower.active);
  }

  private checkVictory(): void {
    if (
      this.currentWave >= this.waves.maxWave &&
      this.spawnQueue.length === 0 &&
      this.enemies.length === 0 &&
      !this.isFinished
    ) {
      this.finish(true);
    }
  }

  private finish(victory: boolean): void {
    this.isFinished = true;
    this.isPaused = false;
    if (victory) {
      recordChapterClear(this.getChapterNumber());
      this.onSaveChanged();
    }

    const panel = this.add.rectangle(480, 280, 560, 210, 0xffffff, 0.94);
    panel.setStrokeStyle(4, victory ? 0x22c55e : 0xef4444, 1);
    const title = victory ? "防线胜利" : "核心失守";
    const subtitle = victory ? "免疫系统完成本章守护。" : "调整部署顺序，再来一次。";
    this.add
      .text(480, 242, title, {
        fontFamily: "system-ui",
        fontSize: "40px",
        fontStyle: "900",
        color: victory ? "#15803d" : "#b91c1c"
      })
      .setOrigin(0.5);
    this.add
      .text(480, 305, subtitle, {
        fontFamily: "system-ui",
        fontSize: "18px",
        fontStyle: "800",
        color: "#334155"
      })
      .setOrigin(0.5);

    this.setMessage(victory ? "胜利！图鉴与成就已更新。" : "失败。可以点击重新开始。");
  }

  private useSkill(skill: SkillKind): void {
    const now = this.time.now;
    const config = SKILL_CONFIGS[skill];
    if (now < this.cooldownUntil[skill]) {
      this.setMessage(`${config.name}冷却中。`);
      return;
    }

    this.cooldownUntil[skill] = now + config.cooldown * 1000;

    if (skill === "fever") {
      this.feverUntil = now + config.duration * 1000;
      this.burstDamage(70, "发烧清扫", (enemy) => enemy.x > 120);
      this.setMessage("发烧模式启动：全体攻击提升！");
    }

    if (skill === "vaccine") {
      this.vaccineUntil = now + config.duration * 1000;
      this.burstDamage(135, "疫苗抗体潮", (enemy) => enemy.isVirus);
      this.setMessage("疫苗接种：全场暴击率提升！");
    }

    if (skill === "cart") {
      this.summonCartCells(now + config.duration * 1000);
      this.burstDamage(260, "CAR-T斩击", (enemy) => enemy.isCancer);
      this.setMessage("CAR-T疗法：超级T细胞加入战场！");
    }

    this.flash(0xffffff, 0.62, 240);
    this.cameras.main.shake(220, 0.006);
    this.audio.play("clear", 1.4);
    this.emitState(true);
  }

  private burstDamage(amount: number, label: string, predicate: (enemy: Enemy) => boolean): void {
    for (const enemy of [...this.enemies]) {
      if (!enemy.active || !predicate(enemy)) {
        continue;
      }

      this.floatText(enemy.x, enemy.y - 30, label, "#ffffff", 16);
      const died = enemy.takeDamage(amount, true);
      if (died) {
        this.handleEnemyDeath(enemy);
      }
    }
  }

  private summonCartCells(expiresAt: number): void {
    [1, 4, 7].forEach((row, index) => {
      const tower = new CellTower(this, "cd8", row, -1, 136 + index * 26, this.grid.getLaneY(row));
      tower.level = 3;
      tower.expiresAt = expiresAt;
      tower.setScale(1.14);
      this.summons.push(tower);
    });
  }

  private getDendriticBoost(tower: CellTower): number {
    let boost = 1;
    for (const helper of this.cells.values()) {
      if (helper.kind !== "dendritic" || !helper.active) {
        continue;
      }

      const distance = Phaser.Math.Distance.Between(tower.x, tower.y, helper.x, helper.y);
      if (distance <= helper.config.range) {
        boost = Math.max(boost, helper.level >= 3 ? 1.35 : 1.2);
      }
    }

    return boost;
  }

  private getMultipliers(): ActiveMultipliers {
    const now = this.time.now;
    const storm = now < this.stormUntil ? 1.6 : 1;
    return {
      attack: (this.randomEvent?.attackMultiplier ?? 1) * this.buffs.getMultiplier(["dropDamage"], now) * storm,
      enemyHealth: this.randomEvent?.enemyMultiplier ?? 1,
      atpRegen: this.randomEvent?.atpRegenMultiplier ?? 1,
      attackRate:
        (this.randomEvent?.attackRateMultiplier ?? 1) *
        this.buffs.getMultiplier(["comboSpeed", "dropSpeed"], now) *
        storm
    };
  }

  private countCells(kind: CellKind): number {
    return [...this.cells.values()].filter((cell) => cell.kind === kind && cell.active).length;
  }

  private updateCooldowns(time: number): void {
    this.state.skillCooldowns = {
      fever: Math.max(0, Math.ceil((this.cooldownUntil.fever - time) / 1000)),
      vaccine: Math.max(0, Math.ceil((this.cooldownUntil.vaccine - time) / 1000)),
      cart: Math.max(0, Math.ceil((this.cooldownUntil.cart - time) / 1000))
    };
    this.state.activeBuffs = this.buffs.list(time);
    this.state.stormActive = time < this.stormUntil;
  }

  private setMessage(message: string): void {
    this.state.message = message;
    this.emitState(true);
  }

  private emitState(force = false): void {
    if (!force && this.time.now - this.lastStateEmit < 250) {
      return;
    }

    this.lastStateEmit = this.time.now;
    emitBattleState({ ...this.state, selectedCell: this.selectedCell, paused: this.isPaused });
  }

  private sayForCell(kind: CellKind): void {
    const line: Record<CellKind, string> = {
      macrophage: "巨噬细胞：吞掉你！",
      dendritic: "树突细胞：抗原情报已共享！",
      nk: "NK细胞：目标锁定！",
      bcell: "B细胞：抗体准备发射！",
      cd4: "T细胞：全员听我指挥！",
      cd8: "T细胞：发现异常细胞！"
    };

    this.setMessage(line[kind]);
  }

  private getChapterNumber(): number {
    const chapterByMap: Record<LevelConfig["mapKey"], number> = {
      nose: 1,
      throat: 2,
      lung: 3,
      gut: 4,
      lymph: 5,
      cancer: 6
    };

    return chapterByMap[this.level.mapKey];
  }
}
