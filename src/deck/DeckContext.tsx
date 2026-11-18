import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { SLIDES, TALK } from "@/config/presentation";

interface DeckState {
  slide: number;
  step: number;
  elapsed: number; // segundos transcurridos de la charla
  running: boolean;
  presenterOpen: boolean;
}

interface DeckApi extends DeckState {
  meta: (typeof SLIDES)[number];
  total: number;
  goNext: () => void;
  goPrev: () => void;
  goTo: (i: number) => void;
  goToStep: (i: number, step: number) => void;
  toggleRunning: () => void;
  resetTimer: () => void;
  openPresenter: () => void;
}

const DeckContext = createContext<DeckApi | null>(null);

const CHANNEL = "noxy-deck-sync";
const senderId = Math.random().toString(36).slice(2);

export function DeckProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DeckState>({
    slide: 0,
    step: 0,
    elapsed: 0,
    running: false,
    presenterOpen: false,
  });
  const chanRef = useRef<BroadcastChannel | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const chan = new BroadcastChannel(CHANNEL);
    chanRef.current = chan;
    chan.onmessage = (ev: MessageEvent) => {
      const msg = ev.data as { sender?: string; kind?: string } & Partial<DeckState>;
      if (!msg || msg.sender === senderId) return;
      if (msg.kind === "state") {
        setState((s) => ({
          ...s,
          slide: msg.slide ?? s.slide,
          step: msg.step ?? s.step,
          elapsed: msg.elapsed ?? s.elapsed,
          running: msg.running ?? s.running,
        }));
      }
      if (msg.kind === "presenter-open") {
        setState((s) => ({ ...s, presenterOpen: true }));
      }
      if (msg.kind === "presenter-closed") {
        setState((s) => ({ ...s, presenterOpen: false }));
      }
    };
    return () => chan.close();
  }, []);

  const broadcast = useCallback((patch: Partial<DeckState>, kind = "state") => {
    chanRef.current?.postMessage({ sender: senderId, kind, ...patch });
  }, []);

  const clampSlide = (i: number) => Math.max(0, Math.min(SLIDES.length - 1, i));

  const goNext = useCallback(() => {
    setState((s) => {
      const meta = SLIDES[s.slide];
      if (s.step < meta.steps - 1) {
        const next = { ...s, step: s.step + 1 };
        broadcast(next);
        return next;
      }
      if (s.slide < SLIDES.length - 1) {
        const next = { ...s, slide: s.slide + 1, step: 0 };
        broadcast(next);
        return next;
      }
      return s;
    });
  }, [broadcast]);

  const goPrev = useCallback(() => {
    setState((s) => {
      if (s.step > 0) {
        const next = { ...s, step: s.step - 1 };
        broadcast(next);
        return next;
      }
      if (s.slide > 0) {
        const prev = SLIDES[s.slide - 1];
        const next = { ...s, slide: s.slide - 1, step: prev.steps - 1 };
        broadcast(next);
        return next;
      }
      return s;
    });
  }, [broadcast]);

  const goTo = useCallback(
    (i: number) => {
      setState((s) => {
        const next = { ...s, slide: clampSlide(i), step: 0 };
        broadcast(next);
        return next;
      });
    },
    [broadcast]
  );

  const goToStep = useCallback(
    (i: number, step: number) => {
      setState((s) => {
        const next = { ...s, slide: clampSlide(i), step };
        broadcast(next);
        return next;
      });
    },
    [broadcast]
  );

  const toggleRunning = useCallback(() => {
    setState((s) => {
      const next = { ...s, running: !s.running };
      broadcast(next);
      return next;
    });
  }, [broadcast]);

  const resetTimer = useCallback(() => {
    setState((s) => {
      const next = { ...s, elapsed: 0, running: false };
      broadcast(next);
      return next;
    });
  }, [broadcast]);

  // cronómetro general (30 min)
  useEffect(() => {
    if (!state.running) return;
    const id = window.setInterval(() => {
      setState((s) => {
        const next = { ...s, elapsed: s.elapsed + 1 };
        stateRef.current = next;
        return next;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [state.running]);

  // sincronizar el cronómetro con la otra ventana cada 5 s
  useEffect(() => {
    if (!chanRef.current) return;
    const id = window.setInterval(() => {
      broadcast({ elapsed: stateRef.current.elapsed, running: stateRef.current.running });
    }, 5000);
    return () => window.clearInterval(id);
  }, [broadcast]);

  const openPresenter = useCallback(() => {
    window.open(
      `${window.location.origin}${window.location.pathname}#/presenter`,
      "noxy-presenter",
      "width=560,height=760"
    );
    setState((s) => ({ ...s, presenterOpen: true }));
    broadcast({}, "presenter-open");
  }, [broadcast]);

  const api = useMemo<DeckApi>(
    () => ({
      ...state,
      meta: SLIDES[state.slide],
      total: SLIDES.length,
      goNext,
      goPrev,
      goTo,
      goToStep,
      toggleRunning,
      resetTimer,
      openPresenter,
    }),
    [state, goNext, goPrev, goTo, goToStep, toggleRunning, resetTimer, openPresenter]
  );

  return <DeckContext.Provider value={api}>{children}</DeckContext.Provider>;
}

export function useDeck(): DeckApi {
  const ctx = useContext(DeckContext);
  if (!ctx) throw new Error("useDeck debe usarse dentro de DeckProvider");
  return ctx;
}

export { TALK };
