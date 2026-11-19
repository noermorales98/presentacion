import { motion } from "framer-motion";
import { WifiOff } from "lucide-react";
import { useDeck, TALK } from "@/deck/DeckContext";
import { useOnline } from "@/hooks/useOnline";
import { usePreload } from "@/preload";

/** marco de la presentación: progreso, numeración, estado de red */
export default function Chrome({ light = false }: { light?: boolean }) {
  const { slide, total } = useDeck();
  const online = useOnline();
  const pre = usePreload();

  const sub = light ? "text-ink/55" : "text-smoke";
  const strong = light ? "text-ink/75" : "text-bone/80";

  return (
    <>
      {/* cuadrícula discreta */}
      <div
        aria-hidden
        className={`${light ? "grid-faint-dark" : "grid-faint"} pointer-events-none fixed inset-0 z-[1]`}
      />

      {/* progreso inferior */}
      <div className={`fixed bottom-0 left-0 right-0 z-30 h-[3px] ${light ? "bg-ink/10" : "bg-bone/10"}`}>
        <motion.div
          className="h-full bg-volt"
          animate={{ width: `${((slide + 1) / total) * 100}%` }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      {/* HUD superior derecho */}
      <div className={`fixed right-6 top-5 z-30 flex items-center gap-4 font-mono text-[11px] tracking-widest ${sub} md:right-10 md:top-7`}>
        <span className={`flex items-center gap-1.5 ${pre.ready ? "text-lime" : ""}`} title="Videos y juego guardados para funcionar sin red">
          <span className={`h-1.5 w-1.5 rounded-full ${pre.ready ? "bg-lime" : "animate-pulse bg-volt"}`} />
          {pre.ready ? "LISTO" : `CARGANDO ${pre.done}/${pre.total}`}
        </span>
        {!online && (
          <span className={`flex items-center gap-1.5 rounded-full border px-2 py-1 ${light ? "border-ink/25 text-ink/70" : "border-bone/20 text-bone/80"}`}>
            <WifiOff className="h-3 w-3" /> OFFLINE
          </span>
        )}
        <span className={`tabular ${strong}`}>
          {String(slide + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </span>
      </div>

      {/* marca inferior izquierda */}
      <div className={`fixed bottom-5 left-6 z-30 font-mono text-[10px] uppercase tracking-kicker ${sub} md:left-10`}>
        {TALK.studio}
      </div>

      {/* ayuda de controles (desaparece tras empezar) */}
      {slide === 0 && (
        <div className={`fixed bottom-5 right-6 z-30 hidden gap-3 font-mono text-[10px] uppercase tracking-widest ${sub} md:flex md:right-10`}>
          <span>← → navegar</span>
          <span>espacio avanzar</span>
          <span>F pantalla completa</span>
          <span>P presentador</span>
        </div>
      )}
    </>
  );
}
