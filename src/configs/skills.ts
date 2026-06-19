import type { SkillConfig } from "../types/game";

export const SKILL_CONFIGS: Record<SkillConfig["id"], SkillConfig> = {
  fever: {
    id: "fever",
    name: "发烧模式",
    cooldown: 60,
    duration: 10,
    description: "全体攻击+50%，持续10秒。"
  },
  vaccine: {
    id: "vaccine",
    name: "疫苗接种",
    cooldown: 90,
    duration: 15,
    description: "全场暴击+30%，持续15秒。"
  },
  cart: {
    id: "cart",
    name: "CAR-T疗法",
    cooldown: 120,
    duration: 30,
    description: "召唤超级T细胞，持续30秒。"
  }
};

export const SKILL_ORDER: SkillConfig["id"][] = ["fever", "vaccine", "cart"];
