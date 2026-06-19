import type { CellConfig } from "../types/game";

export const CELL_CONFIGS: Record<CellConfig["id"], CellConfig> = {
  macrophage: {
    id: "macrophage",
    name: "巨噬细胞",
    englishName: "Macrophage",
    role: "近战吞噬",
    cost: 50,
    baseAttack: 20,
    health: 500,
    attackRate: 1.15,
    range: 72,
    color: 0xff9f43,
    accent: "#ff9f43",
    description: "冲在前线的吞噬型免疫细胞，适合拦截普通细菌。",
    skill: "吞噬：概率秒杀普通细菌。",
    levels: [
      { attack: 20, upgradeCost: 40 },
      { attack: 42, upgradeCost: 75 },
      { attack: 85, upgradeCost: 0, unlock: "强化吞噬" }
    ]
  },
  dendritic: {
    id: "dendritic",
    name: "树突细胞",
    englishName: "Dendritic Cell",
    role: "范围激活",
    cost: 75,
    baseAttack: 0,
    health: 300,
    attackRate: 0,
    range: 156,
    color: 0x34d399,
    accent: "#34d399",
    description: "递呈抗原、唤醒伙伴。它不直接攻击，但能强化周围细胞。",
    skill: "激活：周围3格内细胞攻击提升20%。",
    levels: [
      { attack: 0, upgradeCost: 55 },
      { attack: 0, upgradeCost: 95 },
      { attack: 0, upgradeCost: 0, unlock: "强效激活" }
    ]
  },
  nk: {
    id: "nk",
    name: "NK细胞",
    englishName: "Natural Killer",
    role: "病毒猎手",
    cost: 125,
    baseAttack: 60,
    health: 260,
    attackRate: 1,
    range: 240,
    color: 0x7c3aed,
    accent: "#7c3aed",
    priority: ["fluVirus", "mutantVirus", "miniVirus"],
    description: "天然杀伤细胞，擅长快速识别被病毒感染的异常目标。",
    skill: "目标锁定：25%暴击，优先攻击病毒。",
    levels: [
      { attack: 60, upgradeCost: 95 },
      { attack: 105, upgradeCost: 145 },
      { attack: 175, upgradeCost: 0, unlock: "连续追猎" }
    ]
  },
  bcell: {
    id: "bcell",
    name: "B细胞",
    englishName: "B Cell",
    role: "全行抗体",
    cost: 100,
    baseAttack: 30,
    health: 220,
    attackRate: 1.45,
    range: 920,
    color: 0x22c7d8,
    accent: "#22c7d8",
    description: "制造抗体的远程单位，能沿整行打击入侵者。",
    skill: "抗体发射：Lv3解锁抗体风暴。",
    levels: [
      { attack: 30, upgradeCost: 80 },
      { attack: 60, upgradeCost: 130 },
      { attack: 120, upgradeCost: 0, unlock: "抗体风暴" }
    ]
  },
  cd4: {
    id: "cd4",
    name: "CD4辅助T细胞",
    englishName: "CD4 Helper T",
    role: "全场指挥",
    cost: 150,
    baseAttack: 10,
    health: 260,
    attackRate: 1.8,
    range: 180,
    color: 0xf4b740,
    accent: "#f4b740",
    description: "免疫系统的战术指挥，能让全场攻击节奏更快。",
    skill: "辅助信号：全场攻速提升12%。",
    levels: [
      { attack: 10, upgradeCost: 110 },
      { attack: 25, upgradeCost: 170 },
      { attack: 45, upgradeCost: 0, unlock: "细胞因子号令" }
    ]
  },
  cd8: {
    id: "cd8",
    name: "CD8杀伤T细胞",
    englishName: "CD8 Killer T",
    role: "抗癌斩击",
    cost: 200,
    baseAttack: 120,
    health: 320,
    attackRate: 1.55,
    range: 270,
    color: 0xef4444,
    accent: "#ef4444",
    priority: ["cancerKing", "cancerCell"],
    description: "高伤害单体输出，专门处理癌变细胞与Boss。",
    skill: "异常清除：优先攻击癌细胞。",
    levels: [
      { attack: 120, upgradeCost: 150 },
      { attack: 210, upgradeCost: 240 },
      { attack: 360, upgradeCost: 0, unlock: "精准凋亡" }
    ]
  }
};

export const CELL_ORDER: CellConfig["id"][] = ["macrophage", "dendritic", "nk", "bcell", "cd4", "cd8"];
