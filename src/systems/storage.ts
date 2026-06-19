import type { EnemyKind, SaveData } from "../types/game";
import { ACHIEVEMENTS } from "../configs/achievements";
import { CODEX_ENTRIES } from "../configs/codex";

const SAVE_KEY = "immune-cell-battle-save-v1";

const DEFAULT_SAVE: SaveData = {
  unlockedCodex: ["macrophage", "bacteria"],
  achievements: [],
  bestChapter: 1,
  settings: {
    sound: true,
    reducedMotion: false
  },
  stats: {
    virusKills: 0,
    cancerKills: 0,
    totalKills: 0
  }
};

export function loadSave(): SaveData {
  const raw = window.localStorage.getItem(SAVE_KEY);
  if (!raw) {
    return DEFAULT_SAVE;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return {
      ...DEFAULT_SAVE,
      ...parsed,
      settings: {
        ...DEFAULT_SAVE.settings,
        ...parsed.settings
      },
      stats: {
        ...DEFAULT_SAVE.stats,
        ...parsed.stats
      },
      unlockedCodex: parsed.unlockedCodex ?? DEFAULT_SAVE.unlockedCodex,
      achievements: parsed.achievements ?? DEFAULT_SAVE.achievements
    };
  } catch {
    return DEFAULT_SAVE;
  }
}

export function saveGame(data: SaveData): void {
  window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

export function updateSave(updater: (save: SaveData) => SaveData): SaveData {
  const next = updater(loadSave());
  saveGame(next);
  return next;
}

export function resetSave(): SaveData {
  saveGame(DEFAULT_SAVE);
  return DEFAULT_SAVE;
}

export function unlockCodex(id: string): SaveData {
  return updateSave((save) => {
    if (save.unlockedCodex.includes(id)) {
      return save;
    }

    return {
      ...save,
      unlockedCodex: [...save.unlockedCodex, id]
    };
  });
}

export function recordKill(kind: EnemyKind, traits: { isVirus?: boolean; isCancer?: boolean }): SaveData {
  return updateSave((save) => {
    const next: SaveData = {
      ...save,
      unlockedCodex: save.unlockedCodex.includes(kind) ? save.unlockedCodex : [...save.unlockedCodex, kind],
      stats: {
        totalKills: save.stats.totalKills + 1,
        virusKills: save.stats.virusKills + (traits.isVirus ? 1 : 0),
        cancerKills: save.stats.cancerKills + (traits.isCancer ? 1 : 0)
      }
    };

    return applyAchievements(next);
  });
}

export function recordChapterClear(chapter: number): SaveData {
  return updateSave((save) => {
    const next: SaveData = {
      ...save,
      bestChapter: Math.max(save.bestChapter, chapter + 1)
    };

    if (chapter === 1 && !next.achievements.includes("first-officer")) {
      next.achievements = [...next.achievements, "first-officer"];
    }

    return applyAchievements(next);
  });
}

export function applyAchievements(save: SaveData): SaveData {
  const achievements = new Set(save.achievements);

  if (save.stats.virusKills >= 1000) {
    achievements.add("virus-finisher");
  }

  if (save.stats.cancerKills >= 100) {
    achievements.add("cancer-vanguard");
  }

  if (CODEX_ENTRIES.every((entry) => save.unlockedCodex.includes(entry.id))) {
    achievements.add("body-guardian");
  }

  return {
    ...save,
    achievements: ACHIEVEMENTS.filter((item) => achievements.has(item.id)).map((item) => item.id)
  };
}
