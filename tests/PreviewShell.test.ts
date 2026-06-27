import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { FIRST_LEVEL_CELL_ORDER } from "../src/configs/firstLevelConfig.ts";
import { LEVELS } from "../src/configs/levels.ts";
import { createBattleRuntimeState } from "../src/systems/BattleRuntimeState.ts";
import { BATTLE_RESTART_COMMAND, onBattleCommand, sendBattleCommand } from "../src/systems/gameBus.ts";
import {
  FIRST_LEVEL_HUD_LABELS,
  PREVIEW_VERSION_LABEL,
  getFirstLevelActionCells,
  getLevelStatusText,
  shouldShowDebugOverlay
} from "../src/game/firstLevelPresentation.ts";

if (typeof CustomEvent === "undefined") {
  globalThis.CustomEvent = class<T> extends Event {
    readonly detail: T;

    constructor(type: string, eventInitDict?: CustomEventInit<T>) {
      super(type, eventInitDict);
      this.detail = eventInitDict?.detail as T;
    }
  } as typeof CustomEvent;
}

test("preview home copy no longer exposes V2.0 shell wording", () => {
  const source = readFileSync(new URL("../src/components/MainMenu.tsx", import.meta.url), "utf8");

  assert.equal(PREVIEW_VERSION_LABEL, "V0.1 Preview");
  assert.ok(!source.includes("V2.0"));
});

test("first level card shows nine waves instead of the old twenty-wave copy", () => {
  const source = readFileSync(new URL("../src/components/LevelSelect.tsx", import.meta.url), "utf8");
  const firstLevel = LEVELS[0];

  assert.equal(getLevelStatusText(firstLevel, true), "可挑战 · 9波");
  assert.ok(!source.includes("20波"));
});

test("first level HUD presentation hides fever, combo, and kill counters", () => {
  assert.deepEqual(FIRST_LEVEL_HUD_LABELS, ["组织耐久", "ATP能量", "当前波次"]);
  assert.ok(!FIRST_LEVEL_HUD_LABELS.includes("体温" as never));
  assert.ok(!FIRST_LEVEL_HUD_LABELS.includes("Combo" as never));
  assert.ok(!FIRST_LEVEL_HUD_LABELS.includes("击杀" as never));
});

test("first level bottom action bar exposes macrophage and NK with teaching costs", () => {
  const cells = getFirstLevelActionCells();

  assert.deepEqual(FIRST_LEVEL_CELL_ORDER, ["macrophage", "nk"]);
  assert.deepEqual(
    cells.map((cell) => [cell.kind, cell.cost]),
    [
      ["macrophage", 50],
      ["nk", 70]
    ]
  );
});

test("restart command is emitted from the shared battle bus command", () => {
  let received = "";
  const unsubscribe = onBattleCommand((command) => {
    received = command.type;
  });

  sendBattleCommand(BATTLE_RESTART_COMMAND);
  unsubscribe();

  assert.equal(received, "restart");
});

test("runtime cleanup resets restart-critical battle state", () => {
  const runtime = createBattleRuntimeState({ atp: 12, tissueIntegrity: 3, maxWave: 9 });
  runtime.wave = 5;
  runtime.cells.push({ id: "cell-test", kind: "nk", slotId: "slot-1", routeId: "left", x: 0.2, y: 0.3, range: 0.28, attack: 38, attackCooldownMs: 800, lastAttackAt: 10 });
  runtime.enemies.push({ id: "enemy-test", kind: "normalVirus", routeId: "left", health: 10, maxHealth: 60, speed: 1, reward: 7, damage: 5, progress: 0.4, x: 0.4, y: 0.4 });
  runtime.projectiles.push({ id: "projectile-test", targetId: "enemy-test", x: 0.2, y: 0.3, damage: 20, speed: 1 });

  runtime.cleanup();

  assert.equal(runtime.atp, 160);
  assert.equal(runtime.tissueIntegrity, 100);
  assert.equal(runtime.wave, 0);
  assert.equal(runtime.cells.length, 0);
  assert.equal(runtime.enemies.length, 0);
  assert.equal(runtime.projectiles.length, 0);
});

test("preview debug overlay is opt-in by URL query only", () => {
  assert.equal(shouldShowDebugOverlay(""), false);
  assert.equal(shouldShowDebugOverlay("?debug=false"), false);
  assert.equal(shouldShowDebugOverlay("?debug=true"), true);
});
