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

export const RARITY_MULT: Record<number, number> = { 3: 0.9, 4: 1, 5: 1.18 };
export const LEVEL_MAX = 30;
export const RANK_MAX = 5;
/** coins needed to go from level `lv` to lv + 1 */
export const levelCost = (lv: number): number => 20 + 10 * lv;
/** HP / ATK multiplier from level (+2% each) and rank (+4% each) */
export const powerMult = (lv: number, rank: number): number => (1 + 0.02 * (lv - 1)) * (1 + 0.04 * rank);

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
/** A boss changes behaviour when its HP falls to `at` (fraction of max). Phases fire once, in order. */
export interface BossPhase {
  at: number;
  label: { th: string; en: string };
  speedMul?: number;
  atkMul?: number;
  summon?: { type: string; n: number };
}

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
  /** element: takes less damage from the same element, more from its opposite (see elemMult) */
  elem?: Elem;
  /** ranged attacker: keeps walking and shoots any operator within this many tiles */
  range?: number;
  /** heals other enemies within `radius` tiles by `pct` of their max HP every `every` seconds */
  healAura?: { every: number; pct: number; radius: number };
  phases?: BossPhase[];
  /** sprite key, see sprites.ts */
  sprite: string;
}

export const ENEMIES: Record<string, EnemyDef> = {
  slime: { name: { th: 'สไลม์เงา', en: 'Shade Slime' }, hp: 700, def: 0, res: 0, speed: 0.8, atk: 90, interval: 1.5, sprite: 'slime' },
  runner: { name: { th: 'ตัววิ่ง', en: 'Dasher' }, hp: 450, def: 0, res: 0, speed: 1.6, atk: 70, interval: 1.2, sprite: 'runner' },
  shell: { name: { th: 'ตัวเกราะ', en: 'Shellback' }, hp: 1500, def: 120, res: 0, speed: 0.6, atk: 120, interval: 1.6, sprite: 'shell' },
  bat: { name: { th: 'ค้างคาวบิน', en: 'Skybat' }, hp: 500, def: 0, res: 0, speed: 1.1, atk: 0, interval: 1, flying: true, sprite: 'bat' },
  // --- new in content phase
  archer: { name: { th: 'พลธนูเงา', en: 'Shade Archer' }, hp: 600, def: 20, res: 0, speed: 0.8, atk: 110, interval: 2, range: 2.3, sprite: 'archer' },
  mender: { name: { th: 'วิญญาณรักษา', en: 'Mender Wisp' }, hp: 800, def: 30, res: 30, speed: 0.7, atk: 0, interval: 1, healAura: { every: 3, pct: 0.12, radius: 1.8 }, sprite: 'mender' },
  wraith: { name: { th: 'วิญญาณพราย', en: 'Wraith' }, hp: 900, def: 0, res: 70, speed: 1, atk: 100, interval: 1.4, sprite: 'wraith' },
  ironclad: { name: { th: 'เกราะเหล็ก', en: 'Ironclad' }, hp: 2600, def: 280, res: 0, speed: 0.5, atk: 180, interval: 1.8, sprite: 'ironclad' },
  imp: { name: { th: 'อิมป์เพลิง', en: 'Ember Imp' }, hp: 650, def: 20, res: 0, speed: 1.3, atk: 100, interval: 1.2, elem: 'ember', sprite: 'imp' },
  frostling: { name: { th: 'ตัวน้ำแข็ง', en: 'Frostling' }, hp: 1100, def: 60, res: 0, speed: 0.7, atk: 110, interval: 1.5, elem: 'frost', sprite: 'frostling' },
  sparkbat: { name: { th: 'ค้างคาวสายฟ้า', en: 'Sparkbat' }, hp: 600, def: 0, res: 0, speed: 1.3, atk: 0, interval: 1, flying: true, elem: 'volt', sprite: 'sparkbat' },
  zephyr: { name: { th: 'ตัววิ่งลม', en: 'Zephyr Dasher' }, hp: 520, def: 0, res: 0, speed: 1.9, atk: 70, interval: 1.2, elem: 'gale', sprite: 'zephyr' },
  // --- bosses
  brute: {
    name: { th: 'ยักษ์เงา', en: 'Shade Brute' }, hp: 11000, def: 170, res: 25, speed: 0.45, atk: 380, interval: 2.2, boss: true, sprite: 'brute',
    phases: [
      { at: 0.6, label: { th: 'คลุ้มคลั่ง!', en: 'Enraged!' }, speedMul: 1.5, atkMul: 1.4, summon: { type: 'slime', n: 3 } },
      { at: 0.3, label: { th: 'บ้าคลั่ง!!', en: 'Berserk!!' }, speedMul: 1.3, atkMul: 1.4, summon: { type: 'runner', n: 3 } },
    ],
  },
};

