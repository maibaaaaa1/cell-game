import type { CellKind, EnemyKind, SkillKind } from "./game";

export interface NormalizedPoint {
  x: number;
  y: number;
}

export interface RouteSlotConfig extends NormalizedPoint {
  id: string;
  row: number;
  col: number;
}

export interface RouteConfig {
  id: string;
  name: string;
  points: NormalizedPoint[];
  cellSlots: RouteSlotConfig[];
}

export interface WaveSpawnGroupConfig {
  enemy: EnemyKind;
  count: number;
  route?: "left" | "right" | "mixed";
  delayMs?: number;
  intervalMs?: number;
}

export interface WaveConfig {
  wave: number;
  label: string;
  preWaveMessage?: string;
  minDurationMs?: number;
  preparationMs?: number;
  groups: WaveSpawnGroupConfig[];
}

export interface WaveSetConfig {
  id: string;
  name: string;
  initialPreparationMs?: number;
  initialMessage?: string;
  tutorialMessageMs?: number;
  tutorialMessage?: string;
  normalPreparationMs?: number;
  bossPreparationMs?: number;
  waves: WaveConfig[];
}

export interface ChapterLevelConfig {
  id: string;
  numericId?: number;
  chapterId: string;
  title: string;
  mapKey: string;
  routeId: string;
  routeIds: string[];
  waveSetId: string;
  recommendedCells: CellKind[];
  unlockedByDefault: boolean;
}

export interface ChapterConfig {
  id: string;
  title: string;
  levels: ChapterLevelConfig[];
}

export interface CellRuntimeConfig {
  id: CellKind;
  cost: number;
  attack: number;
  range: number;
  attackRate: number;
}

export interface EnemyRuntimeConfig {
  id: EnemyKind;
  health: number;
  speed: number;
  reward: number;
  damage: number;
}

export interface BossConfig {
  id: EnemyKind;
  name: string;
  phases: Array<{
    healthBelow: number;
    skills: string[];
  }>;
}

export interface SkillRuntimeConfig {
  id: SkillKind;
  cooldown: number;
  duration: number;
}
