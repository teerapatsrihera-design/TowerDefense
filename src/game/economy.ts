// Rules for coins, gacha, upgrades and stage rewards. Pure functions over SaveData so they are easy to test.

import { HEROES, LEVEL_MAX, RANK_MAX, levelCost } from './data';
import type { SaveData } from './save';

export const PULL_COST = 100;
export const TEN_COST = 900;
/** a 5-star is guaranteed on this pull number since the last 5-star */
export const PITY_MAX = 30;
export const RATE_5 = 0.06;
/** coins refunded for a duplicate of a hero already at max rank */
export const REFUND: Record<number, number> = { 4: 25, 5: 60 };

export interface PullResult {
  id: string;
  rarity: number;
  kind: 'new' | 'rank' | 'max';
  refund: number;
}

function pullOnce(save: SaveData, rnd: () => number): PullResult {
  save.pity++;
  const five = save.pity >= PITY_MAX || rnd() < RATE_5;
  if (five) save.pity = 0;
  const pool = HEROES.filter((h) => (five ? h.rarity >= 5 : h.rarity < 5));
  const hero = pool[Math.floor(rnd() * pool.length)];
  save.pulls++;
  if (!save.owned.includes(hero.id)) {
    save.owned.push(hero.id);
    return { id: hero.id, rarity: hero.rarity, kind: 'new', refund: 0 };
  }
  const rank = save.ranks[hero.id] ?? 0;
  if (rank < RANK_MAX) {
    save.ranks[hero.id] = rank + 1;
    return { id: hero.id, rarity: hero.rarity, kind: 'rank', refund: 0 };
  }
  const refund = REFUND[hero.rarity] ?? 20;
  save.coins += refund;
  return { id: hero.id, rarity: hero.rarity, kind: 'max', refund };
}

/** Spends coins and pulls `n` times (1 or 10). Returns null when the player cannot afford it. */
export function pull(save: SaveData, n: 1 | 10, rnd: () => number = Math.random): PullResult[] | null {
  const cost = n === 10 ? TEN_COST : PULL_COST;
  if (save.coins < cost) return null;
  save.coins -= cost;
  return Array.from({ length: n }, () => pullOnce(save, rnd));
}

export const heroLevel = (s: SaveData, id: string): number => s.levels[id] ?? 1;
export const heroRank = (s: SaveData, id: string): number => s.ranks[id] ?? 0;

/** 'ok' on success, otherwise why not. */
export function levelUp(save: SaveData, id: string): 'ok' | 'notOwned' | 'max' | 'coins' {
  if (!save.owned.includes(id)) return 'notOwned';
  const lv = heroLevel(save, id);
  if (lv >= LEVEL_MAX) return 'max';
  const cost = levelCost(lv);
  if (save.coins < cost) return 'coins';
  save.coins -= cost;
  save.levels[id] = lv + 1;
  return 'ok';
}

export interface Reward { coins: number; first: boolean }

/** Coins for winning stage `index` (0-based) with `stars`, given the best stars before this run. */
export function stageReward(index: number, stars: number, prevBest: number): Reward {
  const base = 60 + index * 15;
  const clear = Math.round(base * (0.5 + 0.25 * stars));
  const first = prevBest === 0;
  const bonus = (first ? 200 + index * 40 : 0) + Math.max(0, stars - prevBest) * 80;
  return { coins: clear + bonus, first };
}
