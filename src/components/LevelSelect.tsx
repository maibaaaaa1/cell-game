import { LEVELS } from "../configs/levels";
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
          <h1>人体防线地图</h1>
        </div>
        <button className="secondary-button" onClick={onBack}>
          返回
        </button>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {LEVELS.map((level, index) => {
          const unlocked = level.unlocked || index < save.bestChapter;
          return (
            <button
              key={level.id}
              className={`level-card text-left ${unlocked ? "" : "opacity-55"}`}
              disabled={!unlocked}
              onClick={() => onStart(level)}
            >
              <span className="text-sm font-bold text-lymph">{level.chapter}</span>
              <strong className="mt-2 block text-2xl">{level.name}</strong>
              <span className="mt-3 block min-h-16 text-sm leading-6 text-slate-600">{level.description}</span>
              <span className="mt-5 inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">
                {unlocked ? "可挑战 · 20波" : "后续解锁"}
              </span>
            </button>
          );
        })}
      </section>
    </main>
  );
}
