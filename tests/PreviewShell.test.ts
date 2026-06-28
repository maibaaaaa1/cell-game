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
  assert.ok(source.includes("部署免疫细胞，守住人体第一道防线。"));
  assert.ok(source.includes("当前预览聚焦第一关闭环"));
  assert.ok(!source.includes("V2.0"));
});

test("first level card shows nine waves instead of the old twenty-wave copy", () => {
  const source = readFileSync(new URL("../src/components/LevelSelect.tsx", import.meta.url), "utf8");
  const firstLevel = LEVELS[0];

  assert.equal(getLevelStatusText(firstLevel, true), "可挑战 · 9波");
  assert.equal(getLevelStatusText(LEVELS[1], true), "后续版本开放");
  assert.ok(source.includes("当前测试关"));
  assert.ok(!source.includes("20波"));
});

test("level map page is named immune star map instead of the old body defense map", () => {
  const source = readFileSync(new URL("../src/components/LevelSelect.tsx", import.meta.url), "utf8");

  assert.ok(source.includes("免疫星图"));
  assert.ok(!source.includes("人体防线地图"));
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

test("battle page layout keeps HUD, canvas, and bottom action bar in one viewport", () => {
  const gameShell = readFileSync(new URL("../src/game/GameShell.tsx", import.meta.url), "utf8");
  const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

  assert.ok(gameShell.includes("battle-page-active"));
  assert.ok(styles.includes("body.battle-page-active"));
  assert.match(styles, /\.game-shell\s*{[^}]*position: fixed;/s);
  assert.match(styles, /\.game-shell\s*{[^}]*height: 100dvh;/s);
  assert.match(styles, /\.battle-canvas-frame\s*{[^}]*flex: 1 1 0;/s);
  assert.match(styles, /\.battle-action-bar\s*{[^}]*flex: 0 0 auto;/s);
  assert.match(styles, /\.phaser-host\s*{[^}]*min-height: 0;/s);
});

test("v0.1 skin exposes immune sci-fi theme variables and product shell classes", () => {
  const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
  const mainMenu = readFileSync(new URL("../src/components/MainMenu.tsx", import.meta.url), "utf8");

  assert.ok(styles.includes("--immune-blue: #3CCBFF"));
  assert.ok(styles.includes("--immune-green: #43E0C2"));
  assert.ok(styles.includes("--deep-navy: #071123"));
  assert.ok(styles.includes("--atp-orange: #FF9F1C"));
  assert.ok(styles.includes("--preview-card: #FFFFFF"));
  assert.ok(styles.includes(".home-hero-panel"));
  assert.ok(styles.includes(".immune-orbit"));
  assert.ok(mainMenu.includes("home-hero-panel"));
  assert.ok(mainMenu.includes("immune-orbit"));
});

test("battle modals use v0.1 result copy and product shell classes", () => {
  const source = readFileSync(new URL("../src/game/GameShell.tsx", import.meta.url), "utf8");
  const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

  assert.ok(source.includes("battle-result-title"));
  assert.ok(source.includes("防线胜利"));
  assert.ok(source.includes("鼻腔保卫战完成。"));
  assert.ok(source.includes("免疫防线被突破"));
  assert.ok(source.includes("免疫系统尽力了，重新部署，再来一把。"));
  assert.ok(styles.includes(".battle-result-title"));
  assert.ok(styles.includes(".pause-panel"));
});

test("stage 2.13 skin does not change frozen first level balance", () => {
  const balance = readFileSync(new URL("../src/configs/balanceConfig.ts", import.meta.url), "utf8");
  const enemies = readFileSync(new URL("../src/configs/enemyConfig.ts", import.meta.url), "utf8");

  assert.ok(balance.includes("initialAtp: 120"));
  assert.ok(balance.includes("atpPerSecond: 2.5"));
  assert.ok(balance.includes("maxAtp: 220"));
  assert.ok(balance.includes("nkDamageMultiplier: 0.72"));
  assert.ok(balance.includes("nkAttackRateMultiplier: 0.72"));
  assert.ok(enemies.includes("mutantVirusCluster: { id: \"mutantVirusCluster\", health: 2200, speed: 0.28"));
});

test("first level core is drawn at the bottom instead of the old right side", () => {
  const source = readFileSync(new URL("../src/scenes/BattleScene.ts", import.meta.url), "utf8");

  assert.ok(source.includes("this.height - 24"));
  assert.ok(!source.includes("this.width - 24, this.centerY"));
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

  assert.equal(runtime.atp, 120);
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
