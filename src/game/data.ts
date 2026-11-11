// Game data: classes, skills, enemies and stages. All balance numbers live here.

import { SAMPLES } from '../data/samples';
import type { SpriteSpec } from '../art/sprite';

export type ClassKey = 'vanguard' | 'guard' | 'defender' | 'sniper' | 'caster' | 'medic' | 'supporter' | 'specialist';
/** 0 = right, 1 = down, 2 = left, 3 = up */
export type Dir = 0 | 1 | 2 | 3;
export type Elem = 'volt' | 'ember' | 'frost' | 'gale';

export interface SkillDef {
  name: { th: string; en: string };
  /** charge needed (seconds of charging) */
  sp: number;
  dur: number;
  kind: 'cost' | 'atkBuff' | 'heal' | 'blast' | 'healAll' | 'slowAll' | 'haste';
  value: number;
}

export interface ClassDef {
  deploy: 'ground' | 'high';
  hp: number;
  atk: number;
  def: number;
  res: number;
  interval: number;
  cost: number;
  block: number;
  dmg: 'phys' | 'magic' | 'heal' | 'slow';
  /** attack range tiles, written for an operator facing right */
  range: [number, number][];
  skill: SkillDef;
}

const rect = (x0: number, x1: number, y0: number, y1: number): [number, number][] => {
  const r: [number, number][] = [];
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) r.push([x, y]);
  return r;
};

export const MELEE: ClassKey[] = ['vanguard', 'guard', 'defender', 'specialist'];

export const CLASSES: Record<ClassKey, ClassDef> = {
  vanguard: { deploy: 'ground', hp: 750, atk: 170, def: 80, res: 0, interval: 1.0, cost: 9, block: 1, dmg: 'phys', range: [[1, 0]],
    skill: { name: { th: 'เร่งแต้ม', en: 'Rally' }, sp: 14, dur: 0, kind: 'cost', value: 9 } },
  guard: { deploy: 'ground', hp: 1000, atk: 260, def: 100, res: 0, interval: 1.1, cost: 13, block: 2, dmg: 'phys', range: [[1, 0], [2, 0]],
    skill: { name: { th: 'ฟันหนัก', en: 'Power Strike' }, sp: 18, dur: 6, kind: 'atkBuff', value: 2 } },
  defender: { deploy: 'ground', hp: 2000, atk: 120, def: 300, res: 10, interval: 1.4, cost: 17, block: 3, dmg: 'phys', range: [[1, 0]],
    skill: { name: { th: 'ฟื้นฟูตน', en: 'Recover' }, sp: 20, dur: 0, kind: 'heal', value: 0.5 } },
  sniper: { deploy: 'high', hp: 650, atk: 330, def: 50, res: 0, interval: 1.3, cost: 12, block: 0, dmg: 'phys', range: rect(1, 4, -1, 1),
    skill: { name: { th: 'ยิงรัว', en: 'Burst Fire' }, sp: 20, dur: 5, kind: 'atkBuff', value: 1.9 } },
  caster: { deploy: 'high', hp: 600, atk: 340, def: 40, res: 10, interval: 1.6, cost: 15, block: 0, dmg: 'magic', range: rect(1, 3, -1, 1),
    skill: { name: { th: 'ระเบิดเวท', en: 'Arcane Blast' }, sp: 22, dur: 0, kind: 'blast', value: 2.4 } },
  medic: { deploy: 'high', hp: 650, atk: 230, def: 40, res: 10, interval: 1.8, cost: 13, block: 0, dmg: 'heal', range: rect(-1, 2, -1, 1),
    skill: { name: { th: 'ฟื้นฟูหมู่', en: 'Mass Heal' }, sp: 22, dur: 0, kind: 'healAll', value: 1.4 } },
  supporter: { deploy: 'high', hp: 700, atk: 140, def: 40, res: 20, interval: 1.5, cost: 12, block: 0, dmg: 'slow', range: rect(1, 3, -1, 1),
    skill: { name: { th: 'หน่วงหมู่', en: 'Mass Slow' }, sp: 20, dur: 6, kind: 'slowAll', value: 0.45 } },
  specialist: { deploy: 'ground', hp: 800, atk: 230, def: 60, res: 0, interval: 0.6, cost: 11, block: 1, dmg: 'phys', range: [[1, 0]],
    skill: { name: { th: 'เร่งฟัน', en: 'Frenzy' }, sp: 16, dur: 6, kind: 'haste', value: 2 } },
};

