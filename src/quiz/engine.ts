// Motor de animación del quiz (canvas 1600×900 dibujando arte pixel en una cuadrícula 800×450).
import { QUESTIONS, type AnswerRec, type QuizPhase, type ResultRec } from "@/config/quiz";
import { drawHuman, hashStr, makeLook, mulberry, type Look, type Pose } from "./sprites";
import { GROUND, H, W, drawBackground, levelFor, type Level } from "./scenes";
import { sfx } from "./audio";

export interface PlayerRec {
  name: string;
  seed: number;
  joinedAt?: number;
}
export interface Ranked {
  id: string;
  name: string;
  pts: number;
  ms: number;
}

interface Ent {
  id: string;
  name: string;
  look: Look;
  x: number;
  y: number;
  tx: number;
  ty: number;
  // desplazamientos de pelea / vuelo
  ex: number;
  ey: number;
  evx: number;
  evy: number;
  air: number; // altura al aparecer
  airV: number;
  frame: number;
  flip: boolean;
  scale: number;
  pose: Pose;
  tint: string | null;
  alpha: number;
  // juego
  answer?: number | string;
  answerT: number;
  ok: boolean;
  fastest: boolean;
  pts: number;
  zone: number;
  hasAnswered: boolean;
  koAt: number; // segundos desde inicio de pelea
  koState: 0 | 1 | 2 | 3 | 4; // 0 en pie, 1 congelado, 2 electrocutado, 3 vuelo/animando, 4 en el suelo
  lieRot: number;
  phase: number; // fase aleatoria de animación
  wanderAt: number;
  climbDelay: number;
  climbP: number;
  climbMax: number;
  hop: number;
  nameRow: number;
}

interface Particle {
  x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; grav: number;
}
interface Popup {
  text: string; x: number; y: number; vy: number; life: number; max: number; color: string; size: number;
}
interface Fx {
  kind: "meteor" | "bomb" | "bolt" | "ring";
  x: number; y: number; x0?: number; y0?: number; t: number; dur: number; r?: number;
}

const OPT_COLORS = ["#e8453c", "#2f6fe4", "#f2b632", "#2bb673"];
const OPT_TEXT = ["#ffffff", "#ffffff", "#2b2200", "#ffffff"];
const FONT = '"Press Start 2P", monospace';
const FIGHT_MIN = 5.0;

