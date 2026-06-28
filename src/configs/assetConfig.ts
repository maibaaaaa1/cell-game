import type { CellKind, EnemyKind } from "../types/game";

export interface ImageAssetRef {
  key: string;
  path: string;
}

export interface VisualAssetConfig {
  sprite: ImageAssetRef;
  icon?: ImageAssetRef;
  fallbackColor: number;
  displaySize: number;
}

export const ASSET_CONFIG = {
  atlas: {},
  sprites: {
    placeholderCell: "generated-cell",
    placeholderEnemy: "generated-enemy"
  },
  cells: {
    macrophage: {
      sprite: { key: "cell_macrophage_256", path: "/assets/images/cells/sprite/cell_macrophage_256.png" },
      icon: { key: "cell_macrophage_icon_256", path: "/assets/images/cells/icon/cell_macrophage_256.png" },
      fallbackColor: 0xff9f1c,
      displaySize: 82
    },
    nk: {
      sprite: { key: "cell_nk_256", path: "/assets/images/cells/sprite/cell_nk_256.png" },
      icon: { key: "cell_nk_icon_256", path: "/assets/images/cells/icon/cell_nk_256.png" },
      fallbackColor: 0x7c3aed,
      displaySize: 78
    }
  },
  enemies: {
    normalVirus: {
      sprite: { key: "enemy_normal_virus_256", path: "/assets/images/enemies/sprite/enemy_normal_virus_256.png" },
      fallbackColor: 0xff6b3d,
      displaySize: 48
    },
    fastVirus: {
      sprite: { key: "enemy_fast_virus_256", path: "/assets/images/enemies/sprite/enemy_fast_virus_256.png" },
      fallbackColor: 0xff3d2e,
      displaySize: 50
    },
    bacteria: {
      sprite: { key: "enemy_bacteria_256", path: "/assets/images/enemies/sprite/enemy_bacteria_256.png" },
      fallbackColor: 0xb5d94a,
      displaySize: 64
    },
    miniVirus: {
      sprite: { key: "enemy_mini_virus_256", path: "/assets/images/enemies/sprite/enemy_mini_virus_256.png" },
      fallbackColor: 0xff735c,
      displaySize: 36
    }
  },
  bosses: {
    mutantVirusCluster: {
      sprite: { key: "boss_mutant_virus_cluster_256", path: "/assets/images/bosses/sprite/boss_mutant_virus_cluster_256.png" },
      fallbackColor: 0xff5a2a,
      displaySize: 132
    }
  },
  audio: {
    combo: "generated-combo",
    clear: "generated-clear",
    heartbeat: "generated-heartbeat"
  }
} as const;

export const FIRST_LEVEL_REQUIRED_ASSET_KEYS = [
  ASSET_CONFIG.cells.macrophage.sprite.key,
  ASSET_CONFIG.cells.nk.sprite.key,
  ASSET_CONFIG.enemies.normalVirus.sprite.key,
  ASSET_CONFIG.enemies.fastVirus.sprite.key,
  ASSET_CONFIG.enemies.bacteria.sprite.key,
  ASSET_CONFIG.enemies.miniVirus.sprite.key,
  ASSET_CONFIG.bosses.mutantVirusCluster.sprite.key
] as const;

export function getCellVisualAsset(kind: CellKind): VisualAssetConfig | undefined {
  return ASSET_CONFIG.cells[kind as keyof typeof ASSET_CONFIG.cells];
}

export function getEnemyVisualAsset(kind: EnemyKind): VisualAssetConfig | undefined {
  return ASSET_CONFIG.enemies[kind as keyof typeof ASSET_CONFIG.enemies];
}

export function getBossVisualAsset(kind: EnemyKind): VisualAssetConfig | undefined {
  return ASSET_CONFIG.bosses[kind as keyof typeof ASSET_CONFIG.bosses];
}

export function getEnemyOrBossVisualAsset(kind: EnemyKind): VisualAssetConfig | undefined {
  return getBossVisualAsset(kind) ?? getEnemyVisualAsset(kind);
}

export function getCodexVisualAsset(id: string): VisualAssetConfig | undefined {
  return getCellVisualAsset(id as CellKind) ?? getEnemyOrBossVisualAsset(id as EnemyKind);
}
