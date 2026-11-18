// Humanos pixel generados a partir de un número (semilla). 10 × 16 unidades.

export interface Look {
  skin: string;
  hair: string;
  hairStyle: number; // 0 corto, 1 largo, 2 calvo, 3 mohicano, 4 gorra
  shirt: string;
  pants: string;
  accessory: number; // 0 ninguno, 1 lentes, 2 diadema, 3 capa, 4 corbata
  accent: string;
}

const SKINS = ["#f6d3b3", "#e8b98a", "#c68a5b", "#8d5a3a", "#5e3a24"];
const HAIRS = ["#1d1d1d", "#4a2b17", "#8a5a2b", "#d9a441", "#c8362f", "#6b3fa0", "#2b6fd6"];
const SHIRTS = ["#e8453c", "#2f6fe4", "#2bb673", "#f2b632", "#a24fd0", "#ef7fb0", "#1fb5c9", "#f07b2a", "#8a8a8a", "#ffffff"];
const PANTS = ["#2d3a5c", "#3a3a3a", "#5a4632", "#27506b", "#6b2d3a", "#4a5a2f"];

export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeLook(seed: number): Look {
  const r = mulberry(seed);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const shirt = pick(SHIRTS);
  return {
    skin: pick(SKINS),
    hair: pick(HAIRS),
    hairStyle: Math.floor(r() * 5),
    shirt,
    pants: pick(PANTS),
    accessory: Math.floor(r() * 5),
    accent: pick(SHIRTS.filter((c) => c !== shirt)),
  };
}

export type Pose = "idle" | "walk" | "punch" | "cheer" | "ko" | "sleep" | "dizzy" | "guard" | "climb";

export interface DrawOpts {
  pose?: Pose;
  frame?: number; // contador de animación
  flip?: boolean; // mira a la izquierda
  scale?: number; // 1 = 1 unidad por unidad de arte
  tint?: string | null; // color plano (congelado, chamuscado…)
  alpha?: number;
  rot?: number; // múltiplos de 90° (0..3)
}

