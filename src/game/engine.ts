// Battle simulation (no drawing here). Time-stepped; everything is deterministic given the stage.

import { CLASSES, ENEMIES, MELEE, RARITY_MULT, elemMult, heroById, rotate, stagePaths, type ClassKey, type Dir, type Elem, type EnemyDef, type Hero, type Stage } from './data';
import { L, t } from './i18n';

export interface Op {
  uid: number;
  hero: Hero;
  cls: ClassKey;
  x: number;
  y: number;
  facing: Dir;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  res: number;
  interval: number;
  cd: number;
  sp: number;
  buffT: number;
  buffV: number;
  hasteT: number;
  blocked: Enemy[];
  atkAnim: number;
  hurtAnim: number;
}

export interface Enemy {
  uid: number;
  type: string;
  def: EnemyDef;
  hp: number;
  maxHp: number;
  /** lane this enemy walks */
  path: [number, number][];
  /** continuous index along its path */
  p: number;
  x: number;
  y: number;
  blockedBy: Op | null;
  cd: number;
  slowT: number;
  slowV: number;
  freezeT: number;
  aura: { el: Elem; t: number } | null;
  hurtAnim: number;
  /** boss phase multipliers and progress */
  spdMul: number;
  atkMul: number;
  phase: number;
  /** ability timer (healer pulse) */
  abCd: number;
}

export type FxKind = 'slash' | 'claw' | 'bullet' | 'orb' | 'burst' | 'ring' | 'heal' | 'flash';
/** Visual effect, purely cosmetic. Tile coordinates; age starts negative when delayed. */
export interface Fx { kind: FxKind; x0: number; y0: number; x1: number; y1: number; color: string; age: number; dur: number; size: number }

export const ELEM_COLOR: Record<Elem, string> = { volt: '#c99bff', ember: '#ff8a5a', frost: '#8fe3ff', gale: '#7ff0c0' };

export interface Popup { x: number; y: number; text: string; color: string; t: number }

export type Sfx = 'deploy' | 'hit' | 'skill' | 'heal' | 'leak' | 'win' | 'lose' | 'react' | 'kill' | 'retreat';

export const COST_RATE = 1; // per second
export const COST_MAX = 99;

export class Battle {
  stage: Stage;
  deck: string[];
  time = 0;
  cost: number;
  lives: number;
  ops: Op[] = [];
  enemies: Enemy[] = [];
  popups: Popup[] = [];
  fx: Fx[] = [];
  state: 'play' | 'win' | 'lose' = 'play';
  leaks = 0;
  kills = 0;
  /** enemies created by boss phases (not in the stage timeline) */
  summoned = 0;
  speed = 1;
  paused = false;
  /** seconds until a hero can be redeployed */
  cooldown: Record<string, number> = {};
  onSfx: (s: Sfx) => void = () => {};
  private uid = 1;
  private spawnIdx = 0;

  /** per-hero HP/ATK multiplier from level and rank (missing = 1) */
  private power: Record<string, number>;

  constructor(stage: Stage, deck: string[], power: Record<string, number> = {}) {
    this.stage = stage;
    this.deck = deck;
    this.power = power;
    this.cost = stage.startCost;
    this.lives = stage.lives;
  }

  tile(x: number, y: number): string {
    if (x < 0 || y < 0 || x >= this.stage.cols || y >= this.stage.rows) return '';
    return this.stage.tiles[y][x];
  }

  opAt(x: number, y: number): Op | undefined {
    return this.ops.find((o) => o.x === x && o.y === y);
  }

  deployed(id: string): Op | undefined {
    return this.ops.find((o) => o.hero.id === id);
  }

  /** null when the hero can be deployed there, otherwise a short reason (Thai/English-neutral key) */
  canDeploy(id: string, x: number, y: number): string | null {
    const hero = heroById(id);
    const c = CLASSES[hero.cls];
    if (this.state !== 'play') return 'over';
    if (this.deployed(id)) return 'already';
    if ((this.cooldown[id] ?? 0) > 0) return 'cooldown';
    if (this.cost < c.cost) return 'cost';
    if (this.ops.length >= this.stage.deployLimit) return 'limit';
    const t = this.tile(x, y);
    if (t !== (c.deploy === 'ground' ? 'g' : 'h')) return 'tile';
    if (this.opAt(x, y)) return 'occupied';
    return null;
  }

