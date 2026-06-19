import { RANDOM_EVENTS } from "../configs/events";
import type { RandomEventConfig } from "../types/game";

export class RandomEventSystem {
  pick(): RandomEventConfig {
    const index = Math.floor(Math.random() * RANDOM_EVENTS.length);
    return RANDOM_EVENTS[index] ?? RANDOM_EVENTS[0];
  }
}