ENEMIES.queen = {
  name: { th: 'ราชินีเงา', en: 'Shade Queen' }, hp: 14000, def: 120, res: 60, speed: 0.5, atk: 260, interval: 2.4, range: 2.5, boss: true, sprite: 'queen',
  healAura: { every: 4, pct: 0.04, radius: 2.5 },
  phases: [
    { at: 0.7, label: { th: 'เรียกบริวาร!', en: 'Summons!' }, speedMul: 1.2, summon: { type: 'wraith', n: 2 } },
    { at: 0.4, label: { th: 'ไฟแห่งความมืด!', en: 'Dark Flame!' }, atkMul: 1.3, summon: { type: 'imp', n: 4 } },
    { at: 0.2, label: { th: 'บ้าคลั่ง!!', en: 'Frenzy!!' }, speedMul: 1.3, atkMul: 1.5, summon: { type: 'zephyr', n: 4 } },
  ],
};

/** Opposite pairs: ember↔frost, volt↔gale. */
export const OPPOSITE: Record<Elem, Elem> = { ember: 'frost', frost: 'ember', volt: 'gale', gale: 'volt' };
export const ELEM_WEAK = 1.5;
export const ELEM_RESIST = 0.6;

/** Damage multiplier of an attack element against an enemy element. */
export function elemMult(enemy: Elem | undefined, attack: Elem): number {
  if (!enemy) return 1;
  if (attack === enemy) return ELEM_RESIST;
  if (attack === OPPOSITE[enemy]) return ELEM_WEAK;
  return 1;
}

// ------------------------------------------------------------------ stages
export interface Stage {
  id: string;
  name: { th: string; en: string };
  cols: number;
  rows: number;
  /** g = ground (enemy path / melee), h = high ground (ranged), w = void */
  tiles: string[];
  /** main lane (lane 0) as tile coordinates, first = enemy entrance, last = base */
  path: [number, number][];
  /** optional extra lanes (lane 1, 2, ...) that end at the same base tile */
  extraPaths?: [number, number][][];
  lives: number;
  startCost: number;
  deployLimit: number;
  /** spawn timeline in seconds; `lane` defaults to 0 */
  spawns: { t: number; type: string; lane?: number }[];
}

export const stagePaths = (s: Stage): [number, number][][] => [s.path, ...(s.extraPaths ?? [])];

const wave = (t0: number, type: string, n: number, gap: number, lane = 0) =>
  Array.from({ length: n }, (_, i) => ({ t: t0 + i * gap, type, lane }));

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
    ...wave(78, 'shell', 3, 4),
    ...wave(80, 'slime', 4, 2),
  ].sort((a, b) => a.t - b.t),
};

