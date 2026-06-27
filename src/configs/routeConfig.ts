import type { RouteConfig, RouteSlotConfig } from "../types/config.ts";

const noseSlots: RouteSlotConfig[] = [
  { id: "slot-1", row: 0, col: 0, x: 0.24, y: 0.27 },
  { id: "slot-2", row: 0, col: 1, x: 0.42, y: 0.25 },
  { id: "slot-3", row: 0, col: 2, x: 0.62, y: 0.28 },
  { id: "slot-4", row: 1, col: 0, x: 0.3, y: 0.52 },
  { id: "slot-5", row: 1, col: 1, x: 0.5, y: 0.56 },
  { id: "slot-6", row: 1, col: 2, x: 0.7, y: 0.52 },
  { id: "slot-7", row: 2, col: 1, x: 0.55, y: 0.39 }
];

export const ROUTE_CONFIG: Record<string, RouteConfig> = {
  noseLeft: {
    id: "noseLeft",
    name: "鼻腔左路",
    points: [
      { x: 0.04, y: 0.24 },
      { x: 0.22, y: 0.24 },
      { x: 0.42, y: 0.31 },
      { x: 0.64, y: 0.34 },
      { x: 0.94, y: 0.34 }
    ],
    cellSlots: noseSlots
  },
  noseRight: {
    id: "noseRight",
    name: "鼻腔右路",
    points: [
      { x: 0.04, y: 0.66 },
      { x: 0.24, y: 0.66 },
      { x: 0.44, y: 0.59 },
      { x: 0.66, y: 0.62 },
      { x: 0.94, y: 0.62 }
    ],
    cellSlots: noseSlots
  }
};
