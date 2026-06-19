import type { BattleState, CellKind, SkillKind } from "../types/game";

type BattleCommand =
  | { type: "select-cell"; cell: CellKind }
  | { type: "place-selected"; x: number; y: number }
  | { type: "use-skill"; skill: SkillKind }
  | { type: "toggle-pause" }
  | { type: "resume" }
  | { type: "restart" };

export const gameBus = new EventTarget();

export function sendBattleCommand(command: BattleCommand): void {
  gameBus.dispatchEvent(new CustomEvent<BattleCommand>("battle-command", { detail: command }));
}

export function emitBattleState(state: BattleState): void {
  gameBus.dispatchEvent(new CustomEvent<BattleState>("battle-state", { detail: state }));
}

export function onBattleState(listener: (state: BattleState) => void): () => void {
  const wrapped = (event: Event) => listener((event as CustomEvent<BattleState>).detail);
  gameBus.addEventListener("battle-state", wrapped);
  return () => gameBus.removeEventListener("battle-state", wrapped);
}

export function onBattleCommand(listener: (command: BattleCommand) => void): () => void {
  const wrapped = (event: Event) => listener((event as CustomEvent<BattleCommand>).detail);
  gameBus.addEventListener("battle-command", wrapped);
  return () => gameBus.removeEventListener("battle-command", wrapped);
}
