export const BATTLE_BALANCE_CONFIG = {
  canvas: {
    width: 540,
    height: 960,
    aspectRatio: 540 / 960,
    orientation: "portrait" as const
  },
  layout: {
    hudHeight: 92,
    actionBarHeight: 170,
    safePadding: 16
  },
  resources: {
    initialAtp: 120,
    maxAtp: 220,
    initialTissueIntegrity: 100,
    atpTickMs: 1000,
    atpPerTick: 2.5,
    atpPerSecond: 2.5,
    firstLevelEnemyRewards: {
      normalVirus: 3,
      fastVirus: 4,
      miniVirus: 2,
      bacteria: 5
    }
  },
  combat: {
    maxActiveProjectiles: 120,
    maxActiveEnemies: 80,
    stateEmitIntervalMs: 250,
    defaultGameSpeed: 1,
    firstLevelSpeedMultiplier: 0.9,
    firstLevelInitialPreparationMs: 8000,
    firstLevelSpawnIntervalMs: 1600,
    firstLevelNormalPreparationMs: 2500,
    firstLevelBossPreparationMs: 10000,
    firstLevelWaveAdvanceEnemyThreshold: 1,
    firstLevelCellTuning: {
      nkDamageMultiplier: 0.72,
      nkAttackRateMultiplier: 0.72
    },
    firstLevelBossDamageTaken: {
      nk: 0.65,
      macrophage: 0.85
    }
  }
} as const;