const CLASS_BY_ROLE: Record<string, ClassKey> = {
  Vanguard: 'vanguard', Guard: 'guard', Defender: 'defender', Sniper: 'sniper',
  Caster: 'caster', Medic: 'medic', Supporter: 'supporter', Specialist: 'specialist',
};

export interface Hero {
  id: string;
  name: { th: string; en: string };
  role: { th: string; en: string };
  elem: Elem;
  color: string;
  rarity: number;
  spec: SpriteSpec;
  cls: ClassKey;
}

export const HEROES: Hero[] = SAMPLES.map((c) => ({
  id: c.id,
  name: c.name,
  role: c.role,
  elem: c.element.en.toLowerCase() as Elem,
  color: c.element.color,
  rarity: c.rarity,
  spec: c.spec,
  cls: CLASS_BY_ROLE[c.role.en],
}));

export const heroById = (id: string): Hero => {
  const h = HEROES.find((x) => x.id === id);
  if (!h) throw new Error('unknown hero ' + id);
  return h;
};

/** Rotates an offset written for "facing right" to the given facing. */
export function rotate([dx, dy]: [number, number], f: Dir): [number, number] {
  switch (f) {
    case 0: return [dx, dy];
    case 1: return [-dy, dx];
    case 2: return [-dx, -dy];
    default: return [dy, -dx];
  }
}

// ------------------------------------------------------------------ enemies
export interface EnemyDef {
  name: { th: string; en: string };
  hp: number;
  def: number;
  res: number;
  /** tiles per second */
  speed: number;
  atk: number;
  interval: number;
  flying?: boolean;
  boss?: boolean;
  /** 12-wide ascii sprite, see sprites.ts */
  sprite: string;
}

export const ENEMIES: Record<string, EnemyDef> = {
  slime: { name: { th: 'สไลม์เงา', en: 'Shade Slime' }, hp: 700, def: 0, res: 0, speed: 0.8, atk: 90, interval: 1.5, sprite: 'slime' },
  runner: { name: { th: 'ตัววิ่ง', en: 'Dasher' }, hp: 450, def: 0, res: 0, speed: 1.6, atk: 70, interval: 1.2, sprite: 'runner' },
  shell: { name: { th: 'ตัวเกราะ', en: 'Shellback' }, hp: 1500, def: 120, res: 0, speed: 0.6, atk: 120, interval: 1.6, sprite: 'shell' },
  bat: { name: { th: 'ค้างคาวบิน', en: 'Skybat' }, hp: 500, def: 0, res: 0, speed: 1.1, atk: 0, interval: 1, flying: true, sprite: 'bat' },
  brute: { name: { th: 'ยักษ์เงา', en: 'Shade Brute' }, hp: 7000, def: 150, res: 20, speed: 0.45, atk: 350, interval: 2.2, boss: true, sprite: 'brute' },
};

// ------------------------------------------------------------------ stages
export interface Stage {
  id: string;
  name: { th: string; en: string };
  cols: number;
  rows: number;
  /** g = ground (enemy path / melee), h = high ground (ranged), w = void */
  tiles: string[];
  path: [number, number][];
  lives: number;
  startCost: number;
  deployLimit: number;
  /** spawn timeline in seconds */
  spawns: { t: number; type: string }[];
}

const wave = (t0: number, type: string, n: number, gap: number) =>
  Array.from({ length: n }, (_, i) => ({ t: t0 + i * gap, type }));

export const STAGE_1: Stage = {
  id: '1-1',
  name: { th: 'ด่าน 1-1 · ทางเดินแรก', en: 'Stage 1-1 · First Path' },
  cols: 12,
  rows: 6,
  tiles: [
    'hhhhhhhhhhhh',
    'hhhhhhhhhhhh',
    'ggggghhhgggg',
    'hhhhghhhghhh',
    'hhhhggggghhh',
    'wwhhhhhhhhww',
  ],
  path: [
    [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [4, 3], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4],
    [8, 3], [8, 2], [9, 2], [10, 2], [11, 2],
  ],
  lives: 5,
  startCost: 14,
  deployLimit: 6,
  spawns: [
    ...wave(4, 'slime', 4, 2.4),
    ...wave(26, 'slime', 5, 1.8),
    ...wave(30, 'runner', 3, 2.2),
    ...wave(52, 'shell', 2, 5),
    ...wave(54, 'runner', 5, 1.4),
    ...wave(60, 'bat', 3, 2.5),
    { t: 78, type: 'brute' },
    ...wave(80, 'slime', 4, 2),
  ].sort((a, b) => a.t - b.t),
};

export const DEFAULT_DECK = ['akane', 'aoi', 'sakura', 'yuki', 'murasaki', 'raika', 'wakaba', 'midori'];
