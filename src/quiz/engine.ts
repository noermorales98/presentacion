// Motor de animación del quiz (canvas 1600×900 dibujando arte pixel en una cuadrícula 800×450).
import { QUESTIONS, type AnswerRec, type QuizPhase, type ResultRec } from "@/config/quiz";
import { drawHuman, hashStr, makeLook, mulberry, type Look, type Pose } from "./sprites";
import { BOSS_LEVEL, GROUND, H, W, drawBackground, levelFor, type Level } from "./scenes";
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
  // desplazamientos / física de KO
  ex: number;
  ey: number;
  evx: number;
  evy: number;
  air: number;
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
  koAt: number;
  koState: 0 | 1 | 2 | 3 | 4;
  lieRot: number;
  phase: number;
  wanderAt: number;
  hop: number;
  nameRow: number;
  // arena (estilo Smash)
  arena: boolean;
  h: number; // altura sobre el suelo
  vh: number; // velocidad vertical (arriba +)
  vx: number;
  surf: number; // -1 suelo, -2 en el aire, >=0 índice de plataforma
  aiT: number;
  goalX: number;
  target: string | null; // id o "D" (dino)
  platGoal: number;
  stun: number;
  atkCd: number;
  atkT: number;
  guardT: number;
  script: boolean;
  dashTo: number | null;
  speed: number;
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
interface Surf {
  x: number; w: number; h: number; kind: "plat" | "crate";
}
interface Dino {
  x: number; y: number; hp: number; state: "hidden" | "enter" | "fight" | "dying" | "dead";
  flash: number; bounce: number; legT: number; blink: number; roarT: number;
  flinch: number; lift: number; dieT: number;
}
interface Proj {
  x: number; y: number; vx: number; vy: number; g: number; life: number; rot: number;
  kind: "rock" | "bomb" | "star" | "fire" | "snow" | "bossfire";
  owner: string; tgt: string | null;
}
interface Wave {
  x: number; dir: number; v: number; life: number; victim: string | null; hit: Set<string>;
}

const OPT_COLORS = ["#e8453c", "#2f6fe4", "#f2b632", "#2bb673"];
const OPT_TEXT = ["#ffffff", "#ffffff", "#2b2200", "#ffffff"];
const FONT = '"Press Start 2P", monospace';
const FIGHT_MIN = 6.5;
const G = 620; // gravedad de la arena
const JUMP = 175;
const THROW_KINDS: Proj["kind"][] = ["rock", "fire", "star", "rock", "snow", "fire", "snow", "star", "bomb", "rock"];
const PLAT_BASE = GROUND - 2;

