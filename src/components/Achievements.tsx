import { ACHIEVEMENTS } from "../configs/achievements";
import type { SaveData } from "../types/game";

interface AchievementsProps {
  save: SaveData;
  onBack: () => void;
}

export function Achievements({ save, onBack }: AchievementsProps) {
  return (
    <main className="screen-panel">
      <header className="screen-header">
        <div>
          <p className="eyebrow">成就</p>
          <h1>免疫荣誉墙</h1>
        </div>
        <button className="secondary-button" onClick={onBack}>
          返回
        </button>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        {ACHIEVEMENTS.map((achievement) => {
          const unlocked = save.achievements.includes(achievement.id);
          return (
            <article key={achievement.id} className={`info-card ${unlocked ? "" : "locked-card"}`}>
              <span className="text-xs font-black text-cytokine">{unlocked ? "已获得" : "进行中"}</span>
              <h2 className="mt-2 text-2xl font-black">{achievement.name}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{achievement.description}</p>
            </article>
          );
        })}
      </section>
    </main>
  );
}