  deploy(id: string, x: number, y: number, facing: Dir): boolean {
    if (this.canDeploy(id, x, y)) return false;
    const hero = heroById(id);
    const c = CLASSES[hero.cls];
    const m = (RARITY_MULT[hero.rarity] ?? 1) * (this.power[id] ?? 1);
    this.cost -= c.cost;
    this.ops.push({
      uid: this.uid++, hero, cls: hero.cls, x, y, facing,
      hp: c.hp * m, maxHp: c.hp * m, atk: c.atk * m, def: c.def, res: c.res, interval: c.interval,
      cd: 0.3, sp: 0, buffT: 0, buffV: 1, hasteT: 0, blocked: [], atkAnim: 0, hurtAnim: 0,
    });
    this.onSfx('deploy');
    return true;
  }

  retreat(op: Op) {
    this.removeOp(op, 12);
    this.cost = Math.min(COST_MAX, this.cost + Math.floor(CLASSES[op.cls].cost / 2));
    this.onSfx('retreat');
  }

  skillReady(op: Op): boolean {
    return op.sp >= CLASSES[op.cls].skill.sp;
  }

  useSkill(op: Op) {
    if (!this.skillReady(op) || this.state !== 'play') return;
    const s = CLASSES[op.cls].skill;
    op.sp = 0;
    this.onSfx('skill');
    this.pop(op.x, op.y - 0.2, L(s.name), '#ffe27a');
    const col = ELEM_COLOR[op.hero.elem];
    this.addFx('flash', op.x, op.y, op.x, op.y, col, 0.35);
    switch (s.kind) {
      case 'heal': case 'healAll': this.addFx('ring', op.x, op.y, op.x, op.y, '#8fe0a0', 0.6, 0, 2.6); break;
      case 'slowAll': this.addFx('ring', op.x, op.y, op.x, op.y, '#9fe8ff', 0.7, 0, 3.2); break;
      case 'cost': this.addFx('ring', op.x, op.y, op.x, op.y, '#ffd76a', 0.6, 0, 1.6); break;
      default: this.addFx('ring', op.x, op.y, op.x, op.y, col, 0.5, 0, 1.4);
    }
    switch (s.kind) {
      case 'cost': this.cost = Math.min(COST_MAX, this.cost + s.value); break;
      case 'atkBuff': op.buffT = s.dur; op.buffV = s.value; break;
      case 'haste': op.hasteT = s.dur; break;
      case 'heal': op.hp = Math.min(op.maxHp, op.hp + op.maxHp * s.value); break;
      case 'healAll':
        for (const a of this.alliesInRange(op)) this.heal(a, op.atk * s.value);
        break;
      case 'slowAll':
        for (const e of this.enemiesInRange(op)) { e.slowT = s.dur; e.slowV = s.value; }
        break;
      case 'blast': {
        const t = this.pickTarget(op) ?? this.enemiesInRange(op)[0];
        if (!t) break;
        this.addFx('burst', t.x, t.y, t.x, t.y, col, 0.5, 0.05, 2.4);
        for (const e of this.enemies) {
          if (Math.hypot(e.x - t.x, e.y - t.y) <= 1.6) this.hurtEnemy(e, this.damage(op.atk * s.value, 'magic', e.def.def, e.def.res), op.hero.elem);
        }
        break;
      }
    }
  }

  // ------------------------------------------------------------------ helpers
  private addFx(kind: FxKind, x0: number, y0: number, x1: number, y1: number, color: string, dur: number, delay = 0, size = 1) {
    this.fx.push({ kind, x0, y0, x1, y1, color, age: -delay, dur, size });
  }

  private attackFx(op: Op, t: Enemy) {
    const col = ELEM_COLOR[op.hero.elem];
    switch (op.cls) {
      case 'vanguard': this.addFx('slash', op.x, op.y, t.x, t.y, col, 0.22); break;
      case 'guard': this.addFx('slash', op.x, op.y, t.x, t.y, col, 0.26, 0, 1.6); break;
      case 'defender': this.addFx('burst', op.x, op.y, t.x, t.y, col, 0.3, 0.05, 0.7); break;
      case 'specialist': this.addFx('claw', op.x, op.y, t.x, t.y, col, 0.2); break;
      case 'sniper':
        this.addFx('bullet', op.x, op.y, t.x, t.y, col, 0.13);
        this.addFx('burst', op.x, op.y, t.x, t.y, col, 0.2, 0.13, 0.5);
        break;
      case 'caster':
        this.addFx('orb', op.x, op.y, t.x, t.y, col, 0.28);
        this.addFx('burst', op.x, op.y, t.x, t.y, col, 0.32, 0.28, 1.1);
        break;
      case 'supporter':
        this.addFx('orb', op.x, op.y, t.x, t.y, col, 0.22);
        this.addFx('ring', t.x, t.y, t.x, t.y, '#9fe8ff', 0.4, 0.22, 0.45);
        break;
      default: break;
    }
  }

