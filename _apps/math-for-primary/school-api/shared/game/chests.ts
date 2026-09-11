import { Rng } from '../engine/random';
import { CATALOG } from './store';

/**
 * Treasure chests. They appear at meaningful moments (every few lessons on
 * the map, after a challenge, when all daily quests are done, when skills
 * are mastered) — never on a timer, and never for sale.
 */
export type ChestSource = 'path' | 'quests' | 'challenge' | 'mastery' | 'streak' | 'level';

export interface ChestRecord {
  id: string;
  source: ChestSource;
  createdAt: number;
  rare: boolean;
}

export type ChestReward = { kind: 'gems'; amount: number } | { kind: 'item'; itemId: string };

export const CHEST_LABEL: Record<ChestSource, string> = {
  path: 'Map treasure',
  quests: 'Quest chest',
  challenge: 'Challenge chest',
  mastery: 'Mastery chest',
  streak: 'Streak chest',
  level: 'Level-up chest',
};

/**
 * What is inside. Deterministic for a seed so a chest cannot be "re-rolled"
 * by closing the app. Items are only offered if the child does not own them.
 */
export function chestContents(chest: ChestRecord, owned: readonly string[], seed: number): ChestReward[] {
  const rng = new Rng(seed);
  const rewards: ChestReward[] = [{ kind: 'gems', amount: chest.rare ? rng.int(25, 40) : rng.int(10, 25) }];
  const pool = CATALOG.filter((i) => !owned.includes(i.id) && (i.chestOnly || i.slot === 'sticker'));
  const itemChance = chest.rare ? 1 : 0.4;
  if (pool.length && rng.chance(itemChance)) rewards.push({ kind: 'item', itemId: rng.pick(pool).id });
  return rewards;
}

export function newChest(source: ChestSource, at: number, index: number): ChestRecord {
  return { id: `${source}-${at}-${index}`, source, createdAt: at, rare: source === 'challenge' || source === 'mastery' };
}