/** dibuja con el pie centrado en (x, y). Las coordenadas están en unidades de arte (el canvas escala ×2). */
export function drawHuman(c: CanvasRenderingContext2D, look: Look, x: number, y: number, o: DrawOpts = {}) {
  const pose = o.pose ?? "idle";
  const f = o.frame ?? 0;
  const s = o.scale ?? 1;
  c.save();
  c.globalAlpha = o.alpha ?? 1;
  c.translate(Math.round(x), Math.round(y));
  if (o.rot) c.rotate((o.rot * Math.PI) / 2);
  c.scale(o.flip ? -s : s, s);
  c.translate(-5, -16);

  const col = (v: string) => o.tint ?? v;
  const R = (cx: number, cy: number, w: number, h: number, color: string) => {
    c.fillStyle = col(color);
    c.fillRect(cx, cy, w, h);
  };

  const bob = pose === "idle" || pose === "guard" ? (Math.floor(f / 18) % 2 ? 1 : 0) : 0;
  const walkStep = Math.floor(f / 6) % 2;
  const cheerUp = pose === "cheer" && Math.floor(f / 8) % 2 === 0;

  // sombra
  if (pose !== "ko") {
    c.globalAlpha = (o.alpha ?? 1) * 0.22;
    c.fillStyle = "#000";
    c.fillRect(1, 16, 8, 1);
    c.globalAlpha = o.alpha ?? 1;
  }

  // capa (detrás)
  if (look.accessory === 3) R(1, 6 + bob, 8, 8, look.accent);

  // piernas
  if (pose === "walk" || pose === "climb") {
    if (walkStep) {
      R(3, 12, 2, 3, look.pants);
      R(3, 15, 2, 1, "#222");
      R(6, 12, 2, 2, look.pants);
      R(6, 14, 2, 1, "#222");
    } else {
      R(3, 12, 2, 2, look.pants);
      R(3, 14, 2, 1, "#222");
      R(6, 12, 2, 3, look.pants);
      R(6, 15, 2, 1, "#222");
    }
  } else {
    R(3, 12, 2, 3, look.pants);
    R(6, 12, 2, 3, look.pants);
    R(3, 15, 2, 1, "#222");
    R(6, 15, 2, 1, "#222");
  }

  const by = bob; // cuerpo sube/baja
  // torso
  R(2, 6 + by, 6, 6, look.shirt);
  if (look.accessory === 4) R(4, 6 + by, 2, 4, look.accent);
  // brazos
  const arm = look.skin;
  if (pose === "cheer") {
    if (cheerUp) {
      R(0, 2, 2, 5, arm);
      R(8, 2, 2, 5, arm);
    } else {
      R(0, 4, 2, 4, arm);
      R(8, 4, 2, 4, arm);
    }
  } else if (pose === "punch") {
    R(0, 7, 2, 3, arm);
    R(8, 7, 4, 2, arm);
    R(11, 6, 2, 3, "#fff");
  } else if (pose === "guard") {
    R(1, 6, 2, 3, arm);
    R(7, 6, 2, 3, arm);
    R(2, 5, 6, 1, "#fff");
  } else if (pose === "ko" || pose === "dizzy") {
    R(0, 7 + by, 2, 4, arm);
    R(8, 7 + by, 2, 4, arm);
  } else if (pose === "walk" || pose === "climb") {
    R(walkStep ? 1 : 0, 7, 1, 4, arm);
    R(walkStep ? 8 : 9, 7, 1, 4, arm);
  } else {
    R(1, 7 + by, 1, 4, arm);
    R(8, 7 + by, 1, 4, arm);
  }

  // cabeza
  const hy = by;
  R(2, 1 + hy, 6, 5, look.skin);
  // pelo
  switch (look.hairStyle) {
    case 0:
      R(2, 0 + hy, 6, 2, look.hair);
      break;
    case 1:
      R(2, 0 + hy, 6, 2, look.hair);
      R(1, 1 + hy, 1, 6, look.hair);
      R(8, 1 + hy, 1, 6, look.hair);
      break;
    case 2:
      break;
    case 3:
      R(4, -2 + hy, 2, 3, look.hair);
      R(3, 0 + hy, 4, 1, look.hair);
      break;
    case 4:
      R(2, 0 + hy, 6, 2, look.accent);
      R(6, 1 + hy, 3, 1, look.accent);
      break;
  }
  // diadema
  if (look.accessory === 2) R(2, 2 + hy, 6, 1, look.accent);
  // ojos
  if (pose === "ko") {
    R(3, 3 + hy, 1, 1, "#222");
    R(6, 3 + hy, 1, 1, "#222");
    R(3, 4 + hy, 1, 1, "#222");
    R(6, 4 + hy, 1, 1, "#222");
  } else if (pose === "sleep") {
    R(3, 3 + hy, 2, 1, "#222");
    R(6, 3 + hy, 2, 1, "#222");
  } else if (pose === "dizzy") {
    R(3, 3 + hy, 2, 2, "#222");
    R(6, 3 + hy, 2, 2, "#222");
  } else {
    R(3, 3 + hy, 1, 2, "#222");
    R(6, 3 + hy, 1, 2, "#222");
  }
  // lentes
  if (look.accessory === 1) {
    R(2, 3 + hy, 3, 2, "#222");
    R(5, 3 + hy, 3, 2, "#222");
    R(3, 3 + hy, 1, 1, "#9ad7ff");
    R(6, 3 + hy, 1, 1, "#9ad7ff");
  }
  // boca
  if (pose === "cheer" || pose === "punch") R(4, 5 + hy, 2, 1, "#7a1f1f");
  else if (pose === "ko") R(4, 5 + hy, 2, 1, "#222");
  c.restore();
}
