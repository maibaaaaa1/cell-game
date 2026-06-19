import type { LevelConfig } from "../types/game";

export const LEVELS: LevelConfig[] = [
  {
    id: "nose-1",
    chapter: "第一章",
    name: "鼻腔保卫战",
    mapKey: "nose",
    unlocked: true,
    description: "鼻腔黏膜是呼吸道第一道防线，适合学习基础部署。"
  },
  {
    id: "throat-1",
    chapter: "第二章",
    name: "咽喉攻防战",
    mapKey: "throat",
    unlocked: true,
    description: "病毒速度更快，B细胞和NK细胞开始成为关键。"
  },
  {
    id: "lung-1",
    chapter: "第三章",
    name: "肺部保卫战",
    mapKey: "lung",
    unlocked: true,
    description: "敌人密度提升，考验树突细胞与CD4辅助T细胞的协同。"
  },
  {
    id: "gut-1",
    chapter: "第四章",
    name: "肠道大战",
    mapKey: "gut",
    unlocked: false,
    description: "预留章节：微生态、屏障功能与耐药菌主题。"
  },
  {
    id: "lymph-1",
    chapter: "第五章",
    name: "淋巴防御战",
    mapKey: "lymph",
    unlocked: false,
    description: "预留章节：免疫细胞集结与信号放大。"
  },
  {
    id: "cancer-1",
    chapter: "第六章",
    name: "癌细胞入侵",
    mapKey: "cancer",
    unlocked: false,
    description: "预留章节：CD8、NK与CAR-T协作挑战Boss。"
  }
];
