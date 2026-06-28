import assert from "node:assert/strict";
import test from "node:test";
import { BATTLE_BALANCE_CONFIG } from "../src/configs/balanceConfig.ts";
import { CELL_CONFIG } from "../src/configs/cellConfig.ts";
import { ENEMY_CONFIG } from "../src/configs/enemyConfig.ts";
import { ENEMY_CONFIGS } from "../src/configs/enemies.ts";
import { FIRST_LEVEL_CELL_ORDER } from "../src/configs/firstLevelConfig.ts";
import { LEVEL_CONFIG } from "../src/configs/levelConfig.ts";
import { ROUTE_CONFIG } from "../src/configs/routeConfig.ts";
import { WAVE_CONFIG } from "../src/configs/waveConfig.ts";
import { findDeploySlotAtPoint } from "../src/game/deploySlotHitTest.ts";
import { clientPointToBattleCanvas } from "../src/game/pointerMapping.ts";
import { ATPSystem } from "../src/systems/ATPSystem.ts";
import { BossSystem } from "../src/systems/BossSystem.ts";
import { CellSystem } from "../src/systems/CellSystem.ts";
import { DamageSystem } from "../src/systems/DamageSystem.ts";
import { EnemySystem } from "../src/systems/EnemySystem.ts";
import { ProjectileSystem } from "../src/systems/ProjectileSystem.ts";
import { TargetingSystem } from "../src/systems/TargetingSystem.ts";
import { WaveSystem } from "../src/systems/WaveSystem.ts";
import { createBattleRuntimeState } from "../src/systems/BattleRuntimeState.ts";

function routeLength(routeId: string): number {
  const points = ROUTE_CONFIG[routeId].points;
  return points.slice(1).reduce((length, point, index) => {
    const previous = points[index];
    return length + Math.hypot(point.x - previous.x, point.y - previous.y);
  }, 0);
}

test("first level config uses double routes, seven slots, nine waves, and requested economy", () => {
  const level = LEVEL_CONFIG.chapters[0].levels[0];
  const routes = level.routeIds.map((routeId) => ROUTE_CONFIG[routeId]);
  const waves = WAVE_CONFIG[level.waveSetId].waves;

  assert.equal(level.id, "nose-1");
  assert.equal(level.title, "鼻腔保卫战");
  assert.equal(routes.length, 2);
  assert.equal(routes[0].cellSlots.length, 7);
  assert.equal(waves.length, 9);
  assert.equal(BATTLE_BALANCE_CONFIG.resources.initialAtp, 120);
  assert.ok(BATTLE_BALANCE_CONFIG.resources.atpPerSecond <= 3);
  assert.ok(BATTLE_BALANCE_CONFIG.resources.maxAtp <= 240);
  assert.equal(BATTLE_BALANCE_CONFIG.resources.initialTissueIntegrity, 100);
  assert.equal(CELL_CONFIG.macrophage.cost, 50);
  assert.equal(CELL_CONFIG.nk.cost, 70);
  assert.equal(ENEMY_CONFIG.normalVirus.health, 60);
  assert.equal(ENEMY_CONFIG.fastVirus.speed, 1.45);
  assert.equal(ENEMY_CONFIG.mutantVirusCluster.health, 2200);
  assert.equal(ENEMY_CONFIG.mutantVirusCluster.speed, 0.28);
  assert.equal(ENEMY_CONFIGS.mutantVirusCluster.health, 2200);
  assert.equal(ENEMY_CONFIGS.mutantVirusCluster.speed, 0.28);
});

