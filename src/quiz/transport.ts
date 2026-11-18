// Capa de tiempo real. Con FIREBASE_DB_URL usa Firebase Realtime Database;
// sin URL usa un modo local (localStorage) para probar en pestañas del mismo navegador.
import { FIREBASE_DB_URL } from "@/config/quiz";

export const SERVER_TS = { ".sv": "timestamp" } as const;

export interface Transport {
  mode: "firebase" | "local";
  watch(path: string, cb: (value: unknown) => void): () => void;
  set(path: string, value: unknown): Promise<void>;
  update(path: string, value: Record<string, unknown>): Promise<void>;
  remove(path: string): Promise<void>;
}

/* ───────────── Firebase ───────────── */
async function makeFirebase(): Promise<Transport> {
  const { initializeApp } = await import("firebase/app");
  const { getDatabase, ref, onValue, set, update, remove } = await import("firebase/database");
  const app = initializeApp({ databaseURL: FIREBASE_DB_URL });
  const db = getDatabase(app);
  return {
    mode: "firebase",
    watch: (path, cb) => onValue(ref(db, path), (snap) => cb(snap.val())),
    set: (path, value) => set(ref(db, path), value),
    update: (path, value) => update(ref(db, path), value),
    remove: (path) => remove(ref(db, path)),
  };
}

/* ───────────── Local (localStorage + storage event) ───────────── */
const LS_KEY = "noxy-quiz-local-db";

type Tree = Record<string, unknown>;

function readTree(): Tree {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "{}") as Tree;
  } catch {
    return {};
  }
}
function writeTree(t: Tree) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(t));
  } catch {
    /* ignorar */
  }
}
function resolveTs(v: unknown): unknown {
  if (v && typeof v === "object") {
    if ((v as Record<string, unknown>)[".sv"] === "timestamp") return Date.now();
    const out: Record<string, unknown> = Array.isArray(v) ? ([] as unknown as Record<string, unknown>) : {};
    for (const [k, x] of Object.entries(v)) out[k] = resolveTs(x);
    return out;
  }
  return v;
}
function getAt(t: Tree, path: string): unknown {
  let cur: unknown = t;
  for (const p of path.split("/").filter(Boolean)) {
    if (cur && typeof cur === "object") cur = (cur as Tree)[p];
    else return undefined;
  }
  return cur;
}
function setAt(t: Tree, path: string, value: unknown) {
  const parts = path.split("/").filter(Boolean);
  let cur = t;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (!cur[p] || typeof cur[p] !== "object") cur[p] = {};
    cur = cur[p] as Tree;
  }
  const last = parts[parts.length - 1];
  if (value === null || value === undefined) delete cur[last];
  else cur[last] = value;
}

function makeLocal(): Transport {
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((f) => f());
  window.addEventListener("storage", (e) => {
    if (e.key === LS_KEY) notify();
  });
  return {
    mode: "local",
    watch(path, cb) {
      let last = "";
      const fire = () => {
        const v = getAt(readTree(), path);
        const s = JSON.stringify(v ?? null);
        if (s !== last) {
          last = s;
          cb(v ?? null);
        }
      };
      listeners.add(fire);
      fire();
      return () => listeners.delete(fire);
    },
    async set(path, value) {
      const t = readTree();
      setAt(t, path, resolveTs(value));
      writeTree(t);
      notify();
    },
    async update(path, value) {
      const t = readTree();
      for (const [k, v] of Object.entries(value)) setAt(t, `${path}/${k}`, resolveTs(v));
      writeTree(t);
      notify();
    },
    async remove(path) {
      const t = readTree();
      setAt(t, path, null);
      writeTree(t);
      notify();
    },
  };
}

let cached: Promise<Transport> | null = null;
export function getTransport(): Promise<Transport> {
  if (!cached) cached = FIREBASE_DB_URL.trim() ? makeFirebase() : Promise.resolve(makeLocal());
  return cached;
}
