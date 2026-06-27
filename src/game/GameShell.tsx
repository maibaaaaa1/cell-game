import Phaser from "phaser";
import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { BATTLE_BALANCE_CONFIG } from "../configs/balanceConfig";
import { CELL_CONFIGS, CELL_ORDER } from "../configs/cells";
import { SKILL_CONFIGS, SKILL_ORDER } from "../configs/skills";
import { TEXT_CONFIG } from "../configs/textConfig";
import { BattleScene } from "../scenes/BattleScene";
import { onBattleState, sendBattleCommand } from "../systems/gameBus";
import type { BattleState, CellKind, LevelConfig } from "../types/game";

interface GameShellProps {
  level: LevelConfig;
  soundEnabled: boolean;
  onExit: () => void;
  onSaveChanged: () => void;
}

const INITIAL_STATE: BattleState = {
  life: 20,
  tissueIntegrity: 20,
  atp: 180,
  wave: 0,
  maxWave: 20,
  feverTemperature: 37,
  paused: false,
  pauseMenuOpen: false,
  message: "加载免疫战场中。",
  combo: 0,
  comboTier: "none",
  stormActive: false,
  dangerLevel: 0,
  activeBuffs: [],
  skillCooldowns: {
    fever: 0,
    vaccine: 0,
    cart: 0
  },
  kills: {
    bacteria: 0,
    fluVirus: 0,
    resistantBacteria: 0,
    mutantVirus: 0,
    miniVirus: 0,
    cancerCell: 0,
    cancerKing: 0
  }
};