test("first level wave table uses PvZ-style grouped pacing", () => {
  const waves = WAVE_CONFIG.noseFirstLevel.waves.map((wave) =>
    wave.groups.map((group) => [group.enemy, group.count, group.route ?? "left", group.delayMs ?? 0, group.intervalMs ?? 0])
  );

  assert.deepEqual(waves, [
    [["normalVirus", 3, "left", 0, 2000], ["normalVirus", 3, "left", 6000, 2000]],
    [["normalVirus", 4, "left", 0, 1800], ["normalVirus", 4, "left", 7000, 1800]],
    [["normalVirus", 6, "left", 0, 1700], ["fastVirus", 4, "left", 8000, 1600]],
    [["normalVirus", 6, "left", 0, 1700], ["normalVirus", 6, "right", 5000, 1700]],
    [["normalVirus", 5, "left", 0, 1600], ["fastVirus", 4, "right", 4000, 1500], ["normalVirus", 4, "left", 10000, 1600]],
    [["bacteria", 3, "left", 0, 2200], ["normalVirus", 6, "right", 4000, 1600], ["bacteria", 3, "left", 12000, 2200]],
    [["fastVirus", 5, "left", 0, 1500], ["normalVirus", 6, "right", 2000, 1500], ["bacteria", 4, "right", 10000, 2000]],
    [["normalVirus", 7, "left", 0, 1400], ["fastVirus", 5, "right", 3000, 1400], ["bacteria", 3, "left", 10000, 2000], ["bacteria", 3, "right", 14000, 2000]],
    [["mutantVirusCluster", 1, "mixed", 0, 1000]]
  ]);
});

test("first level wave pacing uses opening prep, short rests, and ten second boss prep", () => {
  const waves = new WaveSystem("noseFirstLevel");

  assert.equal(waves.maxWave, 9);
  assert.equal(waves.getInitialPreparationMs(), 8000);
  assert.equal(waves.getPreparationAfterWave(1), 2500);
  assert.equal(waves.getPreparationAfterWave(8), 10000);
  assert.equal(waves.getPreparationAfterWave(9), 0);
  assert.ok(waves.getWaveMinDurationMs(9) >= 30000);
  assert.equal(BATTLE_BALANCE_CONFIG.combat.defaultGameSpeed, 1);
  assert.equal(BATTLE_BALANCE_CONFIG.combat.firstLevelSpeedMultiplier, 0.9);
});

test("first level routes move from top entrance toward bottom tissue core", () => {
  for (const routeId of ["noseLeft", "noseRight"]) {
    const route = ROUTE_CONFIG[routeId];
    const start = route.points[0];
    const end = route.points[route.points.length - 1];

    assert.ok(start.y < 0.12, `${routeId} should enter from the top`);
    assert.ok(end.y > 0.86, `${routeId} should end near the bottom tissue core`);
    assert.ok(start.y < end.y, `${routeId} must move downward overall`);
    assert.ok(routeLength(routeId) >= 0.92, `${routeId} should be long enough for a visible tower-defense march`);
  }
});

test("first level deploy slots are seven unique enabled touch targets", () => {
  const slots = ROUTE_CONFIG.noseLeft.cellSlots;
  const ids = new Set(slots.map((slot) => slot.id));

  assert.equal(slots.length, 7);
  assert.equal(ids.size, 7);
  for (const slot of slots) {
    assert.ok(slot.x > 0.08 && slot.x < 0.92);
    assert.ok(slot.y > 0.1 && slot.y < 0.76);
  }
});

test("cell deployment spends ATP and rejects unaffordable deployments", () => {
  const runtime = createBattleRuntimeState();
  const atp = new ATPSystem(runtime);
  const cells = new CellSystem(runtime, atp);

  const macrophage = cells.deploy("macrophage", "slot-1");
  assert.ok(macrophage);
  assert.equal(runtime.atp, 70);

  runtime.atp = 20;
  const nk = cells.deploy("nk", "slot-2");
  assert.equal(nk, null);
  assert.equal(runtime.atp, 20);
  assert.match(runtime.message, /ATP不足/);
});

test("first level NK tuning lowers damage and attack speed from the old preview values", () => {
  const runtime = createBattleRuntimeState({ atp: 1000 });
  const atp = new ATPSystem(runtime);
  const cells = new CellSystem(runtime, atp);

  const nk = cells.deploy("nk", "slot-2");

  assert.ok(nk);
  assert.ok(nk.attack < 38);
  assert.ok(nk.attackCooldownMs > 800);
});

