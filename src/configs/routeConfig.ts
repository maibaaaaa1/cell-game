import type { RouteConfig, RouteSlotConfig } from "../types/config.ts";

const noseSlots: RouteSlotConfig[] = [
  { id: "slot-1", row: 0, col: 1, x: 0.5, y: 0.21 },
  { id: "slot-2", row: 1, col: 0, x: 0.31, y: 0.38 },
  { id: "slot-3", row: 1, col: 2, x: 0.69, y: 0.38 },
  { id: "slot-4", row: 2, col: 0, x: 0.31, y: 0.6 },
  { id: "slot-5", row: 2, col: 2, x: 0.69, y: 0.6 },
  { id: "slot-6", row: 3, col: 1, x: 0.5, y: 0.74 }
];

export const ROUTE_CONFIG: Record<string, RouteConfig> = {
  noseLeft: {
    id: "noseLeft",
    name: "鼻腔左路",
    points: [
      { x: 0.34, y: 0.045 },
      { x: 0.34, y: 0.16 },
      { x: 0.29, y: 0.3 },
      { x: 0.36, y: 0.43 },
      { x: 0.29, y: 0.57 },
      { x: 0.38, y: 0.73 },
      { x: 0.49, y: 0.91 }
    ],
    cellSlots: noseSlots
  },
  noseRight: {
    id: "noseRight",
    name: "鼻腔右路",
    points: [
      { x: 0.66, y: 0.045 },
      { x: 0.66, y: 0.16 },
      { x: 0.71, y: 0.3 },
      { x: 0.64, y: 0.43 },
      { x: 0.71, y: 0.57 },
      { x: 0.62, y: 0.73 },
      { x: 0.51, y: 0.91 }
    ],
    cellSlots: noseSlots
  }
};
