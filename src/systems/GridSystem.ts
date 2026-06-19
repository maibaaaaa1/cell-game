import Phaser from "phaser";

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
  readonly slotSize = 52;
  readonly rowGap = 8;
  readonly colGap = 12;
  readonly startX = 240;
  readonly startY = 40;
  readonly coreX = 902;
  readonly enemyStartX = -42;

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
      graphics.fillRoundedRect(24, y - 25, 874, 50, 20);
      graphics.strokeRoundedRect(24, y - 25, 874, 50, 20);
      graphics.fillStyle(0xffffff, 0.5);
      for (let x = 78; x < 860; x += 92) {
        graphics.fillTriangle(x, y - 8, x + 18, y, x, y + 8);
      }
      graphics.fillStyle(palette.lane, 1);
    }

    graphics.fillStyle(0xff7aa2, 0.9);
    graphics.fillRoundedRect(896, 28, 42, 520, 18);
    graphics.fillStyle(0xffffff, 0.86);
    graphics.fillRoundedRect(904, 46, 26, 484, 13);

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
      .text(908, 22, "核心\n器官", {
        fontFamily: "system-ui",
        fontSize: "15px",
        fontStyle: "900",
        align: "center",
        color: "#be123c"
      })
      .setOrigin(0.5, 0);
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
