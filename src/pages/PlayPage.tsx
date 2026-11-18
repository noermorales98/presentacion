import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import "@fontsource/press-start-2p/index.css";
import { QUESTIONS, type QuizPhase, type ResultRec } from "@/config/quiz";
import { getTransport, SERVER_TS, type Transport } from "@/quiz/transport";
import { drawHuman, hashStr, makeLook } from "@/quiz/sprites";
import { sfx, unlockAudio } from "@/quiz/audio";

const PIXEL = { fontFamily: '"Press Start 2P", monospace' } as const;
const COLORS = ["#e8453c", "#2f6fe4", "#f2b632", "#2bb673"];
const TEXT = ["#fff", "#fff", "#2b2200", "#fff"];

interface GameState {
  phase: QuizPhase;
  q: number;
}

function Avatar({ seed, pose = "cheer", size = 6 }: { seed: number; pose?: "cheer" | "idle" | "ko"; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const look = useMemo(() => makeLook(seed), [seed]);
  useEffect(() => {
    const c = ref.current?.getContext("2d");
    if (!c) return;
    let f = 0;
    const id = window.setInterval(() => {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, 16 * size, 24 * size);
      c.setTransform(size, 0, 0, size, 0, 0);
      drawHuman(c, look, 8, 20, { pose, frame: f++ * 6, scale: 1 });
    }, 220);
    return () => window.clearInterval(id);
  }, [look, pose, size]);
  return <canvas ref={ref} width={16 * size} height={24 * size} style={{ imageRendering: "pixelated" }} />;
}

