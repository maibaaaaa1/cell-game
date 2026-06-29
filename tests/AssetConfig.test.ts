import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { ASSET_CONFIG, FIRST_LEVEL_REQUIRED_ASSET_KEYS, getBossVisualAsset, getCellVisualAsset, getEnemyVisualAsset } from "../src/configs/assetConfig.ts";

test("asset config contains first level required sprite and icon paths", () => {
  assert.equal(ASSET_CONFIG.cells.macrophage.sprite.path, "/assets/images/cells/sprite/cell_macrophage_256.png");
  assert.equal(ASSET_CONFIG.cells.macrophage.icon.path, "/assets/images/cells/icon/cell_macrophage_256.png");
  assert.equal(ASSET_CONFIG.cells.nk.sprite.path, "/assets/images/cells/sprite/cell_nk_256.png");
  assert.equal(ASSET_CONFIG.cells.nk.icon.path, "/assets/images/cells/icon/cell_nk_256.png");

  assert.equal(ASSET_CONFIG.enemies.normalVirus.sprite.path, "/assets/images/enemies/sprite/enemy_normal_virus_256.png");
  assert.equal(ASSET_CONFIG.enemies.fastVirus.sprite.path, "/assets/images/enemies/sprite/enemy_fast_virus_256.png");
  assert.equal(ASSET_CONFIG.enemies.bacteria.sprite.path, "/assets/images/enemies/sprite/enemy_bacteria_256.png");
  assert.equal(ASSET_CONFIG.enemies.miniVirus.sprite.path, "/assets/images/enemies/sprite/enemy_mini_virus_256.png");
  assert.equal(ASSET_CONFIG.bosses.mutantVirusCluster.sprite.path, "/assets/images/bosses/sprite/boss_mutant_virus_cluster_256.png");
  assert.equal(ASSET_CONFIG.backgrounds.battle01Nasal.image.key, "bg_battle_01_nasal");
  assert.equal(ASSET_CONFIG.backgrounds.battle01Nasal.image.path, "/assets/images/backgrounds/bg_battle_01_nasal.png");
  assert.equal(ASSET_CONFIG.backgrounds.battle01Nasal.fallback, "nasal_mucosa_2_5d");
  assert.ok(ASSET_CONFIG.backgrounds.battle01Nasal.opacity >= 0.88);
  assert.ok(ASSET_CONFIG.backgrounds.battle01Nasal.opacity <= 1);
  assert.equal(ASSET_CONFIG.backgrounds.battle01Nasal.enabled, true);
  assert.equal(
    ASSET_CONFIG.backgrounds.battle01Nasal.referencePath,
    "/assets/images/backgrounds/reference/bg_battle_01_nasal_concept_reference.png"
  );

  assert.deepEqual(FIRST_LEVEL_REQUIRED_ASSET_KEYS, [
    "cell_macrophage_256",
    "cell_nk_256",
    "enemy_normal_virus_256",
    "enemy_fast_virus_256",
    "enemy_bacteria_256",
    "enemy_mini_virus_256",
    "boss_mutant_virus_cluster_256"
  ]);
});

test("first level visual assets expose fallback colors and stable display sizes", () => {
  assert.equal(getCellVisualAsset("macrophage")?.fallbackColor, 0xff9f1c);
  assert.equal(getCellVisualAsset("nk")?.fallbackColor, 0x7c3aed);
  assert.ok((getCellVisualAsset("macrophage")?.displaySize ?? 0) >= 72);
  assert.ok((getCellVisualAsset("macrophage")?.displaySize ?? 99) <= 74);
  assert.ok((getCellVisualAsset("nk")?.displaySize ?? 0) >= 68);
  assert.ok((getCellVisualAsset("nk")?.displaySize ?? 99) <= 70);

  assert.equal(getEnemyVisualAsset("normalVirus")?.fallbackColor, 0xff6b3d);
  assert.equal(getEnemyVisualAsset("fastVirus")?.fallbackColor, 0xff3d2e);
  assert.equal(getEnemyVisualAsset("bacteria")?.fallbackColor, 0xb5d94a);
  assert.equal(getEnemyVisualAsset("miniVirus")?.fallbackColor, 0xff735c);
  assert.ok((getEnemyVisualAsset("normalVirus")?.displaySize ?? 0) >= 42);
  assert.ok((getEnemyVisualAsset("fastVirus")?.displaySize ?? 0) >= 44);
  assert.ok((getEnemyVisualAsset("bacteria")?.displaySize ?? 0) >= 56);
  assert.ok((getEnemyVisualAsset("bacteria")?.displaySize ?? 0) > (getEnemyVisualAsset("normalVirus")?.displaySize ?? 99));
  assert.ok((getEnemyVisualAsset("miniVirus")?.displaySize ?? 0) >= 32);
  assert.ok((getEnemyVisualAsset("miniVirus")?.displaySize ?? 99) <= 34);

  assert.equal(getBossVisualAsset("mutantVirusCluster")?.fallbackColor, 0xff5a2a);
  assert.ok((getBossVisualAsset("mutantVirusCluster")?.displaySize ?? 0) >= 110);
  assert.ok((getBossVisualAsset("mutantVirusCluster")?.displaySize ?? 99) <= 120);
  assert.ok((getBossVisualAsset("mutantVirusCluster")?.displaySize ?? 0) > (getEnemyVisualAsset("bacteria")?.displaySize ?? 0) * 1.85);
});

