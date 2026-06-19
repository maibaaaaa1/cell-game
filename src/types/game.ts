export type Screen = "home" | "levels" | "codex" | "achievements" | "settings" | "battle";

export type CellKind = "macrophage" | "dendritic" | "nk" | "bcell" | "cd4" | "cd8";

export type EnemyKind =
  | "bacteria"
  | "fluVirus"
  | "resistantBacteria"
  | "mutantVirus"
  | "miniVirus"
  | "cancerCell"
  | "cancerKing";

export type SkillKind = "fever" | "vaccine" | "cart";

export type RandomEventKind = "sleepDebt" | "exercise" | "sugar" | "hyperbaric" | "nmn" | "akg";

export type BuffKind = "comboSpeed" | "storm" | "dropSpeed" | "dropDamage" | "cooldownRush";

export interface CellConfig {
  id: CellKind;
  name: string;
  englishName: string;
  role: string;
  cost: number;
  baseAttack: number;
  health: number;
  attackRate: number;
  range: number;
  color: number;
  accent: string;
  priority?: EnemyKind[];
  description: string;
  skill: string;
  levels: Array<{
    attack: number;
    upgradeCost: number;
    unlock?: string;
  }>;
}

export interface EnemyConfig {
  id: EnemyKind;
  name: string;
  health: number;
  speed: number;
  reward: number;
  damage: number;
  color: number;
  armor?: number;
  isVirus?: boolean;
  isCancer?: boolean;
  description: string;
  weakness: string;
  healthTip: string;
}

export interface LevelConfig {
  id: string;
  chapter: string;
  name: string;
  mapKey: "nose" | "throat" | "lung" | "gut" | "lymph" | "cancer";
  unlocked: boolean;
  description: string;
}

export interface SkillConfig {
  id: SkillKind;
  name: string;
  cooldown: number;
  duration: number;
  description: string;
}

export interface RandomEventConfig {
  id: RandomEventKind;
  name: string;
  description: string;
  attackMultiplier?: number;
  enemyMultiplier?: number;
  healPercent?: number;
  atpRegenMultiplier?: number;
  attackRateMultiplier?: number;
}

export interface BattleState {
  life: number;
  atp: number;
  wave: number;
  maxWave: number;
  selectedCell?: CellKind;
  paused: boolean;
  pauseMenuOpen?: boolean;
  message: string;
  randomEventName?: string;
  combo: number;
  comboTier: "none" | "x3" | "x5" | "x10";
  stormActive: boolean;
  dangerLevel: number;
  activeBuffs: Array<{
    id: BuffKind;
    name: string;
    secondsLeft: number;
  }>;
  skillCooldowns: Record<SkillKind, number>;
  kills: Record<EnemyKind, number>;
}

export interface SaveData {
  unlockedCodex: string[];
  achievements: string[];
  bestChapter: number;
  settings: {
    sound: boolean;
    reducedMotion: boolean;
  };
  stats: {
    virusKills: number;
    cancerKills: number;
    totalKills: number;
  };
}
