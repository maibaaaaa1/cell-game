export interface AchievementConfig {
  id: string;
  name: string;
  description: string;
}

export const ACHIEVEMENTS: AchievementConfig[] = [
  {
    id: "first-officer",
    name: "初级免疫官",
    description: "通关第一章。"
  },
  {
    id: "virus-finisher",
    name: "病毒终结者",
    description: "累计击杀1000个病毒。"
  },
  {
    id: "cancer-vanguard",
    name: "抗癌先锋",
    description: "累计击杀100个癌细胞。"
  },
  {
    id: "body-guardian",
    name: "人体守护神",
    description: "解锁全部图鉴。"
  }
];
