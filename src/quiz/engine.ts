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
  immune: boolean;
  doomed: boolean;
  tStart: number; tvx: number; tvy: number; bx: number; by: number; bsc: number; ang: number;
  codeT: number; cd: number[]; dodgeCd: number;
}

interface Particle {
  x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; grav: number;
}
interface Popup {
  text: string; x: number; y: number; vy: number; life: number; max: number; color: string; size: number;
}
interface Fx {
  kind: "meteor" | "bomb" | "bolt" | "ring" | "laser";
  x: number; y: number; x0?: number; y0?: number; x1?: number; y1?: number; t: number; dur: number; r?: number;
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
  kind: "rock" | "bomb" | "star" | "fire" | "ice" | "arrow" | "grenade" | "bossfire" | "bullet" | "code";
  owner: string; tgt: string | null; lethal?: boolean; txt?: string; power?: number;
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
type Weapon = "arrow" | "rock" | "star" | "fire" | "ice" | "bomb" | "grenade" | "laser" | "bolt";
const WEAPONS: Weapon[][] = [
  ["arrow", "rock", "grenade"], ["fire", "star", "laser"], ["bolt", "star", "ice"], ["arrow", "rock", "bomb"],
  ["ice", "bomb", "laser"], ["fire", "grenade", "bolt"], ["ice", "arrow", "star"], ["laser", "bolt", "star"],
  ["laser", "grenade", "ice"], ["arrow", "fire", "laser", "bolt", "grenade", "ice"],
];
const TRAVEL_TITLES = ["¡UNA NAVE ESPACIAL!", "¡UNA TORMENTA!", "¡UN AGUJERO NEGRO!", "¡A LAS MOTOS!", "¡ABORDEN EL BARCO!", "¡ERUPCIÓN!", "¡A LOS TRINEOS!", "¡PORTAL DE TELETRANSPORTE!", "¡AL COHETE!", "¡ALGO SE ACERCA...!"];
const TRAVEL_DUR = [7.2, 7.2, 7.2, 7, 7.6, 7, 7, 7.4, 9.4, 6.4];
const CODE_SNIPPETS = ["</>", "{ }", "if()", "0101", "git", "API", "=>", "[];", "npm", "<a>"];
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
  onTravelDone?: () => void;
  onEliminated?: (id: string) => void;

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
  private hot: { x: number; y: number; t: number; w: number }[] = [];
  private killCam: { x: number; y: number } = { x: 400, y: 300 };
  private killCamT = 0;
  private lastKill = -9;
  private travelKind = 0;
  private travelDur = 7;
  private travelNext = "";
  private travelFlash = 0;
  private quakeNext = 1;
  private fadeIn = 0;
  private bossDone = false;
  private bossStage: "none" | "enter" | "brawl" | "three" | "duel" | "dying" | "end" = "none";
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
      case "travel":
        return false;
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
      immune: false, doomed: false, tStart: 0, tvx: 0, tvy: 0, bx: 0, by: 0, bsc: 1, ang: 0, codeT: 0, cd: [0, 0, 0, 0], dodgeCd: 0,
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
    const was = this.phase;
    this.phase = phase;
    this.q = q;
    this.level = phase === "final" ? levelFor(9) : phase === "boss" ? BOSS_LEVEL : levelFor(q);
    this.hot = []; this.killCamT = 0;
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
      e.immune = false; e.doomed = false; e.codeT = 0; e.scale = e.scale || 1;
      if (was === "travel" && phase === "question") { e.x = -12 - this.rand() * 80; e.y = 330; }
    }
    if (was === "travel" && phase !== "travel") this.fadeIn = 1;
    if (phase === "question") {
      this.banner(`NIVEL ${q + 1}`, this.level.name, 2.2);
      sfx.question();
      for (const e of this.ents.values()) { e.hasAnswered = false; e.answer = undefined; e.ok = false; e.fastest = false; e.pts = 0; }
    }
    if (phase === "travel") this.startTravel(q);
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
    let maxKo = 0;
    for (const e of this.ents.values()) {
      const r = this.results[e.id];
      e.ok = !!r?.ok;
      e.fastest = !!r?.fastest;
      e.pts = r?.pts ?? 0;
      e.hasAnswered = !!r || e.hasAnswered;
      if (e.hasAnswered) this.enterArena(e);
      if (e.hasAnswered && !e.ok) {
        e.koAt = 2.8 + this.rand() * 5.2;
        maxKo = Math.max(maxKo, e.koAt);
        this.after(e.koAt, () => this.strikeKo(e));
      } else {
        e.koAt = 999;
      }
    }
    this.after(Math.max(FIGHT_MIN + 2, maxKo + 2.6), () => this.finishFight());
  }

  private startKo(e: Ent, style: number) {
    if (e.koState !== 0) return;
    if (e.immune || (this.phase === "boss" && e.id === this.winnerId)) return;
    this.leaveArena(e);
    e.doomed = false;
    const gx = e.x + e.ex, gy = e.y;
    this.mark(gx, gy + e.ey, 2);
    if (this.phase === "boss") this.onEliminated?.(e.id);
    else if (this.phase === "fight" && this.time - this.lastKill > 1.6) { this.killCamT = 0.85; this.killCam = { x: gx, y: gy + e.ey }; this.slowT = Math.max(this.slowT, 0.5); this.lastKill = this.time; }
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
      case 6: // quemado (láser / fuego)
        e.koState = 3; e.tint = "#ff8a2a"; e.evx = (this.rand() < 0.5 ? -1 : 1) * (30 + this.rand() * 30); e.evy = -(80 + this.rand() * 40);
        this.burst(gx, gy - 8 + e.ey, 12, "#ff9a2a", 60);
        this.after(0.45, () => { if (e.koState >= 3) e.tint = "#2a2a2a"; });
        sfx.hit(); this.impact(2.5, 0.04);
        break;
      case 7: // explosión: sale volando alto
        e.koState = 3; e.evx = (this.rand() < 0.5 ? -1 : 1) * (40 + this.rand() * 40); e.evy = -(170 + this.rand() * 60);
        this.burst(gx, gy - 8 + e.ey, 10, "#ffcf3a", 70);
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
  private mark(x: number, y: number, w = 1) {
    this.hot.push({ x, y, t: this.time, w });
    if (this.hot.length > 14) this.hot.shift();
  }
  private knock(e: Ent, dir: number, vx: number, vh: number, stun: number) {
    e.vx = dir * vx; e.vh = vh; e.surf = -2; e.stun = stun; e.guardT = 0; e.aiT = 0;
    this.mark(e.x, e.y - e.h, 0.6);
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

  private pickWeapon(): Weapon {
    const lvl = this.phase === "boss" ? 9 : this.q;
    const list = WEAPONS[lvl % WEAPONS.length];
    return list[Math.floor(this.rand() * list.length)];
  }
  private koStyleFor(w: string): number {
    switch (w) {
      case "arrow": case "rock": case "star": case "bullet": case "code": return 0;
      case "fire": case "laser": return 6;
      case "ice": return 4;
      case "bomb": case "grenade": return 7;
      default: return 2;
    }
  }

  /** lanza un arma: proyectiles (flecha, piedra, estrella, fuego, hielo, bomba, granada) o rayos (láser, relámpago) */
  private throwAt(e: Ent, tx: number, ty: number, tgt: string | null, kind?: Weapon, lethal = false) {
    const k = kind ?? this.pickWeapon();
    if (k === "laser" || k === "bolt") { this.zap(e, tgt, tx, ty, k, lethal); return; }
    if (this.projs.length > 45) return;
    const sx = e.x + (tx < e.x ? -6 : 6) * (e.scale / 1.5 + 0.3), sy = e.y - e.h - 14 * e.scale;
    const arcs = k === "rock" || k === "bomb" || k === "grenade";
    const g = arcs ? 220 : 0;
    const dx = tx - sx, dy = ty - sy;
    let vx: number, vy: number;
    if (arcs) {
      const ft = clamp(Math.hypot(dx, dy) / 150, 0.4, 1.0);
      vx = dx / ft; vy = (dy - 0.5 * g * ft * ft) / ft;
    } else {
      const sp = k === "arrow" ? 250 : k === "star" ? 220 : k === "fire" ? 175 : 190;
      const d = Math.hypot(dx, dy) || 1;
      vx = (dx / d) * sp; vy = (dy / d) * sp;
    }
    this.projs.push({ x: sx, y: sy, vx, vy, g, kind: k, owner: e.id, tgt, life: 2.4, rot: 0, lethal });
    e.atkT = 0.25; e.flip = tx < e.x;
    sfx.throw();
  }

  private zap(att: Ent, tgtId: string | null, tx: number, ty: number, kind: "laser" | "bolt", lethal: boolean) {
    const victim = tgtId && tgtId !== "D" ? this.ents.get(tgtId) : undefined;
    att.atkT = 0.35; att.flip = tx < att.x;
    const ax = att.x, ay = att.y - att.h - 12 * att.scale;
    if (kind === "laser") {
      sfx.laser();
      this.fx.push({ kind: "laser", x: ax, y: ay, x0: ax, y0: ay, x1: tx, y1: ty, t: 0, dur: 0.3 });
      this.after(0.1, () => {
        if (tgtId === "D" && this.dino.state === "fight") { this.dinoHit(0.012); this.burst(this.dino.x - 66, ty, 8, "#ff3b3b", 50); this.impact(1.2); return; }
        if (!victim || victim.koState !== 0 || !victim.arena) return;
        if (lethal) this.startKo(victim, 6);
        else { this.knock(victim, Math.sign(tx - ax) || 1, 50, 40, 0.5); this.burst(tx, ty, 6, "#ff3b3b", 40); this.impact(1); }
      });
    } else {
      this.burst(ax, ay - 10, 6, "#ffe55a", 30);
      this.after(0.4, () => {
        if (tgtId === "D" && this.dino.state === "fight") { this.fx.push({ kind: "bolt", x: this.dino.x - 70, y: ty, t: 0, dur: 0.3 }); sfx.lightning(); this.dinoHit(0.012); this.impact(2); return; }
        if (!victim || victim.koState !== 0 || !victim.arena) return;
        if (lethal) this.startKo(victim, 2);
        else {
          this.fx.push({ kind: "bolt", x: victim.x, y: victim.y - victim.h, t: 0, dur: 0.3 });
          sfx.lightning();
          this.knock(victim, Math.sign(victim.x - ax) || 1, 25, 55, 0.9);
          this.impact(2); this.mark(victim.x, victim.y - victim.h, 1);
        }
      });
    }
  }

  /** un rival visible elimina al jugador: nadie cae solo */
  private strikeKo(v: Ent) {
    if (v.koState !== 0 || v.immune) return;
    v.doomed = true;
    let att: Ent | null = null, best = 1e9;
    for (const o of this.ents.values()) {
      if (o === v || !o.arena || o.koState !== 0) continue;
      const dd = Math.abs(o.x - v.x);
      if (dd < best) { best = dd; att = o; }
    }
    if (!att) { this.startKo(v, 1); return; } // sin rivales: cae un meteorito
    const w = this.pickWeapon();
    this.throwAt(att, v.x, v.y - v.h - 8 * v.scale, v.id, w, true);
    this.after(2.0, () => { if (v.koState === 0) this.startKo(v, this.koStyleFor(w)); });
  }

  private spit(tgt: Ent, lethal: boolean) {
    const d = this.dino;
    const sx = d.x - 88, sy = GROUND - 150, g = 160;
    const dx = tgt.x - sx, dy = tgt.y - tgt.h - 6 - sy;
    const ft = clamp(Math.hypot(dx, dy) / 150, 0.5, 1.1);
    this.projs.push({ x: sx, y: sy, vx: dx / ft, vy: (dy - 0.5 * g * ft * ft) / ft, g, kind: "bossfire", owner: "D", tgt: tgt.id, life: 3, rot: 0, lethal });
    sfx.throw();
  }

  private explode(x: number, y: number, r: number, victimId: string | null) {
    this.fx.push({ kind: "ring", x, y: y + 6, t: 0, dur: 0.35, r: r + 6 });
    this.burst(x, y, 16, "#ffb347", 80);
    this.burst(x, y, 8, "#fff176", 50);
    sfx.explosion();
    this.impact(4, 0.04);
    this.mark(x, y, 2);
    const v = victimId ? this.ents.get(victimId) : undefined;
    for (const e of this.ents.values()) {
      if (!e.arena || e.koState !== 0 || e.script) continue;
      if (Math.abs(e.x - x) < r && Math.abs(e.y - e.h - y) < r + 10) {
        if (victimId === e.id) this.startKo(e, 7);
        else this.knock(e, Math.sign(e.x - x) || 1, 85, 90, 0.5);
      }
    }
    if (v && v.koState === 0 && v.arena && Math.hypot(v.x - x, v.y - v.h - y) < r * 2.4) this.startKo(v, 7);
  }

  private weaponHit(e: Ent, p: Proj) {
    const dir = Math.sign(p.vx) || 1;
    switch (p.kind) {
      case "ice":
        this.knock(e, dir, 35, 35, 0.9);
        e.tint = "#9fe8ff"; this.after(0.7, () => { if (e.koState === 0) e.tint = null; });
        this.burst(p.x, p.y, 8, "#e8fbff", 40); sfx.freeze();
        break;
      case "fire":
        this.knock(e, dir, 50, 45, 0.6);
        this.burst(p.x, p.y, 8, "#ff9a2a", 50);
        break;
      case "arrow":
        this.knock(e, dir, 75, 40, 0.5);
        this.burst(p.x, p.y, 4, "#d8c08a", 35);
        break;
      default:
        this.knock(e, dir, 55, 50, 0.4);
        this.burst(p.x, p.y, 5, "#fff176", 40);
    }
    if (this.lastHitSfx <= 0) { sfx.hitSmall(); this.lastHitSfx = 0.07; }
    this.impact(0.9);
    this.mark(p.x, p.y, 1);
  }

  private updateProjs(dt: number) {
    const d = this.dino;
    const dinoAlive = this.phase === "boss" && (d.state === "fight" || d.state === "enter");
    for (const p of this.projs) {
      p.life -= dt;
      // proyectiles letales siguen a su víctima
      if (p.lethal && p.tgt && p.g === 0) {
        const v = this.ents.get(p.tgt);
        if (v && v.koState === 0) {
          const dx = v.x - p.x, dy = v.y - v.h - 8 * v.scale - p.y, dd = Math.hypot(dx, dy) || 1;
          const sp = Math.hypot(p.vx, p.vy) || 200;
          p.vx += ((dx / dd) * sp - p.vx) * Math.min(1, dt * 9);
          p.vy += ((dy / dd) * sp - p.vy) * Math.min(1, dt * 9);
        }
      }
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += dt * 14;
      if ((p.kind === "fire" || p.kind === "bossfire" || p.kind === "bomb" || p.kind === "grenade" || p.kind === "ice") && this.rand() < 0.7)
        this.particles.push({ x: p.x, y: p.y, vx: (this.rand() - 0.5) * 20, vy: (this.rand() - 0.5) * 20, life: 0.3, max: 0.3, size: 2, color: p.kind === "ice" ? "#bfeaff" : p.kind === "bomb" || p.kind === "grenade" ? "#9a9a9a" : "#ffb347", grav: 0 });
      let done = false;
      if (p.owner !== "D" && dinoAlive && p.x > d.x - 72 && p.x < d.x + 40 && p.y > d.y - 170 && p.y < d.y) {
        if (p.kind === "bomb" || p.kind === "grenade") this.explode(p.x, p.y, 16, null);
        else this.burst(p.x, p.y, 6, "#fff176", 50);
        d.flash = 0.12; d.flinch = 0.2;
        if (p.owner === this.winnerId && this.pendingBombHp !== null && this.bossStage === "duel") {
          const w = this.ents.get(p.owner), hp = this.pendingBombHp;
          this.pendingBombHp = null;
          if (w) this.strikeDino(hp, w, true);
        } else this.dinoHit(p.power ?? 0.01);
        this.impact(1.5, 0.03);
        done = true;
      }
      if (!done) {
        for (const e of this.ents.values()) {
          if (!e.arena || e.koState !== 0 || e.id === p.owner) continue;
          if (p.owner !== "D" && this.phase === "boss") continue;
          const cy = e.y - e.h - 8 * e.scale;
          if (Math.abs(p.x - e.x) < 5 * e.scale + 1 && Math.abs(p.y - cy) < 8 * e.scale) {
            const lethalHit = p.lethal && p.tgt === e.id;
            if (p.kind === "bomb" || p.kind === "grenade" || p.kind === "bossfire") this.explode(p.x, p.y, p.kind === "bossfire" ? 16 : 18, p.lethal ? p.tgt : null);
            else if (lethalHit) this.startKo(e, this.koStyleFor(p.kind));
            else this.weaponHit(e, p);
            done = true;
            break;
          }
        }
      }
      if (!done && p.y >= GROUND - 1 && p.vy > 0) {
        if (p.kind === "bomb" || p.kind === "grenade" || p.kind === "bossfire") this.explode(p.x, GROUND - 2, p.kind === "bossfire" ? 16 : 18, p.lethal ? p.tgt : null);
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
    const top3 = this.ranking.slice(0, 3).map((r) => this.ents.get(r.id)).filter((x): x is Ent => !!x);
    if (!top3.length && ents[0]) top3.push(ents[0]);
    const win = top3[0];
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
      e.immune = top3.includes(e);
      e.doomed = false;
      e.x = 20 + ((i * 53) % 330);
      e.target = "D";
      e.speed = 38 + this.rand() * 22;
    });
    const losers = ents.filter((e) => !e.immune).sort(() => this.rand() - 0.5);
    const t0 = 4.4, span = Math.min(8, 3 + losers.length * 0.35);
    losers.forEach((e, i) => {
      const tk = t0 + ((i + this.rand() * 0.8) / Math.max(1, losers.length)) * span;
      e.koAt = tk;
      this.after(tk - 0.9, () => { if (e.koState === 0 && this.dino.state === "fight") { e.doomed = true; this.dinoAttackOn(e); } });
      this.after(tk + 1.6, () => { if (e.koState === 0) this.startKo(e, 0); });
    });
    this.after(3.0, () => { this.dino.state = "fight"; this.bossStage = "brawl"; this.dinoLoop(); });
    const tThree = t0 + (losers.length ? span : 0) + 2.6;
    this.after(tThree, () => this.bossThree(top3));
  }

  /** quedan los 3 mejores; el dino elimina a los dos últimos hasta que solo quede uno */
  private bossThree(top3: Ent[]) {
    this.bossStage = "three";
    const rest = top3.slice(1).reverse(); // primero el 3.º, luego el 2.º
    if (rest.length) this.banner(`¡QUEDAN ${top3.length}!`, "SOLO UNO PODRÁ DERROTAR AL DINO", 2.4);
    rest.forEach((v, i) => {
      const at = 2.6 + i * 3.0;
      this.after(at - 0.9, () => { if (v.koState === 0) { v.immune = false; v.doomed = true; this.dinoAttackOn(v); } });
      this.after(at + 1.8, () => { if (v.koState === 0) { v.immune = false; this.startKo(v, 0); } });
    });
    const lastKo = rest.length ? 2.6 + (rest.length - 1) * 3.0 + 1.9 : 0.5;
    if (rest.length) this.after(lastKo + 0.3, () => this.banner("¡SOLO UNO EN PIE!", "", 2));
    this.after(lastKo + 2.6, () => this.bossDuel());
  }

  private dinoLoop() {
    if (this.bossStage !== "brawl" && this.bossStage !== "three") return;
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
        if (tgt) this.spit(tgt, !!victim);
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
    w.script = true; w.target = null; w.stun = 0; w.vx = 0; w.dashTo = null; w.immune = true;
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
        this.after(c0, () => { this.pendingBombHp = hp; this.throwAt(w, this.dino.x - 40, GROUND - 90, "D", "grenade"); });
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

  /** acciones desde el celular durante la batalla con el dino */
  playerAction(id: string, a: string) {
    if (this.phase !== "boss") return;
    const e = this.ents.get(id);
    const d = this.dino;
    if (!e || !e.arena || e.koState !== 0 || e.script || e.stun > 0) return;
    if (d.state !== "fight" && d.state !== "enter") return;
    const idx = ["jump", "bomb", "code", "shoot"].indexOf(a);
    if (idx < 0) return;
    const CD = [0.5, 1.7, 3.0, 0.4];
    if (this.time < e.cd[idx]) return;
    e.cd[idx] = this.time + CD[idx];
    e.flip = false;
    this.mark(e.x, e.y - e.h, 0.8);
    if (a === "jump") {
      if (e.vh === 0 || e.surf !== -2) { e.vh = JUMP; e.surf = -2; sfx.jump(); this.burst(e.x, e.y - e.h, 3, "#cfc9b8", 22); }
    } else if (a === "bomb") {
      this.throwAt(e, d.x - 50, GROUND - 40 - this.rand() * 60, "D", "grenade");
      const p = this.projs[this.projs.length - 1];
      if (p && p.owner === e.id) p.power = 0.03;
      this.popup("¡BOMBA!", e.x, e.y - e.h - 26 * e.scale, "#ffd84a", 10, 0.8);
    } else if (a === "shoot") {
      e.atkT = 0.18;
      this.projs.push({ x: e.x + 8 * e.scale, y: e.y - e.h - 9 * e.scale, vx: 330, vy: (this.rand() - 0.5) * 12, g: 0, kind: "bullet", owner: e.id, tgt: "D", life: 1.4, rot: 0, power: 0.008 });
      this.burst(e.x + 10 * e.scale, e.y - e.h - 9 * e.scale, 3, "#ffe55a", 30);
      sfx.hitSmall();
    } else {
      e.codeT = 0.9; e.vx = 0;
      sfx.tick();
      this.popup("</> PROGRAMANDO", e.x, e.y - e.h - 26 * e.scale, "#39ff88", 9, 0.9);
      for (let i = 0; i < 3; i++) {
        this.after(0.9 + i * 0.16, () => {
          if (e.koState !== 0 || this.phase !== "boss" || this.projs.length > 60) return;
          const sx = e.x + 8 * e.scale, sy = e.y - e.h - 12 * e.scale;
          const dx = d.x - 66 - sx, dy = GROUND - 60 - this.rand() * 50 - sy, dd = Math.hypot(dx, dy) || 1;
          this.projs.push({ x: sx, y: sy, vx: (dx / dd) * 170, vy: (dy / dd) * 170, g: 0, kind: "code", owner: e.id, tgt: "D", life: 2.4, rot: 0, txt: CODE_SNIPPETS[Math.floor(this.rand() * CODE_SNIPPETS.length)], power: 0.013 });
          sfx.throw();
        });
      }
    }
  }

  private bossFinish() {
    this.bossStage = "end";
    const w = this.winnerId ? this.ents.get(this.winnerId) : undefined;
    if (w) { w.script = false; w.dashTo = null; w.target = null; w.immune = true; }
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

  /* ───────────── viajes entre niveles ───────────── */
  private startTravel(k: number) {
    this.travelKind = k;
    this.travelDur = TRAVEL_DUR[k % 10];
    this.quakeNext = 1.0;
    const list = [...this.ents.values()].sort((a, b) => a.x - b.x || (a.id < b.id ? -1 : 1));
    const n = list.length, sc = n <= 40 ? 2 : 1;
    const perRow = Math.max(1, Math.min(n, sc === 2 ? 9 : 18));
    list.forEach((e, i) => {
      const row = Math.floor(i / perRow), col = i % perRow, rc = Math.min(perRow, n - row * perRow);
      e.scale = sc; e.bsc = sc; e.koState = 0; e.alpha = 1; e.script = false; e.arena = false; e.tint = null; e.hop = 0;
      e.tx = 400 + (col - (rc - 1) / 2) * 13 * sc;
      e.ty = GROUND - 4 - row * 9 * sc;
      e.bx = e.tx; e.by = e.ty;
      e.tStart = 1.9 + (i / Math.max(1, n - 1)) * 1.4;
      e.ang = this.rand() * 6.28; e.tvx = 0; e.tvy = 0;
    });
    this.travelNext = k < 9 ? `RUMBO AL NIVEL ${k + 2}: ${levelFor(k + 1).name}` : "EL DINO ESTÁ CERCA...";
    this.banner(TRAVEL_TITLES[k % 10], this.travelNext, 2.6);
    switch (k) {
      case 0: this.after(1.2, () => sfx.hum()); this.after(5.4, () => sfx.whoosh()); break;
      case 1: [2.0, 3.3, 4.6].forEach((t) => this.after(t, () => { sfx.lightning(); this.impact(3); })); break;
      case 2: this.after(0.6, () => sfx.hum()); this.after(6.0, () => { sfx.explosion(); this.impact(5); }); break;
      case 3: this.after(1.0, () => sfx.engine()); this.after(2.8, () => sfx.engine()); break;
      case 4: this.after(1.4, () => sfx.whoosh()); this.after(5.6, () => sfx.whoosh()); break;
      case 5:
        for (let i = 0; i < 7; i++) this.after(0.5 + i * 0.25, () => this.impact(2.5));
        this.after(2.0, () => { sfx.explosion(); this.impact(9); this.travelFlash = 1; });
        break;
      case 6: this.after(1.0, () => sfx.whoosh()); break;
      case 7: this.after(1.0, () => sfx.unlock()); break;
      case 8:
        this.after(5.8, () => { this.popup("3", 400, 170, "#ffffff", 40, 0.6); sfx.tick(); });
        this.after(6.4, () => { this.popup("2", 400, 170, "#ffffff", 40, 0.6); sfx.tick(); });
        this.after(7.0, () => { this.popup("1", 400, 170, "#ffffff", 40, 0.6); sfx.tick(); });
        this.after(7.6, () => { sfx.rocket(); this.impact(8); });
        break;
      default: break;
    }
    this.after(this.travelDur, () => this.onTravelDone?.());
  }

  private shipX(T: number) {
    if (T < 2.2) { const u = T / 2.2; return -170 + 570 * (1 - Math.pow(1 - u, 2)); }
    if (T < 5.6) return 400 + Math.sin(T * 2) * 1.5;
    return 400 + 170 * Math.pow(T - 5.6, 1.6);
  }
  private tornadoX(T: number) {
    if (T < 0.8) return W + 90;
    if (T < 2.6) return W + 90 + (330 - (W + 90)) * ((T - 0.8) / 1.8);
    if (T < 4.6) return 330;
    return 330 + (-120 - 330) * ((T - 4.6) / 2.6);
  }

  /** guion de cada viaje; devuelve true si controla al personaje */
  private travelStep(e: Ent, dt: number): boolean {
    const T = this.phaseT, k = this.travelKind;
    const d = T - e.tStart;
    const hh = hashStr(e.id);
    switch (k) {
      case 0: { // nave espacial: rayo tractor
        if (d < 0) return false;
        const ux = 400 + Math.sin(T * 1.3) * 30;
        e.ey = -d * 120;
        e.x += (ux - e.x) * Math.min(1, dt * 1.4);
        e.pose = "cheer"; e.flip = false;
        if (e.y + e.ey < 96) e.alpha = Math.max(0, e.alpha - dt * 5);
        return true;
      }
      case 1: { // tormenta: tornado
        if (d < 0) return false;
        e.ang += dt * (7 + (hh % 5));
        const rr = Math.max(5, 30 - d * 9);
        e.x = this.tornadoX(T) + Math.cos(e.ang) * rr;
        e.ey = -(d * 42) + Math.sin(e.ang) * 3;
        e.pose = "dizzy"; e.flip = Math.cos(e.ang) > 0;
        if (e.ey < -170) e.alpha = Math.max(0, e.alpha - dt * 3);
        return true;
      }
      case 2: { // agujero negro
        if (d < 0) return false;
        const u = clamp(d / 2.4, 0, 1);
        const r0 = Math.hypot(e.bx - 400, e.by - 150);
        const a0 = Math.atan2(e.by - 150, e.bx - 400) + u * 7;
        const r = r0 * Math.pow(1 - u, 1.3);
        e.x = 400 + Math.cos(a0) * r; e.y = 150 + Math.sin(a0) * r * 0.7; e.ey = 0;
        e.scale = Math.max(0.3, e.bsc * (1 - u * 0.85)); e.alpha = 1 - u * u; e.pose = "dizzy";
        return true;
      }
      case 3: case 6: { // motos / trineos
        if (d < -0.7) return false;
        if (d < 0) { e.ey = -3; e.pose = "idle"; return true; }
        const moto = k === 3;
        e.x = e.bx + (moto ? 80 : 55) * d + (moto ? 70 : 45) * d * d;
        e.ey = moto ? -3 - (d < 0.6 ? Math.sin(d * 5.2) * 5 : 0) : -2 + Math.sin(T * 9 + e.ang) * 0.8;
        e.pose = "idle"; e.flip = false;
        if (e.x > W + 40) e.alpha = 0;
        if (this.rand() < dt * 6) this.particles.push({ x: e.x - 6, y: e.y - 1, vx: -30, vy: -10, life: 0.4, max: 0.4, size: 2, color: moto ? "#cfc9b8" : "#ffffff", grav: 30 });
        return true;
      }
      case 4: { // barco
        const sx = this.shipX(T), off = ((hh % 11) - 5) * 11, deck = GROUND - 14 + (hh % 3) * 2;
        const tj = 2.4 + (e.tStart - 1.9) * 1.1;
        const dj = T - tj;
        if (dj < 0) return false;
        const u = clamp(dj / 0.9, 0, 1);
        if (u < 1) {
          e.x = e.bx + (sx + off - e.bx) * u; e.y = e.by + (deck - e.by) * u; e.ey = -Math.sin(u * Math.PI) * 18; e.pose = "guard";
        } else {
          e.x = sx + off; e.y = deck; e.ey = Math.sin(T * 3 + e.ang) * 0.8; e.pose = "cheer";
        }
        e.flip = false;
        return true;
      }
      case 5: { // volcán: salen disparados
        const dl = T - (2.1 + (e.tStart - 1.9) * 1.4);
        if (dl < 0) return false;
        if (e.tvy === 0) { e.tvx = 40 + (hh % 100); e.tvy = -(240 + (hh % 90)); this.burst(e.x, e.y, 8, "#ff7a1a", 70); }
        e.tvy += 330 * dt; e.x += e.tvx * dt; e.y += e.tvy * dt; e.ey = 0; e.pose = "cheer"; e.flip = false;
        if (e.y > H + 40 || e.x > W + 40) e.alpha = 0;
        return true;
      }
      case 7: { // portal de teletransporte
        if (d < 0) return false;
        e.x += 140 * dt; e.y += (GROUND - 6 - e.y) * Math.min(1, dt * 3); e.ey = 0; e.pose = "walk"; e.flip = false;
        if (e.x >= 712) {
          if (e.alpha > 0) { e.alpha = 0; this.burst(712, GROUND - 30, 10, hh % 2 ? "#00f0ff" : "#ff2bd6", 70); }
        } else if (e.x > 690) e.alpha = 0.5 + 0.5 * Math.sin(T * 50);
        return true;
      }
      case 8: { // cohete
        if (d < 0) return false;
        const dx = 400 - e.x;
        if (e.alpha > 0 && Math.abs(dx) > 4) {
          e.x += Math.sign(dx) * Math.min(Math.abs(dx), 95 * dt);
          e.y += (GROUND - 3 - e.y) * Math.min(1, dt * 3); e.pose = "walk"; e.flip = dx < 0;
        } else e.alpha = 0;
        e.ey = 0;
        return true;
      }
      default: { // terremoto
        if (T < 1.2) return false;
        const inten = clamp(T / 5, 0.3, 1);
        e.x = e.bx + Math.sin(T * 38 + e.ang) * 1.2 * inten;
        e.y = e.by; e.ey = -Math.abs(Math.sin(T * 8 + e.ang)) * 2.5 * inten;
        e.pose = hh % 2 ? "guard" : "dizzy"; e.flip = false;
        return true;
      }
    }
  }

  private updateTravelProps(dt: number) {
    const T = this.phaseT, k = this.travelKind;
    if (k === 0 && T > 1.5 && T < 5.4 && this.rand() < dt * 30)
      this.particles.push({ x: 400 + (this.rand() - 0.5) * 70, y: GROUND - this.rand() * 230, vx: 0, vy: -40, life: 0.6, max: 0.6, size: 2, color: "#fff9a0", grav: 0 });
    if (k === 1 && this.rand() < dt * 25) {
      const tx = this.tornadoX(T);
      this.particles.push({ x: tx + (this.rand() - 0.5) * 40, y: GROUND - this.rand() * 40, vx: -60, vy: -50, life: 0.6, max: 0.6, size: 2, color: "#8a7a60", grav: 0 });
    }
    if (k === 5 && T > 2.0 && T < 6.2) {
      for (let i = 0; i < 2; i++)
        this.particles.push({ x: 600 + (this.rand() - 0.5) * 30, y: GROUND - 190, vx: (this.rand() - 0.5) * 120, vy: -150 - this.rand() * 110, life: 1.4, max: 1.4, size: 2, color: ["#ff5a2a", "#ffb347", "#ffd84a"][Math.floor(this.rand() * 3)], grav: 260 });
    }
    if (k === 7 && T > 1 && this.rand() < dt * 20)
      this.particles.push({ x: 712 + (this.rand() - 0.5) * 20, y: GROUND - 36 + (this.rand() - 0.5) * 60, vx: 40, vy: -10, life: 0.5, max: 0.5, size: 2, color: this.rand() < 0.5 ? "#00f0ff" : "#ff2bd6", grav: 0 });
    if (k === 8 && T > 7.4 && T < 9.3) {
      const ry = T > 7.6 ? (T - 7.6) * (T - 7.6) * 120 : 0;
      for (let i = 0; i < 3; i++)
        this.particles.push({ x: 400 + (this.rand() - 0.5) * 16, y: GROUND - ry + 4, vx: (this.rand() - 0.5) * 60, vy: 90 + this.rand() * 80, life: 0.6, max: 0.6, size: 3, color: this.rand() < 0.5 ? "#ffb347" : "#fff176", grav: 0 });
    }
    if (k === 9) {
      if (this.rand() < dt * 30) this.particles.push({ x: this.rand() * W, y: -4, vx: 0, vy: 50, life: 3, max: 3, size: this.rand() < 0.2 ? 4 : 2, color: "#4a3a30", grav: 200 });
      if (T > this.quakeNext) {
        this.quakeNext += Math.max(0.45, 0.95 - T * 0.07);
        this.impact(2.5 + T * 0.9); sfx.stomp();
      }
    }
    this.travelFlash = Math.max(0, this.travelFlash - dt * 1.6);
  }

  private drawTravelBack(c: CanvasRenderingContext2D) {
    const T = this.phaseT, k = this.travelKind;
    const R = (x: number, y: number, w: number, h: number, col: string) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    if (k === 0) {
      const u = clamp(T / 1.4, 0, 1);
      let ux = 400 + Math.sin(T * 1.3) * 30, uy = -40 + 110 * (1 - Math.pow(1 - u, 2));
      if (T > 5.4) { ux += (T - 5.4) * 260; uy -= (T - 5.4) * 90; }
      if (T > 1.5 && T < 5.4) {
        c.fillStyle = `rgba(255,255,160,${0.2 + 0.07 * Math.sin(T * 12)})`;
        c.beginPath(); c.moveTo(ux - 12, uy + 14); c.lineTo(ux + 12, uy + 14); c.lineTo(ux + 56, GROUND + 6); c.lineTo(ux - 56, GROUND + 6); c.closePath(); c.fill();
      }
      R(ux - 9, uy - 11, 18, 9, "#9be7ff"); R(ux - 6, uy - 14, 12, 4, "#9be7ff");
      R(ux - 28, uy - 3, 56, 9, "#b8b8c8"); R(ux - 20, uy + 6, 40, 5, "#8a8aa0");
      for (let i = 0; i < 6; i++) R(ux - 24 + i * 9, uy + 1, 4, 3, Math.floor(T * 6 + i) % 2 ? "#ffd84a" : "#e8453c");
    } else if (k === 1) {
      c.fillStyle = `rgba(15,15,35,${Math.min(0.58, T * 0.3)})`; c.fillRect(0, 0, W, H);
      for (let i = 0; i < 9; i++) R(i * 100 - 30 + Math.sin(T * 0.6 + i) * 8, 6 + (i % 3) * 14, 130, 30 + (i % 2) * 8, "#262638");
      const tx = this.tornadoX(T);
      for (let y = GROUND; y > 30; y -= 3) {
        const w = 8 + (GROUND - y) * 0.32;
        R(tx - w / 2 + Math.sin((GROUND - y) * 0.09 + T * 9) * 6, y, w, 3, (Math.floor(y / 3) + Math.floor(T * 10)) % 2 ? "#7a7a92" : "#5a5a72");
      }
    } else if (k === 2) {
      const grow = clamp((T - 0.6) * 30, 0, 36), shrink = T > 6 ? Math.max(0, 1 - (T - 6) * 3) : 1;
      const r = grow * shrink;
      if (r > 1) {
        c.fillStyle = "rgba(122,60,255,0.25)"; c.beginPath(); c.arc(400, 150, r + 16, 0, 6.3); c.fill();
        c.fillStyle = "#5a2aa0"; c.beginPath(); c.arc(400, 150, r + 7, 0, 6.3); c.fill();
        c.fillStyle = "#000"; c.beginPath(); c.arc(400, 150, r, 0, 6.3); c.fill();
        for (let i = 0; i < 18; i++) { const a = T * 3 + i * 0.35; R(400 + Math.cos(a) * (r + 12), 150 + Math.sin(a) * (r + 12) * 0.5, 3, 2, "#c8a0ff"); }
      }
    } else if (k === 4) {
      R(0, GROUND - 2, W, 16, "#2f6fe4");
      for (let x = 0; x < W; x += 16) R(x + ((T * 20) % 16), GROUND - 1 + (Math.floor(x / 16) % 2) * 2, 8, 2, "#8fd3ff");
      const sx = this.shipX(T);
      R(sx - 80, GROUND - 10, 160, 12, "#7a4a1f"); R(sx - 90, GROUND - 17, 18, 9, "#7a4a1f"); R(sx + 70, GROUND - 19, 22, 11, "#7a4a1f");
      R(sx - 80, GROUND - 12, 160, 3, "#b8803f");
      R(sx - 2, GROUND - 104, 4, 92, "#5a3a1f"); R(sx - 34, GROUND - 100, 30, 52, "#f0f0f0"); R(sx + 4, GROUND - 92, 24, 40, "#e8e8e8"); R(sx + 2, GROUND - 106, 15, 8, "#e8453c");
    } else if (k === 5) {
      for (let y = GROUND; y > GROUND - 190; y -= 3) { const hw = 150 - (GROUND - y) * 0.55; R(600 - hw, y, hw * 2, 3, "#3a1a14"); }
      R(560, GROUND - 190, 80, 6, T > 2.0 ? "#ff5a2a" : "#7a2a14");
      if (T > 2.0) for (let i = 0; i < 5; i++) R(588 + i * 7 + Math.sin(T * 6 + i) * 3, GROUND - 188 + i * 26, 3, 40, "#ff7a1a");
    } else if (k === 7) {
      const r = clamp((T - 1) * 30, 0, 38);
      if (r > 1) {
        c.fillStyle = "#120022"; c.beginPath(); c.ellipse(712, GROUND - 36, r * 0.55, r, 0, 0, 6.3); c.fill();
        c.lineWidth = 3; c.strokeStyle = Math.floor(T * 8) % 2 ? "#00f0ff" : "#ff2bd6";
        c.beginPath(); c.ellipse(712, GROUND - 36, r * 0.55 + 2, r + 2, 0, 0, 6.3); c.stroke();
      }
    } else if (k === 8) {
      const ry = T > 7.6 ? -((T - 7.6) * (T - 7.6) * 120) : 0;
      const x = 400 + (T > 7.2 ? Math.sin(T * 60) * 1.2 : 0);
      R(x - 14, GROUND - 100 + ry, 28, 92, "#f0f0f5"); R(x - 10, GROUND - 112 + ry, 20, 12, "#f0f0f5"); R(x - 6, GROUND - 120 + ry, 12, 8, "#f0f0f5"); R(x - 2, GROUND - 126 + ry, 4, 6, "#e8453c");
      R(x - 5, GROUND - 80 + ry, 10, 10, "#2f6fe4"); R(x - 14, GROUND - 50 + ry, 28, 6, "#e8453c");
      R(x - 24, GROUND - 30 + ry, 10, 28, "#e8453c"); R(x + 14, GROUND - 30 + ry, 10, 28, "#e8453c");
      if (ry === 0) R(x - 4, GROUND - 14, 8, 12, "#555");
      if (T > 7.2) { R(x - 8, GROUND - 8 + ry, 16, 18 + this.rand() * 12, "#ffb347"); R(x - 4, GROUND - 8 + ry, 8, 12 + this.rand() * 8, "#fff176"); }
    } else if (k === 9) {
      c.fillStyle = `rgba(120,0,0,${Math.min(0.22, T * 0.05)})`; c.fillRect(0, 0, W, H);
      const len = T * 110;
      for (let ci = 0; ci < 3; ci++) for (let i = 0; i < Math.floor(len / 8); i++) R(W - i * 8, GROUND + 3 + Math.sin(i * 1.7 + ci * 2) * 6 + ci * 14, 9, 2, "#150808");
    }
  }

  private drawTravelFront(c: CanvasRenderingContext2D) {
    const T = this.phaseT, k = this.travelKind;
    if (k === 1) {
      c.fillStyle = "#a8c8ff";
      for (let i = 0; i < 70; i++) c.fillRect(Math.round((i * 37 + T * 90) % W), Math.round((i * 53 + T * 420) % H), 1, 7);
      if ((T * 3.1) % 1 < 0.07 && Math.floor(T * 3.1) % 3 === 0) { c.fillStyle = "rgba(255,255,255,0.4)"; c.fillRect(0, 0, W, H); }
    }
    if (k === 5 && this.travelFlash > 0) { c.fillStyle = `rgba(255,255,255,${this.travelFlash * 0.6})`; c.fillRect(0, 0, W, H); }
    if (k === 2 && T > 5.9 && T < 6.5) { c.fillStyle = `rgba(255,255,255,${Math.sin(((T - 5.9) / 0.6) * Math.PI) * 0.5})`; c.fillRect(0, 0, W, H); }
  }

  private drawRide(c: CanvasRenderingContext2D, e: Ent) {
    const k = this.travelKind;
    if (k !== 3 && k !== 6) return;
    if (this.phaseT < e.tStart - 0.7 || e.alpha <= 0) return;
    const f = e.bsc >= 2 ? 2 : 1, x = e.x, y = e.y;
    const R = (px: number, py: number, w: number, h: number, col: string) => { c.fillStyle = col; c.fillRect(Math.round(x + px * f), Math.round(y + py * f), Math.max(1, Math.round(w * f)), Math.max(1, Math.round(h * f))); };
    if (k === 3) {
      const col = ["#e8453c", "#2f6fe4", "#2bb673"][hashStr(e.id) % 3];
      R(-9, -5, 5, 5, "#222"); R(4, -5, 5, 5, "#222"); R(-8, -8, 16, 3, col); R(-2, -10, 7, 3, "#ffd84a"); R(5, -12, 2, 5, "#ccc"); R(-9, -4, 2, 2, "#888"); R(5, -4, 2, 2, "#888");
    } else {
      R(-9, -3, 18, 2, "#8a5a2b"); R(-10, -1, 20, 1, "#cfd8e0"); R(8, -5, 2, 3, "#cfd8e0"); R(-6, -4, 12, 1, "#b8803f");
    }
  }

  /* ───────────── diseño / posiciones ───────────── */
  private relayout() {
    this.dirty = false;
    const list = [...this.ents.values()];
    if (this.phase === "travel") return;
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
    e.dodgeCd -= dt;
    if (e.codeT > 0) e.codeT -= dt;

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
    } else if (e.stun <= 0 && e.codeT <= 0 && !e.doomed) {
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
        if (e.target === "D") e.flip = false;
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
        if (!jump && this.rand() < dt * 0.55) { jump = true; small = true; }
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
      // esquivar proyectiles que vienen hacia mí
      if (e.dodgeCd <= 0) {
        for (const pr of this.projs) {
          if (pr.owner === e.id || pr.lethal) continue;
          if (this.phase === "boss" && pr.owner !== "D") continue;
          const rel = e.x - pr.x;
          if (Math.abs(rel) < 55 && Math.sign(pr.vx) === Math.sign(rel) && Math.abs(pr.y - (e.y - e.h - 8 * e.scale)) < 22 && this.rand() < dt * 8) {
            e.dodgeCd = 0.9; e.guardT = 0.4;
            if (grounded) { e.vh = JUMP * 0.85; e.surf = -2; }
            e.vx = Math.sign(rel) * 70;
            break;
          }
        }
      }
      // embestida cuando el rival está cerca pero no al alcance
      if (tgt && grounded && Math.abs(tgt.x - e.x) < 80 && Math.abs(tgt.x - e.x) > 20 && e.atkCd <= 0 && this.rand() < dt * 0.7) e.vx = Math.sign(tgt.x - e.x) * 115;
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
      // lanzar armas a un rival (flechas, bombas, láser, hielo, rayos...)
      if (tgt && e.atkCd <= 0) {
        const dist = Math.abs(tgt.x - e.x);
        if (dist > 26 && dist < 240 && Math.abs(tgt.h - e.h) < 40 && this.rand() < dt * 1.6) {
          e.atkCd = 0.9 + this.rand() * 0.7;
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
          e.atkT = 0.24; e.flip = false;
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
    if (e.stun > 0 || mode === "cheer" || e.codeT > 0) e.vx *= 0.94;
    else if (move === 0 && !e.script) e.vx *= e.doomed ? 0.9 : 0.85;
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
    if (e.codeT > 0) e.pose = "guard";
    else if (e.atkT > 0) e.pose = "punch";
    else if (e.stun > 0) e.pose = "dizzy";
    else if (e.doomed) e.pose = "guard";
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

      if (this.phase === "travel" && this.travelStep(e, dt)) continue;
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
          if (e.koState === 3 && (e.evx !== 0 || Math.abs(e.evy) > 60)) {
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

    if (this.phase === "travel") this.updateTravelProps(dt);
    this.fadeIn = Math.max(0, this.fadeIn - dt * 1.8);
    this.killCamT = Math.max(0, this.killCamT - dt);
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
    } else if (this.phase === "fight") {
      if (this.killCamT > 0) { tz = 1.9; fx = this.killCam.x; fy = this.killCam.y - 12; }
      else {
        let sx = 0, sy = 0, sw = 0;
        for (const h of this.hot) {
          const age = this.time - h.t;
          if (age < 1.4) { const ww = h.w * (1 - age / 1.4); sx += h.x * ww; sy += h.y * ww; sw += ww; }
        }
        const wide = Math.sin(this.time * 0.55) > 0.72;
        if (sw > 0.25 && !wide) { tz = 1.45 + 0.2 * Math.sin(this.time * 0.9); fx = sx / sw; fy = sy / sw - 10; }
        else { tz = wide ? 1.0 : 1.12; fy = GROUND - 60; }
      }
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

    if (this.phase === "travel") this.drawTravelBack(c);
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
      if (this.phase === "travel") this.drawRide(c, e);
      drawHuman(c, e.look, x, y, { pose: e.pose, frame: e.frame, flip: e.flip, scale: e.scale, tint: e.tint, alpha: e.alpha, rot });
      if (e.codeT > 0) this.drawLaptop(c, e, x, y);
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
    if (this.phase === "travel") this.drawTravelFront(c);
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

  private drawLaptop(c: CanvasRenderingContext2D, e: Ent, x: number, y: number) {
    const f = e.scale, ox = 7 * f;
    const R = (px: number, py: number, w: number, h: number, col: string) => { c.fillStyle = col; c.fillRect(Math.round(x + ox + px * f), Math.round(y + py * f), Math.max(1, Math.round(w * f)), Math.max(1, Math.round(h * f))); };
    R(-4, -6, 9, 2, "#b8b8c8");
    R(-3, -13, 7, 7, "#1a1a2a");
    const k = Math.floor(this.time * 14);
    R(-2, -12, 3 + (k % 3), 1, "#2bb673"); R(-2, -10, 2 + ((k + 1) % 3), 1, "#2bb673"); R(-2, -8, 4, 1, (k % 2) ? "#9ad7ff" : "#2bb673");
  }

  private drawProj(c: CanvasRenderingContext2D, p: Proj) {
    const x = Math.round(p.x), y = Math.round(p.y);
    switch (p.kind) {
      case "rock": c.fillStyle = "#6a6a6a"; c.fillRect(x - 2, y - 2, 5, 5); c.fillStyle = "#9a9a9a"; c.fillRect(x - 2, y - 2, 2, 2); break;
      case "ice": c.fillStyle = "#9fe8ff"; c.fillRect(x - 1, y - 3, 3, 7); c.fillRect(x - 3, y - 1, 7, 3); c.fillStyle = "#ffffff"; c.fillRect(x - 1, y - 1, 2, 2); break;
      case "bomb": c.fillStyle = "#111"; c.fillRect(x - 3, y - 3, 6, 6); c.fillStyle = Math.floor(p.rot) % 2 ? "#ff5a2a" : "#ffd84a"; c.fillRect(x, y - 5, 2, 2); break;
      case "grenade": c.fillStyle = "#3a6a2a"; c.fillRect(x - 3, y - 3, 6, 7); c.fillStyle = "#5a9a3a"; c.fillRect(x - 3, y - 3, 2, 3); c.fillStyle = "#999"; c.fillRect(x - 1, y - 5, 3, 2); break;
      case "star": {
        c.fillStyle = "#e8e8f0";
        if (Math.floor(p.rot) % 2) { c.fillRect(x - 3, y - 1, 7, 2); c.fillRect(x - 1, y - 3, 2, 7); }
        else { c.fillRect(x - 2, y - 2, 2, 2); c.fillRect(x + 1, y - 2, 2, 2); c.fillRect(x - 2, y + 1, 2, 2); c.fillRect(x + 1, y + 1, 2, 2); }
        break;
      }
      case "fire": c.fillStyle = "#ff7a1a"; c.fillRect(x - 2, y - 2, 5, 5); c.fillStyle = "#ffd84a"; c.fillRect(x - 1, y - 1, 3, 3); break;
      case "arrow":
        c.save(); c.translate(x, y); c.rotate(Math.atan2(p.vy, p.vx));
        c.fillStyle = "#d8c08a"; c.fillRect(-5, -1, 10, 1); c.fillStyle = "#cfcfcf"; c.fillRect(4, -2, 3, 3); c.fillStyle = "#e8453c"; c.fillRect(-6, -2, 2, 3);
        c.restore();
        break;
      case "bullet": c.fillStyle = "#ffe55a"; c.fillRect(x - 2, y - 1, 5, 2); c.fillStyle = "rgba(255,229,90,0.4)"; c.fillRect(x - 8, y - 1, 6, 1); break;
      case "code":
        c.font = '6px "Press Start 2P", monospace'; c.textAlign = "center"; c.textBaseline = "middle";
        c.fillStyle = "rgba(0,0,0,0.55)"; c.fillText(p.txt ?? "{}", x + 0.6, y + 0.6);
        c.fillStyle = "#39ff88"; c.fillText(p.txt ?? "{}", x, y);
        break;
      default: c.fillStyle = "#ff5a2a"; c.fillRect(x - 4, y - 4, 9, 9); c.fillStyle = "#ffb347"; c.fillRect(x - 3, y - 3, 6, 6); c.fillStyle = "#fff176"; c.fillRect(x - 1, y - 1, 3, 3);
    }
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
    } else if (f.kind === "laser") {
      c.globalAlpha = 1 - k * 0.5;
      c.strokeStyle = "#ff3b3b"; c.lineWidth = 3; c.beginPath(); c.moveTo(f.x0!, f.y0!); c.lineTo(f.x1!, f.y1!); c.stroke();
      c.strokeStyle = "#ffffff"; c.lineWidth = 1; c.beginPath(); c.moveTo(f.x0!, f.y0!); c.lineTo(f.x1!, f.y1!); c.stroke();
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
      const hud = !zoomed || this.phase === "question" || this.phase === "fight";
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
      if (this.bossStage === "brawl" || this.bossStage === "three" || this.bossStage === "duel") T(`EN PIE: ${alive}`, 1572, 62, 16, "#ffb0a0", "right", false);
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

    if (this.phase === "travel") {
      if (this.bannerT > 0) this.drawBanner(c, T);
      if (this.phaseT > this.travelDur - 2.4 && this.phaseT < this.travelDur - 0.4) {
        c.fillStyle = "rgba(0,0,0,0.5)"; c.fillRect(0, 780, 1600, 70);
        T(this.travelNext, 800, 800, 24, "#ffffff", "center");
      }
    }
    let fa = this.fadeIn;
    if (this.phase === "travel") fa = Math.max(fa, clamp((this.phaseT - (this.travelDur - 0.6)) / 0.6, 0, 1));
    if (fa > 0) { c.fillStyle = `rgba(0,0,0,${fa})`; c.fillRect(0, 0, 1600, 900); }
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
