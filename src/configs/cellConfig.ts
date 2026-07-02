import type { CellRuntimeConfig } from "../types/config";

export const CELL_CONFIG: Record<string, CellRuntimeConfig> = {
  macrophage: { id: "macrophage", cost: 50, attack: 24, range: 0.18, attackRate: 1 },
  dendritic: { id: "dendritic", cost: 75, attack: 0, range: 156, attackRate: 0 },
  nk: { id: "nk", cost: 70, attack: 38, range: 0.28, attackRate: 1.25 },
  bcell: { id: "bcell", cost: 100, attack: 30, range: 920, attackRate: 1.45 },
  cd4: { id: "cd4", cost: 150, attack: 10, range: 180, attackRate: 1.8 },
  cd8: { id: "cd8", cost: 200, attack: 120, range: 270, attackRate: 1.55 }
};
export const CELL_CONFIG_VERSION = "v0.1";
