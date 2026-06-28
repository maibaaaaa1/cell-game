import { LEVELS } from "../configs/levels";
import { getLevelStatusText, isPreviewPlayableLevel } from "../game/firstLevelPresentation";
import type { LevelConfig, SaveData } from "../types/game";

interface LevelSelectProps {
  save: SaveData;
  onBack: () => void;
  onStart: (level: LevelConfig) => void;
}

export function LevelSelect({ save, onBack, onStart }: LevelSelectProps) {
  return (
    <main className="screen-panel">
      <header className="screen-header">
        <div>
          <p className="eyebrow">关卡选择</p>
          <h1>免疫星图</h1>
        </div>
        <button className="secondary-button" onClick={onBack}>
          返回
        </button>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {LEVELS.map((level, index) => {
          const unlocked = level.unlocked || index < save.bestChapter;
          const playable = isPreviewPlayableLevel(level, unlocked);
          return (
            <button
              key={level.id}
              className={`level-card text-left ${playable ? "current-level-card" : "locked-card opacity-60"}`}
              disabled={!playable}
              onClick={() => onStart(level)}
            >
              <span className="text-sm font-bold text-lymph">{level.chapter}</span>
              <strong className="mt-2 block text-2xl">{level.name}</strong>
              <span className="mt-3 block min-h-16 text-sm leading-6 text-slate-600">
                {playable ? "双路线、7个免疫驻点、8波普通入侵与1个Boss波。" : level.description}
              </span>
              {playable && <span className="level-open-pill">当前测试关</span>}
              <span className="mt-5 inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">
                {getLevelStatusText(level, unlocked)}
              </span>
            </button>
          );
        })}
      </section>
    </main>
  );
}
