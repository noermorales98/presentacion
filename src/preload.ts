// Precarga todo lo pesado al abrir la presentación (internet lento en el evento):
// las peticiones pasan por el service worker, que las guarda en caché; después
// los videos, logos y el juego salen del disco, sin red.
import { useSyncExternalStore } from "react";

const base = import.meta.env.BASE_URL;
const ASSETS = [
  // imágenes (pequeñas) primero
  "noe.svg", "elon.svg", "jeff.svg", "mark.svg", "steve.svg",
  "claude.jpg", "grok-bot-logo.png", "hermes.png", "openrouter.avif",
  // videos (escenas 4 y 6)
  "01.mp4", "02.mp4",
].map((f) => `${base}${f}`);

interface State { done: number; total: number; ready: boolean }
let state: State = { done: 0, total: ASSETS.length, ready: false };
const listeners = new Set<() => void>();
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

let started = false;
export function startPreload() {
  if (started) return;
  started = true;
  const run = async () => {
    // el juego: trozos de Firebase (carga dinámica) y la fuente pixelada
    void import("firebase/app").catch(() => {});
    void import("firebase/database").catch(() => {});
    void document.fonts?.load('16px "Press Start 2P"').catch(() => {});
    // de uno en uno: no compite con la escena actual en una red lenta
    for (const url of ASSETS) {
      try {
        const res = await fetch(url);
        await res.blob(); // consume todo el cuerpo para que quede completo en caché
      } catch {
        /* sin red: se reintenta al próximo arranque */
      }
      set({ done: state.done + 1 });
    }
    set({ ready: true });
  };
  // tras el primer pintado para no frenar la portada
  window.setTimeout(run, 800);
}

export function usePreload(): State {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state
  );
}
