export interface DeploySlotHitArea {
  id: string;
  x: number;
  y: number;
  radius: number;
}

export const DEPLOY_SLOT_VISUAL_RADIUS = 24;
export const DEPLOY_SLOT_MIN_HIT_RADIUS = 40;

export function getDeploySlotHitRadius(slot: DeploySlotHitArea): number {
  return Math.max(slot.radius * 1.35, DEPLOY_SLOT_MIN_HIT_RADIUS);
}

export function findDeploySlotAtPoint(slots: DeploySlotHitArea[], x: number, y: number): DeploySlotHitArea | null {
  return slots.find((slot) => Math.hypot(x - slot.x, y - slot.y) <= getDeploySlotHitRadius(slot)) ?? null;
}
