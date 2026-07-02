export interface ClientRectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface BattleCanvasPoint {
  x: number;
  y: number;
}

export function clientPointToBattleCanvas(
  clientX: number,
  clientY: number,
  rect: ClientRectLike,
  canvasWidth: number,
  canvasHeight: number
): BattleCanvasPoint | null {
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  const localX = clientX - rect.left;
  const localY = clientY - rect.top;
  if (localX < 0 || localY < 0 || localX > rect.width || localY > rect.height) {
    return null;
  }

  return {
    x: (localX / rect.width) * canvasWidth,
    y: (localY / rect.height) * canvasHeight
  };
}
