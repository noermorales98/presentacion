import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, Check, X } from "lucide-react";
import { Kicker, Reveal, CodeBlock, ActionButton } from "@/components/ui";

const CODE = `// Endpoint generado por IA para buscar un cliente
app.get("/cliente/:id", async (req, res) => {
  const id = req.params.id;
  const sql = "SELECT * FROM clientes WHERE id = " + id;
  const cliente = await db.query(sql);
  res.json(cliente);
});`;

const CODE_OK = `// Así se corrige: consulta parametrizada
app.get("/cliente/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).end();
  const sql = "SELECT * FROM clientes WHERE id = ?";
  const [cliente] = await db.query(sql, [id]);
  res.json(cliente);
});`;

/** paso 0: votación · paso 1: revelación del error */
export default function Slide11({ step }: { step: number }) {
  const [vote, setVote] = useState<"si" | "no" | null>(null);
  const revealed = step >= 1;

  return (
    <div className="flex h-full flex-col">
      <Kicker>Actividad · Revisión</Kicker>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="mt-4 font-grotesk text-4xl font-bold tracking-tight md:text-6xl">
          ¿Y si la IA <span className="text-volt">se equivoca</span>?
        </h2>
        <p className="font-grotesk text-xl text-bone/85 md:text-2xl">¿Aprobarías este código?</p>
      </div>

      <div className="mt-6 grid flex-1 grid-cols-1 items-center gap-8 md:grid-cols-[1.6fr_1fr]">
        <CodeBlock code={CODE} lang="ts" highlight={revealed ? [3, 4] : undefined} />

        <div className="flex flex-col gap-4">
          {!revealed ? (
            <>
              <p className="font-mono text-[11px] uppercase tracking-widest text-smoke">
                Vota en voz alta — ¿qué hace falta revisar?
              </p>
              <div className="flex gap-3">
                <ActionButton onClick={() => setVote("si")}>
                  <span className="flex items-center gap-2">
                    <Check className="h-4 w-4" /> Sí, lo apruebo
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
                  Tu voto: <span className="text-bone/85">{vote === "si" ? "“Sí, lo apruebo”" : "“No, espera…”"}</span> — ahora mira la línea 4.
                </p>
              )}
            </>
          ) : (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="rounded-xl border border-red-400/40 bg-red-500/[0.06] p-5"
              >
                <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-kicker text-red-400">
                  <ShieldAlert className="h-4 w-4" /> error revelado
                </p>
                <p className="mt-3 font-grotesk text-lg leading-snug text-bone/90">
                  La entrada del usuario se concatena directo al SQL:{" "}
                  <span className="font-mono text-[15px] text-red-300">inyección SQL</span>.
                  Compila, “funciona”… y expone toda la base de datos.
                </p>
                <p className="mt-4 font-mono text-[12px] leading-relaxed text-bone/80">
                  La IA acelera la escritura; la responsabilidad de revisar sigue
                  siendo del desarrollador.
                </p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
              >
                <p className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-kicker text-lime">
                  <Check className="h-3.5 w-3.5" /> la versión corregida
                </p>
                <CodeBlock code={CODE_OK} lang="ts" />
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      <Reveal show={!revealed} className="pb-1">
        <p className="font-mono text-[11px] uppercase tracking-widest text-smoke">
          espacio → revelar el error
        </p>
      </Reveal>
    </div>
  );
}
