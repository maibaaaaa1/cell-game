import type { ChapterConfig } from "../types/config";

export const LEVEL_CONFIG: { chapters: ChapterConfig[] } = {
  chapters: [
    {
      id: "chapter-nose",
      title: "第一章 鼻腔保卫战",
      levels: [
        {
          id: "nose-1",
          chapterId: "chapter-nose",
          title: "黏膜巡逻",
          mapKey: "nose",
          routeId: "noseMucosaMain",
          waveSetId: "noseTraining",
          recommendedCells: ["macrophage", "bcell"],
          unlockedByDefault: true
        },
        {
          id: "nose-2",
          chapterId: "chapter-nose",
          title: "喷嚏警报",
          mapKey: "nose",
          routeId: "noseMucosaLower",
          waveSetId: "noseTraining",
          recommendedCells: ["macrophage", "nk"],
          unlockedByDefault: false
        },
        {
          id: "nose-3",
          chapterId: "chapter-nose",
          title: "抗体布防",
          mapKey: "nose",
          routeId: "noseMucosaMain",
          waveSetId: "noseTraining",
          recommendedCells: ["bcell", "dendritic"],
          unlockedByDefault: false
        },
        {
          id: "nose-4",
          chapterId: "chapter-nose",
          title: "炎症升温",
          mapKey: "nose",
          routeId: "noseMucosaLower",
          waveSetId: "noseTraining",
          recommendedCells: ["cd4", "nk"],
          unlockedByDefault: false
        },
        {
          id: "nose-5",
          chapterId: "chapter-nose",
          title: "鼻腔总防线",
          mapKey: "nose",
          routeId: "noseMucosaMain",
          waveSetId: "legacyTwentyWave",
          recommendedCells: ["macrophage", "bcell", "cd8"],
          unlockedByDefault: false
        }
      ]
    }
  ]
};
