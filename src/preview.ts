import { resolveCharacterArt, type ResolvedArt } from './art/registry';
import { SAMPLES } from './data/samples';

interface Frames { idle: ResolvedArt; sway: ResolvedArt; blink: ResolvedArt; attack: ResolvedArt }

/** Idle: body stays still. Blink every ~3.5 s; ears/hair flick for 2 ticks every 2 s. */
function animate(img: HTMLImageElement, f: Frames, phase: number) {
  let t = phase;
  setInterval(() => {
    t += 1;
    const blinking = t % 14 === 0;
    const swaying = t % 8 === 5 || t % 8 === 6;
    img.src = blinking ? f.blink.url : swaying ? f.sway.url : f.idle.url;
  }, 250);
}

async function main() {
  const all = await Promise.all(
    SAMPLES.map(async (c) => ({
      c,
      f: {
        idle: await resolveCharacterArt(c.id, c.spec),
        sway: await resolveCharacterArt(c.id, c.spec, 'sway'),
        blink: await resolveCharacterArt(c.id, c.spec, 'blink'),
        attack: await resolveCharacterArt(c.id, c.spec, 'attack'),
      } as Frames,
    })),
  );

  const grid = document.getElementById('grid')!;
  all.forEach(({ c, f }, i) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.setProperty('--el', c.element.color);
    card.innerHTML = `
      <div class="stars">${'★'.repeat(c.rarity)}</div>
      <div class="name">${c.name.th} <span style="font-size:14px;color:var(--muted)">${c.name.en}</span></div>
      <div class="meta"><span class="pill">${c.role.th} · ${c.role.en}</span><span class="pill el">${c.element.th} · ${c.element.en}</span></div>
      <div class="stage">
        <div class="shadow"><img class="px big" src="${f.idle.url}" alt=""></div>
        <div><img class="px atk" src="${f.attack.url}" alt=""><div class="lbl">ท่าโจมตี</div></div>
      </div>`;
    grid.appendChild(card);
    animate(card.querySelector<HTMLImageElement>('img.big')!, f, i * 3);
  });

  const field = document.getElementById('field')!;
  const layout = ['hhghhghh', 'pppppppp', 'hhgghhgh'];
  const place: Record<string, number> = { '0,1': 0, '1,2': 1, '2,3': 2, '0,4': 3 };
  layout.forEach((row, r) =>
    [...row].forEach((t, col) => {
      const tile = document.createElement('div');
      tile.className = `tile ${t === 'h' ? 'high' : t === 'g' ? 'ground' : 'path'}`;
      const idx = place[`${r},${col}`];
      if (idx !== undefined) {
        const img = document.createElement('img');
        img.className = 'px tiny';
        img.src = all[idx].f.idle.url;
        tile.appendChild(img);
        animate(img, all[idx].f, idx * 5);
      }
      field.appendChild(tile);
    }),
  );
}

main();