test("first level action bar exposes only macrophage and NK", () => {
  assert.deepEqual(FIRST_LEVEL_CELL_ORDER, ["macrophage", "nk"]);
});

test("occupied immune slot cannot be deployed twice", () => {
  const runtime = createBattleRuntimeState();
  const atp = new ATPSystem(runtime);
  const cells = new CellSystem(runtime, atp);

  assert.ok(cells.deploy("macrophage", "slot-1"));
  const duplicate = cells.deploy("nk", "slot-1");

  assert.equal(duplicate, null);
  assert.equal(runtime.cells.length, 1);
  assert.match(runtime.message, /已有细胞/);
});

test("each first level deploy slot accepts a cell deployment", () => {
  const runtime = createBattleRuntimeState({ atp: 1000 });
  const atp = new ATPSystem(runtime);
  const cells = new CellSystem(runtime, atp);

  for (const slot of ROUTE_CONFIG.noseLeft.cellSlots) {
    assert.ok(cells.deploy("macrophage", slot.id), `${slot.id} should accept deployment`);
  }

  assert.equal(runtime.cells.length, 7);
});

test("scaled mobile canvas pointer coordinates still hit every deploy slot", () => {
  const rect = { left: 12, top: 80, width: 270, height: 360 };
  const worldSlots = ROUTE_CONFIG.noseLeft.cellSlots.map((slot) => ({
    id: slot.id,
    x: slot.x * BATTLE_BALANCE_CONFIG.canvas.width,
    y: slot.y * BATTLE_BALANCE_CONFIG.canvas.height,
    radius: 24
  }));

  for (const slot of ROUTE_CONFIG.noseLeft.cellSlots) {
    const point = clientPointToBattleCanvas(
      rect.left + slot.x * rect.width,
      rect.top + slot.y * rect.height,
      rect,
      BATTLE_BALANCE_CONFIG.canvas.width,
      BATTLE_BALANCE_CONFIG.canvas.height
    );

    assert.ok(point);
    assert.equal(findDeploySlotAtPoint(worldSlots, point.x, point.y)?.id, slot.id);
  }
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
  assert.equal(runtime.atp, 3);
});

test("first level kill reward overrides reduce ATP snowballing", () => {
  const runtime = createBattleRuntimeState({ atp: 0 });
  const enemies = new EnemySystem(runtime);

  assert.equal(enemies.spawn("normalVirus", "left", 0).reward, 3);
  assert.equal(enemies.spawn("fastVirus", "left", 0).reward, 4);
  assert.equal(enemies.spawn("miniVirus", "left", 0).reward, 2);
  assert.equal(enemies.spawn("bacteria", "left", 0).reward, 5);
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
  assert.equal(bossEnemy.maxHealth, 2200);
  assert.equal(bossEnemy.speed, 0.28);
  damage.apply(bossEnemy.id, 1110);
  boss.update();
  assert.equal(runtime.enemies.filter((enemy) => enemy.kind === "miniVirus").length, 6);

  damage.apply(bossEnemy.id, 10);
  boss.update();
  assert.equal(runtime.enemies.filter((enemy) => enemy.kind === "miniVirus").length, 6);

  runtime.cells.push({ id: "cell-test", kind: "macrophage", slotId: "slot-1", routeId: "left", x: 0.2, y: 0.5, range: 0.2, attack: 20, attackCooldownMs: 1000, lastAttackAt: 0 });
  runtime.projectiles.push({ id: "p-test", targetId: bossEnemy.id, x: 0.1, y: 0.1, damage: 20, speed: 1 });
  runtime.effects.push({ id: "effect-test", x: 0.2, y: 0.2, text: "+7 ATP", tone: "gain" });
  runtime.cleanup();

  assert.equal(runtime.enemies.length, 0);
  assert.equal(runtime.cells.length, 0);
  assert.equal(runtime.projectiles.length, 0);
  assert.equal(runtime.effects.length, 0);
  assert.equal(runtime.atp, 120);
  assert.equal(runtime.tissueIntegrity, 100);
});

