import { BATTLE_BALANCE_CONFIG } from "../configs/balanceConfig.ts";
import { WAVE_CONFIG } from "../configs/waveConfig.ts";
import type { BattleSystem } from "../types/battle.ts";
import type { EnemyKind } from "../types/game.ts";
import type { BattleRouteSide, BattleRuntimeState } from "./BattleRuntimeState.ts";
import type { EnemySystem } from "./EnemySystem.ts";

interface PendingSpawn {
  enemy: EnemyKind;
  route: BattleRouteSide;
  spawnAt: number;
}

export class WaveSystem implements BattleSystem {
  readonly name = "WaveSystem";
  private readonly waveSetId: string;
  private readonly runtime?: BattleRuntimeState;
  private readonly enemies?: EnemySystem;
  private nextWaveAt = 0;
  private elapsed = 0;
  private pendingSpawns: PendingSpawn[] = [];

  constructor(waveSetId = "legacyTwentyWave", runtime?: BattleRuntimeState, enemies?: EnemySystem) {
    this.waveSetId = waveSetId;
    this.runtime = runtime;
    this.enemies = enemies;
    if (this.runtime) {
      this.runtime.maxWave = this.maxWave;
    }
  }

  get maxWave(): number {
    return this.waveSet.waves.length;
  }

  buildWave(wave: number): EnemyKind[] {
    const waveConfig = this.waveSet.waves.find((item) => item.wave === wave);
    if (!waveConfig) {
      return [];
    }

    return waveConfig.groups.flatMap((group) => this.repeat(group.enemy, group.count));
  }

  getWaveLabel(wave: number): string {
    return this.waveSet.waves.find((item) => item.wave === wave)?.label ?? "未知波次";
  }

  update(_timeOrDelta = 0, maybeDelta?: number): void {
    if (!this.runtime || !this.enemies || this.runtime.status !== "playing") {
      return;
    }

    const delta = maybeDelta ?? _timeOrDelta;
    this.elapsed += delta;
    this.spawnReadyEnemies();

    if (this.pendingSpawns.length > 0 || this.runtime.enemies.length > 0 || this.elapsed < this.nextWaveAt) {
      return;
    }

    if (this.runtime.wave >= this.maxWave) {
      if (this.runtime.defeatedBoss) {
        this.runtime.status = "victory";
        this.runtime.message = "鼻腔保卫战胜利！";
      }
      return;
    }

    this.startNextWave();
  }

  startNextWave(): void {
    if (!this.runtime || !this.enemies) {
      return;
    }

    const nextWave = this.runtime.wave + 1;
    const wave = this.waveSet.waves.find((item) => item.wave === nextWave);
    if (!wave) {
      return;
    }

    this.runtime.wave = nextWave;
    const spawnInterval = BATTLE_BALANCE_CONFIG.combat.firstLevelSpawnIntervalMs;
    let spawnIndex = 0;
    wave.groups.forEach((group, groupIndex) => {
      for (let index = 0; index < group.count; index += 1) {
        this.pendingSpawns.push({
          enemy: group.enemy,
          route: this.routeFor(group.route, index + groupIndex),
          spawnAt: this.elapsed + spawnIndex * spawnInterval
        });
        spawnIndex += 1;
      }
    });
    this.runtime.message = `第${nextWave}波：${wave.label}`;
    this.spawnReadyEnemies();
    const spawnDuration = Math.max(0, spawnIndex - 1) * spawnInterval;
    this.nextWaveAt = this.elapsed + spawnDuration + this.preparationAfterWave(nextWave);
  }

  private repeat(kind: EnemyKind, count: number): EnemyKind[] {
    return Array.from({ length: count }, () => kind);
  }

  private get waveSet() {
    return WAVE_CONFIG[this.waveSetId] ?? WAVE_CONFIG.legacyTwentyWave;
  }

  cleanup(): void {
    this.elapsed = 0;
    this.nextWaveAt = 0;
    this.pendingSpawns = [];
  }

  getPendingSpawnCount(): number {
    return this.pendingSpawns.length;
  }

  getPreparationAfterWave(wave: number): number {
    return this.preparationAfterWave(wave);
  }

  getSpawnIntervalMs(): number {
    return BATTLE_BALANCE_CONFIG.combat.firstLevelSpawnIntervalMs;
  }

  private spawnReadyEnemies(): void {
    if (!this.enemies || this.pendingSpawns.length === 0) {
      return;
    }

    const ready = this.pendingSpawns.filter((spawn) => spawn.spawnAt <= this.elapsed);
    this.pendingSpawns = this.pendingSpawns.filter((spawn) => spawn.spawnAt > this.elapsed);
    for (const spawn of ready) {
      this.enemies.spawn(spawn.enemy, spawn.route, 0);
    }
  }

  private preparationAfterWave(wave: number): number {
    if (wave >= this.maxWave) {
      return 0;
    }

    return wave === this.maxWave - 1
      ? BATTLE_BALANCE_CONFIG.combat.firstLevelBossPreparationMs
      : BATTLE_BALANCE_CONFIG.combat.firstLevelNormalPreparationMs;
  }

  private routeFor(route: "left" | "right" | "mixed" | undefined, index: number): BattleRouteSide {
    if (route === "right") {
      return "right";
    }
    if (route === "mixed") {
      return index % 2 === 0 ? "left" : "right";
    }
    return "left";
  }
}
