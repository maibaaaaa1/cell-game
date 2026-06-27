import assert from "node:assert/strict";
import test from "node:test";
import { BATTLE_BALANCE_CONFIG } from "../src/configs/balanceConfig.ts";
import { CELL_CONFIG } from "../src/configs/cellConfig.ts";
import { ENEMY_CONFIG } from "../src/configs/enemyConfig.ts";
import { LEVEL_CONFIG } from "../src/configs/levelConfig.ts";
import { ROUTE_CONFIG } from "../src/configs/routeConfig.ts";
import { WAVE_CONFIG } from "../src/configs/waveConfig.ts";
import { ATPSystem } from "../src/systems/ATPSystem.ts";
import { BossSystem } from "../src/systems/BossSystem.ts";
import { CellSystem } from "../src/systems/CellSystem.ts";
import { DamageSystem } from "../src/systems/DamageSystem.ts";
import { EnemySystem } from "../src/systems/EnemySystem.ts";
import { WaveSystem } from "../src/systems/WaveSystem.ts";
import { createBattleRuntimeState } from "../src/systems/BattleRuntimeState.ts";

test("first level config uses double routes, seven slots, nine waves, and requested economy", () => {
  const level = LEVEL_CONFIG.chapters[0].levels[0];
  const routes = level.routeIds.map((routeId) => ROUTE_CONFIG[routeId]);
  const waves = WAVE_CONFIG[level.waveSetId].waves;

  assert.equal(level.id, "nose-1");
  assert.equal(level.title, "鼻腔保卫战");
  assert.equal(routes.length, 2);
  assert.equal(routes[0].cellSlots.length, 7);
  assert.equal(waves.length, 9);
  assert.equal(BATTLE_BALANCE_CONFIG.resources.initialAtp, 160);
  assert.equal(BATTLE_BALANCE_CONFIG.resources.atpPerSecond, 6);
  assert.equal(BATTLE_BALANCE_CONFIG.resources.maxAtp, 300);
  assert.equal(BATTLE_BALANCE_CONFIG.resources.initialTissueIntegrity, 100);
  assert.equal(CELL_CONFIG.macrophage.cost, 50);
  assert.equal(CELL_CONFIG.nk.cost, 70);
  assert.equal(ENEMY_CONFIG.normalVirus.health, 60);
  assert.equal(ENEMY_CONFIG.fastVirus.speed, 1.45);
});

test("cell deployment spends ATP and rejects unaffordable deployments", () => {
  const runtime = createBattleRuntimeState();
  const atp = new ATPSystem(runtime);
  const cells = new CellSystem(runtime, atp);

  const macrophage = cells.deploy("macrophage", "slot-1");
  assert.ok(macrophage);
  assert.equal(runtime.atp, 110);

  runtime.atp = 20;
  const nk = cells.deploy("nk", "slot-2");
  assert.equal(nk, null);
  assert.equal(runtime.atp, 20);
  assert.match(runtime.message, /ATP不足/);
});

test("damage kills enemies and awards ATP", () => {
  const runtime = createBattleRuntimeState({ atp: 0 });
  const enemies = new EnemySystem(runtime);
  const damage = new DamageSystem(runtime);

  const enemy = enemies.spawn("normalVirus", "left", 0);
  assert.equal(enemy.health, 60);

  damage.apply(enemy.id, 40);
  assert.equal(enemy.health, 20);
  assert.equal(runtime.atp, 0);

  damage.apply(enemy.id, 25);
  assert.equal(runtime.enemies.length, 0);
  assert.equal(runtime.atp, 7);
});

test("enemy reaching route end damages tissue and is removed", () => {
  const runtime = createBattleRuntimeState();
  const enemies = new EnemySystem(runtime);
  const enemy = enemies.spawn("bacteria", "left", 0);

  enemy.progress = 0.995;
  enemies.update(1000);

  assert.equal(runtime.enemies.length, 0);
  assert.equal(runtime.tissueIntegrity, 92);
});

test("boss splits once at half health and cleanup resets battle state", () => {
  const runtime = createBattleRuntimeState();
  const enemies = new EnemySystem(runtime);
  const damage = new DamageSystem(runtime);
  const boss = new BossSystem(runtime, enemies);

  const bossEnemy = enemies.spawn("mutantVirusCluster", "left", 0);
  damage.apply(bossEnemy.id, 410);
  boss.update();
  assert.equal(runtime.enemies.filter((enemy) => enemy.kind === "miniVirus").length, 6);

  damage.apply(bossEnemy.id, 10);
  boss.update();
  assert.equal(runtime.enemies.filter((enemy) => enemy.kind === "miniVirus").length, 6);

  runtime.cells.push({ id: "cell-test", kind: "macrophage", slotId: "slot-1", routeId: "left", x: 0.2, y: 0.5, range: 0.2, attack: 20, attackCooldownMs: 1000, lastAttackAt: 0 });
  runtime.projectiles.push({ id: "p-test", targetId: bossEnemy.id, x: 0.1, y: 0.1, damage: 20, speed: 1 });
  runtime.cleanup();

  assert.equal(runtime.enemies.length, 0);
  assert.equal(runtime.cells.length, 0);
  assert.equal(runtime.projectiles.length, 0);
  assert.equal(runtime.atp, 160);
  assert.equal(runtime.tissueIntegrity, 100);
});

test("wave system exposes eight normal waves plus boss wave for first level", () => {
  const waves = new WaveSystem("noseFirstLevel");

  assert.equal(waves.maxWave, 9);
  assert.deepEqual(waves.buildWave(1), ["normalVirus", "normalVirus", "normalVirus", "normalVirus"]);
  assert.equal(waves.getWaveLabel(9), "Boss 变异病毒团");
});
