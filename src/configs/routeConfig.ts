import type { RouteConfig, RouteSlotConfig } from "../types/config.ts";

const noseSlots: RouteSlotConfig[] = [
  { id: "slot-1", row: 0, col: 0, x: 0.2, y: 0.18 },
  { id: "slot-2", row: 0, col: 1, x: 0.5, y: 0.2 },
  { id: "slot-3", row: 0, col: 2, x: 0.8, y: 0.18 },
  { id: "slot-4", row: 1, col: 0, x: 0.22, y: 0.42 },
  { id: "slot-5", row: 1, col: 1, x: 0.5, y: 0.48 },
  { id: "slot-6", row: 1, col: 2, x: 0.78, y: 0.42 },
  { id: "slot-7", row: 2, col: 1, x: 0.5, y: 0.68 }
];

export const ROUTE_CONFIG: Record<string, RouteConfig> = {
  noseLeft: {
    id: "noseLeft",
    name: "鼻腔左路",
    points: [
      { x: 0.36, y: 0.04 },
      { x: 0.3, y: 0.2 },
      { x: 0.26, y: 0.38 },
      { x: 0.34, y: 0.56 },
      { x: 0.43, y: 0.74 },
      { x: 0.48, y: 0.9 }
    ],
    cellSlots: noseSlots
  },
  noseRight: {
    id: "noseRight",
    name: "鼻腔右路",
    points: [
      { x: 0.64, y: 0.04 },
      { x: 0.7, y: 0.2 },
      { x: 0.74, y: 0.38 },
      { x: 0.66, y: 0.56 },
      { x: 0.57, y: 0.74 },
      { x: 0.52, y: 0.9 }
    ],
    cellSlots: noseSlots
  }
};