/** T-Rex gigante (mira a la derecha, se voltea al dibujar) — 22 columnas */
const DINO_ROWS = [
  "..............########",
  ".............#########",
  ".............#e#######",
  ".............#########",
  ".............#########",
  ".............#########",
  ".............####.....",
  ".............#######..",
  "............######....",
  "...........#######....",
  "#.........#########...",
  "##........##########..",
  "###.......#########.##",
  "####.....###########.#",
  ".####....############.",
  "..####..############..",
  "...#########.#######..",
  "....########..#####...",
];
const DINO_LEGS_A = [
  ".....######...####....",
  "......####....####....",
  "......###.....###.....",
  "......####....####....",
];
const DINO_LEGS_B = [
  ".....######...........",
  "......####.....###....",
  "...............###....",
  "..............####....",
];
const DINO_LEGS_KNEEL = [
  ".....#########.#####..".slice(0, 22),
  "......####....####....",
];
const DINO_W = 22;
const DINO_P = 8;

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

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

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
  private bannerText = "";
  private bannerSub = "";
  private lastHitSfx = 0;
  private rand = mulberry(Date.now() & 0xffff);
  private arena: Surf[] = [];
  private dino: Dino = { x: W + 150, y: GROUND + 4, hp: 1, state: "hidden", flash: 0, bounce: 0, legT: 0, blink: 0, roarT: 0, flinch: 0, lift: 0, dieT: 0 };
  private projs: Proj[] = [];
  private waves: Wave[] = [];
  private freezeT = 0;
  private slowT = 0;
  private camKick = 0;
  private windT = 0;
  private lobbyRoar = 6;
  private lobbyRoarT = 0;
  private pendingBombHp: number | null = null;
  private bossDone = false;
  private bossStage: "none" | "enter" | "brawl" | "duel" | "dying" | "end" = "none";
  private winnerId: string | null = null;
  private zoomPts: { x: number; y: number; z: number } | null = null;
  private cam = { z: 1, fx: W / 2, fy: H / 2 };
  private reachT = 0;
  private prizeShown = false;
  startedAt = 0;

  get total() { return this.ents.size; }
  get answered() { let n = 0; this.ents.forEach((e) => e.hasAnswered && n++); return n; }
  /** ¿ya se puede pulsar el botón principal? */
  get canAdvance(): boolean {
    switch (this.phase) {
      case "lobby":
      case "question":
        return true;
      case "fight":
        return false;
      case "results":
        return this.phaseT > 3.6;
      case "boss":
        return this.bossDone;
      case "final":
        return this.phaseT > 1.5;
    }
  }
  get allAnswered() { return this.ents.size > 0 && this.answered >= this.ents.size; }

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
      x: 230 + this.rand() * 360, y: 300 + this.rand() * 120, tx: 0, ty: 0,
      ex: 0, ey: 0, evx: 0, evy: 0, air: 240, airV: 0, frame: Math.floor(this.rand() * 30),
      flip: this.rand() < 0.5, scale: 1, pose: "idle", tint: null, alpha: 1,
      answerT: 0, ok: false, fastest: false, pts: 0, zone: 0, hasAnswered: false,
      koAt: 999, koState: 0, lieRot: 1, phase: this.rand() * 6.28, wanderAt: 0, hop: 0, nameRow: 0,
      arena: false, h: 0, vh: 0, vx: 0, surf: -1, aiT: 0, goalX: 0, target: null, platGoal: -1,
      stun: 0, atkCd: 0, atkT: 0, guardT: 0, script: false, dashTo: null, speed: 36 + this.rand() * 18,
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
    if (data.startedAt) this.startedAt = data.startedAt;
    if (data.ranking) this.ranking = data.ranking;
    if (!changed) {
      if (data.results) this.results = data.results;
      return;
    }
    this.phase = phase;
    this.q = q;
    this.level = phase === "final" ? levelFor(9) : phase === "boss" ? BOSS_LEVEL : levelFor(q);
    this.phaseT = 0;
    this.timers = [];
    this.fx = [];
    this.fightDone = false;
    this.bannerT = 0;
    this.popups = [];
    this.zoomPts = null;
    this.bossDone = false;
    this.bossStage = "none";
    this.prizeShown = false;
    this.dino.state = "hidden";
    this.projs = [];
    this.waves = [];
    this.slowT = 0; this.freezeT = 0; this.windT = 0;
    this.cam = { z: 1, fx: W / 2, fy: H / 2 };
    for (const e of this.ents.values()) {
      e.ex = e.ey = e.evx = e.evy = 0;
      e.tint = null; e.alpha = 1; e.koState = 0; e.pose = "idle"; e.hop = 0;
      e.arena = false; e.h = 0; e.vh = 0; e.vx = 0; e.script = false; e.dashTo = null; e.stun = 0;
    }
    if (phase === "question") {
      this.banner(`NIVEL ${q + 1}`, this.level.name, 2.2);
      sfx.question();
      for (const e of this.ents.values()) { e.hasAnswered = false; e.answer = undefined; e.ok = false; e.fastest = false; e.pts = 0; }
    }
    if (phase === "fight") {
      this.results = data.results ?? {};
      this.arena = this.makeArena(q);
      sfx.fightStart();
      this.startFight();
    }
    if (phase === "boss") {
      this.arena = this.makeArena(11);
      this.startBoss();
    }
    if (phase === "final") this.startFinal();
    if (phase === "lobby") for (const e of this.ents.values()) { e.wanderAt = 0; }
    this.dirty = true;
  }

  /* ───────────── utilidades ───────────── */
  private banner(text: string, sub: string, t: number) {
    this.bannerText = text;
    this.bannerSub = sub;
    this.bannerT = t;
  }
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

  /* ───────────── arena ───────────── */
  private makeArena(q: number): Surf[] {
    const r = mulberry(q * 131 + 5);
    const s: Surf[] = [];
    [60 + r() * 50, 300 + r() * 80, 560 + r() * 90].forEach((x) => s.push({ x, w: 90 + r() * 40, h: 20, kind: "plat" }));
    s.push({ x: 170 + r() * 60, w: 90, h: 40, kind: "plat" });
    s.push({ x: 440 + r() * 80, w: 90, h: 40, kind: "plat" });
    for (let i = 0; i < 4; i++) s.push({ x: 40 + i * 190 + r() * 80, w: 14, h: 8, kind: "crate" });
    return s;
  }

  private enterArena(e: Ent) {
    e.arena = true;
    e.y = GROUND - 6 + (hashStr(e.id) % 9);
    e.h = 0; e.vh = 0; e.vx = 0; e.surf = -1;
    e.ex = 0; e.ey = 0; e.evx = 0; e.evy = 0;
    e.aiT = 0; e.target = null; e.stun = 0; e.atkCd = this.rand() * 0.6;
    e.alpha = 1;
  }
  private leaveArena(e: Ent) {
    if (!e.arena) return;
    e.arena = false;
    e.ey = -e.h;
    e.evy = -e.vh;
    e.ex = 0;
    e.evx = e.vx * 0.4;
  }
  private arenaActive(e: Ent): boolean {
    if (!e.arena || e.koState !== 0) return false;
    return this.phase === "fight" || this.phase === "boss" || (this.phase === "results" && this.phaseT < 3.4);
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
      if (e.hasAnswered) this.enterArena(e);
      if (e.hasAnswered && !e.ok) {
        e.koAt = 2.2 + this.rand() * 4.4;
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
    this.leaveArena(e);
    const gx = e.x + e.ex, gy = e.y;
    e.lieRot = this.rand() < 0.5 ? 1 : 3;
    switch (style) {
      case 0: // puñetazo: sale volando
        e.koState = 3; e.evx = (this.rand() < 0.5 ? -1 : 1) * (50 + this.rand() * 60); e.evy = -(110 + this.rand() * 60);
        this.burst(gx, gy - 8 + e.ey, 10, "#fff176", 60);
        this.popup(["POW!", "BAM!", "ZAS!"][Math.floor(this.rand() * 3)], gx, gy - 24, "#ff5a2a", 18);
        sfx.hit(); this.shake = Math.max(this.shake, 3);
        break;
      case 1: // meteoro
        sfx.meteor();
        this.fx.push({ kind: "meteor", x: gx, y: gy + e.ey, x0: gx + 70, y0: -20, t: 0, dur: 0.55 });
        this.after(0.55, () => {
          sfx.explosion(); this.shake = Math.max(this.shake, 5);
          this.burst(gx, gy - 6 + e.ey, 18, "#ff9a2a", 70);
          this.fx.push({ kind: "ring", x: gx, y: gy + e.ey, t: 0, dur: 0.4, r: 22 });
          e.koState = 4; e.tint = "#3a3a3a";
        });
        e.koState = 3; e.evx = 0; e.evy = 0;
        break;
      case 2: // rayo
        e.koState = 2;
        sfx.lightning(); this.shake = Math.max(this.shake, 4);
        this.fx.push({ kind: "bolt", x: gx, y: gy + e.ey, t: 0, dur: 0.3 });
        this.after(0.7, () => { e.koState = 4; e.tint = "#2a2a2a"; this.burst(gx, gy - 10, 8, "#999", 20); });
        break;
      case 3: // bomba
        e.koState = 3; e.evx = 0; e.evy = 0;
        this.fx.push({ kind: "bomb", x: gx, y: gy + e.ey, t: 0, dur: 0.55 });
        this.after(0.55, () => {
          sfx.explosion(); this.shake = Math.max(this.shake, 5);
          this.burst(gx, gy - 6, 16, "#ffcf3a", 80);
          this.fx.push({ kind: "ring", x: gx, y: gy, t: 0, dur: 0.35, r: 18 });
          e.evx = (this.rand() < 0.5 ? -1 : 1) * (30 + this.rand() * 40); e.evy = -(170 + this.rand() * 60);
        });
        break;
      case 5: // pisotón del dino
        e.koState = 4; e.tint = "#8a8a8a";
        this.fx.push({ kind: "ring", x: gx, y: gy, t: 0, dur: 0.4, r: 26 });
        this.burst(gx, gy - 2, 12, "#d0c8b0", 50);
        this.popup("SPLAT!", gx, gy - 24, "#ff5a2a", 16);
        sfx.stomp(); this.shake = Math.max(this.shake, 6);
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
    const surv: Ent[] = [];
    for (const e of this.ents.values()) {
      if (e.hasAnswered && e.ok) {
        surv.push(e);
        e.hop = 1;
        if (e.fastest || this.ents.size <= 30)
          this.popup(e.fastest ? `+${e.pts} RAPIDO` : `+${e.pts}`, e.x, e.y - 24 * e.scale - e.h - 10, e.fastest ? "#ffd84a" : "#ffffff", e.fastest ? 14 : 16, 3.4);
        this.burst(e.x, e.y - 14 - e.h, 4, "#ffd84a", 30);
      }
    }
    if (surv.length) {
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const e of surv) { x0 = Math.min(x0, e.x); x1 = Math.max(x1, e.x); y0 = Math.min(y0, e.y - e.h); y1 = Math.max(y1, e.y - e.h); }
      const z = clamp(Math.min((W * 0.7) / (x1 - x0 + 70), (H * 0.45) / (y1 - y0 + 70)), 1.3, 2.6);
      this.zoomPts = { x: (x0 + x1) / 2, y: (y0 + y1) / 2 - 10, z };
    }
    this.dirty = true;
    this.onFightDone?.();
  }

  /* ───────────── utilidades de combate ───────────── */
  private impact(power: number, stop = 0) {
    this.shake = Math.max(this.shake, power);
    this.camKick = Math.max(this.camKick, power * 0.012);
    if (stop) this.freezeT = Math.max(this.freezeT, stop);
  }
  private knock(e: Ent, dir: number, vx: number, vh: number, stun: number) {
    e.vx = dir * vx; e.vh = vh; e.surf = -2; e.stun = stun; e.guardT = 0; e.aiT = 0;
  }
  private randomArenaEnt(): Ent | null {
    const live = [...this.ents.values()].filter((o) => o.arena && o.koState === 0);
    return live.length ? live[Math.floor(this.rand() * live.length)] : null;
  }
  private dinoHit(power: number) {
    const d = this.dino;
    const floor = this.bossStage === "duel" ? 0.02 : 0.3;
    d.hp = Math.max(floor, d.hp - power);
    d.flash = Math.max(d.flash, 0.1);
    d.flinch = Math.max(d.flinch, 0.18);
  }

  private throwAt(e: Ent, tx: number, ty: number, tgt: string | null, kind?: Proj["kind"]) {
    if (this.projs.length > 40) return;
    const k = kind ?? (this.phase === "boss" ? (this.rand() < 0.4 ? "bomb" : "rock") : THROW_KINDS[this.q % THROW_KINDS.length]);
    const sx = e.x + (tx < e.x ? -6 : 6) * (e.scale / 1.5 + 0.3), sy = e.y - e.h - 14 * e.scale;
    const arcs = k === "rock" || k === "bomb" || k === "snow";
    const g = arcs ? 220 : 0;
    const dx = tx - sx, dy = ty - sy;
    let vx: number, vy: number;
    if (arcs) {
      const ft = clamp(Math.hypot(dx, dy) / 150, 0.4, 1.0);
      vx = dx / ft; vy = (dy - 0.5 * g * ft * ft) / ft;
    } else {
      const sp = k === "fire" ? 170 : 210, d = Math.hypot(dx, dy) || 1;
      vx = (dx / d) * sp; vy = (dy / d) * sp;
    }
    this.projs.push({ x: sx, y: sy, vx, vy, g, kind: k, owner: e.id, tgt, life: 2.2, rot: 0 });
    e.atkT = 0.25; e.flip = tx < e.x;
    sfx.throw();
  }

  private spit(tgt: Ent) {
    const d = this.dino;
    const sx = d.x - 88, sy = GROUND - 150, g = 160;
    const dx = tgt.x - sx, dy = tgt.y - tgt.h - 6 - sy;
    const ft = clamp(Math.hypot(dx, dy) / 150, 0.5, 1.1);
    this.projs.push({ x: sx, y: sy, vx: dx / ft, vy: (dy - 0.5 * g * ft * ft) / ft, g, kind: "bossfire", owner: "D", tgt: tgt.id, life: 3, rot: 0 });
    sfx.throw();
  }

  private explode(x: number, y: number, r: number, victimId: string | null) {
    this.fx.push({ kind: "ring", x, y: y + 6, t: 0, dur: 0.35, r: r + 6 });
    this.burst(x, y, 16, "#ffb347", 80);
    this.burst(x, y, 8, "#fff176", 50);
    sfx.explosion();
    this.impact(4, 0.04);
    for (const e of this.ents.values()) {
      if (!e.arena || e.koState !== 0 || e.script) continue;
      if (Math.abs(e.x - x) < r && Math.abs(e.y - e.h - y) < r + 10) {
        if (victimId === e.id) this.startKo(e, 0);
        else this.knock(e, Math.sign(e.x - x) || 1, 85, 90, 0.5);
      }
    }
  }

  private updateProjs(dt: number) {
    const d = this.dino;
    const dinoAlive = this.phase === "boss" && (d.state === "fight" || d.state === "enter");
    for (const p of this.projs) {
      p.life -= dt;
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += dt * 14;
      if ((p.kind === "fire" || p.kind === "bossfire" || p.kind === "bomb") && this.rand() < 0.7)
        this.particles.push({ x: p.x, y: p.y, vx: (this.rand() - 0.5) * 20, vy: (this.rand() - 0.5) * 20, life: 0.3, max: 0.3, size: 2, color: p.kind === "bomb" ? "#9a9a9a" : "#ffb347", grav: 0 });
      let done = false;
      if (p.owner !== "D" && dinoAlive && p.x > d.x - 72 && p.x < d.x + 40 && p.y > d.y - 170 && p.y < d.y) {
        if (p.kind === "bomb") this.explode(p.x, p.y, 16, null);
        else this.burst(p.x, p.y, 6, "#fff176", 50);
        d.flash = 0.12; d.flinch = 0.2;
        if (p.owner === this.winnerId && this.pendingBombHp !== null && this.bossStage === "duel") {
          const w = this.ents.get(p.owner), hp = this.pendingBombHp;
          this.pendingBombHp = null;
          if (w) this.strikeDino(hp, w, true);
        } else this.dinoHit(0.01);
        this.impact(1.5, 0.03);
        done = true;
      }
      if (!done) {
        for (const e of this.ents.values()) {
          if (!e.arena || e.koState !== 0 || e.id === p.owner) continue;
          if (p.owner !== "D" && this.phase === "boss") continue;
          const cy = e.y - e.h - 8 * e.scale;
          if (Math.abs(p.x - e.x) < 5 * e.scale + 1 && Math.abs(p.y - cy) < 8 * e.scale) {
            if (p.kind === "bomb" || p.kind === "bossfire") this.explode(p.x, p.y, p.kind === "bossfire" ? 16 : 14, p.tgt);
            else {
              this.knock(e, Math.sign(p.vx) || 1, 55, 50, 0.35);
              this.burst(p.x, p.y, 5, p.kind === "snow" ? "#ffffff" : p.kind === "fire" ? "#ff9a2a" : "#fff176", 40);
              if (this.lastHitSfx <= 0) { sfx.hitSmall(); this.lastHitSfx = 0.07; }
              this.impact(0.8);
            }
            done = true;
            break;
          }
        }
      }
      if (!done && p.y >= GROUND - 1 && p.vy > 0) {
        if (p.kind === "bomb" || p.kind === "bossfire") this.explode(p.x, GROUND - 2, p.kind === "bossfire" ? 16 : 14, p.tgt);
        else this.burst(p.x, GROUND - 1, 3, "#d0c8b0", 25);
        done = true;
      }
      if (p.life <= 0 || p.x < -10 || p.x > W + 10) done = true;
      if (done) p.life = -1;
    }
    this.projs = this.projs.filter((p) => p.life > 0);
  }

  private updateWaves(dt: number) {
    for (const w of this.waves) {
      w.life -= dt;
      w.x += w.dir * w.v * dt;
      if (this.rand() < dt * 40) this.particles.push({ x: w.x, y: GROUND - 1, vx: this.rand() * 20 - 10, vy: -20 - this.rand() * 20, life: 0.4, max: 0.4, size: 2, color: "#d0c8b0", grav: 60 });
      for (const e of this.ents.values()) {
        if (!e.arena || e.koState !== 0 || e.script || w.hit.has(e.id) || e.h > 6) continue;
        if (Math.abs(e.x - w.x) < 9) {
          w.hit.add(e.id);
          if (w.victim === e.id) this.startKo(e, 5);
          else {
            this.knock(e, -1, 60, 105, 0.55);
            this.burst(e.x, e.y - 4, 5, "#d0c8b0", 40);
            this.impact(1.5);
          }
        }
      }
    }
    this.waves = this.waves.filter((w) => w.life > 0 && w.x > -10);
  }

  /** separación y rebote entre luchadores */
  private separate() {
    const arr: Ent[] = [];
    for (const e of this.ents.values()) if (this.arenaActive(e)) arr.push(e);
    if (arr.length < 2 || arr.length > 140) return;
    arr.sort((a, b) => a.x - b.x);
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const a = arr[i], b = arr[j];
        const dx = b.x - a.x;
        if (dx > 8) break;
        if (Math.abs(a.h - b.h) > 12 || Math.abs(a.y - b.y) > 5 || a.script || b.script) continue;
        const push = (8 - dx) * 0.5;
        a.x -= push; b.x += push;
        const rel = a.vx - b.vx;
        if (rel > 45) {
          const v = Math.abs(rel) * 0.35;
          a.vx = -v; b.vx = v;
          this.burst((a.x + b.x) / 2, a.y - a.h - 8, 2, "#ffffff", 25);
          if (this.lastHitSfx <= 0) { sfx.hitSmall(); this.lastHitSfx = 0.07; }
        }
      }
    }
  }

  /* ───────────── jefe: dino ───────────── */
  private newDino(state: Dino["state"]): Dino {
    return { x: W + 150, y: GROUND + 4, hp: 1, state, flash: 0, bounce: 0, legT: 0, blink: 0, roarT: 0, flinch: 0, lift: 0, dieT: 0 };
  }

  private startBoss() {
    const ents = [...this.ents.values()];
    const win = this.ranking[0] ? this.ents.get(this.ranking[0].id) : ents[0];
    this.winnerId = win?.id ?? null;
    this.pendingBombHp = null;
    this.dino = this.newDino("enter");
    this.dino.roarT = 1.2;
    this.bossStage = "enter";
    this.banner("¡VENCE AL DINO!", "TODOS CONTRA EL DINOSAURIO", 2.8);
    sfx.roar();
    this.impact(6);
    ents.forEach((e, i) => {
      e.ok = e.id === this.winnerId;
      e.koState = 0;
      this.enterArena(e);
      e.x = 20 + ((i * 53) % 330);
      e.target = "D";
      e.speed = 38 + this.rand() * 22;
    });
    const losers = ents.filter((e) => e.id !== this.winnerId).sort(() => this.rand() - 0.5);
    const t0 = 4.4, span = Math.min(8, 3 + losers.length * 0.35);
    losers.forEach((e, i) => {
      const tk = t0 + ((i + this.rand() * 0.8) / Math.max(1, losers.length)) * span;
      e.koAt = tk;
      this.after(tk - 0.9, () => { if (e.koState === 0 && this.dino.state === "fight") this.dinoAttackOn(e); });
      this.after(tk + 1.6, () => { if (e.koState === 0) this.startKo(e, 0); });
    });
    this.after(3.0, () => { this.dino.state = "fight"; this.bossStage = "brawl"; this.dinoLoop(); });
    const tDuel = t0 + (losers.length ? span : 0) + 3.4;
    this.after(tDuel, () => this.bossDuel());
  }

  private dinoLoop() {
    if (this.bossStage !== "brawl") return;
    const kinds = ["stomp", "fire", "tail", "roar"] as const;
    this.dinoAttack(kinds[Math.floor(this.rand() * kinds.length)], null);
    this.after(2.2 + this.rand() * 1.6, () => this.dinoLoop());
  }

  private dinoAttackOn(e: Ent) {
    const near = e.x > this.dino.x - 140;
    this.dinoAttack(near ? "tail" : this.rand() < 0.5 ? "stomp" : "fire", e);
  }

  private dinoAttack(kind: "stomp" | "fire" | "tail" | "roar", victim: Ent | null) {
    const d = this.dino;
    if (d.state !== "fight") return;
    if (kind === "stomp") {
      d.lift = 14;
      this.after(0.5, () => {
        if (d.state !== "fight") return;
        d.lift = 0; d.bounce = 1;
        this.impact(6, 0.05); sfx.stomp();
        this.fx.push({ kind: "ring", x: d.x - 70, y: GROUND, t: 0, dur: 0.4, r: 26 });
        this.burst(d.x - 70, GROUND - 2, 14, "#d0c8b0", 60);
        this.waves.push({ x: d.x - 70, dir: -1, v: 230, life: 1.8, victim: victim ? victim.id : null, hit: new Set() });
      });
    } else if (kind === "tail") {
      d.bounce = 0.5;
      this.after(0.4, () => {
        if (d.state !== "fight") return;
        this.impact(5, 0.04); sfx.hit();
        for (let i = 0; i < 16; i++) this.burst(d.x - 62 - i * 5, GROUND - 4 - Math.sin((i / 16) * Math.PI) * 12, 1, "#ffffff", 20);
        for (const e of this.ents.values()) {
          if (!e.arena || e.koState !== 0 || e.script) continue;
          if (e.x > d.x - 140 && e.x < d.x - 58 && e.h < 12) {
            if (victim && e.id === victim.id) this.startKo(e, 0);
            else { this.knock(e, -1, 120, 110, 0.6); this.burst(e.x, e.y - 6, 5, "#ffffff", 40); }
          }
        }
      });
    } else if (kind === "fire") {
      d.roarT = 0.45;
      this.after(0.35, () => {
        if (d.state !== "fight") return;
        const tgt = victim ?? this.randomArenaEnt();
        if (tgt) this.spit(tgt);
      });
    } else {
      d.roarT = 1.0; sfx.roar(); this.windT = 1.0; this.impact(3);
      for (let i = 0; i < 20; i++)
        this.particles.push({ x: d.x - 90, y: GROUND - 30 - this.rand() * 110, vx: -140 - this.rand() * 80, vy: 0, life: 0.7, max: 0.7, size: 2, color: "#ffffff", grav: 0 });
    }
  }

  private bossDuel() {
    const w = this.winnerId ? this.ents.get(this.winnerId) : undefined;
    this.bossStage = "duel";
    this.banner("¡UNO CONTRA EL DINO!", w ? w.name.toUpperCase() : "", 2.2);
    if (!w) { this.after(1, () => this.bossFinish()); return; }
    w.script = true; w.target = null; w.stun = 0; w.vx = 0; w.dashTo = null;
    const hpAfter = [0.78, 0.55, 0.34, 0.14, 0];
    const kinds = ["stomp", "fire", "tail", "fire", "stomp"] as const;
    let t = 1.3;
    hpAfter.forEach((hp, k) => {
      const start = t;
      this.after(start, () => { if (this.dino.state === "fight") this.dinoAttack(kinds[k], null); });
      if (kinds[k] === "stomp") this.after(start + 0.36, () => this.winJump(w));
      else if (kinds[k] === "tail") this.after(start + 0.24, () => this.winJump(w));
      else this.after(start + 0.6, () => { w.dashTo = Math.max(30, w.x - 38); });
      const c0 = start + 1.6;
      if (k === 1 || k === 3) {
        this.after(c0, () => { this.pendingBombHp = hp; this.throwAt(w, this.dino.x - 40, GROUND - 90, "D", "bomb"); });
      } else {
        this.after(c0, () => { w.dashTo = this.dino.x - 66; });
        this.after(c0 + 0.32, () => { w.atkT = 0.3; w.vh = 70; w.surf = -2; sfx.jump(); });
        this.after(c0 + 0.5, () => this.strikeDino(hp, w, false));
      }
      t = start + 2.9;
    });
  }

  private winJump(w: Ent) { w.vh = 150; w.surf = -2; w.vx = 0; sfx.jump(); }

  private strikeDino(hp: number, w: Ent, ranged: boolean) {
    const d = this.dino;
    if (d.state !== "fight") return;
    d.hp = hp; d.flash = 0.35; d.flinch = 0.45; d.x += 4;
    const hx = d.x - 66, hy = GROUND - 50 - this.rand() * 60;
    this.burst(hx, hy, 18, "#fff176", 90);
    this.burst(hx, hy, 8, "#ffffff", 50);
    this.fx.push({ kind: "ring", x: hx, y: hy + 10, t: 0, dur: 0.3, r: 18 });
    this.popup(hp === 0 ? "¡K.O.!" : ["POW!", "BAM!", "ZAS!"][Math.floor(this.rand() * 3)], hx, hy - 24, "#ffffff", 22);
    sfx.hit();
    this.impact(hp === 0 ? 9 : 6, hp === 0 ? 0.12 : 0.07);
    if (!ranged) { w.vx = -85; w.vh = 55; w.surf = -2; w.dashTo = null; } // rebota
    if (hp === 0) {
      this.slowT = 1.1; this.camKick = 0.2;
      this.banner("¡GOLPE FINAL!", "", 1.6);
      this.after(0.55, () => this.dinoDie());
    }
  }

  private dinoDie() {
    const d = this.dino;
    d.state = "dying"; d.dieT = 0; d.blink = 0;
    this.bossStage = "dying";
    this.banner("¡DINO DERROTADO!", "", 3);
    sfx.roar();
    this.after(1.95, () => {
      this.impact(11, 0.12); sfx.stomp(); sfx.explosion();
      this.burst(d.x + 30, GROUND, 40, "#d0c8b0", 120);
      this.fx.push({ kind: "ring", x: d.x + 20, y: GROUND, t: 0, dur: 0.6, r: 60 });
    });
    this.after(3.1, () => {
      d.state = "dead";
      this.burst(d.x, GROUND - 60, 120, "#ffd84a", 150);
      this.burst(d.x, GROUND - 60, 60, "#ffffff", 100);
      sfx.victory();
      this.bossFinish();
    });
  }

  private bossFinish() {
    this.bossStage = "end";
    const w = this.winnerId ? this.ents.get(this.winnerId) : undefined;
    if (w) { w.script = false; w.dashTo = null; w.target = null; }
    this.after(1.6, () => { this.bossDone = true; });
  }

  /* ───────────── final: solo el ganador y la sabrita ───────────── */
  private startFinal() {
    const win = this.ranking[0] ? this.ents.get(this.ranking[0].id) : [...this.ents.values()][0];
    this.winnerId = win?.id ?? null;
    this.reachT = 6.0;
    if (!win) return;
    win.x = 400; win.y = GROUND + 10; win.tx = 400; win.ty = win.y; win.air = 260; win.airV = 0;
    this.after(0.9, () => {
      sfx.fanfare(); this.impact(4);
      for (let i = 0; i < 120; i++)
        this.particles.push({ x: 400 + (this.rand() - 0.5) * 80, y: 40, vx: (this.rand() - 0.5) * 190, vy: -this.rand() * 90 - 10, life: 4, max: 4, size: 2, color: ["#ff5a2a", "#ffd84a", "#2bb673", "#2f6fe4", "#ef7fb0", "#fff"][i % 6], grav: 60 });
    });
    this.after(this.reachT, () => {
      this.prizeShown = true;
      sfx.unlock(); this.impact(3);
      this.dirty = true;
      for (let i = 0; i < 90; i++)
        this.particles.push({ x: 520 + (this.rand() - 0.5) * 100, y: 60, vx: (this.rand() - 0.5) * 170, vy: -this.rand() * 110, life: 4, max: 4, size: 2, color: ["#ff5a2a", "#ffd84a", "#fff", "#ffffff"][i % 4], grav: 55 });
    });
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
    if (this.phase === "boss") {
      const s = list.length <= 40 ? 2 : 1;
      list.forEach((e) => (e.scale = s));
      return;
    }
    if (this.phase === "final") {
      const fs = list.length <= 40 ? 2 : 1;
      list.forEach((e) => (e.scale = e.id === this.winnerId ? (this.prizeShown ? 4 : 7) : fs));
      const win = this.winnerId ? this.ents.get(this.winnerId) : undefined;
      if (win) { win.tx = this.prizeShown ? 230 : 400; win.ty = GROUND + 10; }
      const crowd = list.filter((e) => e.id !== this.winnerId).sort((a, b) => a.name.localeCompare(b.name));
      const perRow = Math.floor(760 / (13.4 * fs));
      crowd.forEach((e, i) => {
        const row = Math.floor(i / perRow), col = i % perRow;
        e.tx = 24 + col * 13.4 * fs + (row % 2) * 6 * fs;
        e.ty = GROUND + 34 + row * 12 * (fs === 2 ? 1.2 : 1);
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
        if (this.phase === "results" && !e.ok) continue; // los derrotados se quedan donde cayeron
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

  /* ───────────── IA de la arena (estilo Smash) ───────────── */
  private pickGoal(e: Ent, boss: boolean) {
    const r = this.rand();
    e.aiT = 1 + this.rand() * 2;
    e.platGoal = -1;
    if (boss) {
      if (r < 0.7) { e.target = "D"; e.goalX = this.dino.x - 55 - this.rand() * 40; }
      else if (r < 0.85) { e.target = null; e.platGoal = Math.floor(this.rand() * 5); }
      else { e.target = null; e.goalX = 20 + this.rand() * 560; }
      return;
    }
    if (r < 0.6) {
      const live = [...this.ents.values()].filter((o) => o !== e && o.arena && o.koState === 0);
      if (live.length) { e.target = live[Math.floor(this.rand() * live.length)].id; return; }
    }
    if (r < 0.82) { e.target = null; e.platGoal = Math.floor(this.rand() * 5); }
    else { e.target = null; e.goalX = 20 + this.rand() * 760; }
  }

  private fightStep(e: Ent, dt: number) {
    const mode = this.phase === "boss" ? "boss" : this.phase === "results" ? "cheer" : "brawl";
    e.stun = Math.max(0, e.stun - dt);
    e.atkCd -= dt;
    e.atkT -= dt;
    e.guardT -= dt;
    const grounded = e.vh === 0 && e.surf !== -2;
    const surfaces = this.arena;
    const d = this.dino;
    let move = 0;

    if (e.script) {
      if (e.dashTo !== null) {
        const dd = e.dashTo - e.x;
        e.x += dd * Math.min(1, dt * 7);
        if (Math.abs(dd) < 1) e.dashTo = null;
      } else {
        e.x += e.vx * dt;
        e.vx *= 0.9;
      }
      e.flip = d.x < e.x;
    } else if (mode === "cheer") {
      if (grounded && this.rand() < dt * 0.9) { e.vh = JUMP * 0.45; e.surf = -2; }
    } else if (e.stun <= 0) {
      e.aiT -= dt;
      if (e.aiT <= 0) this.pickGoal(e, mode === "boss");
      let gx = e.goalX;
      let tgt: Ent | null = null;
      if (e.target === "D") {
        gx = d.x - 70 - (hashStr(e.id) % 22);
      } else if (e.target) {
        tgt = this.ents.get(e.target) ?? null;
        if (!tgt || !tgt.arena || tgt.koState !== 0) { e.target = null; e.aiT = 0; tgt = null; }
        else gx = tgt.x;
      } else if (e.platGoal >= 0) {
        const plats = surfaces.filter((s) => s.kind === "plat");
        const P = plats[e.platGoal % plats.length];
        if (P) gx = P.x + P.w / 2;
      }
      const dx = gx - e.x;
      const near = tgt ? 12 : 5;
      if (Math.abs(dx) > near) {
        move = Math.sign(dx);
        const tv = move * e.speed * (grounded ? 1 : 0.8);
        e.vx += (tv - e.vx) * Math.min(1, dt * 7);
        e.flip = dx < 0;
      } else {
        e.vx *= 0.6;
        if (tgt) e.flip = tgt.x < e.x;
        if (e.target === "D") e.flip = true;
      }
      // saltos naturales (bajos): caja adelante, plataforma, objetivo alto o capricho
      if (grounded) {
        let jump = false, small = false;
        for (const s of surfaces) {
          if (s.kind === "crate" && move !== 0) {
            const ahead = (s.x + s.w / 2 - e.x) * move;
            if (ahead > 0 && ahead < 14 && e.h < s.h - 1) { jump = true; small = true; }
          }
        }
        if (e.platGoal >= 0) {
          const plats = surfaces.filter((s) => s.kind === "plat");
          const P = plats[e.platGoal % plats.length];
          if (P && Math.abs(e.x - (P.x + P.w / 2)) < P.w / 2 - 6 && e.h < P.h - 3) jump = true;
        }
        if (tgt && tgt.h > e.h + 10 && Math.abs(tgt.x - e.x) < 40) jump = true;
        if (!jump && this.rand() < dt * 0.25) { jump = true; small = true; }
        if (jump) {
          e.vh = small ? JUMP * 0.6 : JUMP; e.surf = -2; e.vx *= 1.05;
          if (this.rand() < 0.04) sfx.jump();
        }
      }
      // esquivar
      if (e.guardT <= 0 && this.rand() < dt * 0.2) {
        e.guardT = 0.35;
        if (grounded) { e.vh = JUMP * 0.5; e.surf = -2; e.vx = -Math.sign(e.vx || 1) * 35; }
      }
      // golpe cuerpo a cuerpo con embestida
      if (tgt && e.atkCd <= 0 && Math.abs(tgt.x - e.x) < 17 && Math.abs(tgt.h - e.h) < 20 && tgt.stun <= 0) {
        e.atkCd = 0.7 + this.rand() * 0.6;
        e.atkT = 0.24;
        e.flip = tgt.x < e.x;
        const dir = tgt.x < e.x ? -1 : 1;
        e.vx = dir * 70; // embestida
        if (tgt.guardT > 0 || this.rand() < 0.25) {
          tgt.vh = JUMP * 0.5; tgt.surf = -2; tgt.vx = dir * 40;
          this.burst(tgt.x, tgt.y - 10 - tgt.h, 3, "#ffffff", 20);
        } else {
          this.knock(tgt, dir, 45 + this.rand() * 35, 30 + this.rand() * 30, 0.35);
          this.burst((e.x + tgt.x) / 2, tgt.y - 12 - tgt.h, 4, ["#fff176", "#ffffff", "#ff8a2a"][Math.floor(this.rand() * 3)], 45);
          this.impact(0.9);
          if (this.rand() < 0.1) this.popup(["POW", "BAM", "ZAS", "PAF"][Math.floor(this.rand() * 4)], tgt.x, tgt.y - 30 - tgt.h, "#ffffff", 12, 0.6);
          if (this.lastHitSfx <= 0) { sfx.hitSmall(); this.lastHitSfx = 0.07; }
        }
      }
      // lanzar cosas a un rival lejano
      if (tgt && e.atkCd <= 0) {
        const dist = Math.abs(tgt.x - e.x);
        if (dist > 35 && dist < 120 && Math.abs(tgt.h - e.h) < 30 && this.rand() < dt * 1.1) {
          e.atkCd = 1.1 + this.rand() * 0.8;
          this.throwAt(e, tgt.x, tgt.y - tgt.h - 8 * tgt.scale, tgt.id);
        }
      }
      // contra el dino: lanzar y golpear
      if (e.target === "D" && d.state === "fight") {
        const front = d.x - 66;
        const dist = front - e.x;
        if (e.atkCd <= 0 && dist > 55 && dist < 190 && this.rand() < dt * 0.9) {
          e.atkCd = 1.2 + this.rand() * 0.9;
          this.throwAt(e, d.x - 60, GROUND - 40 - this.rand() * 70, "D");
        } else if (e.atkCd <= 0 && Math.abs(dist) < 14 && e.h < 120) {
          e.atkCd = 0.7 + this.rand() * 0.5;
          e.atkT = 0.24; e.flip = true;
          this.dinoHit(0.006);
          this.burst(front, e.y - 10 - e.h, 4, "#fff176", 45);
          this.impact(1.2);
          if (this.lastHitSfx <= 0) { sfx.hitSmall(); this.lastHitSfx = 0.07; }
          e.vx = -60; e.vh = 35; e.surf = -2; e.stun = 0.2; // rebote
        }
      }
    }

    // física horizontal
    if (!e.script) e.x += e.vx * dt;
    if (e.stun > 0 || mode === "cheer") e.vx *= 0.96;
    else if (move === 0 && !e.script) e.vx *= 0.85;
    if (this.windT > 0 && mode === "boss" && !e.script && e.x < d.x) e.x -= 45 * dt;
    e.x = clamp(e.x, 6, W - 6);

    // el dino es sólido: se choca y rebota
    if (mode === "boss" && (d.state === "enter" || d.state === "fight") && !e.script) {
      const front = d.x - 66;
      if (e.x > front - 3) {
        e.x = front - 3;
        if (e.vx > 20) {
          e.vx = -45; e.vh = Math.max(e.vh, 30); e.surf = -2; e.stun = Math.max(e.stun, 0.15);
          this.burst(front, e.y - 6 - e.h, 3, "#d0c8b0", 30);
          if (this.lastHitSfx <= 0) { sfx.hitSmall(); this.lastHitSfx = 0.07; }
        }
      }
    }

    // colisión lateral con cajas
    for (const s of surfaces) {
      if (s.kind !== "crate") continue;
      if (e.h < s.h - 1 && e.x > s.x - 3 && e.x < s.x + s.w + 3) {
        e.x = e.x < s.x + s.w / 2 ? s.x - 3 : s.x + s.w + 3;
        e.vx = 0;
      }
    }

    // polvo al correr
    if (grounded && Math.abs(e.vx) > 35 && this.rand() < dt * 5)
      this.particles.push({ x: e.x - Math.sign(e.vx) * 3, y: e.y - 1, vx: -e.vx * 0.1, vy: -8, life: 0.3, max: 0.3, size: 1, color: "#cfc9b8", grav: 20 });

    // ¿sigue apoyado en su plataforma?
    if (e.surf >= 0) {
      const cur = surfaces[e.surf];
      if (!cur || !(e.x > cur.x - 3 && e.x < cur.x + cur.w + 3)) e.surf = -2;
    }
    // física vertical + plataformas de un solo sentido
    if (e.surf === -2 || e.vh !== 0) {
      const prevH = e.h;
      const vBefore = e.vh;
      e.vh -= G * dt;
      e.h += e.vh * dt;
      if (e.vh <= 0) {
        let landH = 0, landIdx = -1;
        surfaces.forEach((s, i) => {
          if (e.x > s.x - 3 && e.x < s.x + s.w + 3 && prevH >= s.h - 0.5 && e.h <= s.h && s.h > landH) { landH = s.h; landIdx = i; }
        });
        if (e.h <= landH) {
          e.h = landH; e.vh = 0; e.surf = landIdx;
          if (vBefore < -70) this.burst(e.x, e.y - landH, 3, "#cfc9b8", 22);
        }
      }
    }
    e.ey = -e.h;
    e.ex = 0;

    // pose
    if (e.atkT > 0) e.pose = "punch";
    else if (e.stun > 0) e.pose = "dizzy";
    else if (mode === "cheer") e.pose = "cheer";
    else if (e.guardT > 0) e.pose = "guard";
    else if (e.h > 2) e.pose = e.vh > 0 ? "guard" : "idle";
    else if (Math.abs(e.vx) > 6) e.pose = "walk";
    else e.pose = "idle";
  }

  /* ───────────── actualización ───────────── */
  private update(dt: number) {
    this.time += dt;
    this.phaseT += dt;
    this.bannerT = Math.max(0, this.bannerT - dt);
    this.shake = Math.max(0, this.shake - dt * 8);
    this.lastHitSfx -= dt;
    if (this.dirty) this.relayout();
    if (this.timers.length) {
      const due = this.timers.filter((t) => t.at <= this.time);
      if (due.length) {
        this.timers = this.timers.filter((t) => t.at > this.time);
        due.forEach((t) => t.fn());
      }
    }
    this.updateDino(dt);
    const results = this.phase === "results";

    for (const e of this.ents.values()) {
      e.frame++;
      if (e.air > 0) {
        e.airV += 420 * dt;
        e.air -= e.airV * dt;
        if (e.air <= 0) {
          e.air = 0; e.airV = 0;
          this.burst(e.x, e.y, 6, "#ffffff", 30);
        }
      }
      // sale de la arena cuando termina el tiempo de festejo en pie
      if (e.arena && e.koState === 0 && !this.arenaActive(e)) this.leaveArena(e);

      if (this.arenaActive(e)) {
        this.fightStep(e, dt);
        continue;
      }

      // física de vuelo / KO
      if (e.ex !== 0 || e.ey !== 0 || e.evx !== 0 || e.evy !== 0) {
        e.evy += 330 * dt;
        e.ex += e.evx * dt;
        e.ey += e.evy * dt;
        if (e.ey >= 0 && e.evy > 0) {
          e.ey = 0;
          if (e.koState === 3 && (e.evx !== 0 || Math.abs(e.evy) > 60) && e.koAt < 900) {
            e.koState = 4;
            this.burst(e.x + e.ex, e.y, 5, "#ffffff", 25);
          }
          e.evy = e.evy > 90 ? -e.evy * 0.3 : 0;
          e.evx *= 0.5;
          if (Math.abs(e.evx) < 3) e.evx = 0;
        }
        if (e.ey === 0 && e.evy === 0 && e.evx === 0) { e.x += e.ex; e.ex = 0; }
      }

      // movimiento hacia el objetivo
      if (this.phase === "lobby") {
        if (this.time > e.wanderAt) {
          e.wanderAt = this.time + 2 + this.rand() * 4;
          if (this.rand() < 0.7) {
            e.tx = 230 + this.rand() * 360;
            e.ty = (e.scale === 2 ? 285 : 270) + this.rand() * (e.scale === 2 ? 135 : 150);
          }
        }
      }
      const dx = e.tx - e.x, dy = e.ty - e.y;
      const dist = Math.hypot(dx, dy);
      const moving = dist > 0.6 && e.koState === 0;
      const speed = this.phase === "lobby" ? 34 : 90;
      if (moving) {
        const step = Math.min(dist, speed * dt);
        e.x += (dx / dist) * step;
        e.y += (dy / dist) * step;
        if (Math.abs(dx) > 0.5) e.flip = dx < 0;
      }

      // poses
      if (e.koState === 4 || e.koState === 3) e.pose = "ko";
      else if (e.koState === 1 || e.koState === 2) e.pose = "dizzy";
      else if (results && e.hasAnswered && e.ok) e.pose = "cheer";
      else if (this.phase === "final" || this.phase === "boss") e.pose = "cheer";
      else if (moving) e.pose = "walk";
      else e.pose = "idle";
      if (!e.hasAnswered && (this.phase === "fight" || results) && e.koState === 0) { e.pose = "sleep"; e.alpha = 0.75; }
      if (this.phase === "final" && e.id === this.winnerId && e.ey === 0 && e.evy === 0 && e.frame % 45 === 0) e.evy = -(this.prizeShown ? 50 : 70);
      if (e.hop > 0 && e.ey >= 0 && results && e.koState === 0) {
        if (e.frame % 40 === Math.floor(e.phase * 3) % 40) e.evy = -45 * (e.scale === 2 ? 1.3 : 1);
      }
    }

    this.separate();
    this.updateProjs(dt);
    this.updateWaves(dt);
    this.windT = Math.max(0, this.windT - dt);
    if (this.phase === "lobby") {
      this.lobbyRoar -= dt;
      this.lobbyRoarT = Math.max(0, this.lobbyRoarT - dt);
      if (this.lobbyRoar <= 0) {
        this.lobbyRoar = 12 + this.rand() * 6;
        this.lobbyRoarT = 0.9;
        this.popup("RAWR!", 640, GROUND - 120, "#e8453c", 24, 1.2);
        sfx.roar();
        this.impact(2);
      }
    }
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
    this.updateCam(dt);
  }

  private updateDino(dt: number) {
    const d = this.dino;
    d.flash = Math.max(0, d.flash - dt);
    d.flinch = Math.max(0, d.flinch - dt);
    d.bounce = Math.max(0, d.bounce - dt * 2.5);
    d.roarT = Math.max(0, d.roarT - dt);
    d.legT += dt;
    if (d.state === "enter") {
      const tx = 610;
      if (d.x > tx) {
        d.x -= 62 * dt;
        if (Math.floor(d.legT * 2.4) !== Math.floor((d.legT - dt) * 2.4)) { sfx.stomp(); this.impact(3); }
      }
    }
    if (d.state === "dying") {
      d.dieT += dt;
      d.blink += dt;
      if (d.dieT < 1.0 && this.rand() < dt * 18) this.burst(d.x - 40 + this.rand() * 90, GROUND - 40 - this.rand() * 110, 2, "#ffb347", 40);
    }
  }

  private updateCam(dt: number) {
    let tz = 1, fx = W / 2, fy = H / 2;
    if (this.phase === "results" && this.zoomPts && this.phaseT > 0.15 && this.phaseT < 3.0) {
      tz = this.zoomPts.z; fx = this.zoomPts.x; fy = this.zoomPts.y;
    } else if (this.phase === "boss") {
      const w = this.winnerId ? this.ents.get(this.winnerId) : undefined;
      if (this.bossStage === "duel" && w) { tz = 1.7; fx = (w.x + this.dino.x) / 2; fy = GROUND - 55; }
      else if (this.bossStage === "dying") { tz = 1.9; fx = this.dino.x; fy = GROUND - 70; }
    } else if (this.phase === "final") {
      if (this.prizeShown) { tz = 1.3; fx = 340; fy = 245; }
      else { tz = 1 + Math.min(1, this.phaseT / 2.5) * 0.75; fx = 400; fy = 255; }
    }
    tz += this.camKick;
    this.camKick = Math.max(0, this.camKick - dt * 0.5);
    const k = Math.min(1, dt * (this.phase === "final" ? 3 : 5));
    this.cam.z += (tz - this.cam.z) * k;
    fx = clamp(fx, W / (2 * this.cam.z), W - W / (2 * this.cam.z));
    fy = clamp(fy, H / (2 * this.cam.z), H - H / (2 * this.cam.z));
    this.cam.fx += (fx - this.cam.fx) * k;
    this.cam.fy += (fy - this.cam.fy) * k;
  }

  /* ───────────── dibujo ───────────── */
  draw(c: CanvasRenderingContext2D, dt: number) {
    let sdt = Math.min(dt, 0.05);
    if (this.freezeT > 0) { this.freezeT -= sdt; sdt *= 0.05; }
    else if (this.slowT > 0) { this.slowT -= sdt; sdt *= 0.35; }
    this.update(sdt);
    const sx = this.shake ? Math.round((this.rand() - 0.5) * this.shake * 2) : 0;
    const sy = this.shake ? Math.round((this.rand() - 0.5) * this.shake * 2) : 0;
    const { z, fx, fy } = this.cam;
    const art = () => c.setTransform(2 * z, 0, 0, 2 * z, Math.round(sx * 2 + 2 * (W / 2 - fx * z)), Math.round(sy * 2 + 2 * (H / 2 - fy * z)));
    const txt = () => c.setTransform(1, 0, 0, 1, sx * 2, sy * 2);
    c.imageSmoothingEnabled = false;
    art();
    const lv = this.level;
    if (this.phase === "final") this.drawFinalBg(c);
    else drawBackground(c, lv, this.phase === "boss" ? 11 : this.q, this.time);

    if (this.phase === "lobby") {
      const roar = this.lobbyRoarT > 0;
      this.drawDinoAt(c, { x: 700, y: GROUND + 16, P: 6, legs: DINO_LEGS_A, body: "#535353", angry: roar, lift: Math.sin(this.time * 2.2) > 0.6 ? 1 : 0, blinkEye: Math.floor(this.time * 3) % 14 === 0, shakeX: roar ? Math.sin(this.time * 60) * 1.2 : 0 });
    }
    if (this.phase === "question" || this.phase === "fight" || this.phase === "results") { this.drawOptions(art, txt, c); art(); }
    if (this.phase === "fight" || this.phase === "boss" || (this.phase === "results" && this.phaseT < 3.4)) this.drawArena(c, lv);
    if (this.phase === "boss") this.drawDino(c);
    for (const w of this.waves) this.drawWave(c, w);

    const list = [...this.ents.values()].sort((a, b) => (a.y - a.h) - (b.y - b.h) || a.x - b.x);
    for (const e of list) {
      const x = e.x + e.ex;
      let y = e.y + e.ey - e.air;
      let rot = 0;
      if (e.koState === 4) rot = e.lieRot;
      if (rot) y -= 4 * e.scale;
      if (e.koState === 3 && e.evx !== 0) rot = Math.floor(this.time * 8 + e.phase) % 4;
      if (e.koState === 2) e.tint = Math.floor(this.time * 20) % 2 ? "#ffffff" : "#222222";
      drawHuman(c, e.look, x, y, { pose: e.pose, frame: e.frame, flip: e.flip, scale: e.scale, tint: e.tint, alpha: e.alpha, rot });
      if (e.koState === 1) {
        c.fillStyle = "rgba(190,240,255,0.55)";
        c.fillRect(Math.round(x - 7 * e.scale), Math.round(y - 18 * e.scale), 14 * e.scale, 19 * e.scale);
      }
      if (e.koState === 4 && this.phase !== "lobby" && this.phase !== "final") {
        const a = this.time * 6 + e.phase;
        c.fillStyle = "#ffd84a";
        c.fillRect(Math.round(x + Math.cos(a) * 5), Math.round(y - 8 + Math.sin(a) * 2), 2, 2);
        c.fillRect(Math.round(x + Math.cos(a + 3) * 5), Math.round(y - 8 + Math.sin(a + 3) * 2), 2, 2);
      }
      if (e.fastest && this.phase === "results") {
        c.fillStyle = "#ffd84a";
        c.fillRect(Math.round(x - 1), Math.round(y - 16 * e.scale - 9), 3, 3);
        c.fillRect(Math.round(x - 3), Math.round(y - 16 * e.scale - 6), 3, 3);
        c.fillRect(Math.round(x - 1), Math.round(y - 16 * e.scale - 3), 3, 3);
      }
    }

    if (this.phase === "final") this.drawPrize(c);
    for (const p of this.projs) this.drawProj(c, p);
    for (const f of this.fx) this.drawFx(c, f);
    for (const p of this.particles) {
      c.globalAlpha = Math.max(0, Math.min(1, p.life / p.max));
      c.fillStyle = p.color;
      c.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    c.globalAlpha = 1;

    txt();
    this.drawText(c, lv, list);
    c.setTransform(1, 0, 0, 1, 0, 0);
  }

  private drawArena(c: CanvasRenderingContext2D, lv: Level) {
    for (const s of this.arena) {
      const y = PLAT_BASE - s.h;
      if (s.kind === "plat") {
        c.fillStyle = lv.groundDark;
        c.fillRect(Math.round(s.x), y, Math.round(s.w), 5);
        c.fillStyle = lv.ink + "99";
        c.fillRect(Math.round(s.x), y + 5, Math.round(s.w), 2);
        c.fillStyle = lv.accent;
        c.fillRect(Math.round(s.x), y, Math.round(s.w), 1);
        c.fillStyle = lv.groundDark + "55";
        for (let x = 6; x < s.w; x += 24) c.fillRect(Math.round(s.x + x), y + 7, 2, 4);
      } else {
        const top = PLAT_BASE - s.h;
        c.fillStyle = "#8a5a2b";
        c.fillRect(Math.round(s.x), top, Math.round(s.w), s.h + 4);
        c.fillStyle = "#5a3a1f";
        c.fillRect(Math.round(s.x), top, Math.round(s.w), 2);
        c.fillRect(Math.round(s.x + 6), top, 2, s.h + 4);
        c.fillStyle = "#b8803f";
        c.fillRect(Math.round(s.x + 2), top + 3, 3, 3);
      }
    }
  }

  private drawDinoAt(c: CanvasRenderingContext2D, o: { x: number; y: number; P: number; legs: string[]; body: string; angry: boolean; lift?: number; rot?: number; blinkEye?: boolean; shakeX?: number; alpha?: number }) {
    const P = o.P;
    const rows = [...DINO_ROWS, ...o.legs];
    const lift = o.lift ?? 0;
    const x = o.x + (o.shakeX ?? 0);
    const left = x - (DINO_W * P) / 2;
    const top = o.y - rows.length * P - lift;
    c.save();
    if (o.alpha !== undefined) c.globalAlpha = o.alpha;
    const rot = o.rot ?? 0;
    const pivX = x + 55, pivY = o.y;
    if (rot) { c.translate(pivX, pivY); c.rotate(rot); c.translate(-pivX, -pivY); }
    const cell = P + 1; // celdas solapadas: sin costuras al hacer zoom
    const ox = 0;
    let eye: [number, number] | null = null;
    rows.forEach((row, ry) => {
      for (let cx = 0; cx < DINO_W; cx++) {
        const ch = row[cx];
        if (!ch || ch === ".") continue;
        const px = Math.round(left + (DINO_W - 1 - cx) * P) + ox, py = Math.round(top + ry * P);
        if (ch === "e") { eye = [px, py]; c.fillStyle = o.body; } else c.fillStyle = o.body;
        c.fillRect(px, py, cell, cell);
      }
    });
    if (eye) {
      c.fillStyle = o.angry ? "#ff2b2b" : o.blinkEye ? o.body : "#ffffff";
      c.fillRect((eye as [number, number])[0], (eye as [number, number])[1], P, P);
    }
    if (o.angry) {
      c.fillStyle = "#ff2b2b";
      c.fillRect(Math.round(left + (DINO_W - 1 - 18) * P), Math.round(top + 6 * P), 4 * P, P);
    }
    c.restore();
  }

  private drawDino(c: CanvasRenderingContext2D) {
    const d = this.dino;
    if (d.state === "hidden" || d.state === "dead") return;
    const dying = d.state === "dying";
    const legs = dying && d.dieT > 0.5 ? DINO_LEGS_KNEEL : Math.floor(d.legT * 3) % 2 === 0 ? DINO_LEGS_A : DINO_LEGS_B;
    let body = "#8d8d96";
    if (dying) body = d.dieT < 1.0 ? (Math.floor(d.blink * 14) % 2 ? "#ffffff" : "#ff5a2a") : "#6d6d78";
    else if (d.flash > 0) body = "#ffffff";
    let rot = 0;
    if (dying && d.dieT > 1.0) { const k = Math.min(1, (d.dieT - 1.0) / 0.95); rot = k * k * 1.42; }
    let shakeX = d.flinch > 0 ? Math.sin(this.time * 70) * d.flinch * 8 : 0;
    if (dying && d.dieT < 1.0) shakeX += Math.sin(this.time * 50) * 3;
    const bob = Math.round(Math.sin(d.bounce * Math.PI) * 8);
    const alpha = dying && d.dieT > 2.5 && Math.floor(this.time * 16) % 2 ? 0.35 : 1;
    this.drawDinoAt(c, { x: d.x, y: d.y, P: DINO_P, legs, body, angry: d.roarT > 0, lift: d.lift + bob, rot, shakeX, alpha });
  }

  private drawProj(c: CanvasRenderingContext2D, p: Proj) {
    const x = Math.round(p.x), y = Math.round(p.y);
    if (p.kind === "rock") { c.fillStyle = "#6a6a6a"; c.fillRect(x - 2, y - 2, 5, 5); c.fillStyle = "#9a9a9a"; c.fillRect(x - 2, y - 2, 2, 2); }
    else if (p.kind === "snow") { c.fillStyle = "#ffffff"; c.fillRect(x - 2, y - 2, 5, 5); c.fillStyle = "#bfeaff"; c.fillRect(x, y, 2, 2); }
    else if (p.kind === "bomb") { c.fillStyle = "#111"; c.fillRect(x - 3, y - 3, 6, 6); c.fillStyle = Math.floor(p.rot) % 2 ? "#ff5a2a" : "#ffd84a"; c.fillRect(x, y - 5, 2, 2); }
    else if (p.kind === "star") {
      c.fillStyle = "#e8e8f0";
      const k = Math.floor(p.rot) % 2;
      if (k) { c.fillRect(x - 3, y - 1, 7, 2); c.fillRect(x - 1, y - 3, 2, 7); } else { c.fillRect(x - 2, y - 2, 2, 2); c.fillRect(x + 1, y - 2, 2, 2); c.fillRect(x - 2, y + 1, 2, 2); c.fillRect(x + 1, y + 1, 2, 2); }
    }
    else if (p.kind === "fire") { c.fillStyle = "#ff7a1a"; c.fillRect(x - 2, y - 2, 5, 5); c.fillStyle = "#ffd84a"; c.fillRect(x - 1, y - 1, 3, 3); }
    else { c.fillStyle = "#ff5a2a"; c.fillRect(x - 4, y - 4, 9, 9); c.fillStyle = "#ffb347"; c.fillRect(x - 3, y - 3, 6, 6); c.fillStyle = "#fff176"; c.fillRect(x - 1, y - 1, 3, 3); }
  }

  private drawWave(c: CanvasRenderingContext2D, w: Wave) {
    const x = Math.round(w.x);
    c.fillStyle = "#d0c8b0"; c.fillRect(x - 6, GROUND - 8, 12, 8);
    c.fillStyle = "#a89f85"; c.fillRect(x - 8, GROUND - 4, 16, 4);
    c.fillStyle = "#f0e8d0"; c.fillRect(x - 3, GROUND - 11, 6, 4);
  }

  private drawFinalBg(c: CanvasRenderingContext2D) {
    c.fillStyle = "#ffd966"; c.fillRect(0, 0, W, H);
    const t = this.time;
    for (let i = 0; i < 14; i++) {
      const a = t * 0.25 + (i * Math.PI * 2) / 14;
      c.save();
      c.translate(400, 250);
      c.rotate(a);
      c.fillStyle = i % 2 ? "rgba(255,255,255,0.30)" : "rgba(255,240,160,0.18)";
      c.beginPath(); c.moveTo(0, 0); c.lineTo(900, -70); c.lineTo(900, 70); c.closePath(); c.fill();
      c.restore();
    }
    c.fillStyle = "#d9a441"; c.fillRect(0, GROUND, W, H - GROUND);
    c.fillStyle = "#8a4b00"; c.fillRect(0, GROUND, W, 2);
    const r = mulberry(77);
    for (let i = 0; i < 40; i++) {
      const x = r() * W, y = r() * (GROUND - 20);
      if (Math.floor(t * 3 + i) % 4 === 0) { c.fillStyle = "#ffffff"; c.fillRect(Math.round(x), Math.round(y), 3, 3); }
    }
  }

  private drawPrize(c: CanvasRenderingContext2D) {
    if (!this.prizeShown) return;
    const t = this.phaseT - this.reachT;
    const k = clamp(t / 1.1, 0, 1);
    // caída con rebote
    const bounce = k < 1 ? 1 - Math.pow(1 - k, 2) * Math.cos(k * 9) : 1;
    const y = -120 + (172 + 120) * bounce + (t > 1.1 ? Math.sin((t - 1.1) * 3) * 3 : 0);
    const x = 450;
    const s = 6;
    // rayos detrás de la bolsa
    c.save();
    c.translate(x, y + 60);
    for (let i = 0; i < 10; i++) {
      c.rotate((Math.PI * 2) / 10);
      c.fillStyle = i % 2 ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.12)";
      c.save(); c.rotate(this.time * 0.6); c.fillRect(30, -5, 150, 10); c.restore();
    }
    c.restore();
    // sombra
    c.fillStyle = "rgba(0,0,0,0.18)"; c.fillRect(x - 40, GROUND + 4, 80, 5);
    const R = (px: number, py: number, w: number, h: number, col: string) => { c.fillStyle = col; c.fillRect(Math.round(x + px * s - 7 * s), Math.round(y + py * s), w * s, h * s); };
    R(0, 0, 14, 2, "#d8a21a");
    for (let i = 0; i < 14; i += 2) R(i, 0, 1, 2, "#b8841a");
    R(0, 2, 14, 15, "#ffd84a");
    R(0, 6, 14, 5, "#e8453c");
    R(4, 5, 6, 7, "#ffffff");
    R(5, 6, 4, 5, "#ffd84a");
    R(6, 7, 2, 3, "#e8453c");
    R(0, 17, 14, 2, "#d8a21a");
    for (let i = 0; i < 14; i += 2) R(i, 18, 1, 2, "#b8841a");
    R(1, 3, 1, 12, "rgba(255,255,255,0.45)");
    c.fillStyle = "#ffffff";
    for (let i = 0; i < 12; i++) {
      const a = this.time * 1.6 + i * 0.52;
      const rx = x + Math.cos(a) * (55 + (i % 3) * 12), ry = y + 60 + Math.sin(a * 1.3) * (55 + (i % 2) * 10);
      if (Math.floor(this.time * 6 + i) % 2) c.fillRect(Math.round(rx), Math.round(ry), 4, 4);
    }
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
      const y = -20;
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
      c.strokeRect(Math.round(f.x - r), Math.round(f.y - r * 0.5 - 6), Math.round(r * 2), Math.round(r));
      c.globalAlpha = 1;
    }
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
        c.fillStyle = "#ffffff";
        const cx = b.x + b.w - 22, cy = by + 12;
        c.fillRect(cx, cy + 6, 3, 3); c.fillRect(cx + 3, cy + 9, 3, 3); c.fillRect(cx + 6, cy + 6, 3, 3);
        c.fillRect(cx + 9, cy + 3, 3, 3); c.fillRect(cx + 12, cy, 3, 3);
      }
    }
    // texto de las cajas: sigue la cámara
    txt();
    c.textBaseline = "top";
    const { z: cz, fx, fy } = this.cam;
    const WXs = (x: number) => ((x - fx) * cz + W / 2) * 2;
    const WYs = (y: number) => ((y - fy) * cz + H / 2) * 2;
    for (const b of boxes) {
      const dim = dimWrong && !b.good;
      c.fillStyle = dim ? "rgba(255,255,255,0.55)" : b.tcolor;
      const size = (b.label.length > 24 && b.w < 300 ? 14 : 18) * cz;
      c.font = `${size}px ${FONT}`;
      c.textAlign = "left";
      const pad = b.letter ? 56 : 20;
      const lines = wrap(c, b.label, (b.w * 2 - pad - 16) * cz).slice(0, 4);
      const th = lines.length * (size + 6 * cz);
      lines.forEach((ln, i) => c.fillText(ln, WXs(b.x) + pad * cz, WYs(by + bh / 2) - th / 2 + i * (size + 6 * cz)));
      if (b.letter) {
        c.font = `${26 * cz}px ${FONT}`;
        c.fillStyle = dim ? "rgba(255,255,255,0.5)" : b.tcolor;
        c.fillText(b.letter, WXs(b.x) + 16 * cz, WYs(by) + 18 * cz);
      }
    }
  }

  private drawText(c: CanvasRenderingContext2D, lv: Level, list: Ent[]) {
    c.textBaseline = "top";
    const { z, fx, fy } = this.cam;
    const WX = (x: number) => ((x - fx) * z + W / 2) * 2;
    const WY = (y: number) => ((y - fy) * z + H / 2) * 2;
    const zs = Math.min(z, 1.7);
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
    const zoomed = this.cam.z > 1.15;

    if (this.phase === "boss") {
      const g = c.createRadialGradient(800, 450, 320, 800, 450, 1050);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(0,0,0,0.55)");
      c.fillStyle = g; c.fillRect(0, 0, 1600, 900);
      if (this.dino.roarT > 0) { c.fillStyle = `rgba(255,40,40,${Math.min(0.14, this.dino.roarT * 0.2)})`; c.fillRect(0, 0, 1600, 900); }
      if (this.freezeT > 0) { c.fillStyle = "rgba(255,255,255,0.12)"; c.fillRect(0, 0, 1600, 900); }
    }

    if (this.phase === "question" || this.phase === "fight" || this.phase === "results") {
      const showQ = this.phase === "question" || this.phase === "fight";
      const hud = !zoomed || this.phase === "question";
      if (hud) {
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
            cl.forEach((ln, i) => T(ln, 48, y + 18 + i * 22, 15, ln.startsWith("<") ? "#9ad7ff" : "#ffffff", "left", false));
          }
        }
      }
      if (this.phase === "question") {
        const secs = Math.max(0, Math.floor((Date.now() - this.startedAt) / 1000));
        const all = n > 0 && ansN >= n;
        T(`RESPONDIERON ${ansN}/${n}`, 1572, 62, 18, all ? "#2bb673" : lv.ink, "right", false);
        c.fillStyle = "rgba(0,0,0,0.25)"; c.fillRect(1172, 92, 400, 14);
        c.fillStyle = all ? "#2bb673" : lv.accent;
        c.fillRect(1172, 92, n ? Math.round((400 * ansN) / n) : 0, 14);
        if (this.startedAt) T(`${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`, 1572, 120, 14, lv.ink, "right", false);
        if (all && Math.floor(this.time * 2.5) % 2 === 0)
          T("¡TODOS RESPONDIERON!", 800, 330, 22, lv.accent, "center");
        if (this.bannerT > 0) this.drawBanner(c, T);
      }
      if (this.phase === "fight" && this.phaseT < 1.6 && Math.floor(this.phaseT * 6) % 2 === 0)
        T("¡PELEA!", 800, 340, 56, "#ffffff", "center");
      if (this.phase === "results") {
        const surv = list.filter((e) => e.hasAnswered && e.ok).length;
        if (this.phaseT < 3.4 && this.phaseT > 0.1) {
          T(surv ? "¡SOBREVIVIENTES!" : "¡NADIE SOBREVIVIÓ!", 800, 60, 34, surv ? "#ffd84a" : "#ffffff", "center");
        }
        if (this.phaseT >= 3.2) {
          c.globalAlpha = clamp((this.phaseT - 3.2) / 0.4, 0, 1);
          T("RESPUESTA CORRECTA:", 28, 90, 16, lv.ink, "left", false);
          T(qu.answerLabel.slice(0, 50), 28, 120, 28, lv.accent === "#ffffff" ? "#2bb673" : lv.accent, "left", true);
          const top = this.ranking.slice(0, 5);
          const cw = 296, gap = 10;
          T("TOP 5", 28, 206, 12, lv.ink, "left", false);
          top.forEach((r, i) => {
            const x = 28 + i * (cw + gap), y = 230;
            c.fillStyle = i === 0 ? "#ffd84a" : lv.panel; c.fillRect(x, y, cw, 76);
            c.fillStyle = "rgba(0,0,0,0.25)"; c.fillRect(x, y + 72, cw, 4);
            T(`${i + 1}`, x + 14, y + 14, 22, "#222", "left", false);
            T(r.name.slice(0, 10).toUpperCase(), x + 56, y + 14, 14, i === 0 ? "#222" : lv.panelText, "left", false);
            T(`${r.pts} PTS`, x + 56, y + 42, 16, i === 0 ? "#7a4b00" : lv.panelText, "left", false);
          });
          c.globalAlpha = 1;
        }
      }
      const showNames = this.phase === "results" ? n <= 40 : n <= 30;
      for (const e of list) {
        const x = WX(e.x + e.ex);
        const y = WY(e.y + e.ey - e.air - 19 * e.scale);
        const lift = e.nameRow * 14 * zs;
        const fs = (e.scale === 2 ? 12 : 10) * zs;
        const fightName = this.phase === "fight" && e.koState === 0 && showNames && e.hasAnswered;
        const resName = this.phase === "results" ? e.hasAnswered && e.ok : e.hasAnswered || this.phase === "question";
        if ((showNames && resName && this.phase !== "fight") || fightName) {
          T(e.name.slice(0, 9), x, y - 10 * zs - lift, fs, "#ffffff", "center");
        } else if (e.fastest && this.phase === "results") {
          T(e.name.slice(0, 9), x, y - 30 * zs, fs, "#ffd84a", "center");
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

    if (this.phase === "boss") {
      if (this.dino.state !== "hidden" && this.dino.state !== "dead") {
        c.fillStyle = "rgba(0,0,0,0.55)"; c.fillRect(480, 56, 640, 44);
        T("DINO-JEFE", 800, 62, 12, "#ffb0a0", "center", false);
        c.fillStyle = "#3a1a22"; c.fillRect(500, 80, 600, 12);
        c.fillStyle = this.dino.hp > 0.3 ? "#ff3b3b" : "#ffd84a";
        c.fillRect(500, 80, Math.round(600 * this.dino.hp), 12);
      }
      const alive = list.filter((e) => e.koState === 0).length;
      if (this.bossStage === "brawl" || this.bossStage === "duel") T(`EN PIE: ${alive}`, 1572, 62, 16, "#ffb0a0", "right", false);
      if (this.bannerT > 0) this.drawBanner(c, T);
      const w = this.winnerId ? this.ents.get(this.winnerId) : undefined;
      if (w && (this.bossStage === "duel" || this.bossStage === "dying" || this.bossStage === "end"))
        T(w.name.slice(0, 10).toUpperCase(), WX(w.x), WY(w.y - w.h - 19 * w.scale) - 8, 12 * zs, "#ffd84a", "center");
      if (this.bossStage === "end" && this.bossDone) T("¡EL DINO CAYÓ!", 800, 330, 26, "#ffd84a", "center");
    }

    if (this.phase === "final") {
      const top = this.ranking[0];
      const w = this.winnerId ? this.ents.get(this.winnerId) : undefined;
      if (!w || !top) {
        T("SIN JUGADORES", 800, 400, 30, lv.ink, "center");
      } else if (!this.prizeShown) {
        const a = clamp((this.phaseT - 1.0) / 0.6, 0, 1);
        c.globalAlpha = a;
        c.fillStyle = "rgba(0,0,0,0.45)"; c.fillRect(300, 52, 1000, 170);
        T("¡EL GANADOR!", 800, 68, 28, "#ffd84a", "center");
        T(top.name.toUpperCase().slice(0, 14), 800, 112, 56, "#ffffff", "center");
        T(`${top.pts} PUNTOS`, 800, 184, 20, "#ffffff", "center");
        c.globalAlpha = 1;
      } else {
        const a = clamp((this.phaseT - this.reachT) / 0.6, 0, 1);
        const wob = Math.floor(this.time * 3) % 2 ? 0 : 3;
        c.globalAlpha = a;
        c.fillStyle = "rgba(0,0,0,0.5)"; c.fillRect(260, 52, 1080, 170);
        T("¡PREMIO DESBLOQUEADO!", 800, 68 + wob, 28, "#ffd84a", "center");
        T("UNA SABRITA", 800, 112 + wob, 56, "#ffffff", "center");
        T(`PARA ${top.name.toUpperCase().slice(0, 14)}`, 800, 184, 20, "#ffd84a", "center");
        c.globalAlpha = 1;
      }
    }

    for (const p of this.popups) {
      c.globalAlpha = Math.min(1, p.life / (p.max * 0.5));
      T(p.text, WX(p.x), WY(p.y), p.size * zs, p.color, "center");
    }
    c.globalAlpha = 1;
  }

  private drawBanner(c: CanvasRenderingContext2D, T: (s: string, x: number, y: number, size: number, color: string, align?: CanvasTextAlign, shadow?: boolean) => void) {
    const k = Math.min(1, this.bannerT / 0.4, (2.8 - this.bannerT) / 0.3);
    c.globalAlpha = clamp(k, 0, 1);
    c.fillStyle = "rgba(0,0,0,0.65)"; c.fillRect(0, 380, 1600, 150);
    T(this.bannerText, 800, 398, 40, "#ffffff", "center");
    if (this.bannerSub) T(this.bannerSub, 800, 460, 22, this.level.accent === "#ffffff" ? "#ffd84a" : this.level.accent, "center");
    c.globalAlpha = 1;
  }
}
