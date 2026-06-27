import { BATTLE_BALANCE_CONFIG } from "../configs/balanceConfig.ts";
import type { CellKind, EnemyKind } from "../types/game.ts";

export type BattleRouteSide = "left" | "right";
export type BattleStatus = "playing" | "victory" | "defeat";

export interface RuntimeEnemy {
  id: string;
  kind: EnemyKind;
  routeId: BattleRouteSide;
  health: number;
  maxHealth: number;
  speed: number;
  reward: number;
  damage: number;
  progress: number;
  x: number;
  y: number;
  bossSplitTriggered?: boolean;
}

export interface RuntimeCell {
  id: string;
  kind: CellKind;
  slotId: string;
  routeId: BattleRouteSide;
  x: number;
  y: number;
  range: number;
  attack: number;
  attackCooldownMs: number;
  lastAttackAt: number;
}

export interface RuntimeProjectile {
  id: string;
  targetId: string;
  x: number;
  y: number;
  damage: number;
  speed: number;
}

export interface RuntimeEffect {
  id: string;
  x: number;
  y: number;
  text: string;
  tone: "gain" | "danger" | "boss" | "hit";
}

export interface BattleRuntimeState {
  atp: number;
  maxAtp: number;
  tissueIntegrity: number;
  wave: number;
  maxWave: number;
  status: BattleStatus;
  message: string;
  gameSpeed: 1 | 2;
  levelSpeedMultiplier: number;
  selectedCell?: CellKind;
  enemies: RuntimeEnemy[];
  cells: RuntimeCell[];
  projectiles: RuntimeProjectile[];
  effects: RuntimeEffect[];
  defeatedBoss: boolean;
  nextEnemyId: number;
  nextCellId: number;
  nextProjectileId: number;
  nextEffectId: number;
  cleanup: () => void;
}

export interface BattleRuntimeOverrides {
  atp?: number;
  tissueIntegrity?: number;
  maxWave?: number;
  gameSpeed?: 1 | 2;
  levelSpeedMultiplier?: number;
}

export function createBattleRuntimeState(overrides: BattleRuntimeOverrides = {}): BattleRuntimeState {
  const state = {
    atp: overrides.atp ?? BATTLE_BALANCE_CONFIG.resources.initialAtp,
    maxAtp: BATTLE_BALANCE_CONFIG.resources.maxAtp,
    tissueIntegrity: overrides.tissueIntegrity ?? BATTLE_BALANCE_CONFIG.resources.initialTissueIntegrity,
    wave: 0,
    maxWave: overrides.maxWave ?? 9,
    status: "playing" as BattleStatus,
    message: "选择巨噬细胞或NK细胞，点击免疫驻点部署。",
    gameSpeed: overrides.gameSpeed ?? BATTLE_BALANCE_CONFIG.combat.defaultGameSpeed,
    levelSpeedMultiplier: overrides.levelSpeedMultiplier ?? BATTLE_BALANCE_CONFIG.combat.firstLevelSpeedMultiplier,
    selectedCell: undefined,
    enemies: [],
    cells: [],
    projectiles: [],
    effects: [],
    defeatedBoss: false,
    nextEnemyId: 1,
    nextCellId: 1,
    nextProjectileId: 1,
    nextEffectId: 1,
    cleanup() {
      this.atp = BATTLE_BALANCE_CONFIG.resources.initialAtp;
      this.maxAtp = BATTLE_BALANCE_CONFIG.resources.maxAtp;
      this.tissueIntegrity = BATTLE_BALANCE_CONFIG.resources.initialTissueIntegrity;
      this.wave = 0;
      this.status = "playing";
      this.message = "选择巨噬细胞或NK细胞，点击免疫驻点部署。";
      this.gameSpeed = BATTLE_BALANCE_CONFIG.combat.defaultGameSpeed;
      this.levelSpeedMultiplier = BATTLE_BALANCE_CONFIG.combat.firstLevelSpeedMultiplier;
      this.selectedCell = undefined;
      this.enemies = [];
      this.cells = [];
      this.projectiles = [];
      this.effects = [];
      this.defeatedBoss = false;
      this.nextEnemyId = 1;
      this.nextCellId = 1;
      this.nextProjectileId = 1;
      this.nextEffectId = 1;
    }
  };

  return state;
}

export function pushRuntimeEffect(state: BattleRuntimeState, effect: Omit<RuntimeEffect, "id">): void {
  state.effects.push({
    id: `effect-${state.nextEffectId}`,
    ...effect
  });
  state.nextEffectId += 1;
}
