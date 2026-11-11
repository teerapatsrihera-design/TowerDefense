// Visual themes for the battle map: palette, surface texture, pixel props, drifting ambience and background.
// Purely cosmetic. The map is rendered once into an offscreen layer; only animated parts are drawn each frame.

export type Tex = 'none' | 'grass' | 'stone' | 'speckle' | 'plank' | 'cracks' | 'veins';
export type PropKind = 'flower' | 'tuft' | 'rock' | 'reed' | 'pillar' | 'ember' | 'ice' | 'flame' | 'mound';
export type Ambient = 'petal' | 'mist' | 'firefly' | 'wind' | 'dust' | 'snow' | 'duo' | 'flame';
export type VoidKind = 'dark' | 'water' | 'sky';

export interface PropSpec { kind: PropKind; cols: string[] }

export interface Palette {
  /** path ground: two checker shades + front face */
  low: [string, string, string];
  /** raised ground: two checker shades + front face + top edge */
  high: [string, string, string, string];
  lowTex: Tex;
  highTex: Tex;
  lowTexCol: string;
  highTexCol: string;
  props: PropSpec[];
}

export interface Theme {
  id: string;
  bg: [string, string];
  /** stage-select card colour */
  card: string;
  voidKind: VoidKind;
  voidCol: [string, string];
  a: Palette;
  /** second palette used for columns >= splitX (the "vents" stage is half fire, half frost) */
  b?: Palette;
  splitX?: number;
  ambient: Ambient;
  ambCols: string[];
  /** glowing rune circle around the base */
  rune?: string;
}

