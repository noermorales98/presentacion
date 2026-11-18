import { useCallback, useEffect, useRef, useState } from "react";
import { QUESTIONS, phaseOfStep, scoreQuestion, type AnswerRec, type ResultRec } from "@/config/quiz";
import { getTransport, SERVER_TS, type Transport } from "./transport";
import type { PlayerRec, QuizEngine, Ranked } from "./engine";

const ROOM_KEY = "noxy-quiz-room";

function newRoomCode() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let s = "";
  for (let i = 0; i < 4; i++) s += letters[Math.floor(Math.random() * letters.length)];
  return s;
}
function loadRoom(): string {
  try {
    const r = localStorage.getItem(ROOM_KEY);
    if (r) return r;
    const n = newRoomCode();
    localStorage.setItem(ROOM_KEY, n);
    return n;
  } catch {
    return newRoomCode();
  }
}

export function joinUrl(room: string) {
  return `${window.location.origin}${window.location.pathname}#/play/${room}`;
}

type Results = Record<string, Record<string, ResultRec>>;

/** Anfitrión del quiz: sincroniza jugadores y respuestas con el motor y publica el estado del juego. */
export function useQuizHost(step: number, engine: QuizEngine) {
  const [room, setRoom] = useState(loadRoom);
  const [mode, setMode] = useState<"firebase" | "local" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const tRef = useRef<Transport | null>(null);
  const [ready, setReady] = useState(false);
  const players = useRef<Record<string, PlayerRec>>({});
  const answers = useRef<Record<string, Record<string, AnswerRec>>>({});
  const results = useRef<Results>({});
  const stateRef = useRef<{ startedAt?: number }>({});
  const qRef = useRef(0);

  // conexión + suscripciones
  useEffect(() => {
    let off: (() => void)[] = [];
    let dead = false;
    setReady(false);
    setError(null);
    getTransport()
      .then((t) => {
        if (dead) return;
        tRef.current = t;
        setMode(t.mode);
        const base = `rooms/${room}`;
        off.push(
          t.watch(`${base}/players`, (v) => {
            players.current = (v as Record<string, PlayerRec>) ?? {};
            engine.syncPlayers(players.current);
            setCount(Object.keys(players.current).length);
          }),
          t.watch(`${base}/answers`, (v) => {
            answers.current = (v as Record<string, Record<string, AnswerRec>>) ?? {};
            engine.syncAnswers(answers.current[String(qRef.current)] ?? null);
          }),
          t.watch(`${base}/results`, (v) => {
            results.current = (v as Results) ?? {};
          }),
          t.watch(`${base}/state`, (v) => {
            const s = (v as { startedAt?: number } | null) ?? {};
            stateRef.current = s;
            if (s.startedAt) engine.startedAt = s.startedAt;
          })
        );
        setReady(true);
      })
      .catch((e) => setError(String(e?.message ?? e)));
    return () => {
      dead = true;
      off.forEach((f) => f());
      off = [];
    };
  }, [room, engine]);

  const ranking = useCallback((upToQ: number): Ranked[] => {
    const tot: Record<string, { pts: number; ms: number }> = {};
    for (let qi = 0; qi <= upToQ; qi++) {
      const r = results.current[String(qi)];
      if (!r) continue;
      for (const [id, v] of Object.entries(r)) {
        tot[id] ??= { pts: 0, ms: 0 };
        tot[id].pts += v.pts;
        if (v.ok) tot[id].ms += v.ms;
      }
    }
    const list: Ranked[] = Object.entries(players.current).map(([id, p]) => ({
      id,
      name: p.name,
      pts: tot[id]?.pts ?? 0,
      ms: tot[id]?.ms ?? 0,
    }));
    list.sort((a, b) => b.pts - a.pts || a.ms - b.ms || a.name.localeCompare(b.name));
    return list;
  }, []);

  // el motor avisa cuando termina la pelea → los celulares muestran su resultado
  useEffect(() => {
    engine.onFightDone = () => {
      const t = tRef.current;
      if (t) void t.update(`rooms/${room}/state`, { phase: "results" });
    };
    return () => {
      engine.onFightDone = undefined;
    };
  }, [engine, room]);

  // el paso de la diapositiva manda en el juego
  useEffect(() => {
    if (!ready) return;
    const t = tRef.current!;
    const base = `rooms/${room}`;
    const { phase, q } = phaseOfStep(step);
    qRef.current = q;
    const publish = (extra: Record<string, unknown> = {}) =>
      t.set(`${base}/state`, { phase, q, step, v: Date.now(), ...extra });

    if (phase === "lobby") {
      void t.remove(`${base}/answers`);
      void t.remove(`${base}/results`);
      results.current = {};
      answers.current = {};
      engine.syncAnswers(null);
      engine.enter("lobby", 0);
      void publish({ startedAt: null });
    } else if (phase === "question") {
      engine.enter("question", q, { startedAt: Date.now() });
      engine.syncAnswers(answers.current[String(q)] ?? null);
      void publish({ startedAt: SERVER_TS });
    } else if (phase === "fight") {
      const startedAt = stateRef.current.startedAt ?? Date.now();
      const res = scoreQuestion(QUESTIONS[q], answers.current[String(q)] ?? {}, startedAt);
      results.current[String(q)] = res;
      void t.set(`${base}/results/${q}`, res);
      const rk = ranking(q);
      const totals: Record<string, { pts: number; ms: number }> = {};
      rk.forEach((r) => (totals[r.id] = { pts: r.pts, ms: r.ms }));
      void t.set(`${base}/totals`, totals);
      engine.enter("fight", q, { results: res, ranking: rk, startedAt });
      void publish({ startedAt });
    } else if (phase === "boss") {
      const rk = ranking(QUESTIONS.length - 1);
      engine.enter("boss", q, { ranking: rk });
      void publish();
    } else {
      const rk = ranking(QUESTIONS.length - 1);
      engine.enter("final", q, { ranking: rk });
      void publish();
    }
  }, [step, ready, room, engine, ranking]);

  const resetRoom = useCallback(() => {
    const n = newRoomCode();
    try {
      localStorage.setItem(ROOM_KEY, n);
    } catch {
      /* ignorar */
    }
    players.current = {};
    engine.syncPlayers({});
    setRoom(n);
  }, [engine]);

  return { room, mode, error, ready, count, resetRoom };
}
