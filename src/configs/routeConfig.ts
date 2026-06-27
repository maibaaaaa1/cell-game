import type { RouteConfig, RouteSlotConfig } from "../types/config.ts";

const noseSlots: RouteSlotConfig[] = [
  { id: "slot-1", row: 0, col: 0, x: 0.2, y: 0.17 },
  { id: "slot-2", row: 0, col: 1, x: 0.5, y: 0.22 },
  { id: "slot-3", row: 0, col: 2, x: 0.8, y: 0.17 },
  { id: "slot-4", row: 1, col: 0, x: 0.25, y: 0.43 },
  { id: "slot-5", row: 1, col: 1, x: 0.5, y: 0.52 },
  { id: "slot-6", row: 1, col: 2, x: 0.75, y: 0.43 },
  { id: "slot-7", row: 2, col: 1, x: 0.5, y: 0.72 }
];

export const ROUTE_CONFIG: Record<string, RouteConfig> = {
  noseLeft: {
    id: "noseLeft",
    name: "鼻腔左路",
    points: [
      { x: 0.36, y: 0.04 },
      { x: 0.25, y: 0.16 },
      { x: 0.38, y: 0.3 },
      { x: 0.22, y: 0.45 },
      { x: 0.36, y: 0.62 },
      { x: 0.28, y: 0.76 },
      { x: 0.45, y: 0.9 }
    ],
    cellSlots: noseSlots
  },
  noseRight: {
    id: "noseRight",
    name: "鼻腔右路",
    points: [
      { x: 0.64, y: 0.04 },
      { x: 0.75, y: 0.16 },
      { x: 0.62, y: 0.3 },
      { x: 0.78, y: 0.45 },
      { x: 0.64, y: 0.62 },
      { x: 0.72, y: 0.76 },
      { x: 0.55, y: 0.9 }
    ],
    cellSlots: noseSlots
  }
};
