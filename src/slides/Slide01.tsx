import { motion } from "framer-motion";
import { Kicker } from "@/components/ui";
import { TALK } from "@/deck/DeckContext";

const LINES = ["¿Y si programar", "ya no fuera", "lo más importante?"];

export default function Slide01() {
  return (
    <div className="flex h-full flex-col justify-center">
      <Kicker>Charla</Kicker>

      <h1 className="mt-8 font-grotesk text-[6.2rem] font-bold leading-[0.98] tracking-tight text-balance text-ink">
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

      <motion.p
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.85, duration: 0.6 }}
        className="mt-8 font-mono text-sm md:text-base text-ink/70"
      >
        {TALK.subtitle}
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.15, duration: 0.6 }}
        className="mt-14 flex flex-wrap items-center gap-x-8 gap-y-2 font-mono text-[11px] uppercase tracking-kicker text-ink/60"
      >
        <span className="text-ink/85">{TALK.speaker}</span>
        <span>{TALK.studio}</span>
        <span className="text-volt">{TALK.date}</span>
      </motion.div>
    </div>
  );
}
