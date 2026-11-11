// Rendering + input for the battle. Everything is drawn on one 960x600 canvas; hit areas are rebuilt each frame.

import { CLASSES, DECK_MAX, DEFAULT_DECK, ENEMIES, HEROES, LEVEL_MAX, OPPOSITE, RANK_MAX, RARITY_MULT, STAGES, heroById, levelCost, powerMult, stagePaths, type Dir, type Hero, type Stage } from './data';
import { Battle, COST_MAX, type Enemy, type Op } from './engine';
import { enemySprite, heroSprite, type Frame } from './sprites';
import { playSfx, unlockAudio } from './audio';
import { L, elemName, getLang, setLang, t, type Key } from './i18n';
import { buildMapLayer, drawAmbient, drawBackground, drawMapAnim, drawRune, themeFor, type MapLayer } from './themes';
import { PITY_MAX, PULL_COST, TEN_COST, heroLevel, heroRank, levelUp, pull, stageReward, type PullResult, type Reward } from './economy';
import { clearSave, exportCode, importCode, loadSave, stageUnlocked, totalStars, writeSave, type SaveData } from './save';

type Scene = 'title' | 'stages' | 'deck' | 'gacha' | 'settings' | 'battle';
/** where Escape / the back button leads from each menu scene */
const BACK: Partial<Record<Scene, Scene>> = { stages: 'title', deck: 'stages', gacha: 'title', settings: 'title' };

export const W = 960;
export const H = 600;
const T = 72;
const HUD_H = 44;
const DECK_Y = 496;
const CARD_W = 84;
const CARD_H = 96;
const FONT = "'Mitr', system-ui, sans-serif";

interface TutStep {
  text: () => string;
  /** rectangles to outline */
  hi?: () => { x: number; y: number; w: number; h: number }[];
  /** pulse all tiles of this kind */
  tiles?: 'g' | 'h';
  /** auto-advance when true */
  done?: () => boolean;
  /** show a Next button */
  next?: boolean;
  last?: boolean;
}

interface Btn { x: number; y: number; w: number; h: number; fn: () => void; hoverDir?: Dir }

const REASON_KEY: Record<string, Key> = {
  cost: 'rCost', tile: 'rTile', occupied: 'rOccupied', cooldown: 'rCooldown', already: 'rAlready',
};

const DIRS: { d: Dir; dx: number; dy: number }[] = [
  { d: 0, dx: 1, dy: 0 }, { d: 1, dx: 0, dy: 1 }, { d: 2, dx: -1, dy: 0 }, { d: 3, dx: 0, dy: -1 },
];

