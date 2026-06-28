import Phaser from "phaser";
import { useEffect, useRef, useState, type DragEvent } from "react";
import { BATTLE_BALANCE_CONFIG } from "../configs/balanceConfig";
import { TEXT_CONFIG } from "../configs/textConfig";
import { BattleScene } from "../scenes/BattleScene";
import { BATTLE_RESTART_COMMAND, onBattleState, sendBattleCommand } from "../systems/gameBus";
import type { BattleState, CellKind, LevelConfig } from "../types/game";
import { FIRST_LEVEL_HUD_LABELS, getFirstLevelActionCells } from "./firstLevelPresentation";
import { clientPointToBattleCanvas } from "./pointerMapping";

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
  result: undefined,
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
    normalVirus: 0,
    fastVirus: 0,
    bacteria: 0,
    fluVirus: 0,
    resistantBacteria: 0,
    mutantVirus: 0,
    miniVirus: 0,
    cancerCell: 0,
    cancerKing: 0,
    mutantVirusCluster: 0
  }
};

export function GameShell({ level, soundEnabled, onExit, onSaveChanged }: GameShellProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const onSaveChangedRef = useRef(onSaveChanged);
  const draggedCellRef = useRef<CellKind | null>(null);
  const [state, setState] = useState<BattleState>(INITIAL_STATE);
  const actionCells = getFirstLevelActionCells();

  useEffect(() => {
    onSaveChangedRef.current = onSaveChanged;
  }, [onSaveChanged]);

  useEffect(() => {
    document.body.classList.add("battle-page-active");
    return () => document.body.classList.remove("battle-page-active");
  }, []);

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

  const handleDropOnCanvas = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const cell = draggedCellRef.current;
    const rect = getRenderedCanvasRect(hostRef.current);
    if (!cell || !rect) {
      return;
    }

    const point = clientPointToBattleCanvas(event.clientX, event.clientY, rect, BATTLE_BALANCE_CONFIG.canvas.width, BATTLE_BALANCE_CONFIG.canvas.height);
    if (!point) {
      return;
    }
    sendBattleCommand({ type: "select-cell", cell });
    sendBattleCommand({ type: "place-selected", x: point.x, y: point.y });
    draggedCellRef.current = null;
  };

  const placeAtClientPoint = (clientX: number, clientY: number) => {
    const rect = getRenderedCanvasRect(hostRef.current);
    if (!rect || !state.selectedCell) {
      return;
    }

    const point = clientPointToBattleCanvas(clientX, clientY, rect, BATTLE_BALANCE_CONFIG.canvas.width, BATTLE_BALANCE_CONFIG.canvas.height);
    if (point) {
      sendBattleCommand({ type: "place-selected", x: point.x, y: point.y });
    }
  };

  return (
    <main className="game-shell text-slate-950">
      <div className="landscape-warning">{TEXT_CONFIG.orientationWarning}</div>
      <section className="portrait-battle-shell mx-auto flex w-full max-w-[540px] flex-col gap-2">
        <header className="battle-hud rounded-2xl p-2">
          <div className="battle-hud-main">
            <div className="battle-hud-stats grid grid-cols-3 gap-2 text-sm font-black">
              <HudItem label={FIRST_LEVEL_HUD_LABELS[0]} value={state.tissueIntegrity} tone="text-danger" />
              <HudItem label={FIRST_LEVEL_HUD_LABELS[1]} value={state.atp} tone="text-amber-600" />
              <HudItem label={FIRST_LEVEL_HUD_LABELS[2]} value={`${state.wave}/${state.maxWave}`} tone="text-lymph" />
            </div>
            <button className="secondary-button pause-toggle-button" onClick={() => sendBattleCommand({ type: "toggle-pause" })}>
              {state.paused ? "继续" : "暂停"}
            </button>
          </div>
        </header>

        <div className="battle-canvas-frame rounded-2xl p-2">
          <div
            ref={hostRef}
            className={`phaser-host relative w-full overflow-hidden rounded-xl bg-white ${
              state.stormActive ? "storm-border" : ""
            }`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDropOnCanvas}
            onPointerUpCapture={(event) => placeAtClientPoint(event.clientX, event.clientY)}
          >
            {state.dangerLevel > 0.62 && <div className="danger-ribbon">核心器官危险</div>}
          </div>
        </div>

        <footer className="battle-action-bar grid gap-2 rounded-2xl p-2">
          <div className="cell-card-strip mx-auto grid w-full max-w-sm grid-cols-2 gap-2">
            {actionCells.map((cell) => {
              const selected = state.selectedCell === cell.kind;
              const unaffordable = state.atp < cell.cost;
              return (
                <button
                  key={cell.kind}
                  draggable
                  className={`cell-card ${selected ? "selected-card" : ""} ${unaffordable ? "unaffordable-card" : ""}`}
                  title={unaffordable ? "ATP不足，部署后会提示" : `${cell.name} ${cell.cost} ATP`}
                  onDragStart={(event) => {
                    draggedCellRef.current = cell.kind;
                    event.dataTransfer.setData("text/plain", cell.kind);
                  }}
                  onClick={() => sendBattleCommand({ type: "select-cell", cell: cell.kind })}
                >
                  <span className="cell-card-icon" style={{ backgroundColor: cell.accent }}>
                    {cell.icon && (
                      <img
                        src={cell.icon}
                        alt=""
                        draggable={false}
                        onError={(event) => {
                          event.currentTarget.hidden = true;
                        }}
                      />
                    )}
                    <span className="cell-dot" style={{ backgroundColor: cell.accent }} />
                  </span>
                  <strong>{cell.name}</strong>
                  <small>{cell.role}</small>
                  <span>{unaffordable ? `ATP不足 · ${cell.cost}` : `${cell.cost} ATP`}</span>
                </button>
              );
            })}
          </div>

          <div className="grid gap-2">
            <div className="battle-status-message rounded-xl px-4 py-2 text-sm font-bold leading-5 text-white">
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
                <button className="secondary-button" onClick={() => sendBattleCommand(BATTLE_RESTART_COMMAND)}>
                  重新开始
                </button>
                <button className="secondary-button" onClick={onExit}>
                  退出
                </button>
              </div>
            </div>
          </div>
        )}

        {state.result && (
          <div className="battle-result-actions">
            <strong className="battle-result-title">{state.result === "victory" ? "防线胜利" : "免疫防线被突破"}</strong>
            <span className="battle-result-copy">
              {state.result === "victory" ? "鼻腔保卫战完成。" : "免疫系统尽力了，重新部署，再来一把。"}
            </span>
            <div className="grid w-full grid-cols-2 gap-2">
              <button className="primary-button" onClick={() => sendBattleCommand(BATTLE_RESTART_COMMAND)}>
                再战一局
              </button>
              <button className="secondary-button" onClick={onExit}>
                返回地图
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function getRenderedCanvasRect(host: HTMLDivElement | null): DOMRect | null {
  return host?.querySelector("canvas")?.getBoundingClientRect() ?? host?.getBoundingClientRect() ?? null;
}

function HudItem({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-0.5 text-xl ${tone}`}>{value}</div>
    </div>
  );
}
