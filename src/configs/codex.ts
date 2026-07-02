import { getCellVisualAsset, getEnemyOrBossVisualAsset } from "./assetConfig";
import { CELL_CONFIGS, CELL_ORDER } from "./cells";
import { ENEMY_CONFIGS } from "./enemies";

export const CODEX_ENTRIES = [
  ...CELL_ORDER.map((id) => {
    const cell = CELL_CONFIGS[id];
    const asset = getCellVisualAsset(id);
    return {
      id: cell.id,
      type: "免疫细胞",
      name: cell.name,
      description: cell.description,
      weakness: cell.skill,
      healthTip: "免疫系统需要协作，单个细胞再强也需要伙伴配合。",
      icon: asset?.icon?.path,
      fallbackColor: asset?.fallbackColor
    };
  }),
  ...Object.values(ENEMY_CONFIGS).map((enemy) => {
    const asset = getEnemyOrBossVisualAsset(enemy.id);
    return {
      id: enemy.id,
      type: "入侵者",
      name: enemy.name,
      description: enemy.description,
      weakness: enemy.weakness,
      healthTip: enemy.healthTip,
      icon: asset?.sprite.path,
      fallbackColor: asset?.fallbackColor
    };
  })
];
