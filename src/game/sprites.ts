// Small pixel sprites for enemies (ASCII maps) and a cache for operator sprites.

import { drawSprite } from '../art/sprite';
import type { Hero } from './data';

const PAL: Record<string, string> = {
  o: '#26173a', k: '#26173a', w: '#fbf4e6',
  g: '#b07fa6', G: '#8a5f86', // slime
  r: '#c8404f', R: '#9a2f48', // runner
  s: '#7a6a8a', S: '#54396a', y: '#d9a640', // shell
  b: '#6e5a8a', B: '#4a3a6a', // bat
  d: '#54396a', D: '#3a2650', e: '#e8924a', // brute
};

const MAPS: Record<string, string[]> = {
  slime: [
    '....oooo....',
    '..ooggggoo..',
    '.oggggggggo.',
    '.owkggggwkgo',
    'oggggggggggo',
    'ogggkkkkgggo',
    'ogggggggGGgo',
    '.oggggGGGGo.',
    '..oooooooo..',
  ],
  runner: [
    '..o......o..',
    '.oro....oro.',
    '.orroooorro.',
    '.orrrrrrrro.',
    'orwkrrrrwkro',
    'orrrrrrrrrro',
    'orrRRkkRRrro',
    '.orrRRRRrro.',
    '.oo.oooo.oo.',
  ],
  shell: [
    '...oooooo...',
    '..osyssysso.',
    '.ossssssssso',
    'osSssSssSsso',
    'ossssssssSso',
    'owkooooowkoo',
    'ossoooooosso',
    '.osoyyyyoso.',
    '..oo.oo.oo..',
  ],
  bat: [
    'o..........o',
    'oo........oo',
    'obo..oo..obo',
    'obboooooobbo',
    'obbbwkbwkbbo',
    '.obbbbbbbbo.',
    '..obbBBbbo..',
    '...ooooooo..',
    '............',
  ],
  brute: [
    '..oo....oo..',
    '.oeo....oeo.',
    '.oddooooddo.',
    'oddddddddddo',
    'odwkddddwkdo',
    'oddddddddddo',
    'oddkkkkkkddo',
    'oddDDDDDDddo',
    '.oddDDDDddo.',
    '.ooo.oo.ooo.',
  ],
};

const enemyCache = new Map<string, HTMLCanvasElement>();

export function enemySprite(name: string, flash = false): HTMLCanvasElement {
  const key = name + (flash ? '!' : '');
  const hit = enemyCache.get(key);
  if (hit) return hit;
  const rows = MAPS[name];
  const w = 12, h = rows.length;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  rows.forEach((row, y) => {
    for (let x = 0; x < w; x++) {
      const ch = row[x] ?? '.';
      if (ch === '.') continue;
      ctx.fillStyle = flash && ch !== 'o' && ch !== 'k' ? '#ffffff' : PAL[ch] ?? '#ff00ff';
      ctx.fillRect(x, y, 1, 1);
    }
  });
  enemyCache.set(key, c);
  return c;
}

export type Frame = 'idle' | 'sway' | 'blink' | 'attack';
const opCache = new Map<string, HTMLCanvasElement>();

export function heroSprite(hero: Hero, frame: Frame): HTMLCanvasElement {
  const key = hero.id + ':' + frame;
  const hit = opCache.get(key);
  if (hit) return hit;
  const c = drawSprite(hero.spec, {
    pose: frame === 'attack' ? 'attack' : 'idle',
    eyes: frame === 'blink' ? 'closed' : 'open',
    sway: frame === 'sway',
  });
  opCache.set(key, c);
  return c;
}
