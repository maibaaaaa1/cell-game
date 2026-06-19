import type { BuffKind } from "../types/game";

export interface ActiveBuff {
  id: BuffKind;
  name: string;
  multiplier: number;
  endsAt: number;
}

export class BuffSystem {
  private readonly buffs = new Map<BuffKind, ActiveBuff>();

  add(id: BuffKind, name: string, multiplier: number, endsAt: number): void {
    const current = this.buffs.get(id);
    if (!current || current.endsAt < endsAt || current.multiplier < multiplier) {
      this.buffs.set(id, { id, name, multiplier, endsAt });
    }
  }

  reduceCooldowns(now: number, milliseconds: number): void {
    this.add("cooldownRush", "冷却减少", 1, now + milliseconds);
  }

  getMultiplier(ids: BuffKind[], now: number): number {
    this.cleanup(now);
    return ids.reduce((value, id) => value * (this.buffs.get(id)?.multiplier ?? 1), 1);
  }

  has(id: BuffKind, now: number): boolean {
    this.cleanup(now);
    return this.buffs.has(id);
  }

  list(now: number): Array<{ id: BuffKind; name: string; secondsLeft: number }> {
    this.cleanup(now);
    return [...this.buffs.values()].map((buff) => ({
      id: buff.id,
      name: buff.name,
      secondsLeft: Math.max(0, Math.ceil((buff.endsAt - now) / 1000))
    }));
  }

  clear(): void {
    this.buffs.clear();
  }

  private cleanup(now: number): void {
    for (const [id, buff] of this.buffs.entries()) {
      if (buff.endsAt <= now) {
        this.buffs.delete(id);
      }
    }
  }
}
