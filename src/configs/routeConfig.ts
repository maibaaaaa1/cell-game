import type { RouteConfig, RouteSlotConfig } from "../types/config";

function buildSlots(): RouteSlotConfig[] {
  const slots: RouteSlotConfig[] = [];
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      slots.push({
        id: `r${row}-c${col}`,
        row,
        col,
        x: 0.2 + col * 0.13,
        y: 0.14 + row * 0.085
      });
    }
  }
  return slots;
}

const noseSlots = buildSlots();

export const ROUTE_CONFIG: Record<string, RouteConfig> = {
  noseMucosaMain: {
    id: "noseMucosaMain",
    name: "鼻腔黏膜主通路",
    points: [
      { x: 0.02, y: 0.18 },
      { x: 0.18, y: 0.18 },
      { x: 0.42, y: 0.3 },
      { x: 0.62, y: 0.48 },
      { x: 0.84, y: 0.58 },
      { x: 0.96, y: 0.58 }
    ],
    cellSlots: noseSlots
  },
  noseMucosaLower: {
    id: "noseMucosaLower",
    name: "鼻腔黏膜下通路",
    points: [
      { x: 0.02, y: 0.72 },
      { x: 0.24, y: 0.68 },
      { x: 0.5, y: 0.6 },
      { x: 0.76, y: 0.7 },
      { x: 0.96, y: 0.7 }
    ],
    cellSlots: noseSlots
  }
};
