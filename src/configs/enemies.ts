import type { EnemyConfig } from "../types/game";

export const ENEMY_CONFIGS: Record<EnemyConfig["id"], EnemyConfig> = {
  bacteria: {
    id: "bacteria",
    name: "普通细菌",
    health: 50,
    speed: 1,
    reward: 10,
    damage: 1,
    color: 0x8bc34a,
    description: "常见入侵者，数量多但较脆弱。",
    weakness: "巨噬细胞的吞噬效果非常有效。",
    healthTip: "规律作息、均衡饮食能帮助免疫系统保持巡逻效率。"
  },
  fluVirus: {
    id: "fluVirus",
    name: "流感病毒",
    health: 80,
    speed: 2,
    reward: 15,
    damage: 1,
    color: 0x60a5fa,
    isVirus: true,
    description: "主要攻击呼吸道，移动速度较快。",
    weakness: "NK细胞会优先锁定病毒。",
    healthTip: "接种疫苗可降低感染和重症风险。"
  },
  resistantBacteria: {
    id: "resistantBacteria",
    name: "耐药菌",
    health: 300,
    speed: 0.78,
    reward: 35,
    damage: 2,
    color: 0x64748b,
    armor: 0.5,
    description: "拥有50%护甲，能抵消大量普通伤害。",
    weakness: "高等级B细胞和CD8细胞能稳定处理。",
    healthTip: "抗生素需遵医嘱使用，滥用会增加耐药风险。"
  },
  mutantVirus: {
    id: "mutantVirus",
    name: "变异病毒",
    health: 160,
    speed: 1.65,
    reward: 30,
    damage: 2,
    color: 0xa78bfa,
    isVirus: true,
    description: "死亡后分裂成2个小病毒。",
    weakness: "范围火力和NK细胞能压制分裂压力。",
    healthTip: "良好的通风与手卫生可降低呼吸道病毒传播机会。"
  },
  miniVirus: {
    id: "miniVirus",
    name: "小病毒",
    health: 35,
    speed: 2.35,
    reward: 5,
    damage: 1,
    color: 0xc4b5fd,
    isVirus: true,
    description: "由变异病毒分裂产生，速度很快。",
    weakness: "B细胞全行攻击可以快速清理。",
    healthTip: "免疫反应讲究协同，单一防线容易被快速目标突破。"
  },
  cancerCell: {
    id: "cancerCell",
    name: "癌细胞",
    health: 650,
    speed: 0.55,
    reward: 50,
    damage: 5,
    color: 0xfb7185,
    isCancer: true,
    description: "每20秒尝试复制自己，需要尽快击杀。",
    weakness: "CD8杀伤T细胞会优先攻击癌细胞。",
    healthTip: "定期筛查、戒烟限酒、运动和体重管理能降低多种癌症风险。"
  },
  cancerKing: {
    id: "cancerKing",
    name: "癌王",
    health: 10000,
    speed: 0.25,
    reward: 500,
    damage: 10,
    color: 0xbe123c,
    isCancer: true,
    description: "终极Boss，拥有分裂、回血、召唤、免疫护盾。",
    weakness: "CD8杀伤T细胞、CAR-T疗法和疫苗接种技能组合。",
    healthTip: "癌症治疗强调早筛、规范治疗与多学科协作。"
  }
};
