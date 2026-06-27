export const BATTLE_BALANCE_CONFIG = {
  canvas: {
    width: 540,
    height: 720,
    aspectRatio: 540 / 720,
    orientation: "portrait" as const
  },
  layout: {
    hudHeight: 92,
    actionBarHeight: 170,
    safePadding: 16
  },
  resources: {
    initialAtp: 180,
    initialTissueIntegrity: 20,
    atpTickMs: 5000,
    atpPerTick: 20
  },
  combat: {
    maxActiveProjectiles: 120,
    maxActiveEnemies: 80,
    stateEmitIntervalMs: 250
  }
} as const;
