// Resolves the image used for a character.
// Priority: optional hand-made art in public/art/<kind>/<id>[_variant].png  →  generated pixel sprite.

import { spriteURL, type SpriteSpec, type SpriteOptions } from './sprite';

export type ArtKind = 'characters' | 'enemies';
export type ArtVariant = 'idle' | 'sway' | 'attack' | 'blink';

export function artPath(kind: ArtKind, id: string, variant: ArtVariant = 'idle'): string {
  return `${import.meta.env.BASE_URL}art/${kind}/${id}${variant === 'idle' ? '' : '_' + variant}.png`;
}

const cache = new Map<string, Promise<string | null>>();

/** Resolves to the URL if the image exists and decodes, otherwise null (an <img> load, because the
 *  Vite dev server answers unknown paths with index.html + 200). */
export function probeImage(url: string): Promise<string | null> {
  let p = cache.get(url);
  if (!p) {
    p = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(url);
      img.onerror = () => resolve(null);
      img.src = url;
    });
    cache.set(url, p);
  }
  return p;
}

const VARIANT_OPTS: Record<ArtVariant, SpriteOptions> = {
  idle: {},
  sway: { sway: true },
  attack: { pose: 'attack' },
  blink: { eyes: 'closed' },
};

export interface ResolvedArt {
  url: string;
  custom: boolean;
}

export async function resolveCharacterArt(id: string, spec: SpriteSpec, variant: ArtVariant = 'idle'): Promise<ResolvedArt> {
  const custom = await probeImage(artPath('characters', id, variant));
  if (custom) return { url: custom, custom: true };
  if (variant !== 'idle') {
    const idle = await probeImage(artPath('characters', id));
    if (idle) return { url: idle, custom: true };
  }
  return { url: spriteURL(spec, VARIANT_OPTS[variant]), custom: false };
}