export class Game {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  battle: Battle;
  private save: SaveData = loadSave();
  private stage: Stage = STAGES[0];
  private resultDone = false;
  private mapLayer: { id: string; layer: MapLayer } | null = null;
  private tut: { i: number } | null = null;
  private reward: Reward | null = null;
  private focusHero: string | null = null;
  private gRes: PullResult[] | null = null;
  private gT = 0;
  private gN: 1 | 10 = 1;
  private newBest = false;
  private resetArm = 0;
  private buttons: Btn[] = [];
  private t = 0;
  private last = 0;
  private get muted() { return this.save.muted; }
  private set muted(v: boolean) { this.save.muted = v; this.persist(); }
  private selHero: string | null = null;
  private placing: { x: number; y: number } | null = null;
  private selOp: number | null = null;
  private hover = { x: -1, y: -1 };
  private hoverDir: Dir | null = null;
  private msg = '';
  private msgT = 0;
  private mx = (W - 12 * T) / 2;
  private my = HUD_H + 8;
  private scene: Scene = 'title';
  private trans: { t: number; dur: number; action: () => void; acted: boolean } | null = null;
  private homeArm = 0;
  private stars = Array.from({ length: 110 }, () => ({
    x: Math.random() * W, y: Math.random() * H * 0.9, v: 2 + Math.random() * 9, s: Math.random() < 0.15 ? 3 : 2, ph: Math.random() * 6.28, sp: 1 + Math.random() * 3,
  }));
  private petals = Array.from({ length: 26 }, () => ({
    x: Math.random() * W, y: Math.random() * H, vx: -8 - Math.random() * 14, vy: 14 + Math.random() * 22, r: Math.random() * 6.28, rv: 0.6 + Math.random() * 1.6,
    c: ['#ffb3d0', '#e6c2ff', '#ffd6e6'][Math.floor(Math.random() * 3)], s: 0.7 + Math.random() * 0.8,
  }));

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    canvas.width = W;
    canvas.height = H;
    setLang(this.save.lang);
    this.battle = this.attach(this.makeBattle());
    canvas.addEventListener('pointerdown', (e) => this.onDown(e));
    canvas.addEventListener('pointermove', (e) => this.onMove(e));
    window.addEventListener('keydown', (e) => {
      if (this.scene !== 'battle') {
        if (this.scene === 'title' && (e.code === 'Space' || e.code === 'Enter')) { unlockAudio(); this.go('stages'); e.preventDefault(); }
        else if (e.code === 'Escape' && BACK[this.scene]) this.go(BACK[this.scene]!);
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

  private makeBattle(): Battle {
    const power: Record<string, number> = {};
    for (const id of this.save.deck) power[id] = powerMult(heroLevel(this.save, id), heroRank(this.save, id));
    return new Battle(this.stage, this.save.deck, power);
  }

  restart() {
    const speed = this.battle.speed;
    this.battle = this.attach(this.makeBattle());
    this.battle.speed = speed;
    this.resultDone = false;
    this.newBest = false;
    this.reward = null;
    this.clearSelection();
    // first visit to stage 1-1: guided start, enemies wait until the player is ready
    this.tut = !this.save.tutDone && this.stage.id === STAGES[0].id ? { i: 0 } : null;
    this.battle.freezeSpawns = !!this.tut;
    if (this.tut) this.battle.cost = Math.max(this.battle.cost, 32);
  }

  private persist() {
    if (!writeSave(this.save)) this.toast(t('storageFail'));
  }

  private setLanguage(l: 'th' | 'en') {
    setLang(l);
    this.save.lang = l;
    this.persist();
  }

  /** Records stars once per battle; unlocks the next stage implicitly via stageUnlocked(). */
  private recordResult() {
    this.resultDone = true;
    if (this.battle.state !== 'win') return;
    const s = this.battle.stars();
    const prev = this.save.stars[this.stage.id] ?? 0;
    this.reward = stageReward(this.stageIndex(), s, prev);
    this.save.coins += this.reward.coins;
    if (s > prev) {
      this.save.stars[this.stage.id] = s;
      this.newBest = true;
    }
    this.persist();
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
    if (this.scene === 'gacha' && this.gRes) { this.gT = 999; return; }
    if (this.scene !== 'battle') return;
    const tile = this.tileAt(p.x, p.y);
    if (!tile) { this.clearSelection(); return; }
    this.clickTile(tile.x, tile.y);
  }

  private clickTile(x: number, y: number) {
    const b = this.battle;
    if (this.placing && (this.placing.x !== x || this.placing.y !== y)) this.placing = null;
    if (this.selHero) {
      const reason = b.canDeploy(this.selHero, x, y);
      if (reason) { this.toast(reason === 'limit' ? t('rLimit', { n: b.stage.deployLimit }) : REASON_KEY[reason] ? t(REASON_KEY[reason]) : '...'); return; }
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
    if (b.deployed(id)) { this.toast(t('rAlready')); return; }
    if ((b.cooldown[id] ?? 0) > 0) { this.toast(t('rCooldown')); return; }
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
    this.resetArm = Math.max(0, this.resetArm - dt);
    if (this.gRes) this.gT += dt;
    if (this.scene === 'battle') {
      this.battle.update(dt);
      this.tutUpdate();
      if (this.battle.state !== 'play' && !this.resultDone) this.recordResult();
    }
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
    c.imageSmoothingEnabled = false;
    if (this.scene !== 'battle') {
      if (this.scene === 'title') this.drawTitle();
      else if (this.scene === 'stages') this.drawStages();
      else if (this.scene === 'deck') this.drawDeckBuilder();
      else if (this.scene === 'gacha') this.drawGacha();
      else this.drawSettings();
      this.drawToast(H - 36);
      this.drawTransition();
      return;
    }
    const theme = themeFor(b.stage.id);
    drawBackground(c, theme, W, H);

    this.drawMap();
    drawAmbient(c, theme, this.t, W, H);
    this.drawRangePreview();
    this.drawUnits();
    this.drawFx();
    this.drawPopups();
    this.drawHud();
    this.drawDeck();
    if (this.selOp !== null) this.drawOpPanel();
    if (this.placing && this.selHero) this.drawDirPicker();

    if (this.tut && b.state === 'play') this.drawTutorial();
    this.drawToast(this.my + 6 * T - 24);
    if (b.state !== 'play') this.drawEnd();
    this.drawTransition();
  }

  private drawToast(cy: number) {
    if (this.msgT <= 0) return;
    const c = this.ctx;
    c.globalAlpha = Math.min(1, this.msgT);
    this.rr(W / 2 - 250, cy - 16, 500, 32, 10, '#000000cc');
    this.text(this.msg, W / 2, cy, 15, '#ffd6e6', 'center');
    c.globalAlpha = 1;
  }

  private drawMap() {
    const c = this.ctx;
    const b = this.battle;
    const lanes = stagePaths(b.stage);
    const theme = themeFor(b.stage.id);
    if (!this.mapLayer || this.mapLayer.id !== b.stage.id) {
      this.mapLayer = { id: b.stage.id, layer: buildMapLayer(theme, b.stage.tiles, b.stage.cols, b.stage.rows, T) };
    }
    const layer = this.mapLayer.layer;
    c.drawImage(layer.canvas, this.mx, this.my);
    drawMapAnim(c, layer, theme, this.mx, this.my, b.stage.cols * T, b.stage.rows * T, this.t);
    if (theme.rune) {
      const g0 = lanes[0][lanes[0].length - 1];
      drawRune(c, this.cx(g0[0]), this.cy(g0[1]), theme.rune, this.t);
    }
    // path direction dots
    c.fillStyle = '#ffffff22';
    for (const path of lanes) {
      for (let i = 0; i < path.length - 1; i++) {
        const [x0, y0] = path[i], [x1, y1] = path[i + 1];
        c.fillRect(this.cx((x0 + x1) / 2) - 3, this.cy((y0 + y1) / 2) - 3, 6, 6);
      }
    }
    // spawn / goal markers
    for (const path of lanes) { const s = path[0]; this.marker(this.cx(s[0]), this.cy(s[1]), '#e0465a', t('spawn')); }
    const g = lanes[0][lanes[0].length - 1];
    this.marker(this.cx(g[0]), this.cy(g[1]), '#4a9ee0', t('base'));
  }

  private marker(x: number, y: number, color: string, label: string) {
    const c = this.ctx;
    this.rr(x - 26, y - 26, 52, 52, 8, '#120a24d0'); // dark backing keeps the marker readable on pale themes
    c.globalAlpha = 0.9;
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
    if (e.def.elem) {
      c.fillStyle = '#26173a'; c.fillRect(cx - 31, y - 11, 10, 10);
      c.fillStyle = this.auraColor(e.def.elem); c.fillRect(cx - 29, y - 9, 6, 6);
    }
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
    this.text(t('cost'), 120, 23, 14, '#bfb2f0');
    this.bar(210, 17, 210, b.cost / COST_MAX, '#ffd76a', 12);
    this.text(String(Math.floor(b.cost)), 432, 24, 20, '#ffe27a');
    // progress
    const total = b.stage.spawns.length + b.summoned;
    const done = b.kills + b.leaks;
    this.text(`${t('enemies')} ${Math.min(done, total)}/${total}`, 530, 24, 14, '#bfb2f0');
    this.btn(W - 278, 6, 60, 32, '⌂', () => this.homePress(), this.homeArm > 0 ? '#b04a6a' : '#4a3a8a');
    this.btn(W - 210, 6, 60, 32, b.paused ? '▶' : '❚❚', () => { b.paused = !b.paused; }, '#4a3a8a');
    this.btn(W - 142, 6, 60, 32, '×' + b.speed, () => { b.speed = b.speed === 1 ? 2 : 1; }, '#4a3a8a');
    this.btn(W - 74, 6, 60, 32, this.muted ? '🔇' : '🔊', () => { this.muted = !this.muted; }, '#4a3a8a');
    const boss = b.enemies.find((e) => e.def.boss && e.hp > 0);
    if (boss) {
      const bx = W / 2 - 150, by = HUD_H + 18;
      this.text(`${t('boss')} · ${L(boss.def.name)}`, W / 2, HUD_H + 10, 13, '#ffb347', 'center', 700);
      this.bar(bx, by, 300, boss.hp / boss.maxHp, '#ffb347', 8);
      for (const ph of boss.def.phases ?? []) { this.ctx.fillStyle = '#26173a'; this.ctx.fillRect(bx + ph.at * 300 - 1, by - 2, 2, 12); }
    }
    if (b.paused) this.text(t('paused'), W / 2, this.my + 52, 16, '#ffe27a', 'center');
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
      this.text(L(h.name), x + CARD_W / 2, y + (sel ? -8 : 0) + CARD_H - 22, 12, can ? '#ffffff' : '#9a90c0', 'center');
      this.rr(x + 5, y + (sel ? -8 : 0) + CARD_H - 16, 26, 14, 7, can ? '#ffd76a' : '#6a5a30');
      this.text(String(def.cost), x + 18, y + (sel ? -8 : 0) + CARD_H - 9, 11, '#26173a', 'center', 700);
      this.text(L(h.role), x + CARD_W - 4, y + (sel ? -8 : 0) + CARD_H - 9, 9, '#bfb2f0', 'right');
      if (dep) this.text(t('inField'), x + CARD_W / 2, y + 44, 13, '#8fe0a0', 'center');
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
    this.text(`${L(op.hero.name)} · ${L(op.hero.role)}`, x + 12, y + 16, 16, '#ffffff');
    this.text(`HP ${Math.ceil(op.hp)}/${Math.ceil(op.maxHp)}`, x + 12, y + 38, 13, '#8fe0a0');
    this.text(`${t('block')} ${op.blocked.length}/${CLASSES[op.cls].block}`, x + 150, y + 38, 13, '#bfb2f0');
    this.text(`${t('skill')}: ${L(sk.name)}`, x + 12, y + 58, 13, '#ffe27a');
    this.bar(x + 170, y + 53, 100, op.sp / sk.sp, op.sp >= sk.sp ? '#ffe27a' : '#8a7ad0', 8);
    this.btn(x + 12, y + 68, 96, 28, t('retreat'), () => { b.retreat(op); this.selOp = null; }, '#8a3a5a');
    this.btn(x + 120, y + 68, 130, 28, b.skillReady(op) ? t('useSkill') : t('charging'), () => b.useSkill(op), b.skillReady(op) ? '#b08a20' : '#4a3a6a');
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
    this.text(t('pickDir'), cx, cy - 76 < this.my ? cy + 90 : cy - 76, 14, '#ffe27a', 'center');
  }

  // ------------------------------------------------------------------ scenes
  /** Fades to another scene; `before` runs at the darkest moment. */
  private go(scene: Scene, before?: () => void) {
    if (this.trans) return;
    this.trans = {
      t: 0, dur: 0.5, acted: false,
      action: () => { before?.(); this.scene = scene; this.clearSelection(); this.msgT = 0; this.resetArm = 0; this.gRes = null; },
    };
  }

  private startStage(stage: Stage) {
    this.go('battle', () => { this.stage = stage; this.restart(); });
  }

  private homePress() {
    if (this.homeArm > 0) { this.go('stages'); return; }
    this.homeArm = 2;
    this.toast(t('homeConfirm'));
  }

  private stageIndex(): number {
    return STAGES.findIndex((s) => s.id === this.stage.id);
  }

  private toggleHero(id: string) {
    if (!this.save.owned.includes(id)) { this.toast(t('notOwnedToast')); return; }
    const d = this.save.deck;
    const i = d.indexOf(id);
    if (i >= 0) {
      if (d.length <= 1) { this.toast(t('deckMin')); return; }
      d.splice(i, 1);
    } else {
      if (d.length >= DECK_MAX) { this.toast(t('deckFull', { max: DECK_MAX })); return; }
      d.push(id);
    }
    this.persist();
  }

  private exportSave() {
    const code = exportCode(this.save);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(code).then(() => this.toast(t('exportCopied')), () => window.prompt(t('exportPrompt'), code));
    } else {
      window.prompt(t('exportPrompt'), code);
    }
  }

  private importSave() {
    const code = window.prompt(t('importPrompt'), '');
    if (!code) return;
    const d = importCode(code);
    if (!d) { this.toast(t('importFail')); return; }
    this.save = d;
    setLang(d.lang);
    this.persist();
    this.toast(t('importOk'));
  }

  private resetSavePress() {
    if (this.resetArm <= 0) { this.resetArm = 3; this.toast(t('resetConfirm')); return; }
    this.save = clearSave();
    this.save.deck = [...DEFAULT_DECK];
    setLang(this.save.lang);
    this.resetArm = 0;
    this.toast(t('resetDone'));
  }

  // ------------------------------------------------------------------ menu screens
  private header(title: string, back: Scene | null) {
    this.rr(0, 0, W, 64, 0, '#1c1438dd');
    this.text(title, W / 2, 33, 28, '#ffffff', 'center', 700);
    if (back) this.btn(16, 14, 110, 38, t('back'), () => this.go(back), '#4a3a8a', undefined, 17);
  }

  private drawStages() {
    const c = this.ctx;
    this.drawBackdrop();
    this.header(t('stageSelect'), 'title');
    this.coinBadge(W - 16, 33);
    this.text(`★ ${t('totalStars')} ${totalStars(this.save)}/${STAGES.length * 3}`, W - 190, 33, 16, '#ffd76a', 'right');

    const cw = 170, ch = 176, gap = 14, perRow = 5;
    const n = Math.min(STAGES.length + 1, perRow * 2); // + "coming soon" card
    const x0 = (W - (Math.min(n, perRow) * cw + (Math.min(n, perRow) - 1) * gap)) / 2;
    for (let i = 0; i < n; i++) {
      const x = x0 + (i % perRow) * (cw + gap), y = 80 + Math.floor(i / perRow) * (ch + 12);
      if (i >= STAGES.length) {
        c.setLineDash([8, 6]);
        this.rr(x, y, cw, ch, 14, '#ffffff0a', '#7d6fc0');
        c.setLineDash([]);
        this.text(t('comingSoon'), x + cw / 2, y + ch / 2, 18, '#8a7ec0', 'center');
        continue;
      }
      const s = STAGES[i];
      const open = stageUnlocked(this.save, i);
      const st = this.save.stars[s.id] ?? 0;
      const th = themeFor(s.id);
      this.rr(x, y, cw, ch, 14, open ? th.card : '#1a1430', open ? (st ? '#ffd76a' : '#a98bff') : '#3a3260');
      if (open) this.rr(x + 18, y + 2, cw - 36, 5, 2, th.a.high[0]);
      this.text(s.id, x + cw / 2, y + 26, 30, open ? '#ffffff' : '#5a5288', 'center', 700);
      const nm = L(s.name).split('·')[1]?.trim() ?? L(s.name);
      if (open) {
        this.text(nm, x + cw / 2, y + 52, 13, '#d8ccff', 'center');
        // enemy roster of this stage (boss first), 6 per row
        const types = [...new Set(s.spawns.map((sp) => sp.type))].sort((p, q) => Number(!!ENEMIES[q].boss) - Number(!!ENEMIES[p].boss));
        types.slice(0, 12).forEach((ty, k) => {
          const d = ENEMIES[ty];
          const spr = enemySprite(d.sprite);
          const ix = x + 9 + (k % 6) * 26, iy = y + 64 + Math.floor(k / 6) * 22;
          c.drawImage(spr, ix, iy, 24, (spr.height / spr.width) * 24);
          if (d.elem) { c.fillStyle = '#26173a'; c.fillRect(ix + 15, iy - 1, 9, 9); c.fillStyle = this.auraColor(d.elem); c.fillRect(ix + 16, iy, 7, 7); }
          if (d.boss) { c.strokeStyle = '#ffb347'; c.lineWidth = 2; c.strokeRect(ix - 1, iy - 1, 26, (spr.height / spr.width) * 24 + 2); }
        });
        this.text('★'.repeat(st) + '☆'.repeat(3 - st), x + cw / 2, y + 122, 22, '#ffd76a', 'center');
        this.btn(x + 25, y + ch - 36, cw - 50, 28, t('play'), () => this.startStage(s), '#c8508a', undefined, 15);
      } else {
        this.text('🔒', x + cw / 2, y + 84, 30, '#8a7ec0', 'center');
        this.text(t('locked'), x + cw / 2, y + 126, 12, '#8a7ec0', 'center');
      }
    }

    // current team strip
    const sy = 478;
    this.rr(40, sy, W - 80, 96, 14, '#1c1438cc', '#463d80');
    this.text(t('yourTeam'), 58, sy + 16, 14, '#bfb2f0');
    this.save.deck.forEach((id, i) => {
      const spr = heroSprite(heroById(id), 'idle');
      c.drawImage(spr, 70 + i * 74, sy + 28, spr.width * 2.4, spr.height * 2.4);
    });
    this.btn(W - 210, sy + 28, 150, 40, t('editTeam'), () => this.go('deck'), '#6a4fb0', undefined, 17);
  }

  // ------------------------------------------------------------------ tutorial (first run of stage 1-1)
  private cardRect(id: string): { x: number; y: number; w: number; h: number } {
    const n = this.battle.deck.length, gap = 8;
    const x0 = (W - (n * CARD_W + (n - 1) * gap)) / 2;
    return { x: x0 + this.battle.deck.indexOf(id) * (CARD_W + gap) - 3, y: DECK_Y - 3, w: CARD_W + 6, h: CARD_H + 6 };
  }

  private tileRect(x: number, y: number): { x: number; y: number; w: number; h: number } {
    return { x: this.mx + x * T, y: this.my + y * T, w: T, h: T };
  }

  /** first deck hero that deploys on the given ground type (healers are skipped for high ground) */
  private tutHero(kind: 'ground' | 'high'): string | undefined {
    return this.battle.deck.find((id) => {
      const c = CLASSES[heroById(id).cls];
      return c.deploy === kind && (kind === 'ground' || c.dmg !== 'heal');
    });
  }

  private tutSteps(): TutStep[] {
    const b = this.battle;
    const g = this.tutHero('ground'), h = this.tutHero('high');
    const base = stagePaths(b.stage)[0];
    const goal = base[base.length - 1];
    const steps: TutStep[] = [
      { text: () => t('tutWelcome'), hi: () => [this.tileRect(goal[0], goal[1])], next: true },
      { text: () => t('tutCost'), hi: () => [{ x: 110, y: 5, w: 360, h: 34 }], next: true },
    ];
    if (g) {
      const n = L(heroById(g).name);
      steps.push({ text: () => t('tutPickG', { n }), hi: () => (this.selHero === g ? [] : [this.cardRect(g)]), done: () => this.selHero === g || !!b.deployed(g) });
      steps.push({ text: () => t('tutPlaceG'), tiles: 'g', hi: () => (this.selHero === g || this.placing ? [] : [this.cardRect(g)]), done: () => !!b.deployed(g) });
    }
    if (h) {
      const n = L(heroById(h).name);
      steps.push({ text: () => t('tutPickH', { n }), hi: () => (this.selHero === h ? [] : [this.cardRect(h)]), done: () => this.selHero === h || !!b.deployed(h) });
      steps.push({ text: () => t('tutPlaceH'), tiles: 'h', hi: () => (this.selHero === h || this.placing ? [] : [this.cardRect(h)]), done: () => !!b.deployed(h) });
    }
    if (g || h) {
      steps.push({
        text: () => t('tutOp'),
        hi: () => b.ops.filter((o) => this.selOp !== o.uid).map((o) => this.tileRect(o.x, o.y)),
        done: () => this.selOp !== null || b.ops.length === 0,
      });
    }
    steps.push({ text: () => t('tutElem'), next: true });
    steps.push({ text: () => t('tutGo'), next: true, last: true });
    return steps;
  }

  private tutUpdate() {
    if (!this.tut) return;
    const steps = this.tutSteps();
    while (this.tut.i < steps.length && steps[this.tut.i].done?.()) this.tut.i++;
    if (this.tut.i >= steps.length) this.finishTutorial();
  }

  private finishTutorial() {
    this.tut = null;
    this.battle.freezeSpawns = false;
    if (!this.save.tutDone) { this.save.tutDone = true; this.persist(); }
  }

  private wrap(text: string, maxW: number): string[] {
    const c = this.ctx;
    const seg = (Intl as unknown as { Segmenter?: new (l: string, o: object) => { segment(s: string): Iterable<{ segment: string }> } }).Segmenter;
    const tokens = seg ? Array.from(new seg(getLang(), { granularity: 'word' }).segment(text), (x) => x.segment) : Array.from(text);
    const lines: string[] = [];
    let cur = '';
    for (const tok of tokens) {
      if (cur && c.measureText(cur + tok).width > maxW) { lines.push(cur.trimEnd()); cur = tok.trimStart(); }
      else cur += tok;
    }
    if (cur) lines.push(cur.trimEnd());
    return lines;
  }

  private drawTutorial() {
    if (!this.tut) return;
    const c = this.ctx;
    const steps = this.tutSteps();
    const step = steps[Math.min(this.tut.i, steps.length - 1)];
    const pulse = 0.5 + 0.5 * Math.sin(this.t * 6);
    const b = this.battle;

    if (step.tiles) {
      for (let y = 0; y < b.stage.rows; y++) for (let x = 0; x < b.stage.cols; x++) {
        if (b.stage.tiles[y][x] !== step.tiles) continue;
        const r = this.tileRect(x, y);
        c.globalAlpha = 0.12 + 0.2 * pulse;
        c.fillStyle = '#ffe27a';
        c.fillRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
      }
      c.globalAlpha = 1;
    }
    const rects = step.hi?.() ?? [];
    c.lineWidth = 3;
    c.strokeStyle = `rgba(255, 226, 122, ${0.55 + 0.45 * pulse})`;
    for (const r of rects) c.strokeRect(r.x - pulse * 2, r.y - pulse * 2, r.w + pulse * 4, r.h + pulse * 4);

    // message box: above or below depending on where the highlight is
    c.font = `600 15px ${FONT}`;
    const bw = 640, pad = 16;
    const lines = this.wrap(step.text(), bw - pad * 2 - 96);
    const bh = Math.max(64, lines.length * 21 + pad * 2);
    const focusY = rects.length ? rects[0].y : step.tiles ? this.my + 3 * T : this.my + 3 * T;
    const bx = (W - bw) / 2;
    const by = focusY > this.my + 3 * T ? this.my + 10 : this.my + 6 * T - bh - 10;
    this.rr(bx, by, bw, bh, 14, '#120a28ee', '#ffe27a');
    lines.forEach((ln, i) => this.text(ln, bx + pad, by + pad + 10 + i * 21, 15, '#ffffff', 'left', 600));
    this.text(`${Math.min(this.tut.i + 1, steps.length)}/${steps.length}`, bx + bw - 43, by + 38, 11, '#a99bd6', 'center');
    if (step.next) {
      this.btn(bx + bw - 106, by + bh - 40, 94, 30, t('tutNext'), () => { if (step.last) this.finishTutorial(); else this.tut!.i++; }, '#c8508a', undefined, 14);
    }
    this.btn(bx + bw - 74, by + 8, 62, 20, t('tutSkip'), () => this.finishTutorial(), '#3a2f6a', undefined, 11);
  }

  // ------------------------------------------------------------------ economy widgets
  private coin(x: number, y: number, r = 9) {
    const c = this.ctx;
    c.fillStyle = '#26173a'; c.beginPath(); c.arc(x, y, r + 2, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ffd76a'; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    this.text('★', x, y + 1, r * 1.3, '#a8741a', 'center', 700);
  }

  private coinBadge(rightX: number, y: number) {
    const s = String(this.save.coins);
    const w = 46 + s.length * 11;
    this.rr(rightX - w, y - 15, w, 30, 15, '#00000066', '#ffd76a88');
    this.coin(rightX - w + 18, y, 9);
    this.text(s, rightX - 12, y + 1, 17, '#ffe27a', 'right', 700);
  }

  private doPull(n: 1 | 10) {
    const res = pull(this.save, n);
    if (!res) { this.toast(t('noCoins')); return; }
    this.persist();
    this.gRes = res;
    this.gT = 0;
    this.gN = n;
    playSfx(res.some((r) => r.rarity >= 5) ? 'win' : 'skill', this.muted);
  }

  private doLevelUp(id: string) {
    const r = levelUp(this.save, id);
    if (r === 'ok') { this.persist(); this.toast(t('lvUpDone')); playSfx('skill', this.muted); }
    else if (r === 'coins') this.toast(t('noCoins'));
  }

  // ------------------------------------------------------------------ team + upgrade screen
  private drawDeckBuilder() {
    const c = this.ctx;
    this.drawBackdrop();
    this.header(t('deckTitle'), 'stages');
    const d = this.save.deck;
    this.text(t('deckCount', { n: d.length, max: DECK_MAX }), W - 20, 33, 16, '#ffd76a', 'right');
    if (!this.focusHero || !HEROES.some((h) => h.id === this.focusHero)) this.focusHero = d[0] ?? this.save.owned[0];

    // team slots
    const sw = 78, sh = 70, sg = 6;
    for (let i = 0; i < DECK_MAX; i++) {
      const x = 24 + i * (sw + sg), y = 74;
      const id = d[i];
      if (!id) { this.rr(x, y, sw, sh, 10, '#ffffff08', '#463d80'); continue; }
      const h = heroById(id);
      this.rr(x, y, sw, sh, 10, '#2a2050', this.focusHero === id ? '#ffe27a' : h.color);
      const spr = heroSprite(h, 'idle');
      c.drawImage(spr, x + sw / 2 - spr.width * 1.1, y + 3, spr.width * 2.2, spr.height * 2.2);
      this.text(L(h.name), x + sw / 2, y + sh - 8, 11, '#ffffff', 'center');
      this.buttons.push({ x, y, w: sw, h: sh, fn: () => { this.focusHero = id; } });
    }

    // roster grid
    const cols = 6, cw = 104, ch = 88, gap = 6;
    HEROES.forEach((h, i) => {
      const x = 24 + (i % cols) * (cw + gap), y = 152 + Math.floor(i / cols) * (ch + gap);
      const own = this.save.owned.includes(h.id), on = d.includes(h.id), foc = this.focusHero === h.id;
      this.rr(x, y, cw, ch, 10, on ? '#4a3a8a' : '#2a2050', foc ? '#ffe27a' : own ? h.color + '88' : '#3a3260');
      c.fillStyle = own ? h.color : '#3a3260'; c.fillRect(x + 8, y + 5, cw - 16, 3);
      const spr = heroSprite(h, 'idle');
      c.globalAlpha = own ? 1 : 0.22;
      c.drawImage(spr, x + cw / 2 - spr.width, y + 10, spr.width * 2, spr.height * 2);
      c.globalAlpha = 1;
      if (!own) this.text('?', x + cw / 2, y + 36, 26, '#6a5ea0', 'center', 700);
      this.text(h.rarity + '★', x + 7, y + 18, 11, own ? '#ffd76a' : '#6a5ea0');
      this.text(L(h.name), x + cw / 2, y + 68, 12, own ? '#ffffff' : '#6a5ea0', 'center');
      if (own) this.text(t('level') + ' ' + heroLevel(this.save, h.id), x + cw / 2, y + 81, 10, '#bfb2f0', 'center');
      if (on) this.text('✓', x + cw - 12, y + 18, 16, '#8fe0a0', 'center', 700);
      this.buttons.push({ x, y, w: cw, h: ch, fn: () => { this.focusHero = h.id; } });
    });

    this.drawHeroPanel(704, 74, 232, 466);
    this.btn(24, 552, 150, 34, t('deckReset'), () => { this.save.deck = DEFAULT_DECK.filter((id) => this.save.owned.includes(id)); this.persist(); }, '#4a3a8a', undefined, 14);
    this.btn(184, 552, 120, 34, t('back'), () => this.go('stages'), '#6a4fb0', undefined, 15);
  }

  private drawHeroPanel(x: number, y: number, w: number, h: number) {
    const c = this.ctx;
    this.rr(x, y, w, h, 14, '#1c1438ee', '#463d80');
    const id = this.focusHero;
    if (!id) return;
    const hero = heroById(id);
    const def = CLASSES[hero.cls];
    const own = this.save.owned.includes(id);
    const lv = heroLevel(this.save, id), rk = heroRank(this.save, id);
    const m = (RARITY_MULT[hero.rarity] ?? 1) * powerMult(lv, rk);
    c.fillStyle = hero.color; c.fillRect(x + 12, y + 10, w - 24, 3);
    this.text(L(hero.name), x + 14, y + 34, 20, '#ffffff', 'left', 700);
    this.text('★'.repeat(hero.rarity), x + w - 14, y + 34, 14, '#ffd76a', 'right');
    this.text(L(hero.role) + ' · ' + elemName(hero.elem), x + 14, y + 56, 13, '#bfb2f0');
    const spr = heroSprite(hero, 'idle');
    c.globalAlpha = own ? 1 : 0.3;
    c.drawImage(spr, x + 14, y + 68, spr.width * 4, spr.height * 4);
    c.globalAlpha = 1;
    const rx = x + 116;
    if (own) {
      this.text(t('level') + ' ' + lv + '/' + LEVEL_MAX, rx, y + 92, 15, '#ffffff');
      this.text(t('rank'), rx, y + 120, 13, '#bfb2f0');
      for (let i = 0; i < RANK_MAX; i++) { c.fillStyle = i < rk ? '#ff9ad0' : '#3a3260'; c.beginPath(); c.arc(rx + 46 + i * 13, y + 120, 5, 0, Math.PI * 2); c.fill(); }
    } else {
      this.text('?', rx + 40, y + 110, 40, '#6a5ea0', 'center', 700);
    }
    const rows: [string, string | number][] = [
      ['HP', Math.round(def.hp * m)], ['ATK', Math.round(def.atk * m)], ['DEF', def.def], [t('block'), def.block], [t('deployCost'), def.cost],
    ];
    rows.forEach(([k, v], i) => {
      this.text(k, x + 14, y + 190 + i * 20, 13, '#bfb2f0');
      this.text(String(v), x + w - 14, y + 190 + i * 20, 13, '#ffffff', 'right');
    });
    this.text(t('skillLabel') + ': ' + L(def.skill.name), x + 14, y + 298, 13, '#ffe27a');
    this.text(t('strongVs', { e: elemName(OPPOSITE[hero.elem]) }), x + 14, y + 320, 11, '#8fe0a0');
    this.text(t('weakVs', { e: elemName(hero.elem) }), x + 14, y + 336, 11, '#9a90c0');

    if (own) {
      const inTeam = this.save.deck.includes(id);
      this.btn(x + 14, y + 356, w - 28, 34, inTeam ? t('removeTeam') : t('addTeam'), () => this.toggleHero(id), inTeam ? '#8a3a5a' : '#3a8a5a', undefined, 15);
      if (lv >= LEVEL_MAX) this.btn(x + 14, y + 398, w - 28, 34, t('lvMax'), () => {}, '#4a3a6a', undefined, 14);
      else {
        const cost = levelCost(lv);
        this.btn(x + 14, y + 398, w - 28, 34, t('lvUp', { n: cost }), () => this.doLevelUp(id), this.save.coins >= cost ? '#b08a20' : '#5a4a3a', undefined, 14);
      }
    } else {
      this.text(t('notOwned'), x + w / 2, y + 366, 11, '#bfb2f0', 'center');
      this.btn(x + 14, y + 384, w - 28, 34, t('recruit'), () => this.go('gacha'), '#c8508a', undefined, 15);
    }
    this.coinBadge(x + w - 12, y + h - 18);
  }

  // ------------------------------------------------------------------ gacha screen
  private drawGacha() {
    const c = this.ctx;
    this.drawBackdrop();
    this.header(t('recruit'), 'title');
    this.coinBadge(W - 16, 33);
    const res = this.gRes;
    if (!res) {
      this.text(t('topPrize'), W / 2, 98, 18, '#ffd76a', 'center', 700);
      const top = HEROES.filter((h) => h.rarity >= 5);
      const gap = 100, x0 = W / 2 - ((top.length - 1) * gap) / 2;
      top.forEach((h, i) => {
        const own = this.save.owned.includes(h.id);
        const spr = heroSprite(h, 'idle');
        const cx = x0 + i * gap;
        c.fillStyle = '#00000044'; c.beginPath(); c.ellipse(cx, 200, 26, 6, 0, 0, Math.PI * 2); c.fill();
        c.globalAlpha = own ? 1 : 0.4;
        c.drawImage(spr, cx - spr.width * 1.5, 200 - spr.height * 3 + 4, spr.width * 3, spr.height * 3);
        c.globalAlpha = 1;
        this.text(L(h.name), cx, 218, 12, own ? '#ffffff' : '#8a7ec0', 'center');
      });
      const left = Math.max(1, PITY_MAX - this.save.pity);
      this.text(t('pityInfo', { n: left }), W / 2, 262, 15, '#e6d8ff', 'center');
      this.bar(W / 2 - 150, 276, 300, this.save.pity / PITY_MAX, '#ff9ad0', 8);
      this.text(t('rates', { max: RANK_MAX }), W / 2, 312, 13, '#a99bd6', 'center');
      this.text(this.save.owned.length + '/' + HEROES.length, W / 2, 340, 15, '#bfb2f0', 'center');
      const can1 = this.save.coins >= PULL_COST, can10 = this.save.coins >= TEN_COST;
      this.btn(W / 2 - 250, 390, 230, 64, t('pull1') + '  ·  ' + PULL_COST, () => this.doPull(1), can1 ? '#6a4fb0' : '#4a4060', undefined, 20);
      this.btn(W / 2 + 20, 390, 230, 64, t('pull10') + '  ·  ' + TEN_COST, () => this.doPull(10), can10 ? '#c8508a' : '#5a3a52', undefined, 20);
      return;
    }

    // results
    const n = res.length;
    const cols = n === 1 ? 1 : 5, cw = n === 1 ? 190 : 150, ch = n === 1 ? 260 : 156, gap = 12;
    const x0 = (W - (Math.min(n, cols) * cw + (Math.min(n, cols) - 1) * gap)) / 2, y0 = n === 1 ? 84 : 80;
    const step = n === 1 ? 0 : 0.22;
    res.forEach((r, i) => {
      const x = x0 + (i % cols) * (cw + gap), y = y0 + Math.floor(i / cols) * (ch + gap);
      const k = Math.max(0, Math.min(1, (this.gT - i * step) / 0.2));
      if (k <= 0) {
        this.rr(x, y, cw, ch, 12, '#241a4a', '#463d80');
        this.text('?', x + cw / 2, y + ch / 2, 36, '#463d80', 'center', 700);
        return;
      }
      const hero = heroById(r.id);
      const five = r.rarity >= 5;
      c.save();
      c.translate(x + cw / 2, y + ch / 2);
      c.scale(k, 1);
      c.translate(-(x + cw / 2), -(y + ch / 2));
      if (five) { c.shadowColor = '#ffd76a'; c.shadowBlur = 14 + Math.sin(this.t * 6) * 5; }
      this.rr(x, y, cw, ch, 12, five ? '#3a2a5a' : '#2a2050', five ? '#ffd76a' : hero.color);
      c.shadowBlur = 0;
      const S = n === 1 ? 5 : 3;
      const spr = heroSprite(hero, 'idle');
      c.drawImage(spr, x + cw / 2 - spr.width * S / 2, y + 12, spr.width * S, spr.height * S);
      this.text(L(hero.name), x + cw / 2, y + ch - (n === 1 ? 64 : 50), n === 1 ? 18 : 13, '#ffffff', 'center', 700);
      this.text('★'.repeat(r.rarity), x + cw / 2, y + ch - (n === 1 ? 42 : 33), n === 1 ? 16 : 12, '#ffd76a', 'center');
      const tag = r.kind === 'new' ? t('newTag') : r.kind === 'rank' ? t('rankTag') : t('refundTag', { n: r.refund });
      const col = r.kind === 'new' ? '#3a8a5a' : r.kind === 'rank' ? '#b04a8a' : '#8a7020';
      this.rr(x + 12, y + ch - 24, cw - 24, 18, 9, col);
      this.text(tag, x + cw / 2, y + ch - 14, 12, '#ffffff', 'center', 700);
      c.restore();
    });

    const done = this.gT >= (n - 1) * step + 0.2;
    if (!done) { this.text(t('skipHint'), W / 2, 566, 14, '#a99bd6', 'center'); return; }
    const cost = this.gN === 10 ? TEN_COST : PULL_COST;
    this.btn(W / 2 - 200, 530, 190, 46, t('ok'), () => { this.gRes = null; }, '#4a3a8a', undefined, 18);
    this.btn(W / 2 + 10, 530, 190, 46, t('again') + ' · ' + cost, () => this.doPull(this.gN), this.save.coins >= cost ? '#c8508a' : '#5a3a52', undefined, 16);
  }

  private drawSettings() {
    this.drawBackdrop();
    this.header(t('settings'), 'title');
    const px = 210, pw = W - 420;
    this.rr(px, 92, pw, 410, 18, '#1c1438ee', '#463d80');
    const row = (y: number, label: string) => this.text(label, px + 28, y + 20, 18, '#e6d8ff');
    const lang = getLang();

    row(112, t('language'));
    this.btn(px + 190, 112, 120, 40, 'ไทย', () => this.setLanguage('th'), lang === 'th' ? '#c8508a' : '#3a2f6a', undefined, 18);
    this.btn(px + 320, 112, 120, 40, 'English', () => this.setLanguage('en'), lang === 'en' ? '#c8508a' : '#3a2f6a', undefined, 18);

    row(186, t('sound'));
    this.btn(px + 190, 186, 120, 40, t('on'), () => { this.muted = false; }, !this.muted ? '#c8508a' : '#3a2f6a', undefined, 18);
    this.btn(px + 320, 186, 120, 40, t('off'), () => { this.muted = true; }, this.muted ? '#c8508a' : '#3a2f6a', undefined, 18);

    row(260, t('saveData'));
    this.btn(px + 190, 260, 120, 40, t('exportSave'), () => this.exportSave(), '#4a3a8a', undefined, 16);
    this.btn(px + 320, 260, 120, 40, t('importSave'), () => this.importSave(), '#4a3a8a', undefined, 16);
    this.btn(px + 320, 316, 120, 40, t('tutReplay'), () => { this.save.tutDone = false; this.persist(); this.toast(t('tutReplayed')); }, '#4a3a8a', undefined, 16);
    this.btn(px + 190, 316, 120, 40, t('resetSave'), () => this.resetSavePress(), this.resetArm > 0 ? '#c03a4a' : '#6a3a5a', undefined, 16);
    this.text(t('storageNote'), W / 2, 400, 13, '#a99bd6', 'center');
    this.text(`${t('totalStars')}: ${totalStars(this.save)}/${STAGES.length * 3}`, W / 2, 440, 15, '#ffd76a', 'center');
  }

  private drawTransition() {
    if (!this.trans) return;
    const { t, dur } = this.trans;
    const a = t < dur / 2 ? t / (dur / 2) : 1 - (t - dur / 2) / (dur / 2);
    this.ctx.fillStyle = `rgba(8, 4, 18, ${Math.max(0, Math.min(1, a))})`;
    this.ctx.fillRect(0, 0, W, H);
  }

  private drawBackdrop() {
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
  }

  private drawTitle() {
    this.drawBackdrop();
    const c = this.ctx;
    const tm = this.t;

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
      const ph = (tm + i * 0.9) % 3.6;
      const frame: Frame = ph < 0.14 ? 'blink' : ph > 1.9 && ph < 2.3 ? 'sway' : 'idle';
      const spr = heroSprite(h, frame);
      c.fillStyle = '#00000055';
      c.beginPath(); c.ellipse(cx, footY + 6, S * 6, 5, 0, 0, Math.PI * 2); c.fill();
      c.drawImage(spr, cx - 10.5 * S, footY - 25 * S + 4, spr.width * S, spr.height * S);
    });

    // emblem: five-petal flower with a star
    const ex = W / 2, ey = 76;
    for (let i = 0; i < 5; i++) {
      const a = (i * 72 - 90) * (Math.PI / 180) + tm * 0.25;
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
    this.text(t('subtitle'), W / 2, 224, 20, '#e6d8ff', 'center');

    // buttons
    const pulse = Math.sin(tm * 3) * 3;
    this.btn(W / 2 - 150, 258 + pulse, 300, 62, t('play'), () => { unlockAudio(); this.go('stages'); }, '#c8508a', undefined, 28);
    this.btn(W / 2 - 150, 340, 96, 42, t('team'), () => this.go('deck'), '#4a3a8a', undefined, 16);
    this.btn(W / 2 - 48, 340, 96, 42, t('recruit'), () => this.go('gacha'), '#4a3a8a', undefined, 16);
    if (this.save.coins >= PULL_COST) { this.ctx.fillStyle = '#ff5f7a'; this.ctx.beginPath(); this.ctx.arc(W / 2 + 44, 346, 6, 0, Math.PI * 2); this.ctx.fill(); }
    this.btn(16, 14, 110, 32, t('characters'), () => { window.location.href = './preview.html'; }, '#3a2f6a', undefined, 14);
    this.btn(W / 2 + 54, 340, 96, 42, t('settings'), () => this.go('settings'), '#4a3a8a', undefined, 16);
    this.btn(W - 76, 14, 60, 32, getLang() === 'th' ? 'EN' : 'ไทย', () => this.setLanguage(getLang() === 'th' ? 'en' : 'th'), '#4a3a8a', undefined, 15);
    this.btn(W - 142, 14, 60, 32, this.muted ? '🔇' : '🔊', () => { this.muted = !this.muted; }, '#4a3a8a');
    this.text(t('hintStart'), W / 2, 408, 13, '#a99bd6', 'center');
    this.text(t('version'), W - 12, H - 12, 12, '#d8ccff', 'right');
  }

  private drawEnd() {
    const c = this.ctx;
    const b = this.battle;
    c.fillStyle = '#000000aa';
    c.fillRect(0, 0, W, H);
    const win = b.state === 'win';
    this.rr(W / 2 - 220, 150, 440, 290, 20, '#241a4a', win ? '#ffe27a' : '#ff7a9a');
    this.text(win ? t('win') : t('lose'), W / 2, 196, 40, win ? '#ffe27a' : '#ff8aa6', 'center', 700);
    if (win) {
      const s = b.stars();
      this.text('★'.repeat(s) + '☆'.repeat(3 - s), W / 2, 250, 40, '#ffd76a', 'center');
      if (this.newBest) this.text(t('newBest'), W / 2 + 110, 250, 14, '#8fe0a0', 'center');
    } else {
      this.text(t('loseSub'), W / 2, 250, 18, '#d8ccff', 'center');
    }
    this.text(t('summary', { k: b.kills, l: b.leaks, s: Math.floor(b.time) }), W / 2, 338, 15, '#bfb2f0', 'center');
    if (win && this.reward) {
      const rw = '+' + this.reward.coins;
      this.coin(W / 2 - 40, 296, 11);
      this.text(rw, W / 2 - 22, 297, 22, '#ffe27a', 'left', 700);
      if (this.reward.first) this.text(t('firstClear'), W / 2 + 80, 297, 14, '#8fe0a0', 'left');
    }
    const nextIdx = this.stageIndex() + 1;
    const next = win && nextIdx < STAGES.length ? STAGES[nextIdx] : null;
    const bw = 124, bg = 10;
    const n = next ? 3 : 2;
    const bx = W / 2 - (n * bw + (n - 1) * bg) / 2;
    this.btn(bx, 372, bw, 40, t('retry'), () => this.restart(), '#6a4fb0', undefined, 15);
    this.btn(bx + bw + bg, 372, bw, 40, t('stageList'), () => this.go('stages'), '#4a3a8a', undefined, 15);
    if (next) this.btn(bx + 2 * (bw + bg), 372, bw, 40, t('next'), () => this.startStage(next), '#c8508a', undefined, 15);
  }
}

export { ENEMIES };
export type { Hero };
