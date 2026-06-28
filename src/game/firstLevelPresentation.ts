import { CELL_CONFIG } from "../configs/cellConfig.ts";
import { CELL_CONFIGS } from "../configs/cells.ts";
import { FIRST_LEVEL_CELL_ORDER, FIRST_LEVEL_ID, FIRST_LEVEL_WAVE_SET_ID } from "../configs/firstLevelConfig.ts";
import { WAVE_CONFIG } from "../configs/waveConfig.ts";
import type { CellKind, LevelConfig } from "../types/game.ts";

export const PREVIEW_VERSION_LABEL = "V0.1 Preview";
export const FIRST_LEVEL_HUD_LABELS = ["组织耐久", "ATP能量", "当前波次"] as const;

export interface FirstLevelActionCell {
  kind: CellKind;
  name: string;
  role: string;
  cost: number;
  accent: string;
}

export function getFirstLevelActionCells(): FirstLevelActionCell[] {
  return FIRST_LEVEL_CELL_ORDER.map((kind) => ({
    kind,
    name: CELL_CONFIGS[kind].name,
    role: CELL_CONFIGS[kind].role,
    cost: CELL_CONFIG[kind].cost,
    accent: CELL_CONFIGS[kind].accent
  }));
}

export function getLevelWaveCount(level: LevelConfig): number {
  if (level.id === FIRST_LEVEL_ID) {
    return WAVE_CONFIG[FIRST_LEVEL_WAVE_SET_ID].waves.length;
  }

  return WAVE_CONFIG.legacyTwentyWave.waves.length;
}

export function getLevelStatusText(level: LevelConfig, unlocked: boolean): string {
  if (!unlocked) {
    return "后续版本开放";
  }

  if (level.id !== FIRST_LEVEL_ID) {
    return "后续版本开放";
  }

  return `可挑战 · ${getLevelWaveCount(level)}波`;
}

export function isPreviewPlayableLevel(level: LevelConfig, unlocked: boolean): boolean {
  return unlocked && level.id === FIRST_LEVEL_ID;
}

export function shouldShowDebugOverlay(search = ""): boolean {
  return new URLSearchParams(search.startsWith("?") ? search : `?${search}`).get("debug") === "true";
}