  private pop(x: number, y: number, text: string, color: string) {
    this.popups.push({ x, y, text, color, t: 0.9 });
  }

  private damage(atk: number, kind: 'phys' | 'magic', def: number, res: number): number {
    return kind === 'phys' ? Math.max(atk - def, atk * 0.15) : atk * (1 - res / 100);
  }

  private rangeTiles(op: Op): Set<string> {
    const set = new Set<string>();
    for (const r of CLASSES[op.cls].range) {
      const [dx, dy] = rotate(r, op.facing);
      set.add(`${op.x + dx},${op.y + dy}`);
    }
    return set;
  }

  rangeList(op: Op): [number, number][] {
    return CLASSES[op.cls].range.map((r) => {
      const [dx, dy] = rotate(r, op.facing);
      return [op.x + dx, op.y + dy];
    });
  }

  private enemiesInRange(op: Op): Enemy[] {
    const tiles = this.rangeTiles(op);
    const melee = MELEE.includes(op.cls);
    return this.enemies.filter((e) => e.hp > 0 && !(melee && e.def.flying) && tiles.has(`${Math.round(e.x)},${Math.round(e.y)}`));
  }

  private alliesInRange(op: Op): Op[] {
    const tiles = this.rangeTiles(op);
    return this.ops.filter((a) => a !== op && tiles.has(`${a.x},${a.y}`));
  }

  private pickTarget(op: Op): Enemy | undefined {
    // an enemy blocked by this operator shares its tile, so it is always a valid target whatever the facing
    const blocked = op.blocked.filter((e) => e.hp > 0);
    const pool = blocked.length ? blocked : this.enemiesInRange(op);
    return pool.sort((a, b) => b.p - a.p)[0];
  }

  private heal(a: Op, amount: number) {
    const before = a.hp;
    a.hp = Math.min(a.maxHp, a.hp + amount);
    if (a.hp > before) this.pop(a.x, a.y - 0.4, '+' + Math.round(a.hp - before), '#8fe0a0');
  }

  private hurtEnemy(e: Enemy, rawDmg: number, el: Elem) {
    const m = elemMult(e.def.elem, el);
    const dmg = rawDmg * m;
    e.hp -= dmg;
    e.hurtAnim = 0.12;
    if (m > 1) this.pop(e.x, e.y - 0.5, Math.round(dmg) + '▲', '#ffd76a');
    else if (m < 1) this.pop(e.x, e.y - 0.5, Math.round(dmg) + '▼', '#9a90c0');
    else this.pop(e.x, e.y - 0.5, String(Math.round(dmg)), '#ffffff');
    // elemental reaction: two different elements within a short window
    if (e.aura && e.aura.t > 0 && e.aura.el !== el) {
      const bonus = dmg * 0.8 + 40;
      e.hp -= bonus;
      this.pop(e.x, e.y - 0.9, t('reaction') + ' ' + Math.round(bonus), '#ff9ad0');
      if (e.aura.el === 'frost' || el === 'frost') e.freezeT = 1.2;
      e.aura = null;
      this.onSfx('react');
    } else {
      e.aura = { el, t: 4 };
    }
    if (el === 'frost') { e.slowT = Math.max(e.slowT, 1.5); e.slowV = Math.min(e.slowV || 1, 0.6); }
    this.onSfx('hit');
  }

  private unblock(e: Enemy) {
    if (e.blockedBy) e.blockedBy.blocked = e.blockedBy.blocked.filter((x) => x !== e);
    e.blockedBy = null;
  }

  private removeOp(op: Op, cooldown: number) {
    for (const e of [...op.blocked]) this.unblock(e);
    this.ops = this.ops.filter((o) => o !== op);
    this.cooldown[op.hero.id] = cooldown;
  }

  private spawn(type: string, path: [number, number][], p = 0) {
    const def = ENEMIES[type];
    const e: Enemy = {
      uid: this.uid++, type, def, hp: def.hp, maxHp: def.hp, path, p, x: 0, y: 0,
      blockedBy: null, cd: def.interval, slowT: 0, slowV: 1, freezeT: 0, aura: null, hurtAnim: 0,
      spdMul: 1, atkMul: 1, phase: 0, abCd: def.healAura?.every ?? 0,
    };
    this.place(e);
    this.enemies.push(e);
    return e;
  }

