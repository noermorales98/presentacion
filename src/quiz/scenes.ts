// Escenarios pixel (estilo juego del dino de Chrome). Cada nivel cambia de paleta y de decorado.
import { mulberry } from "./sprites";

export const W = 800;
export const H = 450;
export const GROUND = 333;

export interface Level {
  name: string;
  sky: string;
  sky2: string; // franja inferior del cielo
  ground: string;
  groundDark: string;
  ink: string; // trazos del suelo y texto
  accent: string;
  panel: string; // fondo de paneles
  panelText: string;
  deco: "cactus" | "clouds" | "stars" | "trees" | "waves" | "lava" | "snow" | "city" | "planet" | "peaks";
  celestial: "sun" | "moon" | "none";
  celestialColor: string;
}

export const LEVELS: Level[] = [
  { name: "DESIERTO", sky: "#f7f7f7", sky2: "#ececec", ground: "#e2e2e2", groundDark: "#535353", ink: "#535353", accent: "#e8453c", panel: "#ffffff", panelText: "#535353", deco: "cactus", celestial: "sun", celestialColor: "#f2b632" },
  { name: "ATARDECER", sky: "#ff9a5c", sky2: "#ffd08a", ground: "#c4633a", groundDark: "#5a2d4d", ink: "#5a2d4d", accent: "#fff2b0", panel: "#fff0dc", panelText: "#5a2d4d", deco: "clouds", celestial: "sun", celestialColor: "#fff2b0" },
  { name: "NOCHE", sky: "#16162b", sky2: "#23234a", ground: "#2e2e55", groundDark: "#e8e8e8", ink: "#e8e8e8", accent: "#f7e06a", panel: "#0d0d1f", panelText: "#e8e8e8", deco: "stars", celestial: "moon", celestialColor: "#f4f1d0" },
  { name: "BOSQUE", sky: "#bfe8a8", sky2: "#e2f5c8", ground: "#5da04a", groundDark: "#1f4d2a", ink: "#1f4d2a", accent: "#fff27a", panel: "#f0ffe2", panelText: "#1f4d2a", deco: "trees", celestial: "sun", celestialColor: "#fff27a" },
  { name: "OCÉANO", sky: "#8fd3ff", sky2: "#c9ecff", ground: "#e8d29a", groundDark: "#1b4f72", ink: "#1b4f72", accent: "#ffffff", panel: "#e8f7ff", panelText: "#1b4f72", deco: "waves", celestial: "sun", celestialColor: "#fff4a0" },
  { name: "VOLCÁN", sky: "#3a0d0d", sky2: "#7a1d12", ground: "#5a1a14", groundDark: "#ffb347", ink: "#ffb347", accent: "#ff5a2a", panel: "#240606", panelText: "#ffb347", deco: "lava", celestial: "none", celestialColor: "#ff5a2a" },
  { name: "HIELO", sky: "#dff6ff", sky2: "#f3fcff", ground: "#c4e4f2", groundDark: "#3b7ea1", ink: "#3b7ea1", accent: "#6fd0ff", panel: "#f4fcff", panelText: "#2d6a8a", deco: "snow", celestial: "sun", celestialColor: "#ffffff" },
  { name: "CIBERPUNK", sky: "#120022", sky2: "#32005a", ground: "#1a0a30", groundDark: "#00f0ff", ink: "#00f0ff", accent: "#ff2bd6", panel: "#0b0016", panelText: "#00f0ff", deco: "city", celestial: "moon", celestialColor: "#ff2bd6" },
  { name: "ESPACIO", sky: "#05050f", sky2: "#0c0c26", ground: "#4a4a5e", groundDark: "#c9c9d8", ink: "#c9c9d8", accent: "#7ad0ff", panel: "#05050f", panelText: "#c9c9d8", deco: "planet", celestial: "none", celestialColor: "#7ad0ff" },
  { name: "LA CIMA", sky: "#ffd966", sky2: "#fff0b0", ground: "#d9a441", groundDark: "#8a4b00", ink: "#8a4b00", accent: "#ffffff", panel: "#fff8dc", panelText: "#8a4b00", deco: "peaks", celestial: "sun", celestialColor: "#ffffff" },
];