/** Stage 1-2: two lanes that merge into one corridor before the base. */
export const STAGE_2: Stage = {
  id: '1-2',
  name: { th: 'ด่าน 1-2 · สองเลน', en: 'Stage 1-2 · Twin Lanes' },
  cols: 12,
  rows: 6,
  tiles: [
    'hhhhhhhhhhhh',
    'gggggghhhhhh',
    'hhhhhghhhhhh',
    'hhhhhggggggg',
    'gggggghhhhhh',
    'hhhhhhhhhhhh',
  ],
  path: [
    [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [5, 2], [5, 3],
    [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],
  ],
  extraPaths: [[
    [0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [5, 3],
    [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],
  ]],
  lives: 5,
  startCost: 14,
  deployLimit: 7,
  spawns: [
    ...wave(4, 'slime', 3, 2.5, 0), ...wave(5, 'slime', 3, 2.5, 1),
    ...wave(24, 'runner', 3, 2, 0), ...wave(28, 'archer', 2, 4, 1),
    ...wave(44, 'wraith', 2, 5, 0), ...wave(46, 'shell', 2, 5, 1),
    ...wave(62, 'mender', 1, 1, 0), ...wave(63, 'slime', 4, 1.5, 0), ...wave(64, 'frostling', 2, 4, 1),
    ...wave(84, 'sparkbat', 4, 2, 0), ...wave(86, 'imp', 4, 1.5, 1),
    ...wave(104, 'ironclad', 1, 1, 0), ...wave(110, 'runner', 6, 1, 1),
  ].sort((a, b) => a.t - b.t),
};

/** Stage 1-3: one long serpentine lane, ends with the first boss. */
export const STAGE_3: Stage = {
  id: '1-3',
  name: { th: 'ด่าน 1-3 · ยักษ์เงา', en: 'Stage 1-3 · The Shade Brute' },
  cols: 12,
  rows: 6,
  tiles: [
    'hhhhhhhhhhhh',
    'gggggggggghh',
    'hhhhhhhhhghh',
    'hhgggggggghh',
    'hhghhhhhhhhh',
    'hhgggggggggg',
  ],
  path: [
    [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1],
    [9, 2], [9, 3], [8, 3], [7, 3], [6, 3], [5, 3], [4, 3], [3, 3], [2, 3],
    [2, 4], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5],
  ],
  lives: 4,
  startCost: 16,
  deployLimit: 7,
  spawns: [
    ...wave(3, 'slime', 4, 2),
    ...wave(20, 'archer', 3, 3),
    ...wave(34, 'imp', 4, 1.6), ...wave(36, 'frostling', 2, 4),
    ...wave(55, 'ironclad', 1, 1), ...wave(58, 'wraith', 3, 3),
    ...wave(75, 'mender', 1, 1), ...wave(76, 'shell', 3, 3),
    ...wave(95, 'sparkbat', 6, 1.5), ...wave(100, 'zephyr', 7, 0.9), ...wave(104, 'archer', 3, 2.5),
    { t: 115, type: 'brute', lane: 0 },
    ...wave(118, 'slime', 4, 2),
  ].sort((a, b) => a.t - b.t),
};

/** Stage 1-4: the path splits around a high-ground island and rejoins. */
export const STAGE_4: Stage = {
  id: '1-4',
  name: { th: 'ด่าน 1-4 · วงแหวนกลวง', en: 'Stage 1-4 · Hollow Ring' },
  cols: 12,
  rows: 6,
  tiles: [
    'hhhhhhhhhhhh',
    'hggggggggghh',
    'gghhhhhhhggg',
    'hggggggggghh',
    'hhhhhhhhhhhh',
    'hhhhhhhhhhhh',
  ],
  path: [[0, 2], [1, 2], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [9, 2], [10, 2], [11, 2]],
  extraPaths: [[[0, 2], [1, 2], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [9, 2], [10, 2], [11, 2]]],
  lives: 5,
  startCost: 14,
  deployLimit: 7,
  spawns: [
    ...wave(4, 'slime', 3, 2.5, 0), ...wave(5, 'slime', 3, 2.5, 1),
    ...wave(22, 'archer', 2, 3, 0), ...wave(23, 'archer', 2, 3, 1),
    ...wave(40, 'imp', 4, 1.4, 0), ...wave(42, 'frostling', 2, 4, 1),
    ...wave(58, 'bat', 4, 2, 0), ...wave(59, 'bat', 4, 2, 1),
    ...wave(76, 'wraith', 2, 4, 0), ...wave(78, 'ironclad', 1, 1, 1),
    ...wave(96, 'mender', 1, 1, 0), ...wave(97, 'shell', 3, 3, 0), ...wave(100, 'zephyr', 6, 1, 1),
  ].sort((a, b) => a.t - b.t),
};

/** Stage 1-5: a cliff path with lots of void, flyers everywhere. */
export const STAGE_5: Stage = {
  id: '1-5',
  name: { th: 'ด่าน 1-5 · หน้าผาลม', en: 'Stage 1-5 · Windy Cliffs' },
  cols: 12,
  rows: 6,
  tiles: [
    'hhhhhhhhhhhh',
    'hhhhhhhggggg',
    'hhhhhhhghhhh',
    'hhhggggghhhh',
    'hhhghhhhhhww',
    'ggggwwwwwwww',
  ],
  path: [[0, 5], [1, 5], [2, 5], [3, 5], [3, 4], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [7, 2], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1]],
  lives: 5,
  startCost: 16,
  deployLimit: 7,
  spawns: [
    ...wave(8, 'bat', 3, 2.5),
    ...wave(24, 'sparkbat', 3, 2.2), ...wave(26, 'slime', 3, 3),
    ...wave(42, 'archer', 3, 2.5),
    ...wave(56, 'zephyr', 6, 0.9),
    ...wave(68, 'wraith', 3, 3), ...wave(70, 'sparkbat', 3, 2),
    ...wave(90, 'ironclad', 2, 6), ...wave(92, 'mender', 1, 1),
    ...wave(100, 'imp', 6, 1), ...wave(108, 'bat', 5, 1.5),
  ].sort((a, b) => a.t - b.t),
};

