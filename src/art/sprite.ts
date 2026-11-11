// Tiny chibi sprites (~14x18 px body, head+hair 12 rows, body 6 rows, pyramid body, 2-dot feet).
// Every part is only a few pixels on purpose: dark-plum 1px outline, flat fills,
// one shade per colour, 1px eyes. All colours snap to one small shared palette.

export type Hair = 'twintails' | 'ponytail' | 'long' | 'longtails' | 'hightails' | 'lowtails' | 'sidetail' | 'braids' | 'halfup' | 'asym' | 'topknot' | 'bobflip' | 'drills' | 'stubs' | 'hime' | 'sidebraid' | 'wavy' | 'buns' | 'short';
export type Ears = 'none' | 'cat' | 'fox' | 'bunny' | 'bear';
export type Extra = 'none' | 'ahoge' | 'bow' | 'halo' | 'hat' | 'cross';
export type Weapon = 'staff' | 'sword' | 'wand' | 'shield' | 'dagger' | 'flag' | 'hammer' | 'bow' | 'gun' | 'book';

export interface SpriteSpec {
  hair: string;
  hairStyle: Hair;
  eye: string;
  outfit: string;
  outfit2: string;
  accent: string;
  skin?: string;
  ears?: Ears;
  extra?: Extra;
  weapon: Weapon;
  weaponColor?: string;
  mouth?: 'smile' | 'open' | 'flat';
}

export interface SpriteOptions {
  eyes?: 'open' | 'closed';
  pose?: 'idle' | 'attack';
  /** idle secondary-motion frame: ears flick down 1px, ponytail/twintails swing 1px (body and neck stay still) */
  sway?: boolean;
}

export const SPRITE_W = 22;
export const SPRITE_H = 28;
const OX = 3;
const OY = 7;