test("boss takes reduced damage from first level NK and macrophage attacks", () => {
  const runtime = createBattleRuntimeState();
  const enemies = new EnemySystem(runtime);
  const damage = new DamageSystem(runtime);

  const bossEnemy = enemies.spawn("mutantVirusCluster", "left", 0);
  damage.apply(bossEnemy.id, 100, "nk");
  assert.equal(bossEnemy.health, 2135);

  damage.apply(bossEnemy.id, 100, "macrophage");
  assert.equal(bossEnemy.health, 2050);
});

test("boss split mini viruses continue moving downward on both routes", () => {
  const runtime = createBattleRuntimeState();
  const enemies = new EnemySystem(runtime);
  const damage = new DamageSystem(runtime);
  const boss = new BossSystem(runtime, enemies);

  const bossEnemy = enemies.spawn("mutantVirusCluster", "left", 0.5);
  damage.apply(bossEnemy.id, 1110);
  boss.update();

  const miniViruses = runtime.enemies.filter((enemy) => enemy.kind === "miniVirus");
  assert.equal(miniViruses.length, 6);
  assert.ok(miniViruses.some((enemy) => enemy.routeId === "left"));
  assert.ok(miniViruses.some((enemy) => enemy.routeId === "right"));

  const before = new Map(miniViruses.map((enemy) => [enemy.id, enemy.y]));
  enemies.update(1200);

  for (const enemy of runtime.enemies.filter((item) => item.kind === "miniVirus")) {
    assert.ok(enemy.y > (before.get(enemy.id) ?? 0), `${enemy.id} should continue downward`);
  }
});

test("wave system exposes eight normal waves plus boss wave for first level", () => {
  const waves = new WaveSystem("noseFirstLevel");

  assert.equal(waves.maxWave, 9);
  assert.deepEqual(waves.buildWave(1), ["normalVirus", "normalVirus", "normalVirus", "normalVirus", "normalVirus", "normalVirus"]);
  assert.equal(waves.getWaveLabel(9), "Boss 变异病毒团");
});

test("opening preparation delays the first wave and is not affected by future speed state", () => {
  const runtime = createBattleRuntimeState({ gameSpeed: 2 });
  const enemies = new EnemySystem(runtime);
  const waves = new WaveSystem("noseFirstLevel", runtime, enemies);

  waves.update(0, 3000);
  assert.equal(runtime.wave, 0);
  assert.equal(runtime.enemies.length, 0);
  assert.match(runtime.message, /巨噬细胞/);

  waves.update(0, 4999);
  assert.equal(runtime.wave, 0);
  assert.equal(runtime.enemies.length, 0);

  waves.update(0, 1);
  assert.equal(runtime.wave, 1);
  assert.equal(runtime.enemies.length, 1);
});

test("wave system spawns enemies by group delay and interval instead of instantly", () => {
  const runtime = createBattleRuntimeState();
  const enemies = new EnemySystem(runtime);
  const waves = new WaveSystem("noseFirstLevel", runtime, enemies);

  waves.update(0, 8000);
  assert.equal(runtime.wave, 1);
  assert.equal(runtime.enemies.length, 1);
  assert.equal(waves.getPendingSpawnCount(), 5);

  waves.update(0, 1999);
  assert.equal(runtime.enemies.length, 1);

  waves.update(0, 1);
  assert.equal(runtime.enemies.length, 2);
  assert.equal(waves.getPendingSpawnCount(), 4);
});

test("fourth wave is the first deliberate double-route wave", () => {
  const waves = WAVE_CONFIG.noseFirstLevel.waves;

  assert.ok(waves.slice(0, 3).every((wave) => wave.groups.every((group) => group.route === "left")));
  assert.deepEqual(
    waves[3].groups.map((group) => group.route),
    ["left", "right"]
  );
  assert.match(waves[3].preWaveMessage ?? "", /双路线/);
});