function wrap(c: CanvasRenderingContext2D, s: string, maxW: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? cur + " " + w : w;
    if (c.measureText(t).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

export class QuizEngine {
  phase: QuizPhase = "lobby";
  q = 0;
  level: Level = levelFor(0);
  ents = new Map<string, Ent>();
  onFightDone?: () => void;

  private reqPhase: QuizPhase | null = null;
  private reqQ = -1;
  private time = 0;
  private phaseT = 0;
  private particles: Particle[] = [];
  private popups: Popup[] = [];
  private fx: Fx[] = [];
  private timers: { at: number; fn: () => void }[] = [];
  private shake = 0;
  private dirty = true;
  private results: Record<string, ResultRec> = {};
  private ranking: Ranked[] = [];
  private fightDone = false;
  private bannerT = 0;
  private lastHitSfx = 0;
  private rand = mulberry(Date.now() & 0xffff);
  startedAt = 0;
  /** conteo de jugadores / respuestas para el HUD */
  get total() { return this.ents.size; }
  get answered() { let n = 0; this.ents.forEach((e) => e.hasAnswered && n++); return n; }

  /* ───────────── entradas ───────────── */
  syncPlayers(players: Record<string, PlayerRec>) {
    const ids = new Set(Object.keys(players));
    for (const [id, p] of Object.entries(players)) {
      if (!p || !p.name) continue;
      if (!this.ents.has(id)) this.spawn(id, p);
    }
    for (const id of [...this.ents.keys()]) if (!ids.has(id)) this.ents.delete(id);
    this.dirty = true;
  }

  private spawn(id: string, p: PlayerRec) {
    const e: Ent = {
      id, name: p.name.slice(0, 12), look: makeLook(p.seed ?? hashStr(id)),
      x: 230 + this.rand() * 560, y: 300 + this.rand() * 120, tx: 0, ty: 0,
      ex: 0, ey: 0, evx: 0, evy: 0, air: 240, airV: 0, frame: Math.floor(this.rand() * 30),
      flip: this.rand() < 0.5, scale: 1, pose: "idle", tint: null, alpha: 1,
      answerT: 0, ok: false, fastest: false, pts: 0, zone: 0, hasAnswered: false,
      koAt: 0, koState: 0, lieRot: 1, phase: this.rand() * 6.28, wanderAt: 0, climbDelay: 0, climbP: 0, climbMax: 0, hop: 0, nameRow: 0,
    };
    e.tx = e.x; e.ty = e.y;
    this.ents.set(id, e);
    if (this.phase === "lobby") sfx.join();
  }

  syncAnswers(answers: Record<string, AnswerRec> | null) {
    const a = answers ?? {};
    for (const e of this.ents.values()) {
      const rec = a[e.id];
      const had = e.hasAnswered;
      e.hasAnswered = !!rec;
      if (rec) {
        e.answer = rec.a;
        e.answerT = rec.t;
        if (!had && this.phase === "question") {
          e.evy = -55;
          sfx.answerIn();
          this.burst(e.x, e.y - 12, 5, this.level.accent);
        }
      } else {
        e.answer = undefined;
      }
    }
    this.dirty = true;
  }

  enter(phase: QuizPhase, q: number, data: { results?: Record<string, ResultRec>; ranking?: Ranked[]; startedAt?: number } = {}) {
    const changed = phase !== this.reqPhase || q !== this.reqQ;
    this.reqPhase = phase;
    this.reqQ = q;
    this.phase = phase;
    this.q = q;
    this.level = levelFor(phase === "final" ? 9 : q);
    if (data.startedAt) this.startedAt = data.startedAt;
    if (data.ranking) this.ranking = data.ranking;
    if (!changed) {
      if (data.results) this.results = data.results;
      return;
    }
    this.phaseT = 0;
    this.timers = [];
    this.fx = [];
    this.fightDone = false;
    this.bannerT = 0;
    this.popups = [];
    for (const e of this.ents.values()) {
      e.ex = e.ey = e.evx = e.evy = 0;
      e.tint = null; e.alpha = 1; e.koState = 0; e.pose = "idle"; e.hop = 0;
    }
    if (phase === "question") {
      this.bannerT = 2.2;
      sfx.question();
      for (const e of this.ents.values()) { e.hasAnswered = false; e.answer = undefined; e.ok = false; e.fastest = false; e.pts = 0; }
    }
    if (phase === "fight") {
      this.results = data.results ?? {};
      sfx.fightStart();
      this.startFight();
    }
    if (phase === "final") this.startFinal();
    if (phase === "lobby") for (const e of this.ents.values()) { e.wanderAt = 0; }
    this.dirty = true;
  }

  /* ───────────── utilidades ───────────── */
  private after(sec: number, fn: () => void) {
    this.timers.push({ at: this.time + sec, fn });
  }
  private burst(x: number, y: number, n: number, color: string, spd = 40) {
    for (let i = 0; i < n; i++) {
      const a = this.rand() * Math.PI * 2, v = (0.3 + this.rand()) * spd;
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 15, life: 0.6, max: 0.6, size: 1 + Math.floor(this.rand() * 2), color, grav: 120 });
    }
  }
  private popup(text: string, x: number, y: number, color: string, size = 16, life = 1.4) {
    this.popups.push({ text, x, y, vy: -18, life, max: life, color, size });
  }
  private zoneCount(): number {
    const qu = QUESTIONS[this.q];
    if (qu.type === "text") return this.phase === "question" ? 1 : 2;
    return qu.options!.length;
  }
  private zoneOf(e: Ent): number {
    const qu = QUESTIONS[this.q];
    if (qu.type === "text") return this.phase === "question" ? 0 : e.ok ? 1 : 0;
    return typeof e.answer === "number" ? Math.min(e.answer, qu.options!.length - 1) : 0;
  }

  /* ───────────── pelea ───────────── */
  private startFight() {
    const style = this.q % 5;
    let maxKo = 0;
    for (const e of this.ents.values()) {
      const r = this.results[e.id];
      e.ok = !!r?.ok;
      e.fastest = !!r?.fastest;
      e.pts = r?.pts ?? 0;
      e.hasAnswered = !!r || e.hasAnswered;
      if (e.hasAnswered && !e.ok) {
        e.koAt = 1.2 + this.rand() * 2.8;
        maxKo = Math.max(maxKo, e.koAt);
        this.after(e.koAt, () => this.startKo(e, style));
      } else {
        e.koAt = 999;
      }
    }
    this.after(Math.max(FIGHT_MIN, maxKo + 1.8), () => this.finishFight());
  }

  private startKo(e: Ent, style: number) {
    if (e.koState !== 0) return;
    const gx = e.x + e.ex, gy = e.y + e.ey;
    e.lieRot = this.rand() < 0.5 ? 1 : 3;
    switch (style) {
      case 0: // puñetazo: sale volando
        e.koState = 3; e.evx = (this.rand() < 0.5 ? -1 : 1) * (50 + this.rand() * 60); e.evy = -(110 + this.rand() * 60);
        this.burst(gx, gy - 8, 10, "#fff176", 60);
        this.popup(["POW!", "BAM!", "ZAS!"][Math.floor(this.rand() * 3)], gx, gy - 24, "#ff5a2a", 18);
        sfx.hit(); this.shake = Math.max(this.shake, 3);
        break;
      case 1: { // meteoro
        sfx.meteor();
        this.fx.push({ kind: "meteor", x: gx, y: gy, x0: gx + 70, y0: -20, t: 0, dur: 0.55 });
        this.after(0.55, () => {
          sfx.explosion(); this.shake = Math.max(this.shake, 5);
          this.burst(gx, gy - 6, 18, "#ff9a2a", 70);
          this.fx.push({ kind: "ring", x: gx, y: gy, t: 0, dur: 0.4, r: 22 });
          e.koState = 4; e.tint = "#3a3a3a";
        });
        e.koState = 3; e.evx = 0; e.evy = 0;
        break;
      }
      case 2: // rayo
        e.koState = 2;
        sfx.lightning(); this.shake = Math.max(this.shake, 4);
        this.fx.push({ kind: "bolt", x: gx, y: gy, t: 0, dur: 0.3 });
        this.after(0.7, () => { e.koState = 4; e.tint = "#2a2a2a"; this.burst(gx, gy - 10, 8, "#999", 20); });
        break;
      case 3: // bomba
        e.koState = 3; e.evx = 0; e.evy = 0;
        this.fx.push({ kind: "bomb", x: gx, y: gy, t: 0, dur: 0.55 });
        this.after(0.55, () => {
          sfx.explosion(); this.shake = Math.max(this.shake, 5);
          this.burst(gx, gy - 6, 16, "#ffcf3a", 80);
          this.fx.push({ kind: "ring", x: gx, y: gy, t: 0, dur: 0.35, r: 18 });
          e.evx = (this.rand() < 0.5 ? -1 : 1) * (30 + this.rand() * 40); e.evy = -(170 + this.rand() * 60);
        });
        break;
      default: // congelar y romper
        e.koState = 1; e.tint = "#9fe8ff"; sfx.freeze();
        this.burst(gx, gy - 8, 10, "#e8fbff", 30);
        this.after(0.9, () => {
          sfx.shatter();
          this.burst(gx, gy - 8, 16, "#bfeaff", 60);
          e.tint = null; e.koState = 4;
        });
    }
    this.after(0.05, () => sfx.ko());
  }

  private finishFight() {
    if (this.fightDone) return;
    this.fightDone = true;
    this.phase = "results";
    this.phaseT = 0;
    sfx.victory();
    for (const e of this.ents.values()) {
      if (e.hasAnswered && e.ok) {
        e.hop = 1;
        if (e.fastest || this.ents.size <= 30) this.popup(e.fastest ? `+${e.pts} RAPIDO` : `+${e.pts}`, e.x, e.y - 24 * e.scale - 10, e.fastest ? "#ffd84a" : "#ffffff", e.fastest ? 14 : 16, 3.2);
        this.burst(e.x, e.y - 14, 4, "#ffd84a", 30);
      }
    }
    this.dirty = true;
    this.onFightDone?.();
  }

  /* ───────────── final ───────────── */
  private startFinal() {
    const top = this.ranking.slice(0, 5);
    top.forEach((r, i) => {
      const e = this.ents.get(r.id);
      if (!e) return;
      e.climbDelay = 1 + i * 0.6;
      e.climbP = 0;
      e.climbMax = i === 0 ? 1 : Math.max(0.18, 0.62 - i * 0.12);
    });
    const win = top[0] && this.ents.get(top[0].id);
    if (win) {
      this.after(1 + 9.2, () => {
        sfx.fanfare();
        this.shake = 3;
        for (let i = 0; i < 90; i++) {
          this.particles.push({
            x: 400 + (this.rand() - 0.5) * 60, y: 66, vx: (this.rand() - 0.5) * 160, vy: -this.rand() * 120 - 20,
            life: 3, max: 3, size: 2, color: ["#ff5a2a", "#ffd84a", "#2bb673", "#2f6fe4", "#ef7fb0", "#fff"][i % 6], grav: 70,
          });
        }
      });
    }
  }

  private mountainPath(): { x: number; y: number }[] {
    const pts: { x: number; y: number }[] = [{ x: 400, y: GROUND }];
    const n = 8;
    for (let i = 1; i <= n; i++) {
      const yy = GROUND - (i * (GROUND - 78)) / n;
      const hw = ((yy - 70) * 250) / (GROUND - 70);
      pts.push({ x: 400 + (i % 2 ? -1 : 1) * hw * 0.62, y: yy });
    }
    pts.push({ x: 400, y: 68 });
    return pts;
  }
  private pathPos(p: number) {
    const pts = this.mountainPath();
    const segs = pts.length - 1;
    const f = Math.max(0, Math.min(1, p)) * segs;
    const i = Math.min(segs - 1, Math.floor(f));
    const k = f - i;
    return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * k, y: pts[i].y + (pts[i + 1].y - pts[i].y) * k, dx: pts[i + 1].x - pts[i].x };
  }

  /* ───────────── diseño / posiciones ───────────── */
  private relayout() {
    this.dirty = false;
    const list = [...this.ents.values()];
    if (this.phase === "lobby") {
      const s = list.length <= 18 ? 2 : 1;
      list.forEach((e) => (e.scale = s));
      return;
    }
    if (this.phase === "final") {
      const fs = list.length <= 40 ? 2 : 1;
      list.forEach((e) => (e.scale = fs));
      const top = new Set(this.ranking.slice(0, 5).map((r) => r.id));
      const crowd = list.filter((e) => !top.has(e.id)).sort((a, b) => a.name.localeCompare(b.name));
      const perRow = Math.floor(760 / (13.4 * fs));
      crowd.forEach((e, i) => {
        const row = Math.floor(i / perRow), col = i % perRow;
        e.tx = 24 + col * 13.4 * fs + (row % 2) * 6 * fs;
        e.ty = GROUND + 16 * fs + row * 12 * (fs === 2 ? 1.2 : 1);
      });
      return;
    }
    const k = this.zoneCount();
    const zw = W / k;
    const sc = list.length <= 40 ? 2 : 1;
    const cols = Math.max(1, Math.floor((zw - 16) / (13 * sc)));
    const groups: Ent[][] = Array.from({ length: k }, () => []);
    const waiting: Ent[] = [];
    for (const e of list) {
      e.scale = sc;
      if (e.hasAnswered) {
        e.zone = this.zoneOf(e);
        groups[e.zone].push(e);
      } else waiting.push(e);
    }
    groups.forEach((g, z) => {
      g.sort((a, b) => a.answerT - b.answerT || a.id.localeCompare(b.id));
      g.forEach((e, i) => {
        const row = Math.floor(i / cols), col = i % cols;
        const rc = Math.min(cols, g.length - row * cols);
        const startX = z * zw + (zw - rc * 13 * sc) / 2 + 6.5 * sc;
        e.tx = startX + col * 13 * sc;
        e.ty = GROUND - 4 - row * 9 * sc;
        e.nameRow = (col + row) % 2;
      });
    });
    waiting.sort((a, b) => a.id.localeCompare(b.id));
    waiting.forEach((e, i) => {
      const per = Math.floor(740 / (14 * sc)), row = Math.floor(i / per), col = i % per;
      e.tx = 24 + col * 14 * sc + (row % 2) * 6 * sc;
      e.ty = 192 + row * 9 * sc;
      e.nameRow = col % 2;
    });
  }

  /* ───────────── actualización ───────────── */
  private update(dt: number) {
    this.time += dt;
    this.phaseT += dt;
    this.bannerT = Math.max(0, this.bannerT - dt);
    this.shake = Math.max(0, this.shake - dt * 8);
    if (this.dirty) this.relayout();
    // temporizadores
    if (this.timers.length) {
      const due = this.timers.filter((t) => t.at <= this.time);
      if (due.length) {
        this.timers = this.timers.filter((t) => t.at > this.time);
        due.forEach((t) => t.fn());
      }
    }
    const fighting = this.phase === "fight";
    const results = this.phase === "results";
    const ft = this.phaseT;

    for (const e of this.ents.values()) {
      e.frame++;
      // caída al aparecer
      if (e.air > 0) {
        e.airV += 420 * dt;
        e.air -= e.airV * dt;
        if (e.air <= 0) {
          e.air = 0;
          e.airV = 0;
          this.burst(e.x, e.y, 6, "#ffffff", 30);
        }
      }
      // física de vuelo
      if ((e.ex !== 0 || e.ey !== 0 || e.evx !== 0 || e.evy !== 0) && (e.koState !== 0 || !fighting)) {
        e.evy += 330 * dt;
        e.ex += e.evx * dt;
        e.ey += e.evy * dt;
        if (e.ey >= 0 && e.evy > 0) {
          e.ey = 0;
          if (e.koState === 3 && (e.evx !== 0 || Math.abs(e.evy) > 60) && e.koAt < 900) {
            // aterriza noqueado
            e.koState = 4;
            this.burst(e.x + e.ex, e.y, 5, "#ffffff", 25);
          }
          e.evy = e.evy > 90 ? -e.evy * 0.3 : 0;
          e.evx *= 0.5;
          if (Math.abs(e.evx) < 3) e.evx = 0;
        }
        if (e.ey === 0 && e.evy === 0 && e.evx === 0) e.ex = 0;
      }

      // movimiento hacia el objetivo
      if (this.phase === "lobby") {
        if (this.time > e.wanderAt) {
          e.wanderAt = this.time + 2 + this.rand() * 4;
          if (this.rand() < 0.7) {
            e.tx = 230 + this.rand() * 560;
            e.ty = (e.scale === 2 ? 285 : 270) + this.rand() * (e.scale === 2 ? 135 : 150);
          }
        }
      } else if (this.phase === "final") {
        const top = this.ranking.slice(0, 5).findIndex((r) => r.id === e.id);
        if (top >= 0) {
          const run = Math.max(0, this.phaseT - e.climbDelay);
          const dur = 9;
          e.climbP = Math.min(e.climbMax, run / dur);
          const p = this.pathPos(e.climbP);
          e.x = p.x; e.y = p.y;
          e.flip = p.dx < 0;
          e.pose = run <= 0 ? "idle" : e.climbP >= e.climbMax ? "cheer" : "climb";
          if (run > 0 && e.climbP < e.climbMax && Math.floor(e.frame / 6) % 2 === 0 && e.frame % 6 === 0) sfx.step();
          continue;
        }
      }
      const dx = e.tx - e.x, dy = e.ty - e.y;
      const dist = Math.hypot(dx, dy);
      const moving = dist > 0.6;
      const speed = this.phase === "lobby" ? 34 : 90;
      if (moving && !(fighting && e.hasAnswered)) {
        const step = Math.min(dist, speed * dt);
        e.x += (dx / dist) * step;
        e.y += (dy / dist) * step;
        if (Math.abs(dx) > 0.5) e.flip = dx < 0;
      }

      // poses
      if (e.koState === 4) {
        e.pose = "ko";
      } else if (e.koState === 3 || e.koState === 1) {
        e.pose = e.koState === 1 ? "dizzy" : "ko";
      } else if (e.koState === 2) {
        e.pose = "dizzy";
      } else if (fighting && e.hasAnswered) {
        const ph = e.phase;
        const s = Math.sin(ft * 7 + ph);
        e.pose = e.ok ? (s > 0.6 ? "punch" : "guard") : s > 0.2 ? "punch" : "idle";
        e.ex = Math.sin(ft * 5 + ph) * 5 * e.scale;
        e.ey = -Math.abs(Math.sin(ft * 6 + ph)) * 3 * e.scale;
        e.flip = Math.cos(ft * 5 + ph) < 0;
      } else if (results && e.hasAnswered && e.ok) {
        e.pose = "cheer";
      } else if (!e.hasAnswered && this.phase === "question") {
        e.pose = "idle";
      } else if (this.phase === "final") {
        e.pose = "cheer";
      } else if (moving) {
        e.pose = "walk";
      } else {
        e.pose = "idle";
      }
      if (!e.hasAnswered && (fighting || results) && e.koState === 0) { e.pose = "sleep"; e.alpha = 0.75; }
      if (e.hop > 0 && e.ey >= 0 && results) {
        // pequeños saltos de festejo
        if (e.frame % 40 === Math.floor(e.phase * 3) % 40) e.evy = -45 * (e.scale === 2 ? 1.3 : 1);
      }
    }

    // chispas de pelea
    if (fighting && ft < 5.5) {
      this.lastHitSfx -= dt;
      const act = [...this.ents.values()].filter((e) => e.hasAnswered && e.koState === 0);
      if (act.length > 1 && this.rand() < dt * Math.min(18, 4 + act.length * 0.5)) {
        const a = act[Math.floor(this.rand() * act.length)];
        const b = act[Math.floor(this.rand() * act.length)];
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - 10;
        if (Math.hypot(a.x - b.x, a.y - b.y) < 70) {
          this.burst(mx, my, 3, ["#fff176", "#ffffff", "#ff8a2a"][Math.floor(this.rand() * 3)], 40);
          if (this.lastHitSfx <= 0) {
            sfx.hitSmall();
            this.lastHitSfx = 0.08;
          }
          if (this.rand() < 0.08) this.popup(["POW", "BAM", "ZAS", "PAF"][Math.floor(this.rand() * 4)], mx, my - 6, "#ffffff", 12, 0.6);
        }
      }
    }

    // efectos
    for (const f of this.fx) f.t += dt;
    this.fx = this.fx.filter((f) => f.t < f.dur + 0.05);
    for (const p of this.particles) {
      p.life -= dt;
      p.vy += p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0 && p.y < H + 20);
    for (const p of this.popups) {
      p.life -= dt;
      p.y += p.vy * dt;
    }
    this.popups = this.popups.filter((p) => p.life > 0);
    if (this.particles.length > 900) this.particles.splice(0, this.particles.length - 900);
  }

  /* ───────────── dibujo ───────────── */
  draw(c: CanvasRenderingContext2D, dt: number) {
    this.update(Math.min(dt, 0.05));
    const sx = this.shake ? (this.rand() - 0.5) * this.shake * 2 : 0;
    const sy = this.shake ? (this.rand() - 0.5) * this.shake * 2 : 0;
    const art = () => c.setTransform(2, 0, 0, 2, sx * 2, sy * 2);
    const txt = () => c.setTransform(1, 0, 0, 1, sx * 2, sy * 2);
    c.imageSmoothingEnabled = false;
    art();
    const lv = this.level;
    drawBackground(c, lv, this.phase === "final" ? 9 : this.q, this.time);

    if (this.phase === "final") this.drawMountain(c, lv);
    if (this.phase === "question" || this.phase === "fight" || this.phase === "results") { this.drawOptions(art, txt, c); art(); }

    // personajes ordenados por profundidad
    const list = [...this.ents.values()].sort((a, b) => a.y + a.ey - (b.y + b.ey) || a.x - b.x);
    for (const e of list) {
      const x = e.x + e.ex;
      let y = e.y + e.ey - e.air;
      const down = e.koState === 4 || (e.koState === 3 && e.ey < -2 && false);
      let rot = 0;
      if (down || (e.koState === 3 && e.koAt < 900 && e.evx !== 0)) rot = e.lieRot;
      if (rot) y -= 4 * e.scale;
      if (e.koState === 3 && e.evx !== 0) rot = Math.floor(this.time * 8 + e.phase) % 4;
      if (e.koState === 2) {
        // parpadeo eléctrico
        e.tint = Math.floor(this.time * 20) % 2 ? "#ffffff" : "#222222";
      }
      drawHuman(c, e.look, x, y, { pose: e.pose, frame: e.frame, flip: e.flip, scale: e.scale, tint: e.tint, alpha: e.alpha, rot });
      if (e.koState === 1) {
        // bloque de hielo
        c.fillStyle = "rgba(190,240,255,0.55)";
        c.fillRect(Math.round(x - 7), Math.round(y - 18), 14, 19);
        c.fillStyle = "#ffffffaa";
        c.fillRect(Math.round(x - 6), Math.round(y - 17), 3, 8);
      }
      if (e.koState === 4 && this.phase !== "lobby") {
        // estrellitas mareadas
        const a = this.time * 6 + e.phase;
        c.fillStyle = "#ffd84a";
        c.fillRect(Math.round(x + Math.cos(a) * 5), Math.round(y - 8 + Math.sin(a) * 2), 2, 2);
        c.fillRect(Math.round(x + Math.cos(a + 3) * 5), Math.round(y - 8 + Math.sin(a + 3) * 2), 2, 2);
      }
      if (e.fastest && this.phase === "results") {
        // rayo sobre el más rápido
        c.fillStyle = "#ffd84a";
        c.fillRect(Math.round(x - 1), Math.round(y - 16 * e.scale - 9), 3, 3);
        c.fillRect(Math.round(x - 3), Math.round(y - 16 * e.scale - 6), 3, 3);
        c.fillRect(Math.round(x - 1), Math.round(y - 16 * e.scale - 3), 3, 3);
      }
    }

    // efectos
    for (const f of this.fx) this.drawFx(c, f);
    for (const p of this.particles) {
      c.globalAlpha = Math.max(0, Math.min(1, p.life / p.max));
      c.fillStyle = p.color;
      c.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    c.globalAlpha = 1;

    // texto
    txt();
    this.drawText(c, lv, list);
    c.setTransform(1, 0, 0, 1, 0, 0);
  }

  private drawFx(c: CanvasRenderingContext2D, f: Fx) {
    const k = Math.min(1, f.t / f.dur);
    if (f.kind === "meteor") {
      const x = f.x0! + (f.x - f.x0!) * k, y = f.y0! + (f.y - 12 - f.y0!) * k;
      c.fillStyle = "#ff5a2a"; c.fillRect(Math.round(x - 4), Math.round(y - 4), 8, 8);
      c.fillStyle = "#ffd84a"; c.fillRect(Math.round(x - 2), Math.round(y - 2), 4, 4);
      c.fillStyle = "#ff8a2a";
      for (let i = 1; i < 6; i++) c.fillRect(Math.round(x + i * 5 * ((f.x0! - f.x) / 70)), Math.round(y - i * 6), 4 - Math.floor(i / 2), 4 - Math.floor(i / 2));
    } else if (f.kind === "bomb") {
      const y = f.y0 !== undefined ? f.y0 : -20;
      const yy = y + (f.y - 10 - y) * (k * k);
      c.fillStyle = "#111"; c.fillRect(Math.round(f.x - 4), Math.round(yy - 4), 8, 8);
      c.fillStyle = Math.floor(f.t * 20) % 2 ? "#ff5a2a" : "#ffd84a";
      c.fillRect(Math.round(f.x), Math.round(yy - 7), 2, 3);
    } else if (f.kind === "bolt") {
      c.fillStyle = Math.floor(f.t * 30) % 2 ? "#ffffff" : "#ffe55a";
      let x = f.x, y = 0;
      const seed = mulberry(Math.floor(f.t * 30) + Math.floor(f.x));
      while (y < f.y - 6) {
        const nx = f.x + (seed() - 0.5) * 12;
        c.fillRect(Math.round(Math.min(x, nx)), Math.round(y), Math.abs(nx - x) + 2, 2);
        c.fillRect(Math.round(nx), Math.round(y), 2, 10);
        x = nx; y += 10;
      }
      c.globalAlpha = 0.25 * (1 - k);
      c.fillStyle = "#ffffff"; c.fillRect(0, 0, W, H);
      c.globalAlpha = 1;
    } else if (f.kind === "ring") {
      const r = (f.r ?? 20) * k;
      c.strokeStyle = "#ffd84a"; c.lineWidth = 2;
      c.globalAlpha = 1 - k;
      c.strokeRect(Math.round(f.x - r), Math.round(f.y - r - 6), Math.round(r * 2), Math.round(r * 2));
      c.globalAlpha = 1;
    }
  }

  private drawMountain(c: CanvasRenderingContext2D, lv: Level) {
    const apexY = 70, hwBase = 250;
    for (let y = apexY; y < GROUND; y += 2) {
      const hw = ((y - apexY) * hwBase) / (GROUND - apexY);
      const snow = y < apexY + 38;
      c.fillStyle = snow ? "#ffffff" : y % 8 < 4 ? "#7d7d92" : "#74748a";
      c.fillRect(Math.round(400 - hw), y, Math.round(hw * 2), 2);
      c.fillStyle = snow ? "#dfe8f2" : "#5d5d72";
      c.fillRect(Math.round(400 + hw * 0.1), y, Math.round(hw * 0.9), 2);
    }
    // camino en zigzag
    const pts = this.mountainPath();
    c.fillStyle = "#e8c98a";
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const n = 14;
      for (let k = 0; k < n; k++) {
        if (k % 2) continue;
        c.fillRect(Math.round(a.x + ((b.x - a.x) * k) / n), Math.round(a.y + ((b.y - a.y) * k) / n), 2, 2);
      }
    }
    // bandera en la cima
    c.fillStyle = "#4a3a2a"; c.fillRect(399, 50, 2, 22);
    c.fillStyle = lv.accent === "#ffffff" ? "#e8453c" : "#e8453c";
    c.fillRect(401, 50, 12 + (Math.floor(this.time * 4) % 2) * 2, 7);
  }

  private drawOptions(art: () => void, txt: () => void, c: CanvasRenderingContext2D) {
    const qu = QUESTIONS[this.q];
    const showAns = this.phase === "results";
    const dimWrong = this.phase === "results" || (this.phase === "fight" && this.phaseT > 3.5);
    const k = qu.type === "text" ? (this.phase === "question" ? 1 : 2) : qu.options!.length;
    const zw = W / k;
    const by = GROUND + 8, bh = 100;
    art();
    const boxes: { x: number; w: number; label: string; good: boolean; color: string; tcolor: string; letter: string }[] = [];
    for (let i = 0; i < k; i++) {
      let label: string, good: boolean;
      if (qu.type === "text") {
        if (this.phase === "question") { label = "ESCRIBIERON SU RESPUESTA..."; good = false; }
        else { label = i === 1 ? qu.answerLabel : "OTRA RESPUESTA"; good = i === 1; }
      } else { label = qu.options![i]; good = !!qu.correct?.includes(i); }
      boxes.push({ x: i * zw + 3, w: zw - 6, label, good, color: qu.type === "text" ? (i === 1 ? "#2bb673" : "#e8453c") : OPT_COLORS[i % 4], tcolor: qu.type === "text" ? "#fff" : OPT_TEXT[i % 4], letter: qu.type === "text" ? "" : "ABCD"[i] });
    }
    for (const b of boxes) {
      const dim = dimWrong && !b.good;
      c.fillStyle = dim ? "#555a" : b.color;
      c.fillRect(b.x, by, b.w, bh);
      c.fillStyle = "rgba(0,0,0,0.3)";
      c.fillRect(b.x, by + bh - 4, b.w, 4);
      c.fillStyle = "rgba(255,255,255,0.25)";
      c.fillRect(b.x, by, b.w, 2);
      if (showAns && b.good) {
        const on = Math.floor(this.time * 4) % 2;
        c.strokeStyle = on ? "#ffffff" : "#ffd84a"; c.lineWidth = 2;
        c.strokeRect(b.x + 1, by + 1, b.w - 2, bh - 2);
        // palomita pixel
        c.fillStyle = "#ffffff";
        const cx = b.x + b.w - 22, cy = by + 12;
        c.fillRect(cx, cy + 6, 3, 3); c.fillRect(cx + 3, cy + 9, 3, 3); c.fillRect(cx + 6, cy + 6, 3, 3);
        c.fillRect(cx + 9, cy + 3, 3, 3); c.fillRect(cx + 12, cy, 3, 3);
      }
    }
    txt();
    c.textBaseline = "top";
    for (const b of boxes) {
      const dim = dimWrong && !b.good;
      c.fillStyle = dim ? "rgba(255,255,255,0.55)" : b.tcolor;
      const size = b.label.length > 24 && b.w < 300 ? 14 : 18;
      c.font = `${size}px ${FONT}`;
      c.textAlign = "left";
      const pad = b.letter ? 56 : 20;
      const lines = wrap(c, b.label, b.w * 2 - pad - 16).slice(0, 4);
      const th = lines.length * (size + 6);
      lines.forEach((ln, i) => c.fillText(ln, b.x * 2 + pad, (by + bh / 2) * 2 - th / 2 + i * (size + 6)));
      if (b.letter) {
        c.font = `26px ${FONT}`;
        c.fillStyle = dim ? "rgba(255,255,255,0.5)" : b.tcolor;
        c.fillText(b.letter, b.x * 2 + 16, by * 2 + 18);
      }
    }
  }

  private drawText(c: CanvasRenderingContext2D, lv: Level, list: Ent[]) {
    c.textBaseline = "top";
    const T = (s: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = "left", shadow = true) => {
      c.font = `${size}px ${FONT}`;
      c.textAlign = align;
      if (shadow) {
        c.fillStyle = "rgba(0,0,0,0.35)";
        c.fillText(s, x + 2, y + 2);
      }
      c.fillStyle = color;
      c.fillText(s, x, y);
    };
    const qu = QUESTIONS[this.q];
    const n = this.ents.size;
    const ansN = this.answered;

    if (this.phase === "question" || this.phase === "fight" || this.phase === "results") {
      const showQ = this.phase !== "results";
      T(`PREGUNTA ${this.q + 1}/${QUESTIONS.length}  ·  NIVEL ${this.q + 1}: ${lv.name}`, 28, 56, 14, lv.ink, "left", false);
      if (showQ) {
        c.font = `22px ${FONT}`;
        const lines = wrap(c, qu.q, 1544);
        let y = 90;
        lines.forEach((ln) => { T(ln, 28, y, 22, lv.ink, "left", false); y += 32; });
        if (qu.code) {
          c.font = `15px ${FONT}`;
          const cl = qu.code.split("\n");
          const ph = cl.length * 22 + 20;
          c.fillStyle = "#1a1a2a"; c.fillRect(28, y + 4, 1050, ph);
          c.fillStyle = "#3a3a5a"; c.fillRect(28, y + 4, 1050, 4);
          cl.forEach((ln, i) => T(ln, 48, y + 18 + i * 22, 15, ["#9ad7ff", "#ffffff"][ln.startsWith("<") ? 0 : 1], "left", false));
        }
      }
      if (this.phase === "question") {
        const secs = Math.max(0, Math.floor((Date.now() - this.startedAt) / 1000));
        const all = n > 0 && ansN >= n;
        T(`RESPONDIERON ${ansN}/${n}`, 1572, 62, 18, all ? "#2bb673" : lv.ink, "right", false);
        // barra de progreso
        c.fillStyle = "rgba(0,0,0,0.25)"; c.fillRect(1172, 92, 400, 14);
        c.fillStyle = all ? "#2bb673" : lv.accent;
        c.fillRect(1172, 92, n ? Math.round((400 * ansN) / n) : 0, 14);
        if (this.startedAt) T(`${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`, 1572, 120, 14, lv.ink, "right", false);
        if (all && Math.floor(this.time * 2.5) % 2 === 0)
          T("¡TODOS RESPONDIERON! CLIC PARA PELEAR", 800, 330, 20, lv.accent, "center");
        if (this.bannerT > 0) {
          const k = Math.min(1, this.bannerT / 0.4, (2.2 - this.bannerT) / 0.3);
          c.globalAlpha = Math.max(0, Math.min(1, k));
          c.fillStyle = "rgba(0,0,0,0.65)"; c.fillRect(0, 380, 1600, 150);
          T(`NIVEL ${this.q + 1}`, 800, 398, 40, "#ffffff", "center");
          T(lv.name, 800, 460, 26, lv.accent === "#ffffff" ? "#ffd84a" : lv.accent, "center");
          c.globalAlpha = 1;
        }
      }
      if (this.phase === "fight" && this.phaseT < 1.6 && Math.floor(this.phaseT * 6) % 2 === 0)
        T("¡PELEA!", 800, 340, 56, "#ffffff", "center");
      if (this.phase === "results") {
        T("RESPUESTA CORRECTA:", 28, 90, 16, lv.ink, "left", false);
        T(qu.answerLabel.slice(0, 50), 28, 120, 28, lv.accent === "#ffffff" ? "#2bb673" : lv.accent, "left", true);
        // top 5
        const top = this.ranking.slice(0, 5);
        const cw = 296, gap = 10;
        T("TOP 5", 28, 164, 12, lv.ink, "left", false);
        top.forEach((r, i) => {
          const x = 28 + i * (cw + gap), y = 186;
          c.fillStyle = i === 0 ? "#ffd84a" : lv.panel; c.fillRect(x, y, cw, 76);
          c.fillStyle = "rgba(0,0,0,0.25)"; c.fillRect(x, y + 72, cw, 4);
          T(`${i + 1}`, x + 14, y + 14, 22, "#222", "left", false);
          T(r.name.slice(0, 10).toUpperCase(), x + 56, y + 14, 14, i === 0 ? "#222" : lv.panelText, "left", false);
          T(`${r.pts} PTS`, x + 56, y + 42, 16, i === 0 ? "#7a4b00" : lv.accent === "#ffffff" ? lv.panelText : lv.accent, "left", false);
        });
      }
      // nombres
      const showNames = this.phase === "results" ? n <= 24 : n <= 30;
      for (const e of list) {
        const x = (e.x + e.ex) * 2;
        const y = (e.y + e.ey - e.air - 19 * e.scale) * 2;
        const lift = e.nameRow * 14;
        const fs = e.scale === 2 ? 12 : 10;
        if (showNames && (e.hasAnswered || this.phase === "question")) {
          T(e.name.slice(0, 9), x, y - 10 - lift, fs, "#ffffff", "center");
        } else if (e.fastest && this.phase === "results") {
          T(e.name.slice(0, 9), x, y - 30, fs, "#ffd84a", "center");
        }
        if (this.phase === "question" && !e.hasAnswered && n <= 40 && Math.floor(this.time * 2 + e.phase) % 2 === 0) {
          T("?", x, y - 28, 14, "#ffffff", "center");
        }
      }
    }

    if (this.phase === "lobby") {
      const sc = list[0]?.scale ?? 1;
      if (n <= 45) for (const e of list) {
        const x = (e.x + e.ex) * 2, y = (e.y + e.ey - e.air - (sc === 2 ? 34 : 18)) * 2;
        T(e.name.slice(0, 10), x, y - 6, sc === 2 ? 14 : 10, "#ffffff", "center");
      }
    }

    if (this.phase === "final") {
      const top = this.ranking.slice(0, 5);
      const winReached = this.phaseT > 1 + 9;
      T("RESULTADO FINAL", 28, 60, 18, lv.ink, "left", false);
      top.forEach((r, i) => {
        T(`${i + 1}. ${r.name.slice(0, 11).toUpperCase()}`, 28, 100 + i * 34, i === 0 ? 20 : 15, i === 0 ? "#b36b00" : lv.ink, "left", false);
        T(`${r.pts}`, 560, 100 + i * 34, i === 0 ? 20 : 15, i === 0 ? "#b36b00" : lv.ink, "right", false);
      });
      if (winReached && top[0]) {
        const wob = Math.floor(this.time * 3) % 2 ? 0 : 4;
        T("¡GANADOR!", 1270, 190 + wob, 26, "#ffd84a", "center");
        T(top[0].name.toUpperCase().slice(0, 12), 1270, 240 + wob, 44, "#ffffff", "center");
        T(`${top[0].pts} PUNTOS`, 1270, 306 + wob, 20, "#ffffff", "center");
      }
      for (const e of list) {
        const i = top.findIndex((r) => r.id === e.id);
        if (i >= 0) T(e.name.slice(0, 9), e.x * 2, (e.y - 22) * 2 - 6, 10, i === 0 ? "#ffd84a" : "#ffffff", "center");
      }
    }

    // textos flotantes
    for (const p of this.popups) {
      c.globalAlpha = Math.min(1, p.life / (p.max * 0.5));
      T(p.text, p.x * 2, p.y * 2, p.size, p.color, "center");
    }
    c.globalAlpha = 1;
  }
}
