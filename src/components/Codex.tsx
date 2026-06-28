import { CODEX_ENTRIES } from "../configs/codex";
import type { SaveData } from "../types/game";
import { useState } from "react";

interface CodexProps {
  save: SaveData;
  onBack: () => void;
}

export function Codex({ save, onBack }: CodexProps) {
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const activeEntry = CODEX_ENTRIES.find((entry) => entry.id === activeEntryId);

  return (
    <main className="screen-panel">
      <header className="screen-header">
        <div>
          <p className="eyebrow">图鉴</p>
          <h1>免疫知识库</h1>
        </div>
        <button className="secondary-button" onClick={onBack}>
          返回
        </button>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {CODEX_ENTRIES.map((entry) => {
          const unlocked = save.unlockedCodex.includes(entry.id);
          return (
            <button
              key={entry.id}
              className={`info-card text-left ${unlocked ? "hover:-translate-y-1" : "locked-card"}`}
              onClick={() => unlocked && setActiveEntryId(entry.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-black text-lymph">{unlocked ? entry.type : "未解锁"}</span>
                  <h2 className="mt-1 text-xl font-black">{unlocked ? entry.name : "？？？"}</h2>
                </div>
                <div
                  className="codex-avatar h-11 w-11 rounded-full bg-tissue shadow-inner"
                  style={{ backgroundColor: unlocked && entry.fallbackColor !== undefined ? `#${entry.fallbackColor.toString(16).padStart(6, "0")}` : undefined }}
                >
                  {unlocked && entry.icon && (
                    <img
                      src={entry.icon}
                      alt=""
                      draggable={false}
                      onError={(event) => {
                        event.currentTarget.hidden = true;
                      }}
                    />
                  )}
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                {unlocked ? entry.description : "在战斗中部署或击败对应目标后自动记录。"}
              </p>
              {unlocked && (
                <>
                  <p className="mt-3 text-sm font-bold text-slate-800">弱点/能力：{entry.weakness}</p>
                  <p className="mt-3 text-sm leading-6 text-slate-600">健康知识：{entry.healthTip}</p>
                </>
              )}
            </button>
          );
        })}
      </section>

      {activeEntry && save.unlockedCodex.includes(activeEntry.id) && (
        <div className="pause-menu" onClick={() => setActiveEntryId(null)}>
          <article className="pause-panel" onClick={(event) => event.stopPropagation()}>
            <p className="eyebrow">{activeEntry.type}</p>
            <h2>{activeEntry.name}</h2>
            <p>{activeEntry.description}</p>
            <p>
              <strong>弱点/能力：</strong>
              {activeEntry.weakness}
            </p>
            <p>
              <strong>健康知识：</strong>
              {activeEntry.healthTip}
            </p>
            <button className="primary-button" onClick={() => setActiveEntryId(null)}>
              收起
            </button>
          </article>
        </div>
      )}
    </main>
  );
}
