import type Phaser from "phaser";
import { ATPSystem } from "./ATPSystem";
import { BattleLoopSystem } from "./BattleLoopSystem";
import { BossSystem } from "./BossSystem";
import { CellSystem } from "./CellSystem";
import { DamageSystem } from "./DamageSystem";
import { EffectSystem } from "./EffectSystem";
import { EnemySystem } from "./EnemySystem";
import { FeedbackSystem } from "./FeedbackSystem";
import { FeverSystem } from "./FeverSystem";
import { ProjectileSystem } from "./ProjectileSystem";
import { SkillSystem } from "./SkillSystem";
import { TargetingSystem } from "./TargetingSystem";
import { TutorialSystem } from "./TutorialSystem";
import { WaveSystem } from "./WaveSystem";

export function createBattleLoop(scene: Phaser.Scene, waves: WaveSystem): BattleLoopSystem {
  return new BattleLoopSystem([
    new ATPSystem(),
    new FeverSystem(),
    waves,
    new EnemySystem(),
    new BossSystem(),
    new CellSystem(),
    new TargetingSystem(),
    new DamageSystem(),
    new ProjectileSystem(),
    new SkillSystem(),
    new EffectSystem(scene),
    new FeedbackSystem(),
    new TutorialSystem()
  ]);
}