export const THEMES: Record<string, Theme> = {
  meadow: {
    id: 'meadow', bg: ['#1a1040', '#120d24'], card: '#2a2050', voidKind: 'dark', voidCol: ['#17112b', '#0f0a1e'],
    a: {
      low: ['#352c5e', '#312858', '#241d44'], high: ['#6a60b4', '#645aae', '#463d80', '#7c72c6'],
      lowTex: 'none', highTex: 'grass', lowTexCol: '#000000', highTexCol: '#9a90d8',
      props: [{ kind: 'flower', cols: ['#ffb3d0', '#ffe27a', '#e6c2ff'] }, { kind: 'tuft', cols: ['#8a80d0'] }],
    },
    ambient: 'petal', ambCols: ['#ffb3d0', '#e6c2ff', '#ffd6e6'],
  },
  dusk: {
    id: 'dusk', bg: ['#3a1a40', '#1a0e24'], card: '#3a2046', voidKind: 'dark', voidCol: ['#1c0e24', '#10081a'],
    a: {
      low: ['#3a2438', '#352034', '#26162a'], high: ['#a0709c', '#9a6a96', '#6e4a6c', '#b88ab4'],
      lowTex: 'none', highTex: 'grass', lowTexCol: '#000000', highTexCol: '#c89ac4',
      props: [{ kind: 'flower', cols: ['#ffd6a0', '#ffb3d0', '#fff0c0'] }, { kind: 'tuft', cols: ['#c89ac4'] }],
    },
    ambient: 'petal', ambCols: ['#ffcba0', '#ffb3d0', '#ffe0c0'],
  },
  ruins: {
    id: 'ruins', bg: ['#141a24', '#0c1016'], card: '#232c3a', voidKind: 'dark', voidCol: ['#0e1218', '#090c10'],
    a: {
      low: ['#2b3040', '#272c3a', '#1b1f2b'], high: ['#5a6a78', '#546472', '#38444f', '#6e808e'],
      lowTex: 'cracks', highTex: 'stone', lowTexCol: '#0a0e14', highTexCol: '#2e3a44',
      props: [
        { kind: 'rock', cols: ['#46525c', '#6a7a86', '#8a9aa6'] },
        { kind: 'pillar', cols: ['#38444f', '#7a8a96', '#5a6a78'] },
        { kind: 'tuft', cols: ['#6a8a78'] },
      ],
    },
    ambient: 'mist', ambCols: ['#8ab0a8', '#9ab0c0'],
  },
  lake: {
    id: 'lake', bg: ['#0e2a30', '#0a1a20'], card: '#173a42', voidKind: 'water', voidCol: ['#2a6a86', '#1a4a66'],
    a: {
      low: ['#5a4636', '#533f31', '#3a2c22'], high: ['#4f8a86', '#49827e', '#336360', '#66a8a3'],
      lowTex: 'plank', highTex: 'grass', lowTexCol: '#2a1e16', highTexCol: '#8ad0c0',
      props: [
        { kind: 'reed', cols: ['#6a8a4a', '#7a5a3a'] },
        { kind: 'flower', cols: ['#ffe8f0', '#d8f0ff'] },
        { kind: 'tuft', cols: ['#8ad0c0'] },
      ],
    },
    ambient: 'firefly', ambCols: ['#e8ffb0', '#b0ffe0'],
  },
  cliffs: {
    id: 'cliffs', bg: ['#27384f', '#16202e'], card: '#34485f', voidKind: 'sky', voidCol: ['#8cb8dc', '#dcecf6'],
    a: {
      low: ['#7a6a58', '#74644f', '#54463a'], high: ['#c8b894', '#c0b08c', '#948468', '#dccfb0'],
      lowTex: 'speckle', highTex: 'speckle', lowTexCol: '#4a3c30', highTexCol: '#a08e6c',
      props: [
        { kind: 'tuft', cols: ['#9a9a5a'] },
        { kind: 'rock', cols: ['#8a7a64', '#aa9a80', '#c8b89c'] },
      ],
    },
    ambient: 'wind', ambCols: ['#ffffff'],
  },
  gate: {
    id: 'gate', bg: ['#2a1c24', '#160e14'], card: '#3a2a30', voidKind: 'dark', voidCol: ['#150c12', '#0e080c'],
    a: {
      low: ['#40342e', '#3b302a', '#2a211c'], high: ['#a08a78', '#9a8472', '#6e5a4c', '#b8a290'],
      lowTex: 'stone', highTex: 'stone', lowTexCol: '#1a120e', highTexCol: '#6a5646',
      props: [
        { kind: 'pillar', cols: ['#6e5a4c', '#b8a290', '#e0b84a'] },
        { kind: 'rock', cols: ['#7a6656', '#a08a78', '#c0aa98'] },
      ],
    },
    ambient: 'dust', ambCols: ['#e8c898', '#f0d8b0'],
  },
  vents: {
    id: 'vents', bg: ['#1c1220', '#100a14'], card: '#2a2038', voidKind: 'dark', voidCol: ['#12090f', '#0a0509'],
    a: {
      low: ['#3a2428', '#352024', '#251417'], high: ['#9a5a4c', '#945446', '#6a3a30', '#b87464'],
      lowTex: 'veins', highTex: 'stone', lowTexCol: '#e8643a', highTexCol: '#5a3228',
      props: [
        { kind: 'ember', cols: ['#ff7a40', '#ffd27a'] },
        { kind: 'rock', cols: ['#5a3228', '#7a4a3a', '#9a6a58'] },
      ],
    },
    b: {
      low: ['#243040', '#202c3c', '#161e2a'], high: ['#6a96b8', '#648eb0', '#456a88', '#86b0d0'],
      lowTex: 'cracks', highTex: 'speckle', lowTexCol: '#9ad8f0', highTexCol: '#c8e4f4',
      props: [{ kind: 'ice', cols: ['#bfe8ff', '#8fd0f0'] }, { kind: 'mound', cols: ['#f0f8ff'] }],
    },
    splitX: 6,
    ambient: 'duo', ambCols: ['#ff9a5a', '#ffd27a', '#e8f6ff'],
  },
  fortress: {
    id: 'fortress', bg: ['#10162a', '#0a0e1c'], card: '#1e2a48', voidKind: 'dark', voidCol: ['#0a0e1c', '#060912'],
    a: {
      low: ['#2c3244', '#282e40', '#1c2030'], high: ['#6a7a98', '#647492', '#465470', '#8090b0'],
      lowTex: 'stone', highTex: 'stone', lowTexCol: '#10141f', highTexCol: '#3a4660',
      props: [
        { kind: 'pillar', cols: ['#465470', '#8a9ab8', '#c8d4ec'] },
        { kind: 'rock', cols: ['#566480', '#7a8aa8', '#9aaac8'] },
      ],
    },
    ambient: 'mist', ambCols: ['#8aa0d0', '#a0b4e0'], rune: '#8fb0ff',
  },
  frozen: {
    id: 'frozen', bg: ['#15243a', '#0a1220'], card: '#223a58', voidKind: 'dark', voidCol: ['#0c1424', '#070c18'],
    a: {
      low: ['#2a3a52', '#26364e', '#1a2638'], high: ['#9ab8d4', '#92b0cc', '#6a88a4', '#b4d0e8'],
      lowTex: 'cracks', highTex: 'speckle', lowTexCol: '#8ac8e8', highTexCol: '#e8f4ff',
      props: [{ kind: 'ice', cols: ['#d0ecff', '#9fd8f4'] }, { kind: 'mound', cols: ['#f0f8ff'] }],
    },
    ambient: 'snow', ambCols: ['#ffffff', '#d8ecff'],
  },
  throne: {
    id: 'throne', bg: ['#1a0a18', '#0c040c'], card: '#2e1830', voidKind: 'dark', voidCol: ['#0a0408', '#050204'],
    a: {
      low: ['#2a1620', '#26121c', '#1a0c14'], high: ['#5a3a58', '#543452', '#3a2038', '#7a5078'],
      lowTex: 'veins', highTex: 'stone', lowTexCol: '#c0306a', highTexCol: '#2a1228',
      props: [
        { kind: 'flame', cols: ['#2a1020', '#a050e0', '#e8a0ff'] },
        { kind: 'pillar', cols: ['#3a2038', '#6a4468', '#a050e0'] },
      ],
    },
    ambient: 'flame', ambCols: ['#b060f0', '#ff4a7a', '#ffa0c8'],
  },
};