export default function PlayPage() {
  const { room = "" } = useParams();
  const code = room.toUpperCase();
  const [t, setT] = useState<Transport | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const pidKey = `noxy-quiz-pid-${code}`;
  const [pid] = useState(() => {
    try {
      const v = localStorage.getItem(pidKey);
      if (v) return v;
      const n = Math.random().toString(36).slice(2, 10);
      localStorage.setItem(pidKey, n);
      return n;
    } catch {
      return Math.random().toString(36).slice(2, 10);
    }
  });
  const seed = useMemo(() => hashStr(pid), [pid]);
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem("noxy-quiz-name") ?? "";
    } catch {
      return "";
    }
  });
  const [joined, setJoined] = useState(false);
  const [game, setGame] = useState<GameState>({ phase: "lobby", q: 0 });
  const [myAnswer, setMyAnswer] = useState<{ a: number | string } | null>(null);
  const [myResult, setMyResult] = useState<ResultRec | null>(null);
  const [totals, setTotals] = useState<Record<string, { pts: number; ms: number }>>({});
  const [text, setText] = useState("");
  const [connected, setConnected] = useState(true);
  const lastPhase = useRef<string>("");

  useEffect(() => {
    getTransport().then(setT).catch((e) => setErr(String(e?.message ?? e)));
  }, []);

  // suscripciones
  useEffect(() => {
    if (!t) return;
    const base = `rooms/${code}`;
    const offs = [
      t.watch(`${base}/players/${pid}`, (v) => setJoined(!!v)),
      t.watch(`${base}/state`, (v) => {
        const s = v as { phase?: QuizPhase; q?: number } | null;
        if (s?.phase) setGame({ phase: s.phase, q: s.q ?? 0 });
      }),
      t.watch(`${base}/totals`, (v) => setTotals((v as typeof totals) ?? {})),
    ];
    return () => offs.forEach((f) => f());
  }, [t, code, pid]);

  // respuesta y resultado de la pregunta actual
  useEffect(() => {
    if (!t) return;
    const base = `rooms/${code}`;
    setMyAnswer(null);
    setMyResult(null);
    setText("");
    const offs = [
      t.watch(`${base}/answers/${game.q}/${pid}`, (v) => setMyAnswer((v as { a: number | string } | null) ?? null)),
      t.watch(`${base}/results/${game.q}/${pid}`, (v) => setMyResult((v as ResultRec | null) ?? null)),
    ];
    return () => offs.forEach((f) => f());
  }, [t, code, pid, game.q]);

  // detector de conexión
  useEffect(() => {
    const on = () => setConnected(true);
    const off = () => setConnected(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const ranking = useMemo(
    () =>
      Object.entries(totals)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => b.pts - a.pts || a.ms - b.ms),
    [totals]
  );
  const myRank = ranking.findIndex((r) => r.id === pid) + 1;
  const myTotal = totals[pid]?.pts ?? 0;

  // sonidos de resultado
  useEffect(() => {
    const key = `${game.phase}-${game.q}`;
    if (lastPhase.current === key) return;
    lastPhase.current = key;
    if (game.phase === "question") sfx.question();
    if (game.phase === "results") (myResult?.ok ? sfx.correct : sfx.wrong)();
    if (game.phase === "final" && myRank === 1) sfx.victory();
  }, [game, myResult, myRank]);

  const join = () => {
    const n = name.trim().slice(0, 12);
    if (!n || !t) return;
    unlockAudio();
    sfx.join();
    try {
      localStorage.setItem("noxy-quiz-name", n);
    } catch {
      /* ignorar */
    }
    void t.set(`rooms/${code}/players/${pid}`, { name: n, seed, joinedAt: SERVER_TS });
  };

  const send = (a: number | string) => {
    if (!t || myAnswer) return;
    unlockAudio();
    sfx.tap();
    setMyAnswer({ a });
    void t.set(`rooms/${code}/answers/${game.q}/${pid}`, { a, t: SERVER_TS });
  };

  const qu = QUESTIONS[game.q];
  const shell = "fixed inset-0 overflow-y-auto bg-[#16162b] p-5 text-white";

  if (err) return <div className={shell} style={PIXEL}><p className="mt-10 text-[12px] leading-6">ERROR DE CONEXIÓN: {err}</p></div>;

  return (
    <div className={shell} style={PIXEL}>
      <div className="mx-auto flex min-h-full max-w-md flex-col">
        <header className="flex items-center justify-between text-[10px] text-[#9a9ac0]">
          <span>SALA {code}</span>
          {!connected && <span className="text-[#ffd84a]">SIN RED</span>}
          {joined && <span className="max-w-[55%] truncate text-white">{name.toUpperCase()}</span>}
        </header>

        {!joined ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 py-8 text-center">
            <Avatar seed={seed} pose="idle" size={8} />
            <h1 className="text-[18px] leading-8">QUIZ DE PROGRAMACIÓN</h1>
            <p className="text-[11px] leading-5 text-[#9a9ac0]">ESCRIBE TU NOMBRE Y ENTRA A LA BATALLA</p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && join()}
              maxLength={12}
              placeholder="TU NOMBRE"
              autoFocus
              className="w-full border-4 border-white bg-[#0d0d1f] px-4 py-4 text-center text-[16px] uppercase text-white outline-none placeholder:text-[#555580]"
              style={PIXEL}
            />
            <button
              onClick={join}
              disabled={!name.trim() || !t}
              className="w-full border-4 border-white bg-[#2bb673] px-4 py-4 text-[16px] text-white shadow-[0_6px_0_#157a4a] active:translate-y-1 active:shadow-none disabled:opacity-40"
            >
              {t ? "¡ENTRAR!" : "CONECTANDO..."}
            </button>
          </div>
        ) : game.phase === "lobby" ? (
          <Center>
            <Avatar seed={seed} />
            <h2 className="text-[16px] leading-7">¡ESTÁS DENTRO!</h2>
            <p className="text-[11px] leading-5 text-[#9a9ac0]">MIRA LA PANTALLA. TU PERSONAJE YA APARECIÓ.</p>
          </Center>
        ) : game.phase === "question" ? (
          myAnswer ? (
            <Center>
              <Avatar seed={seed} pose="idle" />
              <h2 className="text-[16px] leading-7">¡RESPUESTA ENVIADA!</h2>
              <p className="text-[11px] leading-5 text-[#9a9ac0]">
                {qu.type === "choice" ? `ELEGISTE ${"ABCD"[myAnswer.a as number]}` : `ESCRIBISTE: ${String(myAnswer.a).toUpperCase()}`}
              </p>
              <p className="text-[10px] leading-5 text-[#9a9ac0]">ESPERA A LOS DEMÁS...</p>
            </Center>
          ) : (
            <div className="flex flex-1 flex-col gap-3 py-4">
              <p className="text-[10px] text-[#9a9ac0]">PREGUNTA {game.q + 1}/{QUESTIONS.length}</p>
              <p className="text-[12px] leading-6">{qu.q}</p>
              {qu.code && (
                <pre className="overflow-x-auto bg-[#0d0d1f] p-3 text-[8px] leading-4 text-[#9ad7ff]" style={PIXEL}>
                  {qu.code}
                </pre>
              )}
              {qu.type === "choice" ? (
                <div className={`mt-2 grid flex-1 gap-3 ${qu.options!.length === 2 ? "grid-cols-1" : "grid-cols-1"}`}>
                  {qu.options!.map((o, i) => (
                    <button
                      key={i}
                      onClick={() => send(i)}
                      className="flex min-h-[64px] items-center gap-3 border-4 border-white px-4 py-3 text-left text-[12px] leading-5 shadow-[0_6px_0_rgba(0,0,0,0.4)] active:translate-y-1 active:shadow-none"
                      style={{ background: COLORS[i % 4], color: TEXT[i % 4] }}
                    >
                      <span className="text-[20px]">{"ABCD"[i]}</span>
                      <span className="break-words">{o}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-2 flex flex-col gap-3">
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && text.trim() && send(text.trim())}
                    placeholder="TU RESPUESTA"
                    maxLength={30}
                    autoCapitalize="off"
                    className="border-4 border-white bg-[#0d0d1f] px-4 py-4 text-center text-[16px] text-white outline-none placeholder:text-[#555580]"
                    style={PIXEL}
                  />
                  <button
                    onClick={() => text.trim() && send(text.trim())}
                    className="border-4 border-white bg-[#2f6fe4] px-4 py-4 text-[16px] shadow-[0_6px_0_#173a85] active:translate-y-1 active:shadow-none"
                  >
                    ENVIAR
                  </button>
                </div>
              )}
            </div>
          )
        ) : game.phase === "fight" ? (
          <Center>
            <Avatar seed={seed} pose="idle" />
            <h2 className="animate-pulse text-[18px] leading-8">¡PELEA!</h2>
            <p className="text-[11px] leading-5 text-[#9a9ac0]">MIRA LA PANTALLA</p>
          </Center>
        ) : game.phase === "results" ? (
          <Center>
            <Avatar seed={seed} pose={myResult?.ok ? "cheer" : "ko"} />
            {myResult?.ok ? (
              <>
                <h2 className="text-[20px] leading-8 text-[#2bb673]">¡CORRECTO!</h2>
                <p className="text-[16px] text-[#ffd84a]">+{myResult.pts} PTS{myResult.fastest ? " · RÁPIDO" : ""}</p>
              </>
            ) : (
              <>
                <h2 className="text-[20px] leading-8 text-[#e8453c]">{myAnswer ? "INCORRECTO" : "SIN RESPUESTA"}</h2>
                <p className="text-[11px] leading-5 text-[#9a9ac0]">LA CORRECTA: {qu.answerLabel.toUpperCase()}</p>
              </>
            )}
            <p className="mt-2 text-[12px] leading-6">TOTAL: {myTotal} PTS{myRank ? ` · LUGAR ${myRank}` : ""}</p>
          </Center>
        ) : (
          <Center>
            <Avatar seed={seed} pose={myRank === 1 ? "cheer" : "idle"} />
            <h2 className="text-[18px] leading-8">{myRank === 1 ? "¡GANASTE!" : "FIN DEL JUEGO"}</h2>
            <p className="text-[14px] leading-7 text-[#ffd84a]">LUGAR {myRank || "-"} · {myTotal} PTS</p>
            <p className="text-[10px] leading-5 text-[#9a9ac0]">¡GRACIAS POR JUGAR!</p>
          </Center>
        )}
      </div>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 flex-col items-center justify-center gap-5 py-8 text-center">{children}</div>;
}
