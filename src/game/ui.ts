// Rendering + input for the battle. Everything is drawn on one 960x600 canvas; hit areas are rebuilt each frame.

import { CLASSES, ENEMIES, heroById, type Dir, type Hero } from './data';
import { Battle, COST_MAX, type Enemy, type Op } from './engine';
import { enemySprite, heroSprite, type Frame } from './sprites';
import { playSfx, unlockAudio } from './audio';

export const W = 960;
export const H = 600;
const T = 72;
const HUD_H = 44;
const DECK_Y = 496;
const CARD_W = 84;
const CARD_H = 96;
const FONT = "'Mitr', system-ui, sans-serif";

interface Btn { x: number; y: number; w: number; h: number; fn: () => void; hoverDir?: Dir }

const REASON: Record<string, string> = {
  cost: 'แต้มวางตัวไม่พอ',
  tile: 'วางตรงนี้ไม่ได้ (ระยะประชิดวางพื้นต่ำ · ระยะไกลวางที่สูง)',
  occupied: 'ช่องนี้มีตัวละครอยู่แล้ว',
  limit: 'ลงสนามได้จำนวนจำกัด',
  cooldown: 'ยังวางใหม่ไม่ได้ รอคูลดาวน์',
  already: 'ตัวละครนี้อยู่ในสนามแล้ว',
};

const DIRS: { d: Dir; dx: number; dy: number }[] = [
  { d: 0, dx: 1, dy: 0 }, { d: 1, dx: 0, dy: 1 }, { d: 2, dx: -1, dy: 0 }, { d: 3, dx: 0, dy: -1 },
];

export class Game {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  battle: Battle;
  private makeBattle: () => Battle;
  private buttons: Btn[] = [];
  private t = 0;
  private last = 0;
  private muted = false;
  private selHero: string | null = null;
  private placing: { x: number; y: number } | null = null;
  private selOp: number | null = null;
  private hover = { x: -1, y: -1 };
  private hoverDir: Dir | null = null;
  private msg = '';
  private msgT = 0;
  private mx = (W - 12 * T) / 2;
  private my = HUD_H + 8;
  private scene: 'title' | 'battle' = 'title';
  private trans: { t: number; dur: number; action: () => void; acted: boolean } | null = null;
  private homeArm = 0;
  private stars = Array.from({ length: 110 }, () => ({
    x: Math.random() * W, y: Math.random() * H * 0.9, v: 2 + Math.random() * 9, s: Math.random() < 0.15 ? 3 : 2, ph: Math.random() * 6.28, sp: 1 + Math.random() * 3,
  }));
  private petals = Array.from({ length: 26 }, () => ({
    x: Math.random() * W, y: Math.random() * H, vx: -8 - Math.random() * 14, vy: 14 + Math.random() * 22, r: Math.random() * 6.28, rv: 0.6 + Math.random() * 1.6,
    c: ['#ffb3d0', '#e6c2ff', '#ffd6e6'][Math.floor(Math.random() * 3)], s: 0.7 + Math.random() * 0.8,
  }));