const STAGE_THEME: Record<string, string> = {
  '1-1': 'meadow', '1-2': 'dusk', '1-3': 'ruins', '1-4': 'lake', '1-5': 'cliffs',
  '1-6': 'gate', '1-7': 'vents', '1-8': 'fortress', '1-9': 'frozen', '1-10': 'throne',
};

export const themeFor = (stageId: string): Theme => THEMES[STAGE_THEME[stageId] ?? 'meadow'];

// ------------------------------------------------------------------ helpers
/** deterministic pseudo-random in [0,1) from integers */
function hash(a: number, b: number, s = 0): number {
  let n = (Math.imul(a + 1, 374761393) + Math.imul(b + 7, 668265263) + Math.imul(s + 13, 1442695041)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
}
const mod = (a: number, n: number): number => ((a % n) + n) % n;

function pick<T>(arr: T[], r: number): T { return arr[Math.min(arr.length - 1, Math.floor(r * arr.length))]; }

// ------------------------------------------------------------------ surface texture
function texture(c: CanvasRenderingContext2D, kind: Tex, col: string, px: number, py: number, gx: number, gy: number, T: number) {
  if (kind === 'none') return;
  c.save();
  c.translate(px, py);
  c.fillStyle = col;
  c.strokeStyle = col;
  switch (kind) {
    case 'grass':
      c.globalAlpha = 0.55;
      for (let i = 0; i < 4; i++) {
        const rx = 6 + hash(gx, gy, 10 + i) * (T - 16), ry = 8 + hash(gx, gy, 20 + i) * (T - 34);
        c.fillRect(Math.floor(rx), Math.floor(ry) + 3, 2, 5);
        c.fillRect(Math.floor(rx) + 3, Math.floor(ry), 2, 8);
      }
      break;
    case 'stone': {
      c.globalAlpha = 0.5;
      const o = hash(gx, gy, 3) < 0.5 ? 20 : 40;
      c.fillRect(0, 22, T, 1);
      c.fillRect(0, 46, T, 1);
      c.fillRect(o, 0, 1, 22);
      c.fillRect(T - o, 23, 1, 23);
      c.fillRect(o, 47, 1, T - 57);
      break;
    }
    case 'speckle':
      c.globalAlpha = 0.45;
      for (let i = 0; i < 9; i++) c.fillRect(Math.floor(4 + hash(gx, gy, 30 + i) * (T - 10)), Math.floor(4 + hash(gx, gy, 40 + i) * (T - 20)), 2, 2);
      break;
    case 'plank':
      c.globalAlpha = 0.4;
      for (let y = 14; y < T - 6; y += 14) {
        c.fillRect(0, y, T, 1);
        c.fillRect(4, y - 8, 2, 2);
        c.fillRect(T - 6, y - 8, 2, 2);
        c.fillRect(Math.floor(8 + hash(gx, gy, y) * (T - 16)), y - 13, 1, 13);
      }
      break;
    case 'cracks':
    case 'veins': {
      const glow = kind === 'veins';
      c.globalAlpha = glow ? 0.5 : 0.4;
      c.lineWidth = glow ? 2 : 1;
      c.lineCap = 'round';
      for (let k = 0; k < 2; k++) {
        let x = 10 + hash(gx, gy, 50 + k) * (T - 20), y = 6;
        c.beginPath();
        c.moveTo(x, y);
        for (let s = 0; s < 4; s++) {
          x += (hash(gx, gy, 60 + k * 5 + s) - 0.5) * 22;
          y += 9 + hash(gx, gy, 70 + k * 5 + s) * 6;
          c.lineTo(Math.max(4, Math.min(T - 4, x)), Math.min(T - 8, y));
        }
        c.stroke();
      }
      break;
    }
  }
  c.restore();
}

// ------------------------------------------------------------------ props (small pixel scenery in tile-local coordinates)
const ANIMATED: PropKind[] = ['ember', 'flame'];

export function drawProp(c: CanvasRenderingContext2D, kind: PropKind, x: number, y: number, cols: string[], seed: number, time = 0) {
  c.save();
  switch (kind) {
    case 'flower': {
      c.fillStyle = '#4a7a5a'; c.fillRect(x + 3, y + 5, 2, 7);
      c.fillStyle = pick(cols, seed);
      c.fillRect(x + 3, y, 2, 2); c.fillRect(x + 1, y + 2, 2, 2); c.fillRect(x + 5, y + 2, 2, 2); c.fillRect(x + 3, y + 4, 2, 2);
      c.fillStyle = '#fff0a0'; c.fillRect(x + 3, y + 2, 2, 2);
      break;
    }
    case 'tuft':
      c.fillStyle = cols[0]; c.globalAlpha = 0.8;
      c.fillRect(x, y + 4, 2, 5); c.fillRect(x + 3, y + 1, 2, 8); c.fillRect(x + 6, y + 3, 2, 6);
      break;
    case 'rock':
      c.fillStyle = '#00000040'; c.fillRect(x, y + 12, 18, 3);
      c.fillStyle = cols[0]; c.fillRect(x, y + 6, 16, 7);
      c.fillStyle = cols[1]; c.fillRect(x + 3, y + 2, 10, 6);
      c.fillStyle = cols[2]; c.fillRect(x + 5, y + 3, 4, 2);
      break;
    case 'reed':
      c.fillStyle = cols[0]; c.fillRect(x + 2, y + 5, 2, 14); c.fillRect(x + 7, y + 9, 2, 10);
      c.fillStyle = cols[1]; c.fillRect(x + 1, y, 4, 7); c.fillRect(x + 6, y + 4, 4, 6);
      break;
    case 'pillar':
      c.fillStyle = '#00000040'; c.fillRect(x - 1, y + 17, 15, 3);
      c.fillStyle = cols[0]; c.fillRect(x, y + 14, 12, 4);
      c.fillStyle = cols[1]; c.fillRect(x + 2, y + 3, 8, 12);
      c.fillStyle = cols[2]; c.fillRect(x, y, 12, 4);
      c.fillStyle = '#ffffff30'; c.fillRect(x + 3, y + 4, 2, 10);
      break;
    case 'ember': {
      const p = 0.5 + 0.5 * Math.sin(time * 3 + seed * 20);
      c.fillStyle = '#00000050'; c.fillRect(x, y + 9, 12, 3);
      c.fillStyle = cols[0]; c.globalAlpha = 0.5 + 0.5 * p;
      c.fillRect(x, y + 4, 12, 6); c.fillRect(x + 2, y + 1, 8, 4);
      c.fillStyle = cols[1]; c.globalAlpha = 0.6 + 0.4 * p;
      c.fillRect(x + 4, y + 4, 4, 3);
      break;
    }
    case 'ice':
      c.fillStyle = '#00000030'; c.fillRect(x, y + 15, 18, 3);
      c.fillStyle = cols[0];
      c.beginPath(); c.moveTo(x + 3, y + 16); c.lineTo(x + 8, y); c.lineTo(x + 13, y + 16); c.closePath(); c.fill();
      c.fillStyle = cols[1];
      c.beginPath(); c.moveTo(x + 11, y + 16); c.lineTo(x + 15, y + 6); c.lineTo(x + 19, y + 16); c.closePath(); c.fill();
      c.fillStyle = '#ffffff90'; c.fillRect(x + 7, y + 4, 2, 8);
      break;
    case 'flame': {
      const h = 9 + 3 * Math.sin(time * 8 + seed * 30), h2 = 5 + 2 * Math.sin(time * 10 + seed * 17);
      c.fillStyle = cols[0]; c.fillRect(x + 1, y + 12, 10, 5);
      c.fillStyle = cols[1];
      c.beginPath(); c.moveTo(x + 2, y + 12); c.lineTo(x + 6, y + 12 - h - 3); c.lineTo(x + 10, y + 12); c.closePath(); c.fill();
      c.fillStyle = cols[2];
      c.beginPath(); c.moveTo(x + 4, y + 12); c.lineTo(x + 6, y + 12 - h2); c.lineTo(x + 8, y + 12); c.closePath(); c.fill();
      break;
    }
    case 'mound':
      c.fillStyle = '#00000025'; c.beginPath(); c.ellipse(x + 9, y + 12, 10, 3, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = cols[0]; c.beginPath(); c.ellipse(x + 9, y + 9, 9, 5, 0, Math.PI, 0); c.fill();
      c.fillStyle = '#ffffff'; c.fillRect(x + 5, y + 6, 3, 1);
      break;
  }
  c.restore();
}

// ------------------------------------------------------------------ static map layer
export interface AnimProp { kind: PropKind; x: number; y: number; cols: string[]; seed: number }
export interface MapLayer { canvas: HTMLCanvasElement; voidPath: Path2D; anim: AnimProp[] }

export function buildMapLayer(theme: Theme, tiles: string[], cols: number, rows: number, T: number): MapLayer {
  const canvas = document.createElement('canvas');
  canvas.width = cols * T;
  canvas.height = rows * T;
  const c = canvas.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  const voidPath = new Path2D();
  const anim: AnimProp[] = [];
  const vg = c.createLinearGradient(0, 0, 0, rows * T);
  vg.addColorStop(0, theme.voidCol[0]);
  vg.addColorStop(1, theme.voidCol[1]);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const k = tiles[y][x];
      const px = x * T, py = y * T;
      if (k === 'w') { c.fillStyle = vg; c.fillRect(px, py, T, T); voidPath.rect(px, py, T, T); continue; }
      const pal = theme.b && theme.splitX !== undefined && x >= theme.splitX ? theme.b : theme.a;
      const alt = (x + y) % 2 === 0;
      if (k === 'g') {
        c.fillStyle = alt ? pal.low[0] : pal.low[1];
        c.fillRect(px, py, T, T);
        texture(c, pal.lowTex, pal.lowTexCol, px, py, x, y, T);
        c.fillStyle = pal.low[2];
        c.fillRect(px, py + T - 4, T, 4);
      } else {
        c.fillStyle = alt ? pal.high[0] : pal.high[1];
        c.fillRect(px, py, T, T);
        texture(c, pal.highTex, pal.highTexCol, px, py, x, y, T);
        c.fillStyle = pal.high[2];
        c.fillRect(px, py + T - 10, T, 10);
        c.fillStyle = pal.high[3];
        c.fillRect(px, py, T, 3);
        // scenery in a top corner, clear of the centre where a unit stands
        if (pal.props.length && hash(x, y, 1) < 0.42) {
          const spec = pick(pal.props, hash(x, y, 2));
          const left = hash(x, y, 3) < 0.5;
          const ox = left ? 6 : T - 26;
          const oy = 8 + Math.floor(hash(x, y, 4) * 14);
          if (ANIMATED.includes(spec.kind)) anim.push({ kind: spec.kind, x: px + ox, y: py + oy, cols: spec.cols, seed: hash(x, y, 5) });
          else drawProp(c, spec.kind, px + ox, py + oy, spec.cols, hash(x, y, 5));
        }
      }
      c.strokeStyle = '#00000033';
      c.lineWidth = 1;
      c.strokeRect(px + 0.5, py + 0.5, T - 1, T - 1);
    }
  }
  return { canvas, voidPath, anim };
}

