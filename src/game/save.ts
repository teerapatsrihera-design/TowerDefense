// Persistent player data. Stored in localStorage (per browser, works on GitHub Pages) and portable via a text code.

import { DECK_MAX, DEFAULT_DECK, HEROES, LEVEL_MAX, RANK_MAX, STAGES } from './data';
import type { Lang } from './i18n';

export interface SaveData {
  v: 1;
  lang: Lang;
  muted: boolean;
  /** best stars per stage id (1-3). Missing = never cleared */
  stars: Record<string, number>;
  /** hero ids brought into battle (always owned) */
  deck: string[];
  coins: number;
  /** hero ids the player has recruited */
  owned: string[];
  levels: Record<string, number>;
  /** duplicate pulls: 0..RANK_MAX */
  ranks: Record<string, number>;
  /** pulls since the last 5-star */
  pity: number;
  pulls: number;
  /** true once the stage 1-1 tutorial was finished or skipped */
  tutDone: boolean;
}

export const START_COINS = 600;

const KEY = 'stellar-bloom-save-v1';

export const defaultSave = (): SaveData => ({
  v: 1, lang: 'th', muted: false, stars: {}, deck: [...DEFAULT_DECK],
  coins: START_COINS, owned: [...DEFAULT_DECK], levels: {}, ranks: {}, pity: 0, pulls: 0, tutDone: false,
});

const isHero = (x: unknown): x is string => typeof x === 'string' && HEROES.some((h) => h.id === x);
const num = (x: unknown, lo: number, hi: number, fallback: number): number => {
  const n = Math.floor(Number(x));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
};

/** Accepts anything (parsed JSON, imported code) and returns a safe SaveData. */
export function sanitize(raw: unknown): SaveData {
  const d = defaultSave();
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Record<string, unknown>;
  if (r.lang === 'th' || r.lang === 'en') d.lang = r.lang;
  if (typeof r.muted === 'boolean') d.muted = r.muted;
  if (r.stars && typeof r.stars === 'object') {
    for (const s of STAGES) {
      const n = Number((r.stars as Record<string, unknown>)[s.id]);
      if (n >= 1 && n <= 3) d.stars[s.id] = Math.floor(n);
    }
  }
  const deckIds = Array.isArray(r.deck) ? [...new Set(r.deck.filter(isHero))] : [];
  if (Array.isArray(r.owned)) d.owned = [...new Set(r.owned.filter(isHero))];
  else d.owned = [...new Set([...DEFAULT_DECK, ...deckIds])]; // save from before recruiting existed
  if (d.owned.length === 0) d.owned = [...DEFAULT_DECK];
  const deck = deckIds.filter((id) => d.owned.includes(id)).slice(0, DECK_MAX);
  d.deck = deck.length > 0 ? deck : d.owned.slice(0, DECK_MAX);
  d.coins = num(r.coins, 0, 99_999_999, START_COINS);
  // saves from before the tutorial existed: anyone who already cleared a stage does not need it
  d.tutDone = typeof r.tutDone === 'boolean' ? r.tutDone : Object.keys(d.stars).length > 0;
  d.pity = num(r.pity, 0, 1000, 0);
  d.pulls = num(r.pulls, 0, 99_999_999, 0);
  for (const id of d.owned) {
    const lv = num((r.levels as Record<string, unknown> | undefined)?.[id], 1, LEVEL_MAX, 1);
    const rk = num((r.ranks as Record<string, unknown> | undefined)?.[id], 0, RANK_MAX, 0);
    if (lv > 1) d.levels[id] = lv;
    if (rk > 0) d.ranks[id] = rk;
  }
  return d;
}

export function loadSave(): SaveData {
  try {
    const s = localStorage.getItem(KEY);
    if (s) return sanitize(JSON.parse(s));
  } catch { /* storage blocked or corrupt: start fresh */ }
  // first visit: pick the language from the browser
  const d = defaultSave();
  if (typeof navigator !== 'undefined') d.lang = /^th/i.test(navigator.language) ? 'th' : 'en';
  return d;
}

/** Returns false if the browser refused to store (private mode, quota). */
export function writeSave(d: SaveData): boolean {
  try { localStorage.setItem(KEY, JSON.stringify(d)); return true; } catch { return false; }
}

export function clearSave(): SaveData {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  return loadSave();
}

export const exportCode = (d: SaveData): string => 'SB1.' + btoa(JSON.stringify(d));

/** Returns null when the code is not a valid save. */
export function importCode(code: string): SaveData | null {
  const s = code.trim();
  if (!s.startsWith('SB1.')) return null;
  try { return sanitize({ lang: 'th', ...JSON.parse(atob(s.slice(4))) }); } catch { return null; }
}

export const stageUnlocked = (d: SaveData, index: number): boolean => index === 0 || (d.stars[STAGES[index - 1].id] ?? 0) > 0;
export const totalStars = (d: SaveData): number => Object.values(d.stars).reduce((a, b) => a + b, 0);