// ---------------------------------------------------------------- palette
const PALETTE = [
  '#26173a', '#3a2650', '#54396a', '#7a5f94', '#a893c4', '#d6cbe3',
  '#f6c795', '#ecaa76', '#d8805a', '#b0545a', '#fbdcb8',
  '#c8404f', '#9a2f48', '#6e2744', '#f08c7c', '#d56a6c', '#ffb8a0',
  '#e8924a', '#d9a640', '#efd27a', '#f4e8cc', '#fbf4e6',
  '#7ec0b6', '#4a9298', '#2f6270', '#8fc6a0', '#548f78',
  '#7aa2cc', '#4a74a8', '#a4aecb', '#8a7a9e',
  '#f58fb4', '#5b8fd6', '#7fe0e8', '#b5d96a', '#8a5a3c', // one extra hair hue each: pink, blue, aqua, lime, brown
].map((h) => {
  const n = parseInt(h.slice(1), 16);
  return { h, r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
});
const near = new Map<string, string>();
function snap(hex: string): string {
  let r = near.get(hex);
  if (r) return r;
  const n = parseInt(hex.slice(1), 16);
  const R = (n >> 16) & 255, G = (n >> 8) & 255, B = n & 255;
  let best = Infinity;
  r = PALETTE[0].h;
  for (const c of PALETTE) {
    const d = (c.r - R) ** 2 * 0.3 + (c.g - G) ** 2 * 0.59 + (c.b - B) ** 2 * 0.11;
    if (d < best) { best = d; r = c.h; }
  }
  near.set(hex, r);
  return r;
}

function mix(a: string, b: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = p(a), [r2, g2, b2] = p(b);
  const c = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${c(r1, r2)}${c(g1, g2)}${c(b1, b2)}`;
}
const dark = (h: string) => mix(h, '#3a2650', 0.38);
const light = (h: string) => mix(h, '#ffffff', 0.4);

// ---------------------------------------------------------------- grid
// Character space: 16 wide (x 0..15, mirror x' = 15 - x). Head+hair = rows 0..11,
// body rows 12..17: a big round head on a tiny pyramid body (max 8 px wide).
class Grid {
  px: string[] = new Array(SPRITE_W * SPRITE_H).fill('');
  /** whole-sprite vertical offset (used by the breath/bob frame) */
  dy = 0;
  set(x: number, y: number, k: string) {
    const cx = x + OX, cy = y + OY + this.dy;
    if (cx < 0 || cy < 0 || cx >= SPRITE_W || cy >= SPRITE_H) return;
    this.px[cy * SPRITE_W + cx] = k;
  }
  span(y: number, a: number, b: number, k: string) { for (let x = a; x <= b; x++) this.set(x, y, k); }
  mspan(y: number, a: number, b: number, k: string) { this.span(y, a, b, k); this.span(y, 15 - b, 15 - a, k); }
  mset(x: number, y: number, k: string) { this.set(x, y, k); this.set(15 - x, y, k); }
}

function drawBackHair(g: Grid, s: Hair, sway: boolean) {
  switch (s) {
    case 'twintails':
      for (let y = 4; y <= 14; y++) { const o = sway && y >= 11 ? -1 : 0; g.mspan(y, 0 + o, (y < 9 ? 2 : 1) + o, 'H'); }
      g.mspan(4, 0, 1, 'A');
      break;
    case 'ponytail':
      for (let y = 1; y <= 13; y++) { const o = sway && y >= 9 ? 1 : 0; g.span(y, 14 + o, (y < 8 ? 16 : 15) + o, y > 10 ? 'h' : 'H'); }
      g.span(3, 14, 15, 'A');
      break;
    case 'longtails':
      // long twin tails reaching the hem, tapering to a single pixel
      for (let y = 4; y <= 18; y++) {
        const w = y < 9 ? 2 : y < 15 ? 1 : 0;
        const o = sway && y >= 11 ? -1 : 0;
        g.mspan(y, 0 + o, w + o, 'H');
      }
      g.mspan(4, 0, 1, 'A');
      break;
    case 'hightails': {
      // high twin tails: tied just under the hat brim, then hanging out and down beside the head
      const left = (y: number) => (y <= 4 ? -1 : y <= 14 ? -2 : -3); // left edge of the 2-px strand
      for (let y = 3; y <= 17; y++) {
        const o = sway && y >= 11 ? -1 : 0;
        const x0 = left(y) + o;
        g.mspan(y, x0, y >= 15 ? x0 : x0 + 1, 'H');
      }
      g.mspan(3, -1, 0, 'A'); // hair ties
      break;
    }
    case 'lowtails': {
      // twin tails tied lower, around cheek level (row 6), hanging down beside the body
      for (let y = 6; y <= 17; y++) {
        const o = sway && y >= 11 ? -1 : 0;
        const x0 = (y <= 14 ? -2 : -3) + o;
        g.mspan(y, x0, y >= 15 ? x0 : x0 + 1, 'H');
      }
      g.mspan(6, -2, -1, 'A'); // hair ties
      break;
    }
    case 'sidetail': {
      // one long wavy tail on the left (the weapon hand is on the right), tied high with a hair tie
      for (let y = 2; y <= 18; y++) {
        const k = Math.round(Math.sin((y - 2) / 2.8)); // one smooth S-curve (3 steps in total, no 1-row zigzag)
        const w = y >= 17 ? 0 : y >= 15 ? 1 : 2;        // tapering end
        const o = sway && y >= 11 ? -1 : 0;
        g.span(y, -1 + k + o, -1 + k + o + w, 'H');
      }
      g.span(3, -1, 1, 'A');
      break;
    }
    case 'braids':
      // two long braids hanging just outside the body, tied at the ends
      for (let y = 8; y <= 18; y++) {
        const o = sway && y >= 12 ? -1 : 0;
        g.mspan(y, 0 + o, 1 + o, y % 3 === 0 ? 'h' : 'H');
      }
      g.mspan(18, 0, 1, 'A'); g.mspan(8, 0, 1, 'A');
      break;
    case 'halfup':
      // small top knot + long straight hair falling behind the shoulders
      g.mspan(-2, 6, 7, 'H'); g.mspan(-1, 6, 7, 'H'); g.mspan(-1, 7, 7, 'A');
      for (let y = 11; y <= 18; y++) g.mspan(y, 1, 2, 'H');
      break;
    case 'asym':
      // asymmetric bob: a long lock on the left sweeping outward, short on the right
      for (let y = 11; y <= 17; y++) {
        const o = sway && y >= 14 ? -1 : 0;
        const x0 = (y <= 13 ? 1 : 0) + o;
        g.span(y, x0, x0 + (y >= 16 ? 1 : 2), y === 17 ? 'h' : 'H');
      }
      break;
    case 'topknot':
      // a single round bun on top of the head, tied at the base
      g.mspan(-3, 7, 7, 'H'); g.mspan(-2, 6, 7, 'H'); g.mspan(-1, 6, 7, 'H'); g.mspan(-1, 7, 7, 'A');
      break;
    case 'bobflip': {
      // short bob whose ends flip outward at the jaw
      const f = sway ? -1 : 0;
      g.mspan(12, 1, 3, 'H'); g.mspan(13, 1, 3, 'H'); g.mspan(14, 0 + f, 2 + f, 'H');
      break;
    }
    case 'drills':
      // thick curved twin tails from ear level, one smooth bend (no zigzag)
      for (let y = 6; y <= 17; y++) {
        const k = Math.round(Math.sin((y - 6) / 2.4));
        const o = sway && y >= 11 ? -1 : 0;
        g.mspan(y, -1 + k + o, 1 + k + o - (y >= 16 ? 1 : 0), 'H');
      }
      g.mspan(6, -1, 0, 'A');
      break;
    case 'stubs':
      // short stubby tails at jaw level
      for (let y = 9; y <= 13; y++) {
        const o = sway && y >= 11 ? -1 : 0;
        const a = y === 9 || y === 13 ? -1 : -2;
        g.mspan(y, a + o, 0 + o, 'H');
      }
      g.mspan(9, -1, 0, 'A');
      break;
    case 'hime':
      // two thin straight locks hanging in front, hime-style, with a small gap to the head
      for (let y = 11; y <= 17; y++) g.mspan(y, 3, 4, y === 17 ? 'h' : 'H');
      break;
    case 'sidebraid':
      // one long thin braid on the left with hair ties
      for (let y = 5; y <= 18; y++) {
        const o = sway && y >= 11 ? -1 : 0;
        g.span(y, -1 + o, 0 + o, y % 3 === 0 ? 'h' : 'H');
      }
      g.span(5, -1, 0, 'A'); g.span(18, -1, 0, 'A');
      break;
    case 'wavy':
      // long wavy hair falling behind the body: in, out, in
      for (let y = 9; y <= 17; y++) { const a = y < 12 ? 1 : y < 15 ? 0 : 1; g.mspan(y, a, a + 2, 'H'); }
      break;
    case 'long':
      for (let y = 9; y <= 15; y++) g.mspan(y, 1, 3, y < 13 ? 'H' : 'h');
      break;
    case 'buns':
      for (const [y, a, b] of [[-2, 2, 4], [-1, 1, 5], [0, 1, 5], [1, 2, 4]] as const) g.mspan(y, a, b, 'H');
      break;
    case 'short':
      break;
  }
}

function drawBody(g: Grid, arm: 'down' | 'raise', leftArm: boolean, narrow: boolean) {
  // Pyramid body: narrow neck widening row by row into a flared skirt (2,4,4,8,8 px).
  // No legs: the feet are just two tiny dark dots.
  g.mspan(17, 5, 6, 'B');            // feet
  // skirt: 6 px wide (slim hips) for most, 8 px for the long-hair design
  const sx0 = narrow ? 5 : 4, sx1 = narrow ? 10 : 11;
  g.span(16, sx0, sx1, 'A');         // hem trim
  g.span(15, sx0, sx1, 'D');         // skirt
  g.mset(sx0, 15, 'd');              // one fold shade on each flank
  g.span(14, 6, 9, 'C'); g.set(7, 14, 'A'); g.set(8, 14, 'A'); // waist (4) + bow
  g.span(13, 6, 9, 'C'); g.set(7, 13, 'w'); g.set(8, 13, 'w');
  g.set(7, 12, 'A'); g.set(8, 12, 'A');                          // neck / collar (2)
  // tiny hands at the sides
  if (leftArm) g.set(5, 14, 'S');
  if (arm === 'down') g.set(10, 14, 'S');
  else { g.set(10, 13, 'C'); g.set(11, 12, 'S'); }
}

function drawHead(g: Grid, o: SpriteOptions, spec: SpriteSpec, dy: number) {
  const set = (x: number, y: number, k: string) => g.set(x, y + dy, k);
  const span = (y: number, a: number, b: number, k: string) => g.span(y + dy, a, b, k);
  const mspan = (y: number, a: number, b: number, k: string) => g.mspan(y + dy, a, b, k);
  const mset = (x: number, y: number, k: string) => g.mset(x, y + dy, k);
  // silhouette filled with hair
  if (spec.hairStyle === 'long') {
    // Yuki's silhouette (kept exactly as approved): rounded top, long side hair behind the body
    span(0, 5, 10, 'H'); span(1, 3, 12, 'H'); span(2, 2, 13, 'H');
    for (let y = 3; y <= 9; y++) span(y, 1, 14, 'H');
    span(10, 2, 13, 'H'); span(11, 4, 11, 'H');
  } else {
    // Boxy silhouette like Yuki's: flat top, straight sides down to the jaw, short side locks
    span(0, 4, 11, 'H'); span(1, 2, 13, 'H');
    for (let y = 2; y <= 10; y++) span(y, 1, 14, 'H');
    span(11, 2, 13, 'H'); mspan(12, 2, 3, 'h');
  }
  mspan(1, 5, 6, 'L'); // top shine
  // face
  for (let y = 5; y <= 10; y++) span(y, 3, 12, 'S');
  span(11, 5, 10, 'S');
  // fringe: three soft scallops
  span(4, 3, 12, 'H');
  span(5, 3, 5, 'H'); span(5, 7, 8, 'H'); span(5, 10, 12, 'H');
  mset(3, 6, 'H'); mset(3, 7, 'H');
  span(6, 4, 11, 's'); set(3, 6, 'H'); set(12, 6, 'H');
  // eyes: 1px wide, 2 tall
  if ((o.eyes ?? 'open') === 'open') { mset(5, 7, 'K'); mset(5, 8, 'E'); }
  else { mset(5, 8, 'K'); }
  mset(4, 9, 'b');
  const m = o.pose === 'attack' ? 'open' : spec.mouth ?? 'smile';
  if (m === 'open') { set(7, 10, 'r'); set(8, 10, 'r'); }
  else if (m === 'flat') { set(7, 10, 'm'); set(8, 10, 'm'); }
  else { set(6, 9, 'm'); set(9, 9, 'm'); set(7, 10, 'm'); set(8, 10, 'm'); } // small smile, stays inside the face
  // ears (flick down 1px on the sway frame)
  const ey = o.sway ? 1 : 0;
  if (spec.ears === 'cat') {
    for (const [y, a, b] of [[-2, 2, 2], [-1, 2, 3], [0, 2, 4], [1, 2, 5]] as const) mspan(y + ey, a, b, 'H');
    mset(3, 0 + ey, 'I'); mset(3, -1 + ey, 'I');
  } else if (spec.ears === 'fox') {
    for (const [y, a, b] of [[-3, 2, 2], [-2, 2, 3], [-1, 2, 4], [0, 2, 5], [1, 2, 5]] as const) mspan(y + ey, a, b, 'H');
    mset(3, 0 + ey, 'w'); mset(3, -1 + ey, 'w'); mset(3, -2 + ey, 'w');
  }
  if (spec.ears === 'bunny') {
    mset(4, -4 + ey, 'H');
    for (let y = -3; y <= 0; y++) mspan(y + ey, 3, 5, 'H');
    for (let y = -2; y <= 0; y++) mset(4, y + ey, 'I');
  }
  if (spec.ears === 'bear') {
    for (const [y, a, b] of [[-1, 2, 4], [0, 1, 5], [1, 1, 5]] as const) mspan(y + ey, a, b, 'H');
    mset(3, 0 + ey, 'I'); mset(3, 1 + ey, 'I');
  }
  if (spec.extra === 'hat') {
    // small pointed witch hat: tip, cone, gold band, wide brim
    mspan(-4, 7, 7, 'D');
    mspan(-3, 6, 7, 'D');
    mspan(-2, 6, 7, 'D');
    mspan(-1, 5, 7, 'D');
    mspan(0, 4, 7, 'A');
    mspan(1, 2, 7, 'D');
    mset(6, -2, 'Y');
  }
  if (spec.extra === 'cross') { for (const [x, y] of [[12, 1], [11, 2], [12, 2], [13, 2], [12, 3]]) set(x, y, 'A'); }
  if (spec.extra === 'ahoge') { set(7, -1, 'H'); set(8, -2, 'H'); set(9, -2, 'H'); }
  if (spec.extra === 'bow') { for (const [x, y] of [[10, 0], [12, 0], [11, 1], [10, 2], [12, 2]]) set(x, y, 'A'); }
  if (spec.extra === 'halo') span(-3, 6, 9, 'F');
}

function drawWeapon(g: Grid, w: Weapon, A: number, wx: number) {
  switch (w) {
    case 'staff':
      for (let y = A - 8; y <= A + 3; y++) g.set(wx, y, 'f');
      g.set(wx, A - 12, 'Y'); g.span(A - 11, wx - 1, wx + 1, 'Y'); g.set(wx, A - 10, 'Y'); g.set(wx, A - 11, 'W');
      break;
    case 'sword':
      for (let y = A - 6; y <= A - 1; y++) g.set(wx, y, 'V');
      g.set(wx, A - 7, 'V');
      g.span(A, wx - 1, wx + 1, 'M'); g.set(wx, A + 1, 'n');
      break;
    case 'wand':
      for (let y = A - 3; y <= A + 1; y++) g.set(wx, y, 'f');
      g.set(wx - 1, A - 6, 'Y'); g.set(wx + 1, A - 6, 'Y'); g.span(A - 5, wx - 1, wx + 1, 'Y'); g.set(wx, A - 4, 'Y');
      break;
    case 'dagger':
      for (let y = A - 7; y <= A - 1; y++) { g.set(wx, y, 'V'); g.set(wx + 1, y, 'v'); }
      g.set(wx, A - 8, 'V');
      g.span(A, wx - 1, wx + 2, 'M'); g.set(wx, A + 1, 'n');
      break;
    case 'flag':
      for (let y = A - 9; y <= A + 3; y++) g.set(wx, y, 'f');
      g.span(A - 9, wx + 1, wx + 3, 'M'); g.span(A - 8, wx + 1, wx + 3, 'M'); g.span(A - 7, wx + 1, wx + 2, 'M');
      g.set(wx + 1, A - 8, 'Y');
      break;
    case 'hammer':
      for (let y = A - 6; y <= A + 2; y++) g.set(wx, y, 'f');
      for (let y = A - 9; y <= A - 7; y++) g.span(y, wx - 2, wx + 2, 'M');
      g.set(wx, A - 8, 'Y');
      break;
    case 'bow':
      for (let y = A - 5; y <= A + 1; y++) g.set(wx + 1, y, 'M');
      g.set(wx, A - 6, 'M'); g.set(wx, A + 2, 'M');
      for (let y = A - 4; y <= A; y++) g.set(wx, y, 'w');
      break;
    case 'gun':
      g.span(A - 1, wx - 1, wx + 4, 'n'); g.span(A, wx - 1, wx + 1, 'M'); g.set(wx, A + 1, 'n');
      g.set(wx + 5, A - 1, 'Y');
      break;
    case 'book':
      for (const [y, a, b] of [[13, 1, 4], [14, 1, 4], [15, 1, 4]] as const) g.span(y, a, b, 'M');
      g.span(16, 1, 4, 'w'); g.set(2, 14, 'Y'); g.set(3, 14, 'Y');
      break;
    case 'shield':
      for (const [y, a, b] of [[13, 2, 4], [14, 1, 4], [15, 1, 4], [16, 2, 3]] as const) g.span(y, a, b, 'M');
      g.set(2, 14, 'Y'); g.set(2, 15, 'Y');
      break;
  }
}

function colours(s: SpriteSpec): Record<string, string> {
  const skin = s.skin ?? '#f6c795';
  const wc = s.weaponColor ?? s.accent;
  return {
    H: s.hair, h: dark(s.hair), L: light(s.hair),
    S: skin, s: mix(skin, '#d8805a', 0.5), b: '#d56a6c', m: '#6e2744', r: '#c8404f',
    K: '#26173a', E: s.eye, W: '#ffffff',
    C: s.outfit, c: dark(s.outfit),
    D: s.outfit2, d: dark(s.outfit2),
    A: s.accent, w: '#fbf4e6', B: dark(s.outfit2),
    M: wc, n: dark(wc), V: '#f4f1ff', v: '#a4aecb', f: '#f4e8cc', Y: s.accent,
    F: '#efd27a', I: '#f08c7c',
  };
}

export function drawSprite(spec: SpriteSpec, opts: SpriteOptions = {}): HTMLCanvasElement {
  const attack = opts.pose === 'attack';
  const g = new Grid();
  const shield = spec.weapon === 'shield' || spec.weapon === 'book'; // held in the left hand
  const A = attack ? 12 : 14;
  const handX = attack ? 11 : 10;

  drawBackHair(g, spec.hairStyle, !!opts.sway);
  drawBody(g, attack ? 'raise' : 'down', !shield, spec.hairStyle !== 'long');
  // Tall weapons are held out to the side and drawn in FRONT of the head, otherwise the big head hides them.
  const outside = ['dagger', 'flag', 'hammer', 'bow', 'gun'].includes(spec.weapon);
  if (!outside) {
    drawWeapon(g, spec.weapon, A, handX + 1);
    if (!shield) g.set(handX, A, 'S'); // keep the hand on top of the weapon grip
  }
  drawHead(g, opts, spec, 0);
  if (outside) {
    g.set(11, A, 'S'); g.set(12, A, 'S'); // arm reaching out to the grip
    drawWeapon(g, spec.weapon, A, 13);
  }

  const pal = colours(spec);
  const OUT = snap('#26173a');
  const canvas = document.createElement('canvas');
  canvas.width = SPRITE_W;
  canvas.height = SPRITE_H;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(SPRITE_W, SPRITE_H);
  const put = (i: number, hex: string) => {
    const n = parseInt(snap(hex).slice(1), 16);
    img.data[i * 4] = (n >> 16) & 255; img.data[i * 4 + 1] = (n >> 8) & 255; img.data[i * 4 + 2] = n & 255; img.data[i * 4 + 3] = 255;
  };
  const filled = (x: number, y: number) => x >= 0 && y >= 0 && x < SPRITE_W && y < SPRITE_H && g.px[y * SPRITE_W + x] !== '';
  for (let y = 0; y < SPRITE_H; y++) {
    for (let x = 0; x < SPRITE_W; x++) {
      const i = y * SPRITE_W + x;
      const k = g.px[i];
      if (k) put(i, pal[k] ?? '#ff00ff');
      else if (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)) put(i, OUT);
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

export function spriteURL(spec: SpriteSpec, opts: SpriteOptions = {}): string {
  return drawSprite(spec, opts).toDataURL();
}
