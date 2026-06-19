import { useCallback, useMemo, useState } from "react";
import { ACHIEVEMENTS } from "./configs/achievements";
import { Achievements } from "./components/Achievements";
import { Codex } from "./components/Codex";
import { LevelSelect } from "./components/LevelSelect";
import { MainMenu } from "./components/MainMenu";
import { Settings } from "./components/Settings";
import { GameShell } from "./game/GameShell";
import { loadSave, resetSave, saveGame } from "./systems/storage";
import type { LevelConfig, SaveData, Screen } from "./types/game";

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [save, setSave] = useState<SaveData>(() => loadSave());
  const [activeLevel, setActiveLevel] = useState<LevelConfig | null>(null);
  const [achievementToast, setAchievementToast] = useState<string | null>(null);

  const refreshSave = useCallback(() => {
    setSave((previous) => {
      const next = loadSave();
      const unlocked = next.achievements.find((id) => !previous.achievements.includes(id));
      if (unlocked) {
        const achievement = ACHIEVEMENTS.find((item) => item.id === unlocked);
        setAchievementToast(achievement ? `成就解锁：${achievement.name}` : "成就解锁");
        window.setTimeout(() => setAchievementToast(null), 2800);
      }
      return next;
    });
  }, []);

  const goHome = useCallback(() => {
    setActiveLevel(null);
    refreshSave();
    setScreen("home");
  }, [refreshSave]);

  const content = useMemo(() => {
    if (screen === "levels") {
      return (
        <LevelSelect
          save={save}
          onBack={() => setScreen("home")}
          onStart={(level) => {
            setActiveLevel(level);
            setScreen("battle");
          }}
        />
      );
    }

    if (screen === "codex") {
      return <Codex save={save} onBack={() => setScreen("home")} />;
    }

    if (screen === "achievements") {
      return <Achievements save={save} onBack={() => setScreen("home")} />;
    }

    if (screen === "settings") {
      return (
        <Settings
          save={save}
          onBack={() => setScreen("home")}
          onReset={() => setSave(resetSave())}
          onChange={(next) => {
            saveGame(next);
            setSave(next);
          }}
        />
      );
    }

    if (screen === "battle" && activeLevel) {
      return <GameShell level={activeLevel} onExit={goHome} onSaveChanged={refreshSave} />;
    }

    return <MainMenu onNavigate={setScreen} />;
  }, [activeLevel, goHome, refreshSave, save, screen]);

  return (
    <>
      {content}
      {achievementToast && <div className="achievement-toast">{achievementToast}</div>}
    </>
  );
}
