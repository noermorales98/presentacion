import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, Check, X } from "lucide-react";
import { Kicker, Reveal, CodeBlock, ActionButton } from "@/components/ui";

// Clave FALSA y evidente: nunca poner una clave real en la presentación.
const CODE = `const OPENROUTER_KEY = "sk-or-v1-a8f3...c91d";
fetch("https://openrouter.ai/api/v1/chat/completions", {
  headers: { Authorization: \`Bearer \${OPENROUTER_KEY}\` },
});`;

const CODE_OK = `const OPENROUTER_KEY = import.meta.env.VITE_OPENROUTER_KEY;`;

const ENV = `# .env  (listado en .gitignore)
VITE_OPENROUTER_KEY=sk-or-v1-...`;

/** paso 0: votación "¿Lo aprobarías?" · paso 1: revelación del error y la corrección */
export default function Slide07({ step }: { step: number }) {
  const [vote, setVote] = useState<"si" | "no" | null>(null);
  const revealed = step >= 1;

  return (
    <div className="flex h-full flex-col">
      <Kicker>La IA se equivoca</Kicker>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="mt-4 font-grotesk text-4xl font-bold tracking-tight md:text-6xl">
          ¿Y si la IA <span className="text-volt">se equivoca</span>?
        </h2>
        <p className="font-grotesk text-xl text-bone/85 md:text-2xl">¿Lo aprobarías?</p>
      </div>

      <div className="mt-6 grid flex-1 grid-cols-1 items-center gap-8 md:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-4">
          <CodeBlock code={CODE} lang="js" highlight={revealed ? [1] : undefined} />
          {revealed && (
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <p className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-kicker text-lime">
                <Check className="h-3.5 w-3.5" /> la corrección
              </p>
              <CodeBlock code={CODE_OK} lang="js" />
              <div className="mt-3">
                <CodeBlock code={ENV} lang=".env" />
              </div>
            </motion.div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {!revealed ? (
            <>
              <p className="font-mono text-[11px] uppercase tracking-widest text-smoke">Vota en voz alta</p>
              <div className="flex gap-3">
                <ActionButton onClick={() => setVote("si")}>
                  <span className="flex items-center gap-2">
                    <Check className="h-4 w-4" /> Sí
                  </span>
                </ActionButton>
                <ActionButton tone="ghost" onClick={() => setVote("no")}>
                  <span className="flex items-center gap-2">
                    <X className="h-4 w-4" /> No, espera…
                  </span>
                </ActionButton>
              </div>
              {vote && (
                <p className="font-mono text-[12px] text-smoke">
                  Tu voto: <span className="text-bone/85">{vote === "si" ? "“Sí”" : "“No, espera…”"}</span> — ahora mira la línea 1.
                </p>
              )}
            </>
          ) : (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="rounded-xl border border-red-400/40 bg-red-500/[0.06] backdrop-blur-md p-5"
              >
                <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-kicker text-red-400">
                  <ShieldAlert className="h-4 w-4" /> error revelado
                </p>
                <p className="mt-3 font-grotesk text-lg leading-snug text-bone/90">
                  <span className="font-semibold text-red-300">Error:</span> la clave está escrita en el código.
                </p>
                <p className="mt-3 font-grotesk text-lg leading-snug text-bone/90">
                  <span className="font-semibold text-red-300">Riesgo:</span> al subirlo a GitHub cualquiera la ve y
                  gasta tu dinero.
                </p>
              </motion.div>
              <Reveal show delay={0.3}>
                <p className="border-l-2 border-volt pl-4 font-grotesk text-xl leading-snug text-bone/90">
                  La IA te da código que funciona. <span className="text-volt">No siempre te da código seguro.</span>
                </p>
              </Reveal>
            </AnimatePresence>
          )}
        </div>
      </div>

      <Reveal show={!revealed} className="pb-1">
        <p className="font-mono text-[11px] uppercase tracking-widest text-smoke">espacio → revelar el error</p>
      </Reveal>
    </div>
  );
}