/** Animated parts: the void surface (twinkle / ripples / clouds) and flickering props. Coordinates are map-local. */
export function drawMapAnim(c: CanvasRenderingContext2D, layer: MapLayer, theme: Theme, ox: number, oy: number, mapW: number, mapH: number, time: number) {
  c.save();
  c.translate(ox, oy);
  c.save();
  c.clip(layer.voidPath);
  if (theme.voidKind === 'dark') {
    c.fillStyle = '#ffffff';
    for (let i = 0; i < 16; i++) {
      c.globalAlpha = 0.15 + 0.5 * (0.5 + 0.5 * Math.sin(time * (0.8 + hash(i, 1) * 1.6) + hash(i, 2) * 6.28));
      c.fillRect(Math.floor(hash(i, 3) * mapW), Math.floor(hash(i, 4) * mapH), 2, 2);
    }
  } else if (theme.voidKind === 'water') {
    c.fillStyle = '#d8f4ff';
    for (let i = 0; i < 26; i++) {
      const w = 10 + hash(i, 1) * 18;
      const x = mod(hash(i, 2) * mapW + time * (4 + hash(i, 3) * 6), mapW + 40) - 20;
      c.globalAlpha = 0.12 + 0.22 * (0.5 + 0.5 * Math.sin(time * 1.4 + hash(i, 4) * 6.28));
      c.fillRect(Math.floor(x), Math.floor(hash(i, 5) * mapH), Math.floor(w), 2);
    }
  } else {
    // sky: drifting clouds
    for (let i = 0; i < 7; i++) {
      const sp = 8 + hash(i, 1) * 10;
      const cx = mod(hash(i, 2) * (mapW + 300) + time * sp, mapW + 300) - 150;
      const cy = 20 + hash(i, 3) * (mapH - 40);
      const s = 0.8 + hash(i, 4) * 0.9;
      c.globalAlpha = 0.7;
      c.fillStyle = '#ffffff';
      for (const [dx, dy, rx, ry] of [[0, 0, 40, 14], [-26, 5, 26, 10], [28, 6, 30, 11], [6, -9, 24, 11]] as const) {
        c.beginPath(); c.ellipse(cx + dx * s, cy + dy * s, rx * s, ry * s, 0, 0, Math.PI * 2); c.fill();
      }
    }
  }
  c.restore();
  for (const p of layer.anim) drawProp(c, p.kind, p.x, p.y, p.cols, p.seed, time);
  c.restore();
}