  /** Sets x,y from the continuous path index. */
  private place(e: Enemy) {
    const path = e.path;
    const i = Math.min(Math.floor(e.p), path.length - 1), f = e.p - i;
    const a = path[i], b = path[Math.min(i + 1, path.length - 1)];
    e.x = a[0] + (b[0] - a[0]) * f;
    e.y = a[1] + (b[1] - a[1]) * f;
  }

  // ------------------------------------------------------------------ main step
  update(realDt: number) {
    const dt = Math.min(realDt, 0.05) * this.speed;
    for (const p of this.popups) p.t -= realDt;
    const fdt = this.paused ? 0 : Math.min(realDt, 0.05) * this.speed;
    for (const f of this.fx) f.age += fdt;
    this.fx = this.fx.filter((f) => f.age < f.dur);
    this.popups = this.popups.filter((p) => p.t > 0);
    if (this.paused || this.state !== 'play') return;

    this.time += dt;
    this.cost = Math.min(COST_MAX, this.cost + COST_RATE * dt);
    for (const k of Object.keys(this.cooldown)) this.cooldown[k] = Math.max(0, this.cooldown[k] - dt);

    const lanes = stagePaths(this.stage);
    while (this.spawnIdx < this.stage.spawns.length && this.stage.spawns[this.spawnIdx].t <= this.time) {
      const sp = this.stage.spawns[this.spawnIdx++];
      this.spawn(sp.type, lanes[sp.lane ?? 0] ?? lanes[0]);
    }

    this.updateEnemies(dt);
    this.updateOps(dt);

    // cleanup
    for (const e of this.enemies) {
      if (e.hp > 0) continue;
      this.unblock(e);
      if (e.p < e.path.length - 1) { this.kills++; this.onSfx('kill'); } // leaked enemies are not kills
    }
    this.enemies = this.enemies.filter((e) => e.hp > 0);
    for (const o of [...this.ops]) if (o.hp <= 0) { this.removeOp(o, 25); this.pop(o.x, o.y - 0.5, t('fell'), '#ff6b6b'); }

    if (this.lives <= 0) { this.state = 'lose'; this.onSfx('lose'); }
    else if (this.spawnIdx >= this.stage.spawns.length && this.enemies.length === 0) { this.state = 'win'; this.onSfx('win'); }
  }

  private updateEnemies(dt: number) {
    for (const e of this.enemies) {
      const path = e.path;
      e.hurtAnim = Math.max(0, e.hurtAnim - dt);
      if (e.aura) { e.aura.t -= dt; if (e.aura.t <= 0) e.aura = null; }
      e.slowT = Math.max(0, e.slowT - dt);
      if (e.slowT === 0) e.slowV = 1;
      if (e.freezeT > 0) { e.freezeT -= dt; continue; }
      this.checkPhase(e);
      this.healPulse(e, dt);

      if (e.blockedBy && e.blockedBy.hp <= 0) this.unblock(e);

      // get blocked by a ground operator standing on this tile
      if (!e.blockedBy && !e.def.flying) {
        const o = this.ops.find((op) => CLASSES[op.cls].deploy === 'ground' && op.blocked.length < CLASSES[op.cls].block
          && Math.abs(op.x - e.x) < 0.3 && Math.abs(op.y - e.y) < 0.3);
        if (o) { e.blockedBy = o; o.blocked.push(e); }
      }

      if (e.blockedBy) {
        e.cd -= dt;
        if (e.cd <= 0 && e.def.atk > 0) {
          e.cd = e.def.interval;
          const o = e.blockedBy;
          const d = this.damage(e.def.atk * e.atkMul, 'phys', o.def, o.res);
          o.hp -= d;
          o.hurtAnim = 0.15;
          this.pop(o.x, o.y - 0.7, String(Math.round(d)), '#ff8a8a');
        }
        continue;
      }

      if (e.def.range && e.def.atk > 0) this.shoot(e, dt);

      e.p += e.def.speed * e.spdMul * (e.slowT > 0 ? e.slowV : 1) * dt;
      if (e.p >= path.length - 1) {
        this.lives -= e.def.boss ? 2 : 1;
        this.leaks++;
        e.hp = 0;
        this.pop(path[path.length - 1][0], path[path.length - 1][1] - 0.5, '-1 ❤', '#ff5f5f');
        this.onSfx('leak');
        continue;
      }
      this.place(e);
    }
    this.enemies = this.enemies.filter((e) => !(e.hp <= 0 && e.p >= e.path.length - 1));
  }

