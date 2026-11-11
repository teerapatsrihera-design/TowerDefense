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
  p: '#7a4a8a', P: '#54396a', // archer cloak
  m: '#8fe0c0', M: '#5fb89a', h: '#fbf4e6', // mender wisp
  q: '#cfc4f0', Q: '#9a8ccc', // wraith
  u: '#8a4a9a', U: '#4a2060', c: '#e8c040', // queen
};

/** Recolours of an existing map (same letters, different palette). */
const VARIANT: Record<string, { base: string; pal: Record<string, string> }> = {
  imp: { base: 'runner', pal: { r: '#e8703a', R: '#b04a2a' } },
  zephyr: { base: 'runner', pal: { r: '#5fd6b0', R: '#3a9c82' } },
  frostling: { base: 'slime', pal: { g: '#9fdcf2', G: '#6fb4d6' } },
  sparkbat: { base: 'bat', pal: { b: '#b98cff', B: '#7f57c8' } },
  ironclad: { base: 'shell', pal: { s: '#8a8aa0', S: '#5a5a78', y: '#cfcfe0' } },
};

const MAPS: Record<string, string[]> = {
  queen: [
    '.c...cc...c.',
    '.occcccccco.',
    '.ouuuuuuuuo.',
    'ouuwkuuwkuuo',
    'ouuuuuuuuuuo',
    'ouuuukkuuuuo',
    'ouuUUUUUUuuo',
    'ouUUUUUUUUuo',
    '.ouUUUUUUuo.',
    '.ooo.oo.ooo.',
  ],
  archer: [
    '...oooooo...',
    '..oppppppo..',
    '.oppppppppo.',
    'opwkppppwkpo',
    'oppppppppyyo',
    '.oppPPPPppyo',
    '.opPPPPPPpyo',
    '..oPPPPPPyo.',
    '..oo.oo.oo..',
  ],
  mender: [
    '....oooo....',
    '..oommmmoo..',
    '.ommmmmmmmo.',
    'ommwkmmwkmmo',
    'ommmmhhmmmmo',
    'ommhhhhhhmmo',
    'ommmmhhmmmmo',
    '.oMMmmmmMMo.',
    '..ooo..ooo..',
  ],
  wraith: [
    '....oooo....',
    '...oqqqqo...',
    '..oqqqqqqo..',
    '.oqqqqqqqqo.',
    '.oqwkqqwkqo.',
    '.oqqqqqqqqo.',
    '.oqqkkkkqqo.',
    'oqqqqqqqqqqo',
    'oQqoQqoQqoQo',
  ],
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
  const v = VARIANT[name];
  const rows = MAPS[v ? v.base : name];
  const pal = v ? { ...PAL, ...v.pal } : PAL;
  const w = 12, h = rows.length;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  rows.forEach((row, y) => {
    for (let x = 0; x < w; x++) {
      const ch = row[x] ?? '.';
      if (ch === '.') continue;
      ctx.fillStyle = flash && ch !== 'o' && ch !== 'k' ? '#ffffff' : pal[ch] ?? '#ff00ff';
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