test("first level enemy count matches the stage 2.11 density target", () => {
  const waves = new WaveSystem("noseFirstLevel");

  assert.equal(waves.getTotalEnemyCount(), 95);
  assert.ok(waves.getTotalEnemyCount() - 1 >= 80);
  assert.ok(waves.getTotalEnemyCount() - 1 <= 110);
  assert.equal(WAVE_CONFIG.noseFirstLevel.waves.length, 9);
  assert.ok(waves.buildWave(1).length >= 6);
  assert.ok(waves.buildWave(8).length >= 18);
});

test("boss wave has presence and cannot resolve victory instantly", () => {
  const runtime = createBattleRuntimeState();
  const enemies = new EnemySystem(runtime);
  const damage = new DamageSystem(runtime);
  const waves = new WaveSystem("noseFirstLevel", runtime, enemies);

  runtime.wave = 8;
  waves.startNextWave();
  const bossEnemy = runtime.enemies.find((enemy) => enemy.kind === "mutantVirusCluster");
  assert.ok(bossEnemy);
  damage.apply(bossEnemy.id, 2300);
  assert.equal(runtime.defeatedBoss, true);

  waves.update(0, 29000);
  assert.equal(runtime.status, "playing");

  waves.update(0, 1000);
  assert.equal(runtime.status, "victory");
});

test("fully taught first level remains winnable after pacing calibration", () => {
  const runtime = createBattleRuntimeState({ atp: 1000 });
  const enemies = new EnemySystem(runtime);
  const damage = new DamageSystem(runtime);
  const targeting = new TargetingSystem(runtime);
  const projectiles = new ProjectileSystem(runtime, damage);
  const atp = new ATPSystem(runtime);
  const cells = new CellSystem(runtime, atp);
  const boss = new BossSystem(runtime, enemies);
  const waves = new WaveSystem("noseFirstLevel", runtime, enemies);
  cells.wireCombat(targeting, projectiles);

  ROUTE_CONFIG.noseLeft.cellSlots.forEach((slot, index) => {
    assert.ok(cells.deploy(index % 3 === 0 ? "macrophage" : "nk", slot.id));
  });

  for (let time = 0; time <= 240000 && runtime.status === "playing"; time += 250) {
    atp.update(time, 250);
    waves.update(time, 250);
    enemies.update(time, 250);
    boss.update();
    cells.update(time);
    projectiles.update(time, 250);
  }

  assert.equal(runtime.status, "victory");
  assert.ok(runtime.tissueIntegrity > 0);
});

test("first level remains winnable with reduced ATP economy and staged deployment", () => {
  const runtime = createBattleRuntimeState();
  const enemies = new EnemySystem(runtime);
  const damage = new DamageSystem(runtime);
  const targeting = new TargetingSystem(runtime);
  const projectiles = new ProjectileSystem(runtime, damage);
  const atp = new ATPSystem(runtime);
  const cells = new CellSystem(runtime, atp);
  const boss = new BossSystem(runtime, enemies);
  const waves = new WaveSystem("noseFirstLevel", runtime, enemies);
  cells.wireCombat(targeting, projectiles);

  const plan = [
    ["macrophage", "slot-4"],
    ["nk", "slot-5"],
    ["macrophage", "slot-7"],
    ["nk", "slot-2"],
    ["nk", "slot-6"],
    ["macrophage", "slot-1"],
    ["nk", "slot-3"]
  ] as const;
  let nextDeployment = 0;

  for (let time = 0; time <= 260000 && runtime.status === "playing"; time += 250) {
    while (nextDeployment < plan.length) {
      const [kind, slotId] = plan[nextDeployment];
      if (!cells.deploy(kind, slotId)) {
        break;
      }
      nextDeployment += 1;
    }
    atp.update(time, 250);
    waves.update(time, 250);
    enemies.update(time, 250);
    boss.update();
    cells.update(time);
    projectiles.update(time, 250);
  }

  assert.equal(runtime.status, "victory");
  assert.ok(runtime.tissueIntegrity > 0);
  assert.equal(runtime.cells.length, 7);
});
