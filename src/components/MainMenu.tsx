import type { Screen } from "../types/game";
import { PREVIEW_VERSION_LABEL } from "../game/firstLevelPresentation";

interface MainMenuProps {
  onNavigate: (screen: Screen) => void;
}

export function MainMenu({ onNavigate }: MainMenuProps) {
  return (
    <main className="home-shell min-h-screen overflow-hidden text-slate-900">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-5 sm:px-8">
        <div className="flex flex-1 flex-col justify-center gap-8 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-7">
            <div className="preview-badge">
              HTML5塔防 · 免疫防线科普
            </div>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-5xl font-black leading-tight tracking-normal text-slate-950 sm:text-7xl">
                免疫细胞大作战
              </h1>
              <div className="version-pill">
                {PREVIEW_VERSION_LABEL}
              </div>
              <p className="max-w-2xl text-lg leading-8 text-slate-700">
                部署免疫细胞，守住人体第一道防线。
              </p>
              <p className="max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                当前预览聚焦第一关闭环，后续将逐步开放更多免疫战役。
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
            <div className="text-sm text-slate-500">排行榜、更多章节与完整素材将在后续版本逐步接入。</div>
          </div>

          <div className="home-hero-panel relative min-h-[360px] rounded-[2rem] p-5">
            <div className="immune-orbit" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className="absolute inset-5 rounded-[1.5rem] bg-tissue" />
            <div className="relative flex h-full min-h-[320px] flex-col justify-between gap-5">
              <div className="hero-mission-card rounded-2xl p-5">
                <p className="eyebrow">第一章</p>
                <h2 className="text-3xl font-black">鼻腔保卫战</h2>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
                  双路线、6个免疫驻点、8波普通入侵与1个Boss波。
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {["巨噬细胞", "NK细胞"].map((name, index) => (
                  <div
                    key={name}
                    className="hero-cell-token flex min-h-28 items-center justify-center rounded-2xl text-center text-lg font-black text-slate-800"
                  >
                    <span className={`cell-token ${index === 0 ? "macrophage-token" : "nk-token"}`}>{name.replace("细胞", "")}</span>
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
