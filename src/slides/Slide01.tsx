import { motion } from "framer-motion";
import { Kicker } from "@/components/ui";
import { TALK } from "@/deck/DeckContext";

const LINES = ["¿Y si programar", "ya no fuera", "lo más importante?"];

/** todo el contenido visible desde el inicio (sin pasos); la pregunta y la presentación entran con retraso */
export default function Slide01() {
  return (
    <div className="flex h-full flex-col justify-center">
      <Kicker>Charla</Kicker>

      <h1 className="mt-6 font-grotesk text-[5.6rem] font-bold leading-[0.98] tracking-tight text-balance text-ink">
        {LINES.map((ln, i) => (
          <span key={ln} className="block overflow-hidden">
            <motion.span
              className="block"
              initial={{ y: "110%" }}
              animate={{ y: 0 }}
              transition={{ duration: 0.8, delay: 0.15 + i * 0.14, ease: [0.22, 1, 0.36, 1] }}
            >
              {i === 2 ? (
                <>
                  lo más <span className="text-volt">importante</span>
                  <motion.span
                    className="ml-2 inline-block h-[0.75em] w-[0.45em] translate-y-[0.08em] bg-volt"
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 0.4 }}
                    aria-hidden
                  />
                </>
              ) : (
                ln
              )}
            </motion.span>
          </span>
        ))}
      </h1>

      <div className="mt-10 min-h-[190px]">
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-[1100px] font-grotesk text-3xl font-semibold leading-snug text-ink"
        >
          Hoy cualquiera crea software sin saber programar.{" "}
          <span className="text-volt">¿Dónde quedamos nosotros?</span>
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 flex max-w-[1100px] items-start gap-6 border-t border-ink/15 pt-6"
        >
          <img
            src={`${import.meta.env.BASE_URL}noe.svg`}
            alt="Noe"
            className="h-24 w-24 shrink-0 rounded-full border border-ink/15 bg-ink/5 backdrop-blur-md object-cover"
            style={{ imageRendering: "pixelated" }}
          />
          <div className="shrink-0">
            <p className="font-grotesk text-2xl font-bold text-ink">{TALK.speaker}</p>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-kicker text-ink/60">
              Fundador · {TALK.studio}
            </p>
            <p className="font-mono text-[11px] uppercase tracking-kicker text-ink/60">Cancún</p>
          </div>
          <p className="border-l border-ink/15 pl-6 font-grotesk text-xl leading-snug text-ink/80">
            Hace <span className="rounded bg-volt/10 px-1.5 font-mono text-volt">[X]</span> años escribía todo el
            código a mano. Hoy dirijo IA para construirlo.
            <span className="mt-2 block font-mono text-[10px] uppercase tracking-kicker text-ink/45">
              placeholder · completar [X] con los años reales
            </span>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