export function levelFor(q: number): Level {
  return LEVELS[((q % LEVELS.length) + LEVELS.length) % LEVELS.length];
}

function rect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), w, h);
}

function cloud(c: CanvasRenderingContext2D, x: number, y: number, color: string) {
  rect(c, x + 4, y, 14, 3, color);
  rect(c, x, y + 3, 26, 3, color);
  rect(c, x + 8, y - 3, 8, 3, color);
}

function cactus(c: CanvasRenderingContext2D, x: number, base: number, color: string, h: number) {
  rect(c, x, base - h, 4, h, color);
  rect(c, x - 4, base - h * 0.65, 4, 3, color);
  rect(c, x - 4, base - h * 0.65 - 5, 3, 6, color);
  rect(c, x + 4, base - h * 0.5, 4, 3, color);
  rect(c, x + 5, base - h * 0.5 - 6, 3, 7, color);
}

function tree(c: CanvasRenderingContext2D, x: number, base: number, trunk: string, leaf: string, h: number) {
  rect(c, x, base - h * 0.4, 4, h * 0.4, trunk);
  rect(c, x - 8, base - h * 0.4 - 8, 20, 8, leaf);
  rect(c, x - 5, base - h * 0.4 - 16, 14, 8, leaf);
  rect(c, x - 2, base - h * 0.4 - 22, 8, 6, leaf);
}

