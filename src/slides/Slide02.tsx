import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, RefreshCw, Volume2, VolumeX } from "lucide-react";
import "@fontsource/press-start-2p/index.css";
import { phaseOfStep } from "@/config/quiz";
import { QuizEngine } from "@/quiz/engine";
import { useQuizHost, joinUrl } from "@/quiz/useHost";
import { isMuted, setMuted, setMusicLevel, startMusic, stopMusic, unlockAudio } from "@/quiz/audio";

const PIXEL = { fontFamily: '"Press Start 2P", monospace' } as const;

/**
 * Quiz en vivo. El público entra por QR/link desde el celular; sus personajes aparecen aquí.
 * Cada paso de la diapositiva (clic / →) avanza el juego: lobby → pregunta → pelea → … → final.
 */
export default function Slide02({ step }: { step: number }) {
  const engine = useMemo(() => new QuizEngine(), []);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const host = useQuizHost(step, engine);
  const { phase, q } = phaseOfStep(step);
  const [muted, setMutedState] = useState(isMuted());
  const [copied, setCopied] = useState(false);
  const url = joinUrl(host.room);

  // bucle de dibujo
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      engine.draw(ctx, dt);
      raf = requestAnimationFrame(loop);
    };
    void document.fonts?.load('16px "Press Start 2P"');
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [engine]);

  // música de fondo durante las preguntas
  useEffect(() => {
    unlockAudio();
    if (phase === "question") {
      setMusicLevel(q);
      startMusic(q);
    } else stopMusic();
    return () => stopMusic();
  }, [phase, q]);

  // tecla M = silenciar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "m" || e.key === "M") {
        const next = !isMuted();
        setMuted(next);
        setMutedState(next);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const copy = () => {
    void navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    });
  };

  return (
    <div
      className="relative"
      style={{ margin: "-99px -112px -72px -112px", width: 1600, height: 900, ...PIXEL }}
    >
      <canvas
        ref={canvasRef}
        width={1600}
        height={900}
        className="absolute inset-0 h-full w-full"
        style={{ imageRendering: "pixelated" }}
      />

      {phase === "lobby" && (
        <>
          {/* panel QR */}
          <div className="absolute left-7 top-[120px] w-[380px] border-4 border-[#535353] bg-white p-5 text-[#535353] shadow-[8px_8px_0_rgba(0,0,0,0.25)]">
            <p className="mb-3 text-center text-[13px] leading-5">ESCANEA PARA JUGAR</p>
            <div className="flex justify-center bg-white">
              <QRCodeSVG value={url} size={300} marginSize={1} bgColor="#ffffff" fgColor="#111111" level="M" />
            </div>
            <p className="mt-4 text-center text-[11px] leading-5">O ENTRA A:</p>
            <p className="mt-1 break-all text-center text-[11px] leading-5" style={{ wordBreak: "break-all" }}>
              {url.replace(/^https?:\/\//, "")}
            </p>
            <p className="mt-3 text-center text-[13px]">
              SALA <span className="text-[26px] text-[#e8453c]">{host.room}</span>
            </p>
          </div>

          {/* título y contador */}
          <div className="absolute left-[460px] top-[90px] text-[#535353]">
            <h2 className="text-[40px] leading-[56px]">¡ÚNETE AL QUIZ!</h2>
            <p className="mt-3 text-[16px] leading-7">
              PROGRAMACIÓN · {10} PREGUNTAS
            </p>
            <p className="mt-5 text-[22px] text-[#e8453c]">
              {host.count} {host.count === 1 ? "JUGADOR" : "JUGADORES"}
            </p>
            {host.ready && (
              <p className="mt-4 animate-pulse text-[13px] leading-6">CLIC / → PARA EMPEZAR</p>
            )}
          </div>

          {/* estado de conexión */}
          <div className="absolute bottom-[26px] right-7 flex items-center gap-3 text-[10px] text-[#535353]">
            {host.mode === "local" && (
              <span className="bg-[#ffd84a] px-2 py-1">MODO LOCAL: falta configurar Firebase</span>
            )}
            {host.error && <span className="bg-[#e8453c] px-2 py-1 text-white">ERROR: {host.error.slice(0, 60)}</span>}
            {!host.ready && !host.error && <span>CONECTANDO...</span>}
            <button onClick={copy} className="flex items-center gap-1 border-2 border-[#535353] bg-white px-2 py-1">
              <Copy className="h-3 w-3" /> {copied ? "COPIADO" : "COPIAR LINK"}
            </button>
            <button
              onClick={() => {
                const next = !muted;
                setMuted(next);
                setMutedState(next);
              }}
              className="flex items-center gap-1 border-2 border-[#535353] bg-white px-2 py-1"
            >
              {muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />} {muted ? "SIN SONIDO" : "SONIDO"}
            </button>
            <button
              onClick={() => {
                if (window.confirm("¿Crear una sala nueva? Los jugadores actuales tendrán que volver a entrar.")) host.resetRoom();
              }}
              className="flex items-center gap-1 border-2 border-[#535353] bg-white px-2 py-1"
            >
              <RefreshCw className="h-3 w-3" /> NUEVA SALA
            </button>
          </div>
        </>
      )}
    </div>
  );
}
