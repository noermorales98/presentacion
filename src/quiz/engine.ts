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
}

const OPT_COLORS = ["#e8453c", "#2f6fe4", "#f2b632", "#2bb673"];
const OPT_TEXT = ["#ffffff", "#ffffff", "#2b2200", "#ffffff"];
const FONT = '"Press Start 2P", monospace';
const FIGHT_MIN = 6.5;
const G = 520; // gravedad de la arena
const JUMP = 190;
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
  private dino: Dino = { x: W + 150, y: GROUND + 4, hp: 1, state: "hidden", flash: 0, bounce: 0, legT: 0, blink: 0, roarT: 0 };
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
      x: 230 + this.rand() * 560, y: 300 + this.rand() * 120, tx: 0, ty: 0,
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
    [60 + r() * 50, 300 + r() * 80, 560 + r() * 90].forEach((x) => s.push({ x, w: 90 + r() * 40, h: 32, kind: "plat" }));
    s.push({ x: 170 + r() * 60, w: 90, h: 64, kind: "plat" });
    s.push({ x: 440 + r() * 80, w: 90, h: 64, kind: "plat" });
    for (let i = 0; i < 4; i++) s.push({ x: 40 + i * 190 + r() * 80, w: 14, h: 10, kind: "crate" });
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

  /* ───────────── jefe: dino ───────────── */
  private startBoss() {
    const ents = [...this.ents.values()];
    const win = this.ranking[0] ? this.ents.get(this.ranking[0].id) : ents[0];
    this.winnerId = win?.id ?? null;
    this.dino = { x: W + 150, y: GROUND + 4, hp: 1, state: "enter", flash: 0, bounce: 0, legT: 0, blink: 0, roarT: 1.2 };
    this.bossStage = "enter";
    this.banner("¡DINO JEFE!", "TODOS CONTRA EL DINOSAURIO", 2.8);
    sfx.roar();
    this.shake = 6;
    ents.forEach((e, i) => {
      e.ok = e.id === this.winnerId;
      e.koState = 0;
      this.enterArena(e);
      e.x = 20 + ((i * 53) % 330);
      e.target = "D";
      e.speed = 38 + this.rand() * 22;
    });
    const losers = ents.filter((e) => e.id !== this.winnerId).sort(() => this.rand() - 0.5);
    const t0 = 3.4, span = Math.min(7.5, 2.5 + losers.length * 0.35);
    losers.forEach((e, i) => {
      const tk = t0 + ((i + this.rand() * 0.8) / Math.max(1, losers.length)) * span;
      e.koAt = tk;
      this.after(tk, () => {
        if (e.koState !== 0) return;
        const style = this.rand() < 0.5 ? 5 : 0;
        this.dino.bounce = 1;
        this.dino.roarT = 0.35;
        this.fx.push({ kind: "ring", x: e.x, y: e.y, t: 0, dur: 0.35, r: 30 });
        sfx.stomp();
        this.startKo(e, style);
      });
    });
    this.after(2.6, () => { this.dino.state = "fight"; this.bossStage = "brawl"; });
    const tDuel = t0 + (losers.length ? span : 0) + 1.8;
    this.after(tDuel, () => this.bossDuel());
  }

  private bossDuel() {
    const w = this.winnerId ? this.ents.get(this.winnerId) : undefined;
    this.bossStage = "duel";
    this.banner("¡UNO CONTRA EL DINO!", w ? w.name.toUpperCase() : "", 2.2);
    if (!w) { this.after(1, () => this.bossFinish()); return; }
    w.script = true;
    w.target = null;
    const hpAfter = [0.78, 0.55, 0.34, 0.14, 0];
    hpAfter.forEach((hp, k) => {
      const at = 0.9 + k * 1.15;
      // el dino ataca: el ganador esquiva saltando
      this.after(at - 0.5, () => {
        if (this.dino.state === "dying" || this.dino.state === "dead") return;
        this.dino.bounce = 1; sfx.roar();
        this.after(0.28, () => { w.vh = 175; w.surf = -2; w.vx = -30; sfx.jump(); });
        this.after(0.5, () => {
          this.fx.push({ kind: "ring", x: w.x, y: w.y, t: 0, dur: 0.35, r: 34 });
          sfx.stomp(); this.shake = Math.max(this.shake, 5);
        });
      });
      // el ganador golpea
      this.after(at, () => {
        w.dashTo = this.dino.x - 62;
        this.after(0.28, () => {
          w.atkT = 0.3; w.vh = 120; w.surf = -2; sfx.jump();
          this.after(0.18, () => {
            this.dino.hp = hp;
            this.dino.flash = 0.3;
            this.dino.x += 5;
            this.burst(this.dino.x - 50, GROUND - 40 - this.rand() * 40, 14, "#fff176", 80);
            this.popup(hp === 0 ? "¡K.O.!" : ["POW!", "BAM!", "ZAS!"][k % 3], this.dino.x - 55, GROUND - 100, "#ffffff", 20);
            sfx.hit(); this.shake = Math.max(this.shake, 4);
            if (hp === 0) this.dinoDie();
          });
        });
      });
    });
  }

  private dinoDie() {
    this.dino.state = "dying";
    this.bossStage = "dying";
    this.dino.blink = 0;
    this.banner("¡DINO DERROTADO!", "", 2.5);
    for (let i = 0; i < 6; i++) this.after(i * 0.3, () => { sfx.explosion(); this.shake = 5; this.burst(this.dino.x + (this.rand() - 0.5) * 100, GROUND - 40 - this.rand() * 90, 14, ["#ff9a2a", "#ffd84a", "#ffffff"][i % 3], 90); });
    this.after(1.9, () => {
      this.dino.state = "dead";
      this.burst(this.dino.x, GROUND - 70, 120, "#ffd84a", 140);
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

  /* ───────────── final ───────────── */
  private startFinal() {
    const win = this.ranking[0] ? this.ents.get(this.ranking[0].id) : [...this.ents.values()][0];
    this.winnerId = win?.id ?? null;
    this.reachT = 1.4 + 8.5;
    if (win) {
      this.after(this.reachT, () => {
        sfx.fanfare();
        this.after(0.9, () => sfx.unlock());
        this.shake = 3;
        this.prizeShown = true;
        for (let i = 0; i < 110; i++) {
          this.particles.push({
            x: 400 + (this.rand() - 0.5) * 60, y: 50, vx: (this.rand() - 0.5) * 170, vy: -this.rand() * 130 - 20,
            life: 4, max: 4, size: 2, color: ["#ff5a2a", "#ffd84a", "#2bb673", "#2f6fe4", "#ef7fb0", "#fff"][i % 6], grav: 70,
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
    const f = clamp(p, 0, 1) * segs;
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
    if (this.phase === "boss") {
      const s = list.length <= 40 ? 2 : 1;
      list.forEach((e) => (e.scale = s));
      return;
    }
    if (this.phase === "final") {
      const fs = list.length <= 40 ? 2 : 1;
      list.forEach((e) => (e.scale = e.id === this.winnerId ? 3 : fs));
      const crowd = list.filter((e) => e.id !== this.winnerId).sort((a, b) => a.name.localeCompare(b.name));
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
    if (r < 0.55) {
      const live = [...this.ents.values()].filter((o) => o !== e && o.arena && o.koState === 0);
      if (live.length) { e.target = live[Math.floor(this.rand() * live.length)].id; return; }
    }
    if (r < 0.8) { e.target = null; e.platGoal = Math.floor(this.rand() * 5); }
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
    let move = 0;

    if (e.script) {
      if (e.dashTo !== null) {
        const d = e.dashTo - e.x;
        e.x += d * Math.min(1, dt * 7);
        if (Math.abs(d) < 1) e.dashTo = null;
      }
      e.flip = this.dino.x < e.x;
    } else if (mode === "cheer") {
      if (grounded && this.rand() < dt * 0.9) { e.vh = JUMP * 0.55; e.surf = -2; }
    } else if (e.stun <= 0) {
      e.aiT -= dt;
      if (e.aiT <= 0) this.pickGoal(e, mode === "boss");
      let gx = e.goalX;
      let tgt: Ent | null = null;
      if (e.target === "D") {
        gx = this.dino.x - 58 - (hashStr(e.id) % 24);
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
      const near = tgt ? 13 : 5;
      if (Math.abs(dx) > near) {
        move = Math.sign(dx);
        e.vx = move * e.speed * (grounded ? 1 : 0.8);
        e.flip = dx < 0;
      } else {
        e.vx *= 0.6;
        if (tgt) e.flip = tgt.x < e.x;
        if (e.target === "D") e.flip = true;
      }
      // saltos: caja adelante, plataforma, objetivo alto o capricho
      if (grounded) {
        let jump = false;
        for (const s of surfaces) {
          if (s.kind === "crate" && move !== 0) {
            const ahead = (s.x + s.w / 2 - e.x) * move;
            if (ahead > 0 && ahead < 14 && e.h < s.h - 1) jump = true;
          }
        }
        if (e.platGoal >= 0) {
          const plats = surfaces.filter((s) => s.kind === "plat");
          const P = plats[e.platGoal % plats.length];
          if (P && Math.abs(e.x - (P.x + P.w / 2)) < P.w / 2 - 6 && e.h < P.h - 3) jump = true;
        }
        if (tgt && tgt.h > e.h + 10 && Math.abs(tgt.x - e.x) < 40) jump = true;
        if (this.rand() < dt * 0.35) jump = true;
        if (jump) {
          e.vh = JUMP; e.surf = -2; e.vx *= 1.1;
          if (this.rand() < 0.05) sfx.jump();
        }
      }
      // esquivar
      if (e.guardT <= 0 && this.rand() < dt * 0.25) {
        e.guardT = 0.35;
        if (grounded) { e.vh = JUMP * 0.7; e.surf = -2; e.vx = -Math.sign(e.vx || 1) * 40; }
      }
      // ataque a otro jugador
      if (tgt && e.atkCd <= 0 && Math.abs(tgt.x - e.x) < 17 && Math.abs(tgt.h - e.h) < 20 && tgt.stun <= 0) {
        e.atkCd = 0.7 + this.rand() * 0.6;
        e.atkT = 0.24;
        e.flip = tgt.x < e.x;
        if (tgt.guardT > 0 || this.rand() < 0.25) {
          tgt.vh = JUMP * 0.6; tgt.surf = -2; tgt.vx = (tgt.x < e.x ? -1 : 1) * 45;
          this.burst(tgt.x, tgt.y - 10 - tgt.h, 3, "#ffffff", 20);
        } else {
          const dir = tgt.x < e.x ? -1 : 1;
          tgt.vx = dir * (60 + this.rand() * 40);
          tgt.vh = 70 + this.rand() * 60;
          tgt.surf = -2;
          tgt.stun = 0.35;
          this.burst((e.x + tgt.x) / 2, tgt.y - 12 - tgt.h, 4, ["#fff176", "#ffffff", "#ff8a2a"][Math.floor(this.rand() * 3)], 45);
          if (this.rand() < 0.1) this.popup(["POW", "BAM", "ZAS", "PAF"][Math.floor(this.rand() * 4)], tgt.x, tgt.y - 30 - tgt.h, "#ffffff", 12, 0.6);
          if (this.lastHitSfx <= 0) { sfx.hitSmall(); this.lastHitSfx = 0.07; }
        }
      }
      // ataque al dino
      if (e.target === "D" && e.atkCd <= 0 && this.dino.state === "fight" && Math.abs(this.dino.x - 50 - e.x) < 34) {
        e.atkCd = 0.6 + this.rand() * 0.5;
        e.atkT = 0.24;
        e.flip = true;
        this.dino.flash = 0.12;
        this.dino.hp = Math.max(0.3, this.dino.hp - 0.006);
        this.burst(this.dino.x - 55, GROUND - 20 - this.rand() * 80, 3, "#fff176", 40);
        if (this.lastHitSfx <= 0) { sfx.hitSmall(); this.lastHitSfx = 0.07; }
      }
    }

    // física horizontal
    if (!e.script) e.x += e.vx * dt;
    if (e.stun > 0 || mode === "cheer") e.vx *= 0.96;
    else if (move === 0) e.vx *= 0.85;
    e.x = clamp(e.x, 6, W - 6);

    // colisión lateral con cajas
    for (const s of surfaces) {
      if (s.kind !== "crate") continue;
      if (e.h < s.h - 1 && e.x > s.x - 3 && e.x < s.x + s.w + 3) {
        e.x = e.x < s.x + s.w / 2 ? s.x - 3 : s.x + s.w + 3;
        e.vx = 0;
      }
    }

    // ¿sigue apoyado en su plataforma?
    if (e.surf >= 0) {
      const cur = surfaces[e.surf];
      if (!cur || !(e.x > cur.x - 3 && e.x < cur.x + cur.w + 3)) e.surf = -2;
    }
    // física vertical + plataformas de un solo sentido
    if (e.surf === -2 || e.vh !== 0) {
      const prevH = e.h;
      e.vh -= G * dt;
      e.h += e.vh * dt;
      if (e.vh <= 0) {
        let landH = 0, landIdx = -1;
        surfaces.forEach((s, i) => {
          if (e.x > s.x - 3 && e.x < s.x + s.w + 3 && prevH >= s.h - 0.5 && e.h <= s.h && s.h > landH) { landH = s.h; landIdx = i; }
        });
        if (e.h <= landH) { e.h = landH; e.vh = 0; e.surf = landIdx; }
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
            e.tx = 230 + this.rand() * 560;
            e.ty = (e.scale === 2 ? 285 : 270) + this.rand() * (e.scale === 2 ? 135 : 150);
          }
        }
      } else if (this.phase === "final" && e.id === this.winnerId) {
        const run = Math.max(0, this.phaseT - 1.4);
        const p = clamp(run / 8.5, 0, 1);
        const pos = this.pathPos(p);
        e.x = pos.x; e.y = pos.y; e.flip = pos.dx < 0;
        e.pose = run <= 0 ? "idle" : p >= 1 ? "cheer" : "climb";
        if (run > 0 && p < 1 && e.frame % 12 === 0) sfx.step();
        continue;
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
      if (e.hop > 0 && e.ey >= 0 && results && e.koState === 0) {
        if (e.frame % 40 === Math.floor(e.phase * 3) % 40) e.evy = -45 * (e.scale === 2 ? 1.3 : 1);
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
    d.bounce = Math.max(0, d.bounce - dt * 2.5);
    d.roarT = Math.max(0, d.roarT - dt);
    d.legT += dt;
    if (d.state === "enter") {
      const tx = 610;
      if (d.x > tx) {
        d.x -= 62 * dt;
        if (Math.floor(d.legT * 2.4) !== Math.floor((d.legT - dt) * 2.4)) { sfx.stomp(); this.shake = Math.max(this.shake, 4); }
      }
    }
    if (d.state === "dying") {
      d.blink += dt;
      d.y += 8 * dt;
    }
  }

  private updateCam(dt: number) {
    let tz = 1, fx = W / 2, fy = H / 2;
    if (this.phase === "results" && this.zoomPts && this.phaseT > 0.15 && this.phaseT < 3.0) {
      tz = this.zoomPts.z; fx = this.zoomPts.x; fy = this.zoomPts.y;
    } else if (this.phase === "boss") {
      const w = this.winnerId ? this.ents.get(this.winnerId) : undefined;
      if (this.bossStage === "duel" && w) { tz = 1.7; fx = (w.x + this.dino.x) / 2; fy = GROUND - 55; }
      else if (this.bossStage === "dying") { tz = 2.1; fx = this.dino.x; fy = GROUND - 70; }
    } else if (this.phase === "final") {
      const w = this.winnerId ? this.ents.get(this.winnerId) : undefined;
      if (w && this.phaseT > 0.5) {
        const p = clamp((this.phaseT - 1.4) / 8.5, 0, 1);
        tz = this.phaseT < 1.4 ? 2.0 : p >= 1 ? 3.2 : 2.3 + p * 0.5;
        fx = w.x; fy = w.y - 14;
        if (p >= 1) { fx = 400; fy = 62; }
      }
    }
    const k = Math.min(1, dt * (this.phase === "final" ? 3 : 5));
    this.cam.z += (tz - this.cam.z) * k;
    fx = clamp(fx, W / (2 * this.cam.z), W - W / (2 * this.cam.z));
    fy = clamp(fy, H / (2 * this.cam.z), H - H / (2 * this.cam.z));
    this.cam.fx += (fx - this.cam.fx) * k;
    this.cam.fy += (fy - this.cam.fy) * k;
  }

  /* ───────────── dibujo ───────────── */
  draw(c: CanvasRenderingContext2D, dt: number) {
    this.update(Math.min(dt, 0.05));
    const sx = this.shake ? Math.round((this.rand() - 0.5) * this.shake * 2) : 0;
    const sy = this.shake ? Math.round((this.rand() - 0.5) * this.shake * 2) : 0;
    const { z, fx, fy } = this.cam;
    const art = () => c.setTransform(2 * z, 0, 0, 2 * z, Math.round(sx * 2 + 2 * (W / 2 - fx * z)), Math.round(sy * 2 + 2 * (H / 2 - fy * z)));
    const txt = () => c.setTransform(1, 0, 0, 1, sx * 2, sy * 2);
    c.imageSmoothingEnabled = false;
    art();
    const lv = this.level;
    drawBackground(c, lv, this.phase === "final" ? 9 : this.phase === "boss" ? 11 : this.q, this.time);

    if (this.phase === "final") this.drawMountain(c, lv);
    if (this.phase === "question" || this.phase === "fight" || this.phase === "results") { this.drawOptions(art, txt, c); art(); }
    if (this.phase === "fight" || this.phase === "boss" || (this.phase === "results" && this.phaseT < 3.4)) this.drawArena(c, lv);
    if (this.phase === "boss") this.drawDino(c);

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

  private drawDino(c: CanvasRenderingContext2D) {
    const d = this.dino;
    if (d.state === "hidden" || d.state === "dead") return;
    const P = DINO_P;
    const legs = Math.floor(d.legT * 3) % 2 === 0 ? DINO_LEGS_A : DINO_LEGS_B;
    const rows = [...DINO_ROWS, ...(d.state === "enter" || d.state === "fight" ? legs : DINO_LEGS_A)];
    const bob = Math.round(Math.sin(d.bounce * Math.PI) * 8);
    const left = Math.round(d.x - (DINO_W * P) / 2);
    const top = Math.round(d.y - rows.length * P - bob);
    let body = "#8d8d96";
    if (d.state === "dying") body = Math.floor(d.blink * 14) % 2 ? "#ffffff" : "#ff5a2a";
    else if (d.flash > 0) body = "#ffffff";
    const angry = d.roarT > 0;
    rows.forEach((row, ry) => {
      for (let cx = 0; cx < DINO_W; cx++) {
        const ch = row[cx];
        if (!ch || ch === ".") continue;
        c.fillStyle = ch === "e" ? (angry ? "#ff2b2b" : "#ffffff") : body;
        c.fillRect(left + (DINO_W - 1 - cx) * P, top + ry * P, P, P); // volteado: mira a la izquierda
      }
    });
    if (angry) {
      c.fillStyle = "#ff2b2b";
      c.fillRect(left + (DINO_W - 1 - 18) * P, top + 6 * P, 4 * P, P);
    }
  }

  private drawPrize(c: CanvasRenderingContext2D) {
    if (!this.prizeShown) return;
    const t = this.phaseT - this.reachT;
    const drop = Math.max(0, 1 - t / 0.9);
    const y = 34 - drop * 120 + (t > 0.9 ? Math.sin((t - 0.9) * 4) * 2 : 0);
    const x = 438;
    const s = 1.4;
    const R = (px: number, py: number, w: number, h: number, col: string) => { c.fillStyle = col; c.fillRect(x + px * s - 7 * s, Math.round(y + py * s), w * s, h * s); };
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
    for (let i = 0; i < 6; i++) {
      const a = this.time * 2 + i * 1.05;
      const rx = x + Math.cos(a) * 18, ry = y + 14 + Math.sin(a) * 16;
      if (Math.floor(this.time * 6 + i) % 2) c.fillRect(Math.round(rx), Math.round(ry), 3, 3);
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
    c.fillStyle = "#4a3a2a"; c.fillRect(399, 50, 2, 22);
    c.fillStyle = "#e8453c";
    c.fillRect(401, 50, 12 + (Math.floor(this.time * 4) % 2) * 2, 7);
    void lv;
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
      const top = this.ranking.slice(0, 5);
      T("RESULTADO FINAL", 28, 60, 18, lv.ink, "left", false);
      top.forEach((r, i) => {
        T(`${i + 1}. ${r.name.slice(0, 11).toUpperCase()}`, 28, 100 + i * 34, i === 0 ? 20 : 15, i === 0 ? "#b36b00" : lv.ink, "left", false);
        T(`${r.pts}`, 560, 100 + i * 34, i === 0 ? 20 : 15, i === 0 ? "#b36b00" : lv.ink, "right", false);
      });
      const w = this.winnerId ? this.ents.get(this.winnerId) : undefined;
      if (w) T(w.name.slice(0, 10).toUpperCase(), WX(w.x), WY(w.y - 16 * w.scale) - 14, 12 * zs, "#ffd84a", "center");
      if (this.prizeShown && top[0]) {
        const t = this.phaseT - this.reachT;
        const wob = Math.floor(this.time * 3) % 2 ? 0 : 4;
        c.globalAlpha = clamp(t / 0.6, 0, 1);
        c.fillStyle = "rgba(0,0,0,0.55)"; c.fillRect(300, 690 + wob, 1000, 150);
        T("¡GANADOR!", 800, 708 + wob, 22, "#ffd84a", "center");
        T(top[0].name.toUpperCase().slice(0, 14), 800, 744 + wob, 40, "#ffffff", "center");
        T("¡PREMIO DESBLOQUEADO: UNA SABRITA!", 800, 802 + wob, 18, "#ffd84a", "center");
        c.globalAlpha = 1;
      } else if (!w) {
        T("SIN JUGADORES", 800, 400, 30, lv.ink, "center");
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