/** dibuja el fondo completo del nivel. t = segundos */
export function drawBackground(c: CanvasRenderingContext2D, lv: Level, q: number, t: number) {
  const r = mulberry(q * 977 + 13);
  // cielo en dos bandas (look pixel)
  rect(c, 0, 0, W, GROUND, lv.sky);
  rect(c, 0, GROUND - 90, W, 90, lv.sky2);
  rect(c, 0, GROUND - 100, W, 10, mix(lv.sky, lv.sky2));

  // astro
  if (lv.celestial !== "none") {
    const cx = 520, cy = 62;
    rect(c, cx - 14, cy - 10, 28, 20, lv.celestialColor);
    rect(c, cx - 10, cy - 14, 20, 28, lv.celestialColor);
    if (lv.celestial === "moon") {
      rect(c, cx - 4, cy - 12, 14, 18, lv.sky);
    }
  }

  const scroll = t * 6;
  switch (lv.deco) {
    case "stars":
    case "planet": {
      for (let i = 0; i < 46; i++) {
        const x = r() * W, y = r() * (GROUND - 60);
        const tw = Math.floor(t * 2 + i) % 5 === 0;
        rect(c, x, y, tw ? 2 : 1, tw ? 2 : 1, "#ffffff");
      }
      if (lv.deco === "planet") {
        rect(c, 90, 70, 46, 46, "#7a5cc8");
        rect(c, 84, 78, 58, 30, "#7a5cc8");
        rect(c, 84, 92, 58, 4, "#c9b6ff");
        rect(c, 76, 90, 74, 3, "#d9d0ff");
      }
      break;
    }
    case "clouds":
    case "cactus":
    case "snow":
    case "waves":
    case "trees":
    case "peaks": {
      for (let i = 0; i < 5; i++) {
        const x = (((r() * (W + 80) - scroll * (0.5 + i * 0.15)) % (W + 80)) + (W + 80)) % (W + 80) - 40;
        cloud(c, x, 40 + r() * 70, lv.deco === "snow" ? "#ffffff" : lv.deco === "peaks" ? "#ffffffcc" : shade(lv.sky, 0.06));
      }
      break;
    }
    default:
      break;
  }

  // siluetas lejanas
  if (lv.deco === "peaks" || lv.deco === "snow") {
    for (let i = 0; i < 6; i++) {
      const bx = i * 150 - 20, bh = 60 + (i % 3) * 25;
      for (let k = 0; k < bh; k += 4) rect(c, bx + k / 1.4, GROUND - k - 4, 110 - k * 1.4, 4, shade(lv.sky2, -0.12));
    }
  }
  if (lv.deco === "city") {
    for (let i = 0; i < 14; i++) {
      const bw = 34 + ((i * 13) % 20), bh = 60 + ((i * 37) % 90);
      const bx = i * 58 - 10;
      rect(c, bx, GROUND - bh, bw, bh, "#241040");
      for (let wy = 8; wy < bh - 6; wy += 10)
        for (let wx = 5; wx < bw - 5; wx += 9)
          if ((wx * 7 + wy * 3 + i) % 4 !== 0) rect(c, bx + wx, GROUND - bh + wy, 4, 4, (wx + wy + i) % 3 ? "#ff2bd6" : "#00f0ff");
    }
  }
  if (lv.deco === "lava") {
    for (let i = 0; i < 5; i++) {
      const bx = i * 190 - 30, bh = 70 + (i % 2) * 30;
      for (let k = 0; k < bh; k += 4) rect(c, bx + k * 0.8, GROUND - k - 4, 150 - k * 1.6, 4, "#2a0808");
      rect(c, bx + 60, GROUND - bh - 4, 28, 4, "#ff5a2a");
    }
  }

  // elementos del paisaje
  const rr = mulberry(q * 31 + 7);
  for (let i = 0; i < 7; i++) {
    const x = rr() * W;
    switch (lv.deco) {
      case "cactus":
        cactus(c, x, GROUND, lv.ink, 22 + rr() * 14);
        break;
      case "trees":
        tree(c, x, GROUND, "#5a3a1f", "#2f7a3a", 40 + rr() * 20);
        break;
      case "peaks":
        rect(c, x, GROUND - 14, 8, 14, "#8a4b00");
        rect(c, x - 3, GROUND - 18, 14, 5, "#ffffff");
        break;
      case "lava":
        rect(c, x, GROUND - 8, 10, 8, "#7a1d12");
        break;
      case "snow":
        rect(c, x, GROUND - 12, 6, 12, "#ffffff");
        rect(c, x - 3, GROUND - 8, 12, 3, "#ffffff");
        break;
      default:
        break;
    }
  }

  // suelo
  rect(c, 0, GROUND, W, H - GROUND, lv.ground);
  rect(c, 0, GROUND, W, 2, lv.groundDark);
  // olas / lava burbujeando
  if (lv.deco === "waves") {
    for (let x = 0; x < W; x += 16) rect(c, x + ((t * 20) % 16), GROUND + 4 + (Math.floor(x / 16) % 2) * 2, 8, 2, "#ffffff88");
  }
  if (lv.deco === "lava") {
    for (let i = 0; i < 6; i++) {
      const bx = (i * 143 + 30) % W;
      const ph = (t * 0.8 + i * 0.37) % 1;
      rect(c, bx, GROUND - ph * 26, 3, 3, ph < 0.9 ? "#ff8a2a" : "#ffd36a");
    }
  }
  // guijarros del suelo (se desplazan lento, estilo dino)
  const pr = mulberry(q * 71 + 3);
  for (let i = 0; i < 40; i++) {
    const x = (((pr() * W - scroll * 3) % W) + W) % W;
    const y = GROUND + 6 + pr() * 90;
    rect(c, x, y, 2 + Math.floor(pr() * 5), 1, lv.groundDark + "88");
  }
  // nieve cayendo
  if (lv.deco === "snow") {
    for (let i = 0; i < 40; i++) {
      const x = (i * 67 + Math.sin(t + i) * 10 + 800) % W;
      const y = (t * 25 + i * 53) % GROUND;
      rect(c, x, y, 2, 2, "#ffffff");
    }
  }
}

function hex(h: string) {
  const s = h.replace("#", "");
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}
function toHex(rgb: number[]) {
  return "#" + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}
function mix(a: string, b: string) {
  const A = hex(a), B = hex(b);
  return toHex(A.map((v, i) => (v + B[i]) / 2));
}
function shade(a: string, amt: number) {
  const A = hex(a);
  return toHex(A.map((v) => v + 255 * amt));
}
