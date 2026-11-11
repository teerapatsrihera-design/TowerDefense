// Small color helpers used by the procedural art.

function parse(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Linear blend from a to b, t in 0..1. */
export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

/** amt > 0 lightens toward white, amt < 0 darkens toward a deep violet (anime-style shadows). */
export function shade(hex: string, amt: number): string {
  return amt >= 0 ? mix(hex, '#ffffff', amt) : mix(hex, '#2a1838', -amt);
}

/** Line-art color derived from a fill: dark, slightly purple, never pure black. */
export function line(hex: string): string {
  return mix(hex, '#2b1a3c', 0.62);
}

export function hexToNum(hex: string): number {
  const [r, g, b] = parse(hex);
  return (r << 16) | (g << 8) | b;
}