  /** Ranged enemies keep walking and shoot the nearest operator in range. */
  private shoot(e: Enemy, dt: number) {
    e.cd -= dt;
    if (e.cd > 0) return;
    let best: Op | null = null, bd = e.def.range!;
    for (const o of this.ops) {
      const d = Math.hypot(o.x - e.x, o.y - e.y);
      if (d <= bd) { best = o; bd = d; }
    }
    if (!best) { e.cd = 0; return; }
    e.cd = e.def.interval;
    const dmg = this.damage(e.def.atk * e.atkMul, 'phys', best.def, best.res);
    best.hp -= dmg;
    best.hurtAnim = 0.15;
    this.addFx('bullet', e.x, e.y, best.x, best.y, '#ff8a8a', 0.16);
    this.pop(best.x, best.y - 0.7, String(Math.round(dmg)), '#ff8a8a');
  }

  /** Healer enemies mend wounded allies in a radius. */
  private healPulse(e: Enemy, dt: number) {
    const h = e.def.healAura;
    if (!h) return;
    e.abCd -= dt;
    if (e.abCd > 0) return;
    const hurt = this.enemies.filter((o) => o !== e && o.hp > 0 && o.hp < o.maxHp && Math.hypot(o.x - e.x, o.y - e.y) <= h.radius);
    if (!hurt.length) { e.abCd = 0; return; }
    e.abCd = h.every;
    for (const o of hurt) {
      const gain = Math.min(o.maxHp - o.hp, o.maxHp * h.pct);
      o.hp += gain;
      this.pop(o.x, o.y - 0.5, '+' + Math.round(gain), '#8fe0a0');
    }
    this.addFx('ring', e.x, e.y, e.x, e.y, '#8fe0a0', 0.5, 0, 1.8);
  }

  /** Boss phases: trigger once when HP drops under the threshold. */
  private checkPhase(e: Enemy) {
    const ph = e.def.phases?.[e.phase];
    if (!ph || e.hp <= 0 || e.hp / e.maxHp > ph.at) return;
    e.phase++;
    e.spdMul *= ph.speedMul ?? 1;
    e.atkMul *= ph.atkMul ?? 1;
    this.pop(e.x, e.y - 1, L(ph.label), '#ff9ad0');
    this.addFx('flash', e.x, e.y, e.x, e.y, '#ff6b8a', 0.5);
    this.addFx('ring', e.x, e.y, e.x, e.y, '#ff6b8a', 0.7, 0, 3);
    this.onSfx('skill');
    if (ph.summon) {
      for (let i = 0; i < ph.summon.n; i++) {
        this.spawn(ph.summon.type, e.path, Math.max(0, e.p - 0.4 - i * 0.35));
        this.summoned++;
      }
    }
  }

  private updateOps(dt: number) {
    for (const op of this.ops) {
      op.atkAnim = Math.max(0, op.atkAnim - dt);
      op.hurtAnim = Math.max(0, op.hurtAnim - dt);
      op.cd -= dt;
      op.sp = Math.min(CLASSES[op.cls].skill.sp, op.sp + dt);
      if (op.buffT > 0) { op.buffT -= dt; if (op.buffT <= 0) op.buffV = 1; }
      if (op.hasteT > 0) op.hasteT -= dt;
      if (op.cd > 0) continue;

      const c = CLASSES[op.cls];
      const interval = op.interval / (op.hasteT > 0 ? CLASSES[op.cls].skill.value : 1);
      const atk = op.atk * (op.buffT > 0 ? op.buffV : 1);

      if (c.dmg === 'heal') {
        const hurt = this.alliesInRange(op).filter((a) => a.hp < a.maxHp).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
        if (!hurt) continue;
        op.cd = interval; op.atkAnim = 0.25;
        this.heal(hurt, atk);
        this.addFx('heal', op.x, op.y, hurt.x, hurt.y, '#8fe0a0', 0.4);
        this.onSfx('heal');
        continue;
      }
      const t = this.pickTarget(op);
      if (!t) continue;
      op.cd = interval;
      op.atkAnim = 0.25;
      this.attackFx(op, t);
      if (c.dmg === 'slow') {
        t.slowT = 2.5; t.slowV = Math.min(t.slowV || 1, 0.55);
        this.hurtEnemy(t, this.damage(atk * 0.5, 'magic', t.def.def, t.def.res), op.hero.elem);
      } else {
        this.hurtEnemy(t, this.damage(atk, c.dmg, t.def.def, t.def.res), op.hero.elem);
      }
    }
  }

  stars(): number {
    return this.leaks === 0 ? 3 : this.leaks <= 2 ? 2 : 1;
  }
}
