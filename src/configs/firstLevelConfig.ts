import type { CellKind } from "../types/game.ts";

export const FIRST_LEVEL_ID = "nose-1";
export const FIRST_LEVEL_CELL_ORDER: CellKind[] = ["macrophage", "nk"];
export const FIRST_LEVEL_ROUTE_IDS = ["noseLeft", "noseRight"] as const;
export const FIRST_LEVEL_WAVE_SET_ID = "noseFirstLevel";
