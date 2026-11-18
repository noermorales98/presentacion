import { useEffect } from "react";
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { useDeck, TALK } from "@/deck/DeckContext";
import { SLIDES } from "@/config/presentation";

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Vista del presentador: notas privadas, cronómetro, control del deck.
 *  No proyectar esta ventana. Se abre con P desde /present. */
export default function PresenterPage() {
  const deck = useDeck();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); deck.goNext(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); deck.goPrev(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deck]);

  const remaining = Math.max(0, TALK.durationMin * 60 - deck.elapsed);

  return (
    <div className="flex h-full flex-col bg-ink p-5 text-bone">
      <header className="flex items-center justify-between border-b border-line pb-3">
        <p className="font-mono text-[10px] uppercase tracking-kicker text-volt">
          vista del presentador · privada
        </p>
        <p className="font-mono text-[11px] text-smoke">
          {String(deck.slide + 1).padStart(2, "0")}/{String(deck.total).padStart(2, "0")} · {deck.meta.kicker}
        </p>
      </header>

      {/* cronómetro */}
      <div className="mt-4 flex items-center justify-between rounded-2xl border border-line bg-panel/70 p-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-kicker text-smoke">tiempo restante</p>
          <p className={`font-grotesk text-5xl font-bold tabular ${remaining <= 300 ? "text-red-400" : ""}`}>
            {fmt(remaining)}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={deck.toggleRunning}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-line hover:border-volt/60 hover:text-volt"
            aria-label={deck.running ? "Pausar cronómetro" : "Iniciar cronómetro"}
          >
            {deck.running ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
          <button
            onClick={deck.resetTimer}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-line hover:border-volt/60 hover:text-volt"
            aria-label="Reiniciar cronómetro"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* notas */}
      <section className="mt-4 flex-1 overflow-y-auto rounded-2xl border border-line bg-panel/70 p-4">
        <p className="font-mono text-[10px] uppercase tracking-kicker text-smoke">notas de esta escena</p>
        <p className="mt-2 font-grotesk text-[15px] leading-relaxed text-bone/90">{deck.meta.notes}</p>
        {deck.meta.steps > 1 && (
          <p className="mt-3 font-mono text-[11px] text-volt">
            revelación {deck.step + 1} de {deck.meta.steps}
          </p>
        )}
      </section>

      {/* navegación + miniatura del próximo */}
      <footer className="mt-4 flex items-stretch gap-3">
        <button
          onClick={deck.goPrev}
          className="flex w-14 cursor-pointer items-center justify-center rounded-xl border border-line hover:border-volt/60 hover:text-volt"
          aria-label="Diapositiva anterior"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="flex-1 rounded-2xl border border-line bg-panel/70 px-4 py-2">
          <p className="font-mono text-[10px] uppercase tracking-kicker text-smoke">siguiente</p>
          <p className="mt-1 truncate font-grotesk text-sm font-semibold">
            {deck.slide < SLIDES.length - 1 ? SLIDES[deck.slide + 1].kicker : "Fin de la charla"}
          </p>
        </div>
        <button
          onClick={deck.goNext}
          className="flex w-14 cursor-pointer items-center justify-center rounded-xl border border-line hover:border-volt/60 hover:text-volt"
          aria-label="Siguiente diapositiva"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </footer>
    </div>
  );
}
