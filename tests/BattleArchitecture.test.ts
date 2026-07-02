import assert from "node:assert/strict";
import test from "node:test";
import { BATTLE_SYSTEMS, BattleLoopSystem } from "../src/systems/BattleLoopSystem.ts";
import { BATTLE_BALANCE_CONFIG } from "../src/configs/balanceConfig.ts";
import { CELL_CONFIG } from "../src/configs/cellConfig.ts";
import { ENEMY_CONFIG } from "../src/configs/enemyConfig.ts";
import { LEVEL_CONFIG } from "../src/configs/levelConfig.ts";
import { ROUTE_CONFIG } from "../src/configs/routeConfig.ts";
import { WAVE_CONFIG } from "../src/configs/waveConfig.ts";
import type { BattleSystem } from "../src/types/battle.ts";

function isNormalized(value: number): boolean {
  return value >= 0 && value <= 1;
}

test("v0.1 battle configs are normalized and ready for chapter expansion", () => {
  assert.ok(LEVEL_CONFIG.chapters.length >= 1);
  const firstChapter = LEVEL_CONFIG.chapters[0];
  assert.equal(firstChapter.id, "chapter-nose");
  assert.ok(firstChapter.levels.length >= 5, "第一章需要预留五关结构");

  for (const level of firstChapter.levels) {
    assert.ok(ROUTE_CONFIG[level.routeId], `${level.id} must reference a route`);
    assert.ok(WAVE_CONFIG[level.waveSetId], `${level.id} must reference waves`);
  }

  for (const route of Object.values(ROUTE_CONFIG)) {
    assert.ok(route.points.length >= 2);
    for (const point of route.points) {
      assert.ok(isNormalized(point.x), `route ${route.id} x must use 0-1 coordinates`);
      assert.ok(isNormalized(point.y), `route ${route.id} y must use 0-1 coordinates`);
    }
    for (const slot of route.cellSlots) {
      assert.ok(isNormalized(slot.x), `slot ${slot.id} x must use 0-1 coordinates`);
      assert.ok(isNormalized(slot.y), `slot ${slot.id} y must use 0-1 coordinates`);
    }
  }

  assert.ok(Object.keys(CELL_CONFIG).length >= 6);
  assert.ok(Object.keys(ENEMY_CONFIG).length >= 5);
  assert.equal(BATTLE_BALANCE_CONFIG.canvas.width, 540);
  assert.equal(BATTLE_BALANCE_CONFIG.canvas.height, 960);
  assert.equal(BATTLE_BALANCE_CONFIG.canvas.aspectRatio, 540 / 960);
  assert.equal(BATTLE_BALANCE_CONFIG.canvas.orientation, "portrait");
});

test("battle loop updates and cleans all registered systems in order", () => {
  const calls: string[] = [];
  const systems: BattleSystem[] = [
    {
      name: "alpha",
      update: (time, delta) => calls.push(`alpha:${time}:${delta}`),
      cleanup: () => calls.push("alpha:cleanup")
    },
    {
      name: "beta",
      update: (time, delta) => calls.push(`beta:${time}:${delta}`),
      cleanup: () => calls.push("beta:cleanup")
    }
  ];

  const loop = new BattleLoopSystem(systems);
  loop.update(100, 16);
  loop.cleanup();

  assert.deepEqual(calls, ["alpha:100:16", "beta:100:16", "alpha:cleanup", "beta:cleanup"]);
  assert.ok(BATTLE_SYSTEMS.includes("WaveSystem"));
  assert.ok(BATTLE_SYSTEMS.includes("EnemySystem"));
  assert.ok(BATTLE_SYSTEMS.includes("CellSystem"));
  assert.ok(BATTLE_SYSTEMS.includes("EffectSystem"));
});