export function GameShell({ level, soundEnabled, onExit, onSaveChanged }: GameShellProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const onSaveChangedRef = useRef(onSaveChanged);
  const draggedCellRef = useRef<CellKind | null>(null);
  const [state, setState] = useState<BattleState>(INITIAL_STATE);

  useEffect(() => {
    onSaveChangedRef.current = onSaveChanged;
  }, [onSaveChanged]);

  useEffect(() => {
    return onBattleState(setState);
  }, []);

  useEffect(() => {
    if (!hostRef.current || gameRef.current) {
      return;
    }

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: hostRef.current,
      width: BATTLE_BALANCE_CONFIG.canvas.width,
      height: BATTLE_BALANCE_CONFIG.canvas.height,
      backgroundColor: "#f8fbff",
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      render: {
        antialias: true,
        pixelArt: false
      },
      scene: [new BattleScene(level, () => onSaveChangedRef.current(), soundEnabled)]
    });

    gameRef.current = game;

    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
  }, [level, soundEnabled]);

  const totalKills = useMemo(
    () => Object.values(state.kills).reduce<number>((sum, value) => sum + value, 0),
    [state.kills]
  );

  const handleDropOnCanvas = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const cell = draggedCellRef.current;
    const rect = hostRef.current?.getBoundingClientRect();
    if (!cell || !rect) {
      return;
    }

    const x = ((event.clientX - rect.left) / rect.width) * BATTLE_BALANCE_CONFIG.canvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * BATTLE_BALANCE_CONFIG.canvas.height;
    sendBattleCommand({ type: "select-cell", cell });
    sendBattleCommand({ type: "place-selected", x, y });
    draggedCellRef.current = null;
  };

  const placeAtClientPoint = (clientX: number, clientY: number) => {
    const rect = hostRef.current?.getBoundingClientRect();
    if (!rect || !state.selectedCell) {
      return;
    }

    const x = ((clientX - rect.left) / rect.width) * BATTLE_BALANCE_CONFIG.canvas.width;
    const y = ((clientY - rect.top) / rect.height) * BATTLE_BALANCE_CONFIG.canvas.height;
    sendBattleCommand({ type: "place-selected", x, y });
  };

  return (
    <main className="game-shell min-h-screen px-3 py-3 text-slate-950">
      <div className="landscape-warning">{TEXT_CONFIG.orientationWarning}</div>
      <section className="portrait-battle-shell mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-[540px] flex-col gap-2">
        <header className="battle-hud grid gap-2 rounded-2xl border border-white/80 bg-white/90 p-2 shadow-soft">
          <div className="grid grid-cols-3 gap-2 text-sm font-black">
            <HudItem label="组织耐久" value={state.tissueIntegrity} tone="text-danger" />
            <HudItem label="ATP能量" value={state.atp} tone="text-amber-600" />
            <HudItem label="当前波次" value={`${state.wave}/${state.maxWave}`} tone="text-lymph" />
            <HudItem label="Combo" value={state.combo > 1 ? `x${state.combo}` : "-"} tone={state.combo >= 10 ? "text-orange-600" : "text-cyan-700"} />
            <HudItem label="体温" value={`${state.feverTemperature.toFixed(1)}℃`} tone="text-rose-600" />
            <HudItem label="击杀" value={totalKills} tone="text-emerald-600" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="secondary-button min-h-10 px-4" onClick={() => sendBattleCommand({ type: "toggle-pause" })}>
              {state.paused ? "继续" : "暂停"}
            </button>
            <button className="secondary-button min-h-10 px-4" onClick={() => sendBattleCommand({ type: "restart" })}>
              重新开始
            </button>
            <button className="secondary-button min-h-10 px-4" onClick={onExit}>
              退出
            </button>
          </div>
        </header>

        <div className="battle-canvas-frame rounded-2xl border border-white/80 bg-white/70 p-2 shadow-soft">
          <div
            ref={hostRef}
            className={`phaser-host relative w-full overflow-hidden rounded-xl bg-white ${
              state.stormActive ? "storm-border" : ""
            }`}
            style={{ aspectRatio: `${BATTLE_BALANCE_CONFIG.canvas.width} / ${BATTLE_BALANCE_CONFIG.canvas.height}` }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDropOnCanvas}
            onPointerUpCapture={(event) => placeAtClientPoint(event.clientX, event.clientY)}
          >
            {state.dangerLevel > 0.62 && <div className="danger-ribbon">核心器官危险</div>}
          </div>
        </div>

        <footer className="battle-action-bar grid gap-2 rounded-2xl border border-white/80 bg-white/90 p-2 shadow-soft">
          <div className="cell-card-strip grid grid-cols-3 gap-2">
            {CELL_ORDER.map((kind) => {
              const cell = CELL_CONFIGS[kind];
              const selected = state.selectedCell === kind;
              return (
                <button
                  key={kind}
                  draggable
                  className={`cell-card ${selected ? "selected-card" : ""}`}
                  onDragStart={(event) => {
                    draggedCellRef.current = kind;
                    event.dataTransfer.setData("text/plain", kind);
                  }}
                  onClick={() => sendBattleCommand({ type: "select-cell", cell: kind })}
                >
                  <span className="cell-dot" style={{ backgroundColor: cell.accent }} />
                  <strong>{cell.name}</strong>
                  <small>{cell.role}</small>
                  <span>{cell.cost} ATP</span>
                </button>
              );
            })}
          </div>

          <div className="grid gap-2">
            <div className="grid grid-cols-3 gap-2">
              {SKILL_ORDER.map((skill) => {
                const config = SKILL_CONFIGS[skill];
                const cooldown = state.skillCooldowns[skill];
                return (
                  <button
                    key={skill}
                    className="skill-button"
                    disabled={cooldown > 0}
                    onClick={() => sendBattleCommand({ type: "use-skill", skill })}
                    title={config.description}
                  >
                    <strong>{config.name}</strong>
                    <span>{cooldown > 0 ? `${cooldown}s` : "可用"}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex min-h-8 flex-wrap gap-2">
              {state.stormActive && <span className="buff-pill storm-pill">免疫风暴</span>}
              {state.activeBuffs.map((buff) => (
                <span key={buff.id} className="buff-pill">
                  {buff.name} {buff.secondsLeft}s
                </span>
              ))}
            </div>
            <div className="min-h-12 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold leading-6 text-white">
              {level.chapter} · {level.name}：{state.message}
            </div>
          </div>
        </footer>

        {state.pauseMenuOpen && (
          <div className="pause-menu">
            <div className="pause-panel">
              <p className="eyebrow">暂停</p>
              <h2>免疫指挥室</h2>
              <p>调整节奏，观察敌人压力，再打出清屏连击。</p>
              <div className="grid gap-2 sm:grid-cols-3">
                <button className="primary-button" onClick={() => sendBattleCommand({ type: "resume" })}>
                  继续战斗
                </button>
                <button className="secondary-button" onClick={() => sendBattleCommand({ type: "restart" })}>
                  重新开始
                </button>
                <button className="secondary-button" onClick={onExit}>
                  退出
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function HudItem({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-0.5 text-xl ${tone}`}>{value}</div>
    </div>
  );
}
