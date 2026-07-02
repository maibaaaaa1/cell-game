import type { RouteConfig, RouteSlotConfig } from "../types/config.ts";

const noseSlots: RouteSlotConfig[] = [
  { id: "slot-1", row: 0, col: 1, x: 0.5, y: 0.18 },
  { id: "slot-2", row: 1, col: 0, x: 0.3, y: 0.32 },
  { id: "slot-3", row: 1, col: 2, x: 0.7, y: 0.32 },
  { id: "slot-4", row: 2, col: 0, x: 0.3, y: 0.52 },
  { id: "slot-5", row: 2, col: 2, x: 0.7, y: 0.52 },
  { id: "slot-6", row: 3, col: 1, x: 0.5, y: 0.69 }
];

export const ROUTE_CONFIG: Record<string, RouteConfig> = {
  noseLeft: {
    id: "noseLeft",
    name: "鼻腔左路",
    points: [
      { x: 0.28, y: 0.045 },
      { x: 0.26, y: 0.13 },
      { x: 0.34, y: 0.25 },
      { x: 0.29, y: 0.37 },
      { x: 0.36, y: 0.49 },
      { x: 0.31, y: 0.61 },
      { x: 0.4, y: 0.75 },
      { x: 0.48, y: 0.91 }
    ],
    cellSlots: noseSlots
  },
  noseRight: {
    id: "noseRight",
    name: "鼻腔右路",
    points: [
      { x: 0.72, y: 0.045 },
      { x: 0.74, y: 0.13 },
      { x: 0.66, y: 0.25 },
      { x: 0.71, y: 0.37 },
      { x: 0.64, y: 0.49 },
      { x: 0.69, y: 0.61 },
      { x: 0.6, y: 0.75 },
      { x: 0.52, y: 0.91 }
    ],
    cellSlots: noseSlots
  }
};
