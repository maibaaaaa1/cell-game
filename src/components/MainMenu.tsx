import type { Screen } from "../types/game";

interface MainMenuProps {
  onNavigate: (screen: Screen) => void;
}

export function MainMenu({ onNavigate }: MainMenuProps) {
  return (
    <main className="min-h-screen overflow-hidden bg-plasma text-slate-900">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-5 sm:px-8">
        <div className="flex flex-1 flex-col justify-center gap-8 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/80 px-4 py-2 text-sm font-semibold text-amber-700 shadow-sm">
              HTML5塔防 · 人体免疫科普
            </div>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-5xl font-black leading-tight tracking-normal text-slate-950 sm:text-7xl">
                免疫细胞大作战 V2.0
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-700">
                扮演免疫系统总司令，部署巨噬细胞、NK细胞、B细胞与T细胞，守住核心器官，边玩边理解免疫协作。
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button className="primary-button text-lg" onClick={() => onNavigate("levels")}>
                开始游戏
              </button>
              <button className="secondary-button" onClick={() => onNavigate("codex")}>
                图鉴
              </button>
              <button className="secondary-button" onClick={() => onNavigate("achievements")}>
                成就
              </button>
              <button className="secondary-button" onClick={() => onNavigate("settings")}>
                设置
              </button>
            </div>
            <div className="text-sm text-slate-500">排行榜已预留，V2.0先使用本地存档。</div>
          </div>

          <div className="relative min-h-[360px] rounded-[2rem] border border-white/80 bg-white/70 p-5 shadow-soft backdrop-blur">
            <div className="absolute inset-5 rounded-[1.5rem] bg-tissue" />
            <div className="relative grid h-full min-h-[320px] grid-cols-3 gap-3">
              {["巨噬", "树突", "NK", "B", "CD4", "CD8"].map((name, index) => (
                <div
                  key={name}
                  className="flex items-center justify-center rounded-2xl border border-white/80 bg-white/75 text-center text-lg font-black text-slate-800 shadow-sm"
                  style={{
                    transform: `translateY(${index % 2 === 0 ? 14 : -4}px)`
                  }}
                >
                  <span className="cell-token">{name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
