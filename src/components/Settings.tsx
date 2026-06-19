import type { SaveData } from "../types/game";

interface SettingsProps {
  save: SaveData;
  onBack: () => void;
  onChange: (save: SaveData) => void;
  onReset: () => void;
}

export function Settings({ save, onBack, onChange, onReset }: SettingsProps) {
  return (
    <main className="screen-panel">
      <header className="screen-header">
        <div>
          <p className="eyebrow">设置</p>
          <h1>游戏偏好</h1>
        </div>
        <button className="secondary-button" onClick={onBack}>
          返回
        </button>
      </header>

      <section className="max-w-2xl space-y-4">
        <label className="settings-row">
          <span>
            <strong>音效</strong>
            <small>V1.0使用文字气泡表现，后续可接入音频资源。</small>
          </span>
          <input
            type="checkbox"
            checked={save.settings.sound}
            onChange={(event) =>
              onChange({
                ...save,
                settings: { ...save.settings, sound: event.currentTarget.checked }
              })
            }
          />
        </label>

        <label className="settings-row">
          <span>
            <strong>减少动态效果</strong>
            <small>适合低性能手机或微信内置浏览器。</small>
          </span>
          <input
            type="checkbox"
            checked={save.settings.reducedMotion}
            onChange={(event) =>
              onChange({
                ...save,
                settings: { ...save.settings, reducedMotion: event.currentTarget.checked }
              })
            }
          />
        </label>

        <button className="danger-button" onClick={onReset}>
          重置本地存档
        </button>
      </section>
    </main>
  );
}
