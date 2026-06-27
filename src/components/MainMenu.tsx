import type { Screen } from "../types/game";
import { PREVIEW_VERSION_LABEL } from "../game/firstLevelPresentation";

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
                免疫细胞大作战
              </h1>
              <div className="inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white shadow-soft">
                {PREVIEW_VERSION_LABEL}
              </div>
              <p className="max-w-2xl text-lg leading-8 text-slate-700">
                扮演免疫系统总司令，在鼻腔黏膜第一道防线部署巨噬细胞与NK细胞，完成第一关手机试玩验收。
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
            <div className="text-sm text-slate-500">当前预览聚焦第一关闭环，排行榜仍为后续预留。</div>
          </div>

          <div className="relative min-h-[360px] rounded-[2rem] border border-white/80 bg-white/70 p-5 shadow-soft backdrop-blur">
            <div className="absolute inset-5 rounded-[1.5rem] bg-tissue" />
            <div className="relative flex h-full min-h-[320px] flex-col justify-between gap-5">
              <div className="rounded-2xl border border-cyan-100 bg-white/85 p-5 shadow-sm">
                <p className="eyebrow">第一章</p>
                <h2 className="text-3xl font-black">鼻腔保卫战</h2>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
                  双路线、7个免疫驻点、8波普通入侵与1个Boss波。
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {["巨噬细胞", "NK细胞"].map((name) => (
                  <div
                    key={name}
                    className="flex min-h-28 items-center justify-center rounded-2xl border border-white/80 bg-white/85 text-center text-lg font-black text-slate-800 shadow-sm"
                  >
                    <span className="cell-token">{name.replace("细胞", "")}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
