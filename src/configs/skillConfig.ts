import type { SkillRuntimeConfig } from "../types/config";

export const SKILL_CONFIG: Record<string, SkillRuntimeConfig> = {
  fever: { id: "fever", cooldown: 60, duration: 10 },
  vaccine: { id: "vaccine", cooldown: 90, duration: 15 },
  cart: { id: "cart", cooldown: 120, duration: 30 }
};
export const SKILL_CONFIG_VERSION = "v0.1";