/** Stage 1-6: three lanes, high-ground rows between them. */
export const STAGE_6: Stage = {
  id: '1-6',
  name: { th: 'ด่าน 1-6 · ประตูสามบาน', en: 'Stage 1-6 · Triple Gate' },
  cols: 12,
  rows: 6,
  tiles: [
    'hhhhhhhhhhhh',
    'gggggggggghh',
    'hhhhhhhhhghh',
    'gggggggggggg',
    'hhhhhhhhhghh',
    'gggggggggghh',
  ],
  path: [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [9, 2], [9, 3], [10, 3], [11, 3]],
  extraPaths: [
    [[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3]],
    [[0, 5], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [9, 4], [9, 3], [10, 3], [11, 3]],
  ],
  lives: 5,
  startCost: 16,
  deployLimit: 8,
  spawns: [
    ...wave(4, 'slime', 2, 3, 0), ...wave(5, 'slime', 2, 3, 1), ...wave(6, 'slime', 2, 3, 2),
    ...wave(24, 'runner', 3, 1.5, 1), ...wave(26, 'archer', 2, 3, 0), ...wave(26, 'archer', 2, 3, 2),
    ...wave(44, 'shell', 2, 4, 0), ...wave(44, 'shell', 2, 4, 2), ...wave(46, 'wraith', 2, 4, 1),
    ...wave(66, 'frostling', 2, 4, 0), ...wave(66, 'imp', 3, 1.6, 2), ...wave(68, 'mender', 1, 1, 1), ...wave(70, 'slime', 3, 2, 1),
    ...wave(88, 'sparkbat', 4, 1.6, 0), ...wave(88, 'zephyr', 4, 1.2, 2), ...wave(90, 'ironclad', 1, 1, 1),
    ...wave(110, 'runner', 6, 1, 0), ...wave(112, 'bat', 4, 1.4, 1),
  ].sort((a, b) => a.t - b.t),
};

