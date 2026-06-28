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
  originY: number;
  displayWidth?: number;
  displayHeight?: number;
  shadow: {
    widthRatio: number;
    heightRatio: number;
    alpha: number;
    offsetYRatio: number;
  };
  trail?: {
    color: number;
    alpha: number;
    widthRatio: number;
    heightRatio: number;
    offsetXRatio: number;
    offsetYRatio: number;
  };
}

export interface BackgroundAssetConfig {
  image: ImageAssetRef;
  fallback: "nasal_mucosa_2_5d";
  opacity: number;
  optional: boolean;
  enabled: boolean;
  referencePath?: string;
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
      displaySize: 72,
      originY: 0.84,
      shadow: { widthRatio: 0.78, heightRatio: 0.2, alpha: 0.24, offsetYRatio: 0.04 }
    },
    nk: {
      sprite: { key: "cell_nk_256", path: "/assets/images/cells/sprite/cell_nk_256.png" },
      icon: { key: "cell_nk_icon_256", path: "/assets/images/cells/icon/cell_nk_256.png" },
      fallbackColor: 0x7c3aed,
      displaySize: 68,
      originY: 0.84,
      shadow: { widthRatio: 0.72, heightRatio: 0.18, alpha: 0.22, offsetYRatio: 0.04 }
    }
  },
  enemies: {
    normalVirus: {
      sprite: { key: "enemy_normal_virus_256", path: "/assets/images/enemies/sprite/enemy_normal_virus_256.png" },
      fallbackColor: 0xff6b3d,
      displaySize: 42,
      originY: 0.76,
      shadow: { widthRatio: 0.64, heightRatio: 0.17, alpha: 0.18, offsetYRatio: 0.05 }
    },
    fastVirus: {
      sprite: { key: "enemy_fast_virus_256", path: "/assets/images/enemies/sprite/enemy_fast_virus_256.png" },
      fallbackColor: 0xff3d2e,
      displaySize: 44,
      displayWidth: 50,
      displayHeight: 38,
      originY: 0.76,
      shadow: { widthRatio: 0.72, heightRatio: 0.15, alpha: 0.16, offsetYRatio: 0.05 },
      trail: { color: 0xff7a1a, alpha: 0.24, widthRatio: 0.92, heightRatio: 0.2, offsetXRatio: -0.42, offsetYRatio: -0.06 }
    },
    bacteria: {
      sprite: { key: "enemy_bacteria_256", path: "/assets/images/enemies/sprite/enemy_bacteria_256.png" },
      fallbackColor: 0xb5d94a,
      displaySize: 58,
      originY: 0.78,
      shadow: { widthRatio: 0.88, heightRatio: 0.2, alpha: 0.24, offsetYRatio: 0.05 }
    },
    miniVirus: {
      sprite: { key: "enemy_mini_virus_256", path: "/assets/images/enemies/sprite/enemy_mini_virus_256.png" },
      fallbackColor: 0xff735c,
      displaySize: 34,
      originY: 0.76,
      shadow: { widthRatio: 0.62, heightRatio: 0.16, alpha: 0.17, offsetYRatio: 0.05 }
    }
  },
  bosses: {
    mutantVirusCluster: {
      sprite: { key: "boss_mutant_virus_cluster_256", path: "/assets/images/bosses/sprite/boss_mutant_virus_cluster_256.png" },
      fallbackColor: 0xff5a2a,
      displaySize: 116,
      originY: 0.8,
      shadow: { widthRatio: 0.92, heightRatio: 0.24, alpha: 0.28, offsetYRatio: 0.04 }
    }
  },
  backgrounds: {
    /*
     * battle01Nasal.image must be a pure battlefield background. It must not
     * contain HUD, numbers, Chinese text, cards, buttons, icons, characters,
     * enemies, bosses, health bars, routes, deploy slots, or info panels.
     *
     * Allowed content: nasal mucosa interior space, soft tissue walls and
     * texture, blue-green immune ambience, central empty play space, bottom
     * core-area atmosphere, and subtle vertical perspective. Until a pure
     * background is available, keep enabled false so the code-drawn fallback
     * remains the active battlefield layer.
     */
    battle01Nasal: {
      image: { key: "bg_battle_01_nasal", path: "/assets/images/backgrounds/bg_battle_01_nasal.png" },
      fallback: "nasal_mucosa_2_5d",
      opacity: 0.62,
      optional: true,
      enabled: false,
      referencePath: "/assets/images/backgrounds/reference/bg_battle_01_nasal_concept_reference.png"
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
