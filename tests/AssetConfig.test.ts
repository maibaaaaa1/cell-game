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
  assert.ok((getCellVisualAsset("macrophage")?.displaySize ?? 0) <= 56);
  assert.ok((getCellVisualAsset("nk")?.displaySize ?? 0) <= 56);

  assert.equal(getEnemyVisualAsset("normalVirus")?.fallbackColor, 0xff6b3d);
  assert.equal(getEnemyVisualAsset("fastVirus")?.fallbackColor, 0xff3d2e);
  assert.equal(getEnemyVisualAsset("bacteria")?.fallbackColor, 0xb5d94a);
  assert.equal(getEnemyVisualAsset("miniVirus")?.fallbackColor, 0xff735c);
  assert.ok((getEnemyVisualAsset("miniVirus")?.displaySize ?? 99) <= 26);

  assert.equal(getBossVisualAsset("mutantVirusCluster")?.fallbackColor, 0xff5a2a);
  assert.ok((getBossVisualAsset("mutantVirusCluster")?.displaySize ?? 0) >= 70);
  assert.ok((getBossVisualAsset("mutantVirusCluster")?.displaySize ?? 99) <= 96);
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

test("battle scene loads optional sprites and keeps fallback rendering guarded", () => {
  const source = readFileSync(new URL("../src/scenes/BattleScene.ts", import.meta.url), "utf8");

  assert.ok(source.includes("ASSET_CONFIG"));
  assert.ok(source.includes("this.load.image"));
  assert.ok(source.includes("this.textures.exists"));
  assert.ok(source.includes("createCellFallbackShape"));
  assert.ok(source.includes("createEnemyFallbackShape"));
});

test("cell cards and codex can show icons without breaking fallback dots", () => {
  const gameShell = readFileSync(new URL("../src/game/GameShell.tsx", import.meta.url), "utf8");
  const codex = readFileSync(new URL("../src/components/Codex.tsx", import.meta.url), "utf8");

  assert.ok(gameShell.includes("cell.icon"));
  assert.ok(gameShell.includes("onError"));
  assert.ok(codex.includes("entry.icon"));
  assert.ok(codex.includes("codex-avatar"));
});