  constructor(canvas: HTMLCanvasElement, makeBattle: () => Battle) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    canvas.width = W;
    canvas.height = H;
    this.makeBattle = makeBattle;
    this.battle = this.attach(makeBattle());
    canvas.addEventListener('pointerdown', (e) => this.onDown(e));
    canvas.addEventListener('pointermove', (e) => this.onMove(e));
    window.addEventListener('keydown', (e) => {
      if (this.scene === 'title') {
        if (e.code === 'Space' || e.code === 'Enter') { unlockAudio(); this.startGame(); e.preventDefault(); }
        return;
      }
      if (e.code === 'Space') { this.battle.paused = !this.battle.paused; e.preventDefault(); }
      if (e.key === '1') this.battle.speed = 1;
      if (e.key === '2') this.battle.speed = 2;
      if (e.key === 'Escape') this.clearSelection();
    });
    requestAnimationFrame((ts) => this.loop(ts));
  }

  private attach(b: Battle): Battle {
    b.onSfx = (s) => playSfx(s, this.muted);
    return b;
  }

  restart() {
    const speed = this.battle.speed;
    this.battle = this.attach(this.makeBattle());
    this.battle.speed = speed;
    this.clearSelection();
  }

  private clearSelection() {
    this.selHero = null;
    this.placing = null;
    this.selOp = null;
    this.hoverDir = null;
  }

  private toast(text: string) {
    this.msg = text;
    this.msgT = 2.2;
  }

  // ------------------------------------------------------------------ input
  private pos(e: PointerEvent): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  }

  private tileAt(x: number, y: number): { x: number; y: number } | null {
    const tx = Math.floor((x - this.mx) / T), ty = Math.floor((y - this.my) / T);
    if (tx < 0 || ty < 0 || tx >= this.battle.stage.cols || ty >= this.battle.stage.rows) return null;
    return { x: tx, y: ty };
  }

  private onMove(e: PointerEvent) {
    const p = this.pos(e);
    const t = this.tileAt(p.x, p.y);
    this.hover = t ?? { x: -1, y: -1 };
    this.hoverDir = null;
    for (const b of this.buttons) {
      if (b.hoverDir !== undefined && p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) this.hoverDir = b.hoverDir;
    }
  }

  private onDown(e: PointerEvent) {
    unlockAudio();
    if (this.trans) return;
    const p = this.pos(e);
    this.onMove(e);
    for (let i = this.buttons.length - 1; i >= 0; i--) {
      const b = this.buttons[i];
      if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) { b.fn(); return; }
    }
    if (this.scene === 'title') return;
    const t = this.tileAt(p.x, p.y);
    if (!t) { this.clearSelection(); return; }
    this.clickTile(t.x, t.y);
  }

  private clickTile(x: number, y: number) {
    const b = this.battle;
    if (this.placing && (this.placing.x !== x || this.placing.y !== y)) this.placing = null;
    if (this.selHero) {
      const reason = b.canDeploy(this.selHero, x, y);
      if (reason) { this.toast(reason === 'limit' ? `ลงสนามได้สูงสุด ${b.stage.deployLimit} ตัว` : REASON[reason] ?? '...'); return; }
      this.placing = { x, y };
      return;
    }
    const op = b.opAt(x, y);
    this.selOp = op ? op.uid : null;
  }

  private chooseDir(d: Dir) {
    if (!this.placing || !this.selHero) return;
    this.battle.deploy(this.selHero, this.placing.x, this.placing.y, d);
    this.clearSelection();
  }

  private pickHero(id: string) {
    const b = this.battle;
    if (b.deployed(id)) { this.toast(REASON.already); return; }
    if ((b.cooldown[id] ?? 0) > 0) { this.toast(REASON.cooldown); return; }
    this.selOp = null;
    this.placing = null;
    this.selHero = this.selHero === id ? null : id;
  }

  // ------------------------------------------------------------------ loop
  private loop(ts: number) {
    const dt = Math.min(0.1, (ts - this.last) / 1000 || 0);
    this.last = ts;
    this.t += dt;
    this.msgT = Math.max(0, this.msgT - dt);
    this.homeArm = Math.max(0, this.homeArm - dt);
    if (this.scene === 'battle') this.battle.update(dt);
    if (this.trans) {
      this.trans.t += dt;
      if (!this.trans.acted && this.trans.t >= this.trans.dur / 2) { this.trans.acted = true; this.trans.action(); }
      if (this.trans.t >= this.trans.dur) this.trans = null;
    }
    this.draw();
    requestAnimationFrame((n) => this.loop(n));
  }

  // ------------------------------------------------------------------ drawing helpers
  private rr(x: number, y: number, w: number, h: number, r: number, fill: string, stroke?: string) {
    const c = this.ctx;
    c.beginPath();
    c.roundRect(x, y, w, h, r);
    c.fillStyle = fill;
    c.fill();
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = 2; c.stroke(); }
  }

  private text(s: string, x: number, y: number, size: number, color = '#f2ecff', align: CanvasTextAlign = 'left', weight = 600) {
    const c = this.ctx;
    c.font = `${weight} ${size}px ${FONT}`;
    c.textAlign = align;
    c.textBaseline = 'middle';
    c.fillStyle = color;
    c.fillText(s, x, y);
  }

  private btn(x: number, y: number, w: number, h: number, label: string, fn: () => void, color = '#6a4fb0', hoverDir?: Dir, size?: number) {
    this.rr(x, y, w, h, 8, color, '#1c1030');
    this.text(label, x + w / 2, y + h / 2 + 1, size ?? Math.min(16, h * 0.5), '#ffffff', 'center');
    this.buttons.push({ x, y, w, h, fn, hoverDir });
  }

  private cx(tx: number) { return this.mx + (tx + 0.5) * T; }
  private cy(ty: number) { return this.my + (ty + 0.5) * T; }

  // ------------------------------------------------------------------ draw
  private draw() {
    const c = this.ctx;
    const b = this.battle;
    this.buttons = [];
    if (this.scene === 'title') { c.imageSmoothingEnabled = false; this.drawTitle(); this.drawTransition(); return; }
    c.imageSmoothingEnabled = false;
    c.fillStyle = '#120d24';
    c.fillRect(0, 0, W, H);

    this.drawMap();
    this.drawRangePreview();
    this.drawUnits();
    this.drawFx();
    this.drawPopups();
    this.drawHud();
    this.drawDeck();
    if (this.selOp !== null) this.drawOpPanel();
    if (this.placing && this.selHero) this.drawDirPicker();

    if (this.msgT > 0) {
      c.globalAlpha = Math.min(1, this.msgT);
      this.rr(W / 2 - 250, this.my + 6 * T - 40, 500, 32, 10, '#000000aa');
      this.text(this.msg, W / 2, this.my + 6 * T - 24, 15, '#ffd6e6', 'center');
      c.globalAlpha = 1;
    }
    if (b.state !== 'play') this.drawEnd();
    this.drawTransition();
  }

  private drawMap() {
    const c = this.ctx;
    const b = this.battle;
    const { cols, rows, tiles, path } = b.stage;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const k = tiles[y][x];
        const px = this.mx + x * T, py = this.my + y * T;
        if (k === 'w') { c.fillStyle = '#17112b'; c.fillRect(px, py, T, T); continue; }
        const alt = (x + y) % 2 === 0;
        if (k === 'g') {
          c.fillStyle = alt ? '#352c5e' : '#312858';
          c.fillRect(px, py, T, T);
          c.fillStyle = '#241d44';
          c.fillRect(px, py + T - 4, T, 4);
        } else {
          c.fillStyle = alt ? '#6a60b4' : '#645aae';
          c.fillRect(px, py, T, T);
          c.fillStyle = '#463d80';
          c.fillRect(px, py + T - 10, T, 10);
          c.fillStyle = '#7c72c6';
          c.fillRect(px, py, T, 3);
        }
        c.strokeStyle = '#00000033';
        c.lineWidth = 1;
        c.strokeRect(px + 0.5, py + 0.5, T - 1, T - 1);
      }
    }
    // path direction dots
    c.fillStyle = '#ffffff22';
    for (let i = 0; i < path.length - 1; i++) {
      const [x0, y0] = path[i], [x1, y1] = path[i + 1];
      c.fillRect(this.cx((x0 + x1) / 2) - 3, this.cy((y0 + y1) / 2) - 3, 6, 6);
    }
    // spawn / goal markers
    const s = path[0], g = path[path.length - 1];
    this.marker(this.cx(s[0]), this.cy(s[1]), '#e0465a', 'เข้า');
    this.marker(this.cx(g[0]), this.cy(g[1]), '#4a9ee0', 'ฐาน');
  }

  private marker(x: number, y: number, color: string, label: string) {
    const c = this.ctx;
    c.globalAlpha = 0.85;
    this.rr(x - 26, y - 26, 52, 52, 8, color + '55', color);
    c.globalAlpha = 1;
    this.text(label, x, y, 14, '#ffffff', 'center');
  }

  private drawRangePreview() {
    const b = this.battle;
    const c = this.ctx;
    let tiles: [number, number][] = [];
    let color = '#ffffff';
    if (this.selOp !== null) {
      const op = b.ops.find((o) => o.uid === this.selOp);
      if (op) { tiles = b.rangeList(op); color = op.hero.color; }
    } else if (this.placing && this.selHero) {
      const h = heroById(this.selHero);
      const d = this.hoverDir ?? 0;
      tiles = CLASSES[h.cls].range.map(([dx, dy]) => {
        const r: [number, number] = d === 0 ? [dx, dy] : d === 1 ? [-dy, dx] : d === 2 ? [-dx, -dy] : [dy, -dx];
        return [this.placing!.x + r[0], this.placing!.y + r[1]];
      });
      color = h.color;
    }
    c.globalAlpha = 0.38;
    c.fillStyle = color;
    for (const [x, y] of tiles) {
      if (b.tile(x, y) === '' || b.tile(x, y) === 'w') continue;
      c.fillRect(this.mx + x * T + 3, this.my + y * T + 3, T - 6, T - 6);
    }
    c.globalAlpha = 1;
    // selection / hover outline
    if (this.placing) this.outline(this.placing.x, this.placing.y, '#ffe27a');
    else if (this.selHero && this.hover.x >= 0) {
      this.outline(this.hover.x, this.hover.y, b.canDeploy(this.selHero, this.hover.x, this.hover.y) ? '#8fe0a0' : '#ff7a7a');
    }
  }

  private outline(x: number, y: number, color: string) {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(this.mx + x * T + 2, this.my + y * T + 2, T - 4, T - 4);
  }

  private frameFor(op: Op): Frame {
    if (op.atkAnim > 0) return 'attack';
    const ph = (this.t + op.uid * 0.9) % 3.6;
    if (ph < 0.14) return 'blink';
    if (ph > 1.9 && ph < 2.3) return 'sway';
    return 'idle';
  }

  private drawUnits() {
    const c = this.ctx;
    const b = this.battle;
    const items: { y: number; draw: () => void }[] = [];
    for (const op of b.ops) items.push({ y: op.y + 0.01, draw: () => this.drawOp(op) });
    for (const e of b.enemies) items.push({ y: e.y + 0.005, draw: () => this.drawEnemy(e) });
    items.sort((a, z) => a.y - z.y);
    for (const it of items) it.draw();
    c.globalAlpha = 1;
  }

  private bar(x: number, y: number, w: number, frac: number, color: string, h = 4) {
    const c = this.ctx;
    c.fillStyle = '#000000aa';
    c.fillRect(x - 1, y - 1, w + 2, h + 2);
    c.fillStyle = color;
    c.fillRect(x, y, Math.max(0, Math.min(1, frac)) * w, h);
  }

  /** Per-class body motion during the attack animation (0.25 s). */
  private atkOffset(op: Op): { dx: number; dy: number } {
    if (op.atkAnim <= 0) return { dx: 0, dy: 0 };
    const k = op.atkAnim / 0.25;
    const s = Math.sin(Math.PI * (1 - k));
    const f = DIRS[op.facing];
    switch (op.cls) {
      case 'vanguard': return { dx: f.dx * s * 12, dy: f.dy * s * 10 };
      case 'guard': return { dx: f.dx * s * 15, dy: f.dy * s * 12 };
      case 'specialist': return { dx: f.dx * s * 8 + Math.sin(this.t * 70) * 2, dy: f.dy * s * 6 };
      case 'defender': return { dx: 0, dy: -s * 8 };
      case 'sniper': return { dx: -f.dx * k * 7, dy: -f.dy * k * 5 };
      case 'caster': return { dx: 0, dy: -s * 11 };
      default: return { dx: 0, dy: -s * 5 };
    }
  }

  private drawOp(op: Op) {
    const c = this.ctx;
    const S = 3;
    const spr = heroSprite(op.hero, this.frameFor(op));
    const cx = this.cx(op.x), cy = this.cy(op.y);
    const x0 = cx - 10.5 * S, y0 = cy + 26 - 24 * S;
    c.save();
    c.fillStyle = '#00000055';
    c.beginPath(); c.ellipse(cx, cy + 27, 22, 6, 0, 0, Math.PI * 2); c.fill();
    const off = this.atkOffset(op);
    c.translate(off.dx, off.dy);
    if (op.facing === 2) { c.translate(cx * 2, 0); c.scale(-1, 1); }
    if (op.hurtAnim > 0) c.globalAlpha = 0.6;
    c.drawImage(spr, x0, y0, spr.width * S, spr.height * S);
    c.restore();
    this.bar(cx - 22, cy + 31, 44, op.hp / op.maxHp, '#6fe0a0');
    const sk = CLASSES[op.cls].skill;
    this.bar(cx - 22, cy + 37, 44, op.sp / sk.sp, op.sp >= sk.sp ? '#ffe27a' : '#8a7ad0', 3);
    if (op.sp >= sk.sp) this.text('★', cx + 26, cy - 30 + Math.sin(this.t * 6) * 2, 18, '#ffe27a', 'center');
    // facing marker
    const f = DIRS[op.facing];
    this.text('▸', cx + f.dx * 30, cy + 30 + f.dy * 20 - 4, 12, op.hero.color, 'center');
    if (this.selOp === op.uid) this.outline(op.x, op.y, '#ffe27a');
  }

  private drawEnemy(e: Enemy) {
    const c = this.ctx;
    const S = e.def.boss ? 6 : 4;
    const spr = enemySprite(e.def.sprite);
    const w = spr.width * S, h = spr.height * S;
    const cx = this.cx(e.x), cy = this.cy(e.y);
    const hover = e.def.flying ? -22 + Math.sin(this.t * 5 + e.uid) * 4 : Math.abs(Math.sin(this.t * 6 + e.uid)) * -3;
    const x = cx - w / 2, y = cy + 22 - h + hover;
    c.fillStyle = '#00000044';
    c.beginPath(); c.ellipse(cx, cy + 24, w * 0.4, 5, 0, 0, Math.PI * 2); c.fill();
    c.drawImage(spr, x, y, w, h);
    if (e.hurtAnim > 0) {
      // soft hit flash: a translucent white copy on top, so the enemy never turns fully white
      c.globalAlpha = 0.45;
      c.drawImage(enemySprite(e.def.sprite, true), x, y, w, h);
      c.globalAlpha = 1;
    }
    if (e.freezeT > 0) { c.strokeStyle = '#9fe8ff'; c.lineWidth = 3; c.strokeRect(x - 2, y - 2, w + 4, h + 4); }
    this.bar(cx - 20, y - 8, 40, e.hp / e.maxHp, e.def.boss ? '#ffb347' : '#ff6b8a');
    if (e.aura) { c.fillStyle = this.auraColor(e.aura.el); c.beginPath(); c.arc(cx + w / 2 + 2, y + 4, 4, 0, Math.PI * 2); c.fill(); }
    if (e.slowT > 0) this.text('❄', cx - w / 2 - 6, y + 4, 12, '#9fe8ff', 'center');
  }

  private auraColor(el: string): string {
    return el === 'volt' ? '#b98cff' : el === 'ember' ? '#ff7a59' : el === 'frost' ? '#7fd8ff' : '#6fe3b4';
  }

  private drawFx() {
    const c = this.ctx;
    for (const f of this.battle.fx) {
      if (f.age < 0) continue;
      const p = Math.min(1, f.age / f.dur);
      const x0 = this.cx(f.x0), y0 = this.cy(f.y0) - 12, x1 = this.cx(f.x1), y1 = this.cy(f.y1) - 8;
      c.save();
      c.lineCap = 'round';
      switch (f.kind) {
        case 'slash': {
          c.translate(x1, y1);
          c.rotate(Math.atan2(y1 - y0, x1 - x0));
          const r = 24 * f.size, a0 = -1.25 + p * 0.8;
          c.globalAlpha = 1 - p * p;
          c.strokeStyle = f.color; c.lineWidth = 9 * (1 - p) + 2;
          c.beginPath(); c.arc(-6, 0, r, a0, a0 + 1.3); c.stroke();
          c.strokeStyle = '#ffffff'; c.lineWidth = 3 * (1 - p) + 1;
          c.beginPath(); c.arc(-6, 0, r, a0 + 0.1, a0 + 1.2); c.stroke();
          break;
        }
        case 'claw': {
          c.translate(x1, y1);
          c.rotate(Math.atan2(y1 - y0, x1 - x0) + 0.5);
          c.globalAlpha = 1 - p;
          const len = 20 * Math.min(1, p * 3);
          for (let i = -1; i <= 1; i++) {
            c.strokeStyle = i === 0 ? '#ffffff' : f.color; c.lineWidth = 3;
            c.beginPath(); c.moveTo(i * 9, -len); c.lineTo(i * 9 + 4, len); c.stroke();
          }
          break;
        }
        case 'bullet': {
          const hx = x0 + (x1 - x0) * p, hy = y0 + (y1 - y0) * p;
          const q = Math.max(0, p - 0.4), tx = x0 + (x1 - x0) * q, ty = y0 + (y1 - y0) * q;
          c.strokeStyle = f.color; c.lineWidth = 5;
          c.beginPath(); c.moveTo(tx, ty); c.lineTo(hx, hy); c.stroke();
          c.strokeStyle = '#ffffff'; c.lineWidth = 2;
          c.beginPath(); c.moveTo(tx, ty); c.lineTo(hx, hy); c.stroke();
          break;
        }
        case 'orb': {
          const e = p * p * (3 - 2 * p);
          for (let i = 3; i >= 0; i--) {
            const q = Math.max(0, e - i * 0.07);
            c.globalAlpha = i === 0 ? 1 : 0.22;
            c.fillStyle = i === 0 ? '#ffffff' : f.color;
            c.beginPath(); c.arc(x0 + (x1 - x0) * q, y0 + (y1 - y0) * q - Math.sin(Math.PI * q) * 14, i === 0 ? 6 : 9 - i, 0, Math.PI * 2); c.fill();
          }
          c.globalAlpha = 0.5; c.fillStyle = f.color;
          c.beginPath(); c.arc(x0 + (x1 - x0) * e, y0 + (y1 - y0) * e - Math.sin(Math.PI * e) * 14, 11, 0, Math.PI * 2); c.fill();
          break;
        }
        case 'burst': {
          c.globalAlpha = 1 - p;
          c.strokeStyle = f.color; c.lineWidth = 6 * (1 - p) + 1;
          c.beginPath(); c.arc(x1, y1, 8 + p * 30 * f.size, 0, Math.PI * 2); c.stroke();
          c.globalAlpha = 0.4 * (1 - p); c.fillStyle = '#ffffff';
          c.beginPath(); c.arc(x1, y1, 4 + p * 16 * f.size, 0, Math.PI * 2); c.fill();
          break;
        }
        case 'ring': {
          c.globalAlpha = 0.8 * (1 - p);
          c.strokeStyle = f.color; c.lineWidth = 5 * (1 - p) + 1;
          c.beginPath(); c.ellipse(x0, y0 + 14, p * T * f.size, p * T * f.size * 0.55, 0, 0, Math.PI * 2); c.stroke();
          break;
        }
        case 'heal': {
          c.fillStyle = f.color;
          c.font = `700 16px ${FONT}`;
          c.textAlign = 'center';
          for (let i = 0; i < 3; i++) {
            const q = Math.min(1, Math.max(0, p * 1.4 - i * 0.18));
            c.globalAlpha = Math.sin(Math.PI * q);
            c.fillText('+', x0 + (x1 - x0) * q + Math.sin(q * 9 + i) * 6, y0 + (y1 - y0) * q - q * 10);
          }
          break;
        }
        case 'flash': {
          c.globalAlpha = 0.16 * (1 - p);
          c.fillStyle = f.color;
          c.fillRect(0, 0, W, H);
          break;
        }
      }
      c.restore();
    }
  }

  private drawPopups() {
    const c = this.ctx;
    for (const p of this.battle.popups) {
      const k = 1 - p.t / 0.9;
      c.globalAlpha = Math.min(1, p.t * 2.5);
      this.text(p.text, this.cx(p.x), this.cy(p.y) - 20 - k * 26, p.text.length > 6 ? 15 : 14, p.color, 'center', 700);
    }
    c.globalAlpha = 1;
  }

  private drawHud() {
    const b = this.battle;
    this.rr(0, 0, W, HUD_H, 0, '#1c1438');
    this.text('♥', 22, 23, 22, '#ff6b8a', 'center');
    this.text(String(b.lives), 46, 24, 22, '#ffffff');
    // cost
    this.text('แต้มวางตัว', 120, 23, 14, '#bfb2f0');
    this.bar(210, 17, 210, b.cost / COST_MAX, '#ffd76a', 12);
    this.text(String(Math.floor(b.cost)), 432, 24, 20, '#ffe27a');
    // progress
    const total = b.stage.spawns.length;
    const done = b.kills + b.leaks;
    this.text(`ศัตรู ${Math.min(done, total)}/${total}`, 530, 24, 14, '#bfb2f0');
    this.btn(W - 278, 6, 60, 32, '⌂', () => this.homePress(), this.homeArm > 0 ? '#b04a6a' : '#4a3a8a');
    this.btn(W - 210, 6, 60, 32, b.paused ? '▶' : '❚❚', () => { b.paused = !b.paused; }, '#4a3a8a');
    this.btn(W - 142, 6, 60, 32, '×' + b.speed, () => { b.speed = b.speed === 1 ? 2 : 1; }, '#4a3a8a');
    this.btn(W - 74, 6, 60, 32, this.muted ? '🔇' : '🔊', () => { this.muted = !this.muted; }, '#4a3a8a');
    if (b.paused) this.text('หยุดชั่วคราว — วางตัวละครได้', W / 2, this.my + 16, 16, '#ffe27a', 'center');
  }

  private drawDeck() {
    const c = this.ctx;
    const b = this.battle;
    const n = b.deck.length;
    const gap = 8;
    const x0 = (W - (n * CARD_W + (n - 1) * gap)) / 2;
    b.deck.forEach((id, i) => {
      const h = heroById(id);
      const def = CLASSES[h.cls];
      const x = x0 + i * (CARD_W + gap), y = DECK_Y;
      const dep = !!b.deployed(id);
      const cd = b.cooldown[id] ?? 0;
      const can = !dep && cd <= 0 && b.cost >= def.cost;
      const sel = this.selHero === id;
      this.rr(x, y + (sel ? -8 : 0), CARD_W, CARD_H, 10, sel ? '#4a3a8a' : '#2a2050', sel ? '#ffe27a' : h.color + 'aa');
      c.fillStyle = h.color + (can ? 'ff' : '66');
      c.fillRect(x + 6, y + (sel ? -8 : 0) + 5, CARD_W - 12, 4);
      const spr = heroSprite(h, 'idle');
      c.globalAlpha = can ? 1 : 0.45;
      c.drawImage(spr, x + CARD_W / 2 - spr.width * 1.4, y + (sel ? -8 : 0) + 4, spr.width * 2.8, spr.height * 2.8);
      c.globalAlpha = 1;
      this.text(h.name.th, x + CARD_W / 2, y + (sel ? -8 : 0) + CARD_H - 22, 12, can ? '#ffffff' : '#9a90c0', 'center');
      this.rr(x + 6, y + (sel ? -8 : 0) + CARD_H - 16, 30, 14, 7, can ? '#ffd76a' : '#6a5a30');
      this.text(String(def.cost), x + 21, y + (sel ? -8 : 0) + CARD_H - 9, 11, '#26173a', 'center', 700);
      this.text(h.role.th, x + CARD_W - 5, y + (sel ? -8 : 0) + CARD_H - 9, 10, '#bfb2f0', 'right');
      if (dep) this.text('ลงสนาม', x + CARD_W / 2, y + 44, 13, '#8fe0a0', 'center');
      if (cd > 0) this.text(String(Math.ceil(cd)), x + CARD_W / 2, y + 44, 22, '#ff9a9a', 'center');
      this.buttons.push({ x, y, w: CARD_W, h: CARD_H, fn: () => this.pickHero(id) });
    });
  }

  private drawOpPanel() {
    const b = this.battle;
    const op = b.ops.find((o) => o.uid === this.selOp);
    if (!op) { this.selOp = null; return; }
    const sk = CLASSES[op.cls].skill;
    const x = this.mx + 8, y = this.my + 8, w = 320, h = 104;
    this.rr(x, y, w, h, 12, '#1c1438ee', op.hero.color);
    this.text(`${op.hero.name.th} · ${op.hero.role.th}`, x + 12, y + 16, 16, '#ffffff');
    this.text(`HP ${Math.ceil(op.hp)}/${Math.ceil(op.maxHp)}`, x + 12, y + 38, 13, '#8fe0a0');
    this.text(`ขวาง ${op.blocked.length}/${CLASSES[op.cls].block}`, x + 150, y + 38, 13, '#bfb2f0');
    this.text(`สกิล: ${sk.name.th}`, x + 12, y + 58, 13, '#ffe27a');
    this.bar(x + 140, y + 53, 100, op.sp / sk.sp, op.sp >= sk.sp ? '#ffe27a' : '#8a7ad0', 8);
    this.btn(x + 12, y + 68, 96, 28, 'ถอนตัว', () => { b.retreat(op); this.selOp = null; }, '#8a3a5a');
    this.btn(x + 120, y + 68, 120, 28, b.skillReady(op) ? 'ใช้สกิล ★' : 'กำลังชาร์จ', () => b.useSkill(op), b.skillReady(op) ? '#b08a20' : '#4a3a6a');
  }

  private drawDirPicker() {
    if (!this.placing) return;
    const { x, y } = this.placing;
    const cx = this.cx(x), cy = this.cy(y);
    const arrows = ['▶', '▼', '◀', '▲'];
    for (const a of DIRS) {
      const bx = cx + a.dx * 62 - 22, by = cy + a.dy * 56 - 22;
      this.rr(bx, by, 44, 44, 22, this.hoverDir === a.d ? '#ffe27a' : '#2a2050dd', '#ffe27a');
      this.text(arrows[a.d], bx + 22, by + 23, 20, this.hoverDir === a.d ? '#26173a' : '#ffe27a', 'center');
      this.buttons.push({ x: bx, y: by, w: 44, h: 44, fn: () => this.chooseDir(a.d), hoverDir: a.d });
    }
    this.text('เลือกทิศที่หัน', cx, cy - 76 < this.my ? cy + 90 : cy - 76, 14, '#ffe27a', 'center');
  }

  // ------------------------------------------------------------------ scenes
  private startGame() {
    if (this.trans) return;
    this.trans = { t: 0, dur: 0.7, acted: false, action: () => { this.restart(); this.scene = 'battle'; } };
  }

  private goHome() {
    if (this.trans) return;
    this.trans = { t: 0, dur: 0.6, acted: false, action: () => { this.scene = 'title'; this.clearSelection(); } };
  }

  private homePress() {
    if (this.homeArm > 0) { this.goHome(); return; }
    this.homeArm = 2;
    this.toast('กดปุ่มบ้านอีกครั้งเพื่อกลับหน้าหลัก');
  }

  private drawTransition() {
    if (!this.trans) return;
    const { t, dur } = this.trans;
    const a = t < dur / 2 ? t / (dur / 2) : 1 - (t - dur / 2) / (dur / 2);
    this.ctx.fillStyle = `rgba(8, 4, 18, ${Math.max(0, Math.min(1, a))})`;
    this.ctx.fillRect(0, 0, W, H);
  }

  private drawTitle() {
    const c = this.ctx;
    const t = this.t;
    // sky
    const sky = c.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#1a1040'); sky.addColorStop(0.55, '#34226b'); sky.addColorStop(1, '#120d24');
    c.fillStyle = sky; c.fillRect(0, 0, W, H);
    const glow = c.createRadialGradient(W / 2, 170, 10, W / 2, 170, 360);
    glow.addColorStop(0, 'rgba(255,170,220,0.28)'); glow.addColorStop(1, 'rgba(255,170,220,0)');
    c.fillStyle = glow; c.fillRect(0, 0, W, H);
    // stars
    for (const st of this.stars) {
      const x = (((st.x - t * st.v) % W) + W) % W;
      c.globalAlpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * st.sp + st.ph));
      c.fillStyle = '#fff6d8';
      c.fillRect(Math.round(x), Math.round(st.y), st.s, st.s);
    }
    c.globalAlpha = 1;
    // petals
    for (const pt of this.petals) {
      const x = (((pt.x + t * pt.vx) % W) + W) % W, y = (((pt.y + t * pt.vy) % H) + H) % H;
      c.save();
      c.translate(x, y); c.rotate(pt.r + t * pt.rv); c.scale(pt.s, pt.s);
      c.globalAlpha = 0.8; c.fillStyle = pt.c;
      c.beginPath(); c.ellipse(0, 0, 7, 3.4, 0, 0, Math.PI * 2); c.fill();
      c.restore();
    }
    c.globalAlpha = 1;

    // platform + heroes
    const footY = 556;
    for (let x = 0; x < W; x += 48) {
      c.fillStyle = (x / 48) % 2 ? '#463d80' : '#4d4488'; c.fillRect(x, footY, 48, H - footY);
      c.fillStyle = '#6a60b4'; c.fillRect(x, footY, 48, 5);
      c.fillStyle = '#00000030'; c.fillRect(x + 47, footY, 1, H - footY);
    }
    const line = ['murasaki', 'akane', 'raika', 'yuki', 'sakura', 'wakaba', 'aoi'];
    line.forEach((id, i) => {
      const h = heroById(id);
      const S = id === 'yuki' ? 5 : 4;
      const cx = W / 2 + (i - 3) * 118;
      const ph = (t + i * 0.9) % 3.6;
      const frame: Frame = ph < 0.14 ? 'blink' : ph > 1.9 && ph < 2.3 ? 'sway' : 'idle';
      const spr = heroSprite(h, frame);
      c.fillStyle = '#00000055';
      c.beginPath(); c.ellipse(cx, footY + 6, S * 6, 5, 0, 0, Math.PI * 2); c.fill();
      c.drawImage(spr, cx - 10.5 * S, footY - 25 * S + 4, spr.width * S, spr.height * S);
    });

    // emblem: five-petal flower with a star
    const ex = W / 2, ey = 76;
    for (let i = 0; i < 5; i++) {
      const a = (i * 72 - 90) * (Math.PI / 180) + t * 0.25;
      c.save();
      c.translate(ex + Math.cos(a) * 22, ey + Math.sin(a) * 22); c.rotate(a);
      c.fillStyle = '#ffb3d0'; c.strokeStyle = '#26173a'; c.lineWidth = 3;
      c.beginPath(); c.ellipse(0, 0, 15, 9, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      c.restore();
    }
    c.fillStyle = '#ffe27a'; c.strokeStyle = '#26173a'; c.lineWidth = 3;
    c.beginPath(); c.arc(ex, ey, 12, 0, Math.PI * 2); c.fill(); c.stroke();
    this.text('★', ex, ey + 1, 16, '#26173a', 'center', 700);

    // logo
    c.save();
    c.font = `700 74px ${FONT}`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.letterSpacing = '5px';
    c.shadowColor = '#ff9ad0'; c.shadowBlur = 26;
    c.lineWidth = 12; c.strokeStyle = '#26173a'; c.lineJoin = 'round';
    c.strokeText('STELLAR BLOOM', W / 2, 168);
    c.shadowBlur = 0;
    const lg = c.createLinearGradient(0, 130, 0, 205);
    lg.addColorStop(0, '#fff3b0'); lg.addColorStop(1, '#ff9ad0');
    c.fillStyle = lg; c.fillText('STELLAR BLOOM', W / 2, 168);
    c.restore();
    this.text('ดวงดาวผลิบาน · Tower Defense', W / 2, 224, 20, '#e6d8ff', 'center');

    // buttons
    const pulse = Math.sin(t * 3) * 3;
    this.btn(W / 2 - 150, 264 + pulse, 300, 62, 'เริ่มเกม', () => { unlockAudio(); this.startGame(); }, '#c8508a', undefined, 28);
    this.btn(W / 2 - 150, 346, 146, 44, 'ตัวละคร', () => { window.location.href = './preview.html'; }, '#4a3a8a', undefined, 18);
    this.btn(W / 2 + 4, 346, 146, 44, this.muted ? 'เสียง: ปิด' : 'เสียง: เปิด', () => { this.muted = !this.muted; }, '#4a3a8a', undefined, 18);
    this.text('กด Enter หรือ Space เพื่อเริ่ม', W / 2, 414, 13, '#a99bd6', 'center');
    this.text('ต้นแบบ v0.1', W - 12, H - 12, 12, '#d8ccff', 'right');
  }

  private drawEnd() {
    const c = this.ctx;
    const b = this.battle;
    c.fillStyle = '#000000aa';
    c.fillRect(0, 0, W, H);
    const win = b.state === 'win';
    this.rr(W / 2 - 220, 170, 440, 240, 20, '#241a4a', win ? '#ffe27a' : '#ff7a9a');
    this.text(win ? 'สำเร็จ!' : 'พ่ายแพ้', W / 2, 220, 40, win ? '#ffe27a' : '#ff8aa6', 'center', 700);
    if (win) {
      const s = b.stars();
      this.text('★'.repeat(s) + '☆'.repeat(3 - s), W / 2, 275, 40, '#ffd76a', 'center');
    } else {
      this.text('ศัตรูเข้าถึงฐานมากเกินไป', W / 2, 270, 18, '#d8ccff', 'center');
    }
    this.text(`ศัตรูที่ล้ม ${b.kills} · หลุดเข้าฐาน ${b.leaks} · เวลา ${Math.floor(b.time)} วิ`, W / 2, 322, 15, '#bfb2f0', 'center');
    this.btn(W / 2 - 170, 350, 150, 40, 'เล่นใหม่', () => this.restart(), '#6a4fb0');
    this.btn(W / 2 + 20, 350, 150, 40, 'หน้าหลัก', () => this.goHome(), '#4a3a8a');
  }
}

export { ENEMIES };
export type { Hero };