test("first level visual assets define grounded origins and distinct fast-virus presentation", () => {
  const macrophage = getCellVisualAsset("macrophage");
  const nk = getCellVisualAsset("nk");
  const normalVirus = getEnemyVisualAsset("normalVirus");
  const fastVirus = getEnemyVisualAsset("fastVirus");
  const bacteria = getEnemyVisualAsset("bacteria");
  const miniVirus = getEnemyVisualAsset("miniVirus");
  const boss = getBossVisualAsset("mutantVirusCluster");

  assert.equal(macrophage?.originY, 0.84);
  assert.equal(nk?.originY, 0.84);
  assert.equal(normalVirus?.originY, 0.76);
  assert.equal(fastVirus?.originY, 0.76);
  assert.equal(bacteria?.originY, 0.78);
  assert.equal(miniVirus?.originY, 0.76);
  assert.equal(boss?.originY, 0.8);
  assert.ok((boss?.displaySize ?? 999) <= 120);
  assert.ok(fastVirus?.trail);
  assert.ok(fastVirus?.displayWidth !== normalVirus?.displaySize);
  assert.ok((bacteria?.shadow.widthRatio ?? 0) > (normalVirus?.shadow.widthRatio ?? 99));
});

test("configured first level lightweight png files are present in public assets", () => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const paths = [
    ASSET_CONFIG.cells.macrophage.sprite.path,
    ASSET_CONFIG.cells.macrophage.icon.path,
    ASSET_CONFIG.cells.nk.sprite.path,
    ASSET_CONFIG.cells.nk.icon.path,
    ASSET_CONFIG.enemies.normalVirus.sprite.path,
    ASSET_CONFIG.enemies.fastVirus.sprite.path,
    ASSET_CONFIG.enemies.bacteria.sprite.path,
    ASSET_CONFIG.enemies.miniVirus.sprite.path,
    ASSET_CONFIG.bosses.mutantVirusCluster.sprite.path
  ];

  for (const path of paths) {
    assert.ok(existsSync(join(root, "public", path.replace(/^\//, ""))), `${path} should exist`);
  }
});

test("battle background config enables the final pure nasal background and keeps fallback ready", () => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const background = ASSET_CONFIG.backgrounds.battle01Nasal;
  const absolutePath = join(root, "public", background.image.path.replace(/^\//, ""));
  const referencePath = background.referencePath
    ? join(root, "public", background.referencePath.replace(/^\//, ""))
    : undefined;

  assert.equal(background.optional, true);
  assert.equal(background.enabled, true);
  assert.equal(background.fallback, "nasal_mucosa_2_5d");
  assert.equal(existsSync(absolutePath), true);
  assert.equal(referencePath ? existsSync(referencePath) : false, true);
});

test("battle scene loads optional sprites and keeps fallback rendering guarded", () => {
  const source = readFileSync(new URL("../src/scenes/BattleScene.ts", import.meta.url), "utf8");

  assert.ok(source.includes("ASSET_CONFIG"));
  assert.ok(source.includes("this.load.image"));
  assert.ok(source.includes("ASSET_CONFIG.backgrounds.battle01Nasal"));
  assert.ok(source.includes("if (background.enabled)"));
  assert.ok(source.includes("background.enabled && this.textures.exists"));
  assert.ok(source.includes("this.textures.exists"));
  assert.ok(source.includes("drawBackgroundImage"));
  assert.ok(source.includes("drawNasalMucosaFallback"));
  assert.ok(source.includes("createCellFallbackShape"));
  assert.ok(source.includes("createEnemyFallbackShape"));
});

test("battle scene keeps sprite scaling visual-only and adds 2.5D presentation cues", () => {
  const source = readFileSync(new URL("../src/scenes/BattleScene.ts", import.meta.url), "utf8");

  assert.ok(source.includes("createBattlefieldLayers"));
  assert.ok(source.includes("backgroundLayer"));
  assert.ok(source.includes("terrainLayer"));
  assert.ok(source.includes("routeBaseLayer"));
  assert.ok(source.includes("routeGlowLayer"));
  assert.ok(source.includes("slotPlatformLayer"));
  assert.ok(source.includes("shadowLayer"));
  assert.ok(source.includes("unitLayer"));
  assert.ok(source.includes("projectileLayer"));
  assert.ok(source.includes("effectLayer"));
  assert.ok(source.includes("labelLayer"));
  assert.ok(source.includes("debugLayer"));
  assert.ok(source.includes("addToBattlefieldLayer"));
  assert.ok(source.includes("createGroundedImage"));
  assert.ok(source.includes("setOrigin(0.5, asset.originY)"));
  assert.ok(source.includes("createSoftShadow"));
  assert.ok(source.includes("drawRouteChannel"));
  assert.ok(source.includes("perspectiveWidthForY"));
  assert.ok(source.includes("drawFleshyRouteBed"));
  assert.ok(source.includes("drawRouteChannelGlow"));
  assert.ok(source.includes("drawBiologicalPlatform"));
  assert.ok(source.includes("drawImmunePlatformRim"));
  assert.ok(source.includes("drawLifeCoreShield"));
  assert.ok(source.includes("drawIntegratedMucosaCorridor"));
  assert.ok(source.includes("drawPlatformSocket"));
  assert.ok(source.includes("createBattleCellActor"));
  assert.ok(source.includes("createBattleEnemyActor"));
  assert.ok(source.includes("createBossBattleActor"));
  assert.ok(source.includes("drawCellArmorDetails"));
  assert.ok(source.includes("drawTissueTexture"));
  assert.ok(source.includes("drawMucosaWalls"));
  assert.ok(source.includes("drawAirflowLines"));
  assert.ok(source.includes("drawRouteEnergyFlow"));
  assert.ok(source.includes("drawCoreEnergyBase"));
  assert.ok(source.includes("depthScaleForY"));
  assert.ok(source.includes("toVisualWorld"));
  assert.ok(source.includes("createFastVirusTrail"));
  assert.ok(source.includes("playBossSpawnFeedback"));
  assert.ok(source.includes("playMiniVirusPop"));
  assert.ok(source.includes("playBossSplitFlash"));
  assert.ok(!source.includes("cell.range ="));
  assert.ok(!source.includes("enemy.speed ="));
});

test("first level visual reconstruction avoids white gutters and raw white-backed sprites", () => {
  const scene = readFileSync(new URL("../src/scenes/BattleScene.ts", import.meta.url), "utf8");
  const shell = readFileSync(new URL("../src/game/GameShell.tsx", import.meta.url), "utf8");
  const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

  assert.ok(scene.includes("drawBackgroundEdgeBlend"));
  assert.ok(scene.includes("drawSceneOcclusion"));
  assert.ok(scene.includes("drawSubtleLaneGuides"));
  assert.ok(scene.includes("createBattleCellActor"));
  assert.ok(scene.includes("createBattleEnemyActor"));
  assert.ok(scene.includes("createBossBattleActor"));
  assert.ok(shell.includes("phaser-host relative overflow-hidden rounded-xl"));
  assert.ok(!shell.includes("phaser-host relative w-full overflow-hidden rounded-xl bg-white"));
  assert.match(styles, /\.phaser-host\s*{[^}]*flex: 1 1 auto;/s);
  assert.match(styles, /\.phaser-host\s*{[^}]*width: 100%;/s);
  assert.match(styles, /\.phaser-host\s*{[^}]*background:/s);
});

test("battle scene routes battlefield objects through dedicated 2.5D layers", () => {
  const source = readFileSync(new URL("../src/scenes/BattleScene.ts", import.meta.url), "utf8");

  assert.ok(source.includes("this.addToBattlefieldLayer(\"backgroundLayer\""));
  assert.ok(source.includes("this.addToBattlefieldLayer(\"terrainLayer\""));
  assert.ok(source.includes("this.addToBattlefieldLayer(\"routeBaseLayer\""));
  assert.ok(source.includes("this.addToBattlefieldLayer(\"routeGlowLayer\""));
  assert.ok(source.includes("this.addToBattlefieldLayer(\"slotPlatformLayer\""));
  assert.ok(source.includes("this.addToBattlefieldLayer(\"shadowLayer\""));
  assert.ok(source.includes("this.addToBattlefieldLayer(\"unitLayer\""));
  assert.ok(source.includes("this.addToBattlefieldLayer(\"projectileLayer\""));
  assert.ok(source.includes("this.addToBattlefieldLayer(\"effectLayer\""));
  assert.match(source, /addToBattlefieldLayer\(\s*"labelLayer"/s);
  assert.match(source, /addToBattlefieldLayer\(\s*"debugLayer"/s);
});

test("cell cards and codex can show icons without breaking fallback dots", () => {
  const gameShell = readFileSync(new URL("../src/game/GameShell.tsx", import.meta.url), "utf8");
  const codex = readFileSync(new URL("../src/components/Codex.tsx", import.meta.url), "utf8");

  assert.ok(gameShell.includes("cell.icon"));
  assert.ok(gameShell.includes("onError"));
  assert.ok(codex.includes("entry.icon"));
  assert.ok(codex.includes("codex-avatar"));
});
