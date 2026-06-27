import Phaser from "phaser";
import { BATTLE_BALANCE_CONFIG } from "../configs/balanceConfig";
import { ROUTE_CONFIG } from "../configs/routeConfig";

export interface GridSlot {
  row: number;
  col: number;
  x: number;
  y: number;
  key: string;
}

export class GridSystem {
  readonly rows = 9;
  readonly cols = 5;
  readonly slotSize = 42;
  readonly rowGap = 18;
  readonly colGap = 22;
  readonly startX = 96;
  readonly startY = 56;
  readonly coreX = BATTLE_BALANCE_CONFIG.canvas.width - 34;
  readonly enemyStartX = -42;
  private readonly canvasWidth = BATTLE_BALANCE_CONFIG.canvas.width;
  private readonly canvasHeight = BATTLE_BALANCE_CONFIG.canvas.height;

  getSlot(row: number, col: number): GridSlot {
    const x = this.startX + col * (this.slotSize + this.colGap) + this.slotSize / 2;
    const y = this.startY + row * (this.slotSize + this.rowGap) + this.slotSize / 2;
    return { row, col, x, y, key: `${row}-${col}` };
  }

  getLaneY(row: number): number {
    return this.getSlot(row, 0).y;
  }

  getSlotAt(worldX: number, worldY: number): GridSlot | null {
    for (let row = 0; row < this.rows; row += 1) {
      for (let col = 0; col < this.cols; col += 1) {
        const slot = this.getSlot(row, col);
        const half = this.slotSize / 2;
        if (
          worldX >= slot.x - half &&
          worldX <= slot.x + half &&
          worldY >= slot.y - half &&
          worldY <= slot.y + half
        ) {
          return slot;
        }
      }
    }

    return null;
  }

  draw(scene: Phaser.Scene, mapKey: string): void {
    const palette = this.getPalette(mapKey);
    scene.cameras.main.setBackgroundColor(palette.background);

    const graphics = scene.add.graphics();
    graphics.fillStyle(palette.lane, 1);
    graphics.lineStyle(2, palette.laneLine, 0.45);

    for (let row = 0; row < this.rows; row += 1) {
      const y = this.getLaneY(row);
      graphics.fillRoundedRect(16, y - 23, this.coreX - 28, 46, 20);
      graphics.strokeRoundedRect(16, y - 23, this.coreX - 28, 46, 20);
      graphics.fillStyle(0xffffff, 0.5);
      for (let x = 54; x < this.coreX - 42; x += 72) {
        graphics.fillTriangle(x, y - 8, x + 18, y, x, y + 8);
      }
      graphics.fillStyle(palette.lane, 1);
    }

    graphics.fillStyle(0xff7aa2, 0.9);
    graphics.fillRoundedRect(this.coreX - 6, 38, 30, this.canvasHeight - 92, 18);
    graphics.fillStyle(0xffffff, 0.86);
    graphics.fillRoundedRect(this.coreX, 56, 18, this.canvasHeight - 128, 13);

    graphics.lineStyle(2, 0xffffff, 0.95);
    for (let row = 0; row < this.rows; row += 1) {
      for (let col = 0; col < this.cols; col += 1) {
        const slot = this.getSlot(row, col);
        graphics.fillStyle(0xffffff, 0.52);
        graphics.fillRoundedRect(
          slot.x - this.slotSize / 2,
          slot.y - this.slotSize / 2,
          this.slotSize,
          this.slotSize,
          12
        );
        graphics.strokeRoundedRect(
          slot.x - this.slotSize / 2,
          slot.y - this.slotSize / 2,
          this.slotSize,
          this.slotSize,
          12
        );
      }
    }

    scene.add
      .text(this.coreX + 8, 16, "核心\n器官", {
        fontFamily: "system-ui",
        fontSize: "13px",
        fontStyle: "900",
        align: "center",
        color: "#be123c"
      })
      .setOrigin(0.5, 0);

    this.drawRoutePreview(graphics);
  }

  toWorldPoint(point: { x: number; y: number }): { x: number; y: number } {
    return {
      x: point.x * this.canvasWidth,
      y: point.y * this.canvasHeight
    };
  }

  private drawRoutePreview(graphics: Phaser.GameObjects.Graphics): void {
    const route = ROUTE_CONFIG.noseMucosaMain;
    graphics.lineStyle(4, 0xffffff, 0.32);
    route.points.forEach((point, index) => {
      const world = this.toWorldPoint(point);
      if (index === 0) {
        graphics.beginPath();
        graphics.moveTo(world.x, world.y);
        return;
      }
      graphics.lineTo(world.x, world.y);
    });
    graphics.strokePath();
  }

  private getPalette(mapKey: string): { background: number; lane: number; laneLine: number } {
    if (mapKey === "throat") {
      return { background: 0xfff1f2, lane: 0xffd6e3, laneLine: 0xfb7185 };
    }

    if (mapKey === "lung") {
      return { background: 0xeff6ff, lane: 0xdbeafe, laneLine: 0x60a5fa };
    }

    if (mapKey === "gut") {
      return { background: 0xfffbeb, lane: 0xfde68a, laneLine: 0xf59e0b };
    }

    if (mapKey === "lymph") {
      return { background: 0xf5f3ff, lane: 0xddd6fe, laneLine: 0x8b5cf6 };
    }

    if (mapKey === "cancer") {
      return { background: 0xfff1f2, lane: 0xfecdd3, laneLine: 0xe11d48 };
    }

    return { background: 0xf0fdfa, lane: 0xccfbf1, laneLine: 0x14b8a6 };
  }
}