// ------------------------------------------------------------------ background + ambience
export function drawBackground(c: CanvasRenderingContext2D, theme: Theme, W: number, H: number) {
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, theme.bg[0]);
  g.addColorStop(1, theme.bg[1]);
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
}

function soft(c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, col: string, a: string) {
  c.save();
  c.translate(x, y);
  c.scale(1, ry / rx);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, col + a);
  g.addColorStop(1, col + '00');
  c.fillStyle = g;
  c.beginPath(); c.arc(0, 0, rx, 0, Math.PI * 2); c.fill();
  c.restore();
}

export function drawAmbient(c: CanvasRenderingContext2D, theme: Theme, t: number, W: number, H: number) {
  const cols = theme.ambCols;
  c.save();
  switch (theme.ambient) {
    case 'petal':
      for (let i = 0; i < 26; i++) {
        const x = mod(hash(i, 1) * W + t * (-8 - hash(i, 3) * 14), W), y = mod(hash(i, 2) * H + t * (14 + hash(i, 4) * 22), H);
        c.save();
        c.translate(x, y); c.rotate(hash(i, 5) * 6.28 + t * (0.6 + hash(i, 6) * 1.6)); c.scale(0.6 + hash(i, 7) * 0.7, 0.6 + hash(i, 7) * 0.7);
        c.globalAlpha = 0.6; c.fillStyle = cols[i % cols.length];
        c.beginPath(); c.ellipse(0, 0, 7, 3.4, 0, 0, Math.PI * 2); c.fill();
        c.restore();
      }
      break;
    case 'mist':
      for (let i = 0; i < 7; i++) {
        const rx = 120 + hash(i, 1) * 120, ry = 28 + hash(i, 2) * 30;
        const x = mod(hash(i, 3) * (W + 2 * rx) + t * (5 + hash(i, 4) * 8), W + 2 * rx) - rx;
        soft(c, x, hash(i, 5) * H, rx, ry, cols[i % cols.length], '38');
      }
      break;
    case 'firefly':
      for (let i = 0; i < 18; i++) {
        const ph = hash(i, 3) * 6.28;
        const x = hash(i, 1) * W + Math.sin(t * (0.3 + hash(i, 4) * 0.4) + ph) * 50;
        const y = hash(i, 2) * H + Math.cos(t * (0.25 + hash(i, 5) * 0.4) + ph) * 34;
        const b = 0.5 + 0.5 * Math.sin(t * 1.6 + ph * 2);
        soft(c, x, y, 10, 10, cols[i % cols.length], '55');
        c.globalAlpha = 0.35 + 0.6 * b; c.fillStyle = cols[i % cols.length];
        c.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
      }
      break;
    case 'wind':
      c.strokeStyle = cols[0]; c.lineWidth = 2; c.lineCap = 'round';
      for (let i = 0; i < 14; i++) {
        const len = 50 + hash(i, 3) * 70;
        const x = mod(hash(i, 1) * (W + 200) + t * (260 + hash(i, 4) * 160), W + 200) - 100, y = hash(i, 2) * H;
        c.globalAlpha = 0.14 + hash(i, 5) * 0.14;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x - len, y + 4); c.stroke();
      }
      break;
    case 'dust':
      for (let i = 0; i < 30; i++) {
        const x = mod(hash(i, 1) * W + t * (6 + hash(i, 3) * 10), W), y = mod(hash(i, 2) * H - t * 3 + Math.sin(t * 0.5 + hash(i, 4) * 6) * 10, H);
        c.globalAlpha = 0.25 + 0.3 * hash(i, 5); c.fillStyle = cols[i % cols.length];
        c.fillRect(Math.round(x), Math.round(y), 2, 2);
      }
      break;
    case 'snow':
      for (let i = 0; i < 50; i++) {
        const x = mod(hash(i, 1) * W + Math.sin(t * 0.8 + hash(i, 4) * 6) * 14, W), y = mod(hash(i, 2) * H + t * (25 + hash(i, 3) * 40), H);
        const s = hash(i, 5) < 0.3 ? 3 : 2;
        c.globalAlpha = 0.55 + 0.3 * hash(i, 6); c.fillStyle = cols[i % cols.length];
        c.fillRect(Math.round(x), Math.round(y), s, s);
      }
      break;
    case 'duo':
      // fire sparks rise on the left half, snow falls on the right half
      for (let i = 0; i < 44; i++) {
        if (i % 2 === 0) {
          const P = 3 + hash(i, 3) * 3, u = mod(t + hash(i, 4) * P, P) / P;
          const x = hash(i, 1) * (W / 2) + Math.sin(t + hash(i, 5) * 6) * 8, y = H * (0.98 - u * 0.95);
          c.globalAlpha = Math.sin(Math.PI * u) * 0.85; c.fillStyle = cols[hash(i, 6) < 0.5 ? 0 : 1];
          c.fillRect(Math.round(x), Math.round(y), 3 - Math.floor(u * 2), 3 - Math.floor(u * 2));
        } else {
          const x = W / 2 + mod(hash(i, 1) * (W / 2) + Math.sin(t * 0.8 + hash(i, 4) * 6) * 14, W / 2), y = mod(hash(i, 2) * H + t * (25 + hash(i, 3) * 40), H);
          c.globalAlpha = 0.7; c.fillStyle = cols[2];
          c.fillRect(Math.round(x), Math.round(y), 2, 2);
        }
      }
      break;
    case 'flame':
      for (let i = 0; i < 34; i++) {
        const P = 3 + hash(i, 3) * 3, u = mod(t + hash(i, 4) * P, P) / P;
        const x = hash(i, 1) * W + Math.sin(t * 1.3 + hash(i, 5) * 6) * 10, y = H * (0.98 - u * 0.95);
        const s = 3 - Math.floor(u * 2);
        c.globalAlpha = Math.sin(Math.PI * u) * 0.8; c.fillStyle = cols[i % cols.length];
        c.fillRect(Math.round(x), Math.round(y), s, s);
      }
      break;
  }
  c.restore();
}

/** Slowly rotating dashed ring around a tile centre (the fortress base). */
export function drawRune(c: CanvasRenderingContext2D, x: number, y: number, col: string, t: number) {
  c.save();
  c.translate(x, y);
  c.strokeStyle = col;
  c.lineWidth = 2;
  for (const [r, dir, dash] of [[52, 1, 10], [84, -1, 16]] as const) {
    c.globalAlpha = 0.28 + 0.12 * Math.sin(t * 2 + r);
    c.setLineDash([dash, dash * 0.8]);
    c.lineDashOffset = dir * t * 14;
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke();
  }
  c.restore();
}