/** Stage 1-7: vertical serpentine; elemental enemies take extra damage from the opposite element. */
export const STAGE_7: Stage = {
  id: '1-7',
  name: { th: 'ด่าน 1-7 · ช่องไฟน้ำแข็ง', en: 'Stage 1-7 · Fire & Frost Vents' },
  cols: 12,
  rows: 6,
  tiles: [
    'hghggghggghh',
    'hghghghghghh',
    'hghghghghghh',
    'hghghghghggg',
    'hggghggghhhh',
    'hhhhhhhhhhhh',
  ],
  path: [
    [1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [2, 4], [3, 4], [3, 3], [3, 2], [3, 1], [3, 0], [4, 0], [5, 0],
    [5, 1], [5, 2], [5, 3], [5, 4], [6, 4], [7, 4], [7, 3], [7, 2], [7, 1], [7, 0], [8, 0], [9, 0],
    [9, 1], [9, 2], [9, 3], [10, 3], [11, 3],
  ],
  lives: 5,
  startCost: 16,
  deployLimit: 7,
  spawns: [
    ...wave(3, 'imp', 4, 2),
    ...wave(18, 'frostling', 3, 3),
    ...wave(34, 'imp', 4, 1.5), ...wave(36, 'frostling', 3, 2.5),
    ...wave(55, 'sparkbat', 4, 1.5), ...wave(57, 'zephyr', 4, 1.2),
    ...wave(75, 'mender', 2, 4), ...wave(76, 'ironclad', 1, 1),
    ...wave(92, 'archer', 3, 2), ...wave(95, 'wraith', 3, 3),
    ...wave(112, 'imp', 6, 0.9), ...wave(113, 'frostling', 4, 2),
  ].sort((a, b) => a.t - b.t),
};

/** Stage 1-8: four entrances, one base in the middle. */
export const STAGE_8: Stage = {
  id: '1-8',
  name: { th: 'ด่าน 1-8 · ป้อมกลางวง', en: 'Stage 1-8 · Central Fortress' },
  cols: 12,
  rows: 6,
  tiles: [
    'hhhhhhhhhhhh',
    'gggghhhhgggg',
    'hhhghhhhghhh',
    'hhhgggggghhh',
    'hhhghhhhghhh',
    'gggghhhhgggg',
  ],
  path: [[0, 1], [1, 1], [2, 1], [3, 1], [3, 2], [3, 3], [4, 3], [5, 3]],
  extraPaths: [
    [[11, 5], [10, 5], [9, 5], [8, 5], [8, 4], [8, 3], [7, 3], [6, 3], [5, 3]],
    [[11, 1], [10, 1], [9, 1], [8, 1], [8, 2], [8, 3], [7, 3], [6, 3], [5, 3]],
    [[0, 5], [1, 5], [2, 5], [3, 5], [3, 4], [3, 3], [4, 3], [5, 3]],
  ],
  lives: 6,
  startCost: 18,
  deployLimit: 8,
  spawns: [
    ...wave(4, 'slime', 2, 3, 0), ...wave(5, 'slime', 2, 3, 1), ...wave(6, 'slime', 2, 3, 2), ...wave(7, 'slime', 2, 3, 3),
    ...wave(24, 'runner', 3, 1.5, 0), ...wave(24, 'runner', 3, 1.5, 2), ...wave(26, 'archer', 2, 3, 1), ...wave(26, 'archer', 2, 3, 3),
    ...wave(46, 'shell', 2, 4, 1), ...wave(46, 'shell', 2, 4, 3), ...wave(48, 'wraith', 2, 4, 0), ...wave(48, 'wraith', 2, 4, 2),
    ...wave(68, 'bat', 4, 2, 0), ...wave(68, 'bat', 4, 2, 2), ...wave(70, 'imp', 4, 1.4, 1), ...wave(70, 'imp', 4, 1.4, 3),
    ...wave(90, 'mender', 1, 1, 0), ...wave(91, 'slime', 4, 1.6, 0), ...wave(92, 'ironclad', 1, 1, 2),
    ...wave(92, 'frostling', 2, 4, 1), ...wave(92, 'frostling', 2, 4, 3),
    ...wave(112, 'zephyr', 4, 1.2, 0), ...wave(112, 'zephyr', 4, 1.2, 1), ...wave(112, 'zephyr', 4, 1.2, 2), ...wave(112, 'zephyr', 4, 1.2, 3),
  ].sort((a, b) => a.t - b.t),
};

/** Stage 1-9: a long straight gauntlet with few deploy spots; healers and ranged enemies. */
export const STAGE_9: Stage = {
  id: '1-9',
  name: { th: 'ด่าน 1-9 · ช่องเขาเยือกแข็ง', en: 'Stage 1-9 · Frozen Pass' },
  cols: 12,
  rows: 6,
  tiles: [
    'hhhhwwwwhhhh',
    'hhhhhhhhhhhh',
    'gggggggggggg',
    'hhhhhhhhhhhh',
    'hhhhwwwwhhhh',
    'hhhhwwwwhhhh',
  ],
  path: [[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2]],
  lives: 4,
  startCost: 16,
  deployLimit: 7,
  spawns: [
    ...wave(3, 'frostling', 3, 3),
    ...wave(18, 'archer', 3, 2), ...wave(20, 'mender', 1, 1),
    ...wave(36, 'frostling', 4, 2.2), ...wave(38, 'slime', 4, 2),
    ...wave(54, 'ironclad', 2, 5), ...wave(56, 'wraith', 3, 3),
    ...wave(74, 'mender', 2, 5), ...wave(75, 'shell', 4, 2.5),
    ...wave(95, 'sparkbat', 5, 1.4), ...wave(97, 'zephyr', 6, 1),
    ...wave(115, 'ironclad', 2, 4), ...wave(116, 'archer', 4, 2), ...wave(120, 'frostling', 4, 2),
  ].sort((a, b) => a.t - b.t),
};

/** Stage 1-10: spiral to the throne; second boss. */
export const STAGE_10: Stage = {
  id: '1-10',
  name: { th: 'ด่าน 1-10 · บัลลังก์เงา', en: 'Stage 1-10 · Throne of Shadows' },
  cols: 12,
  rows: 6,
  tiles: [
    'gggggggggggg',
    'hhhhhhhhhhhg',
    'hggggggggghg',
    'hghhhhgggghg',
    'hghhhhhhhhhg',
    'hggggggggggg',
  ],
  path: [
    [0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0],
    [11, 1], [11, 2], [11, 3], [11, 4], [11, 5],
    [10, 5], [9, 5], [8, 5], [7, 5], [6, 5], [5, 5], [4, 5], [3, 5], [2, 5], [1, 5],
    [1, 4], [1, 3], [1, 2],
    [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2],
    [9, 3], [8, 3], [7, 3], [6, 3],
  ],
  lives: 4,
  startCost: 18,
  deployLimit: 8,
  spawns: [
    ...wave(3, 'slime', 4, 2),
    ...wave(16, 'imp', 4, 1.6), ...wave(20, 'zephyr', 3, 1.4),
    ...wave(34, 'archer', 4, 2.5),
    ...wave(50, 'frostling', 3, 3), ...wave(52, 'wraith', 3, 3),
    ...wave(70, 'sparkbat', 6, 1.3), ...wave(72, 'ironclad', 2, 5),
    ...wave(92, 'mender', 2, 4), ...wave(94, 'shell', 4, 2.5),
    ...wave(114, 'runner', 10, 0.7),
    { t: 130, type: 'queen', lane: 0 },
    ...wave(134, 'imp', 4, 1.5),
  ].sort((a, b) => a.t - b.t),
};

export const STAGES: Stage[] = [STAGE_1, STAGE_2, STAGE_3, STAGE_4, STAGE_5, STAGE_6, STAGE_7, STAGE_8, STAGE_9, STAGE_10];

export const DECK_MAX = 8;
export const DEFAULT_DECK = ['akane', 'aoi', 'sakura', 'yuki', 'murasaki', 'raika', 'wakaba', 'midori'];
