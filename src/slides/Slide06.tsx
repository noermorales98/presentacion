import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ClipboardList,
  Code2,
  FlaskConical,
  Eye,
  ArrowRight,
  ArrowDown,
} from "lucide-react";
import { Kicker, Reveal, ActionButton } from "@/components/ui";

const STAGES = [
  { icon: Search, label: "Investigar" },
  { icon: ClipboardList, label: "Planear" },
  { icon: Code2, label: "Programar" },
  { icon: FlaskConical, label: "Probar" },
  { icon: Eye, label: "Revisar" },
];

const PROMPT_BAD = `Hazme un CRM.`;

const PROMPT_GOOD = `Contexto: CRM para seguimiento de clientes en Next.js 14.
Tarea: agregar filtro por etapa del pipeline en la tabla de clientes.
Restricciones: no tocar la API de pagos; TypeScript estricto.
Criterios de aceptación: el filtro persiste al recargar y tiene prueba unitaria.`;

/** paso 0: etapas · paso 1: comparación de prompts */
export default function Slide06({ step }: { step: number }) {
  const [good, setGood] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <Kicker>Método</Kicker>
      <h2 className="mt-4 font-grotesk text-4xl font-bold tracking-tight md:text-6xl">
        Mi forma de trabajar <span className="text-volt">con IA</span>
      </h2>

      <div className="mt-10 flex flex-1 flex-col justify-center">
        <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center md:gap-0">
          {STAGES.map((s, i) => (
            <div key={s.label} className="flex flex-1 items-center gap-2 md:gap-0">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.12, duration: 0.5 }}
                className="flex flex-1 flex-col items-start gap-3 rounded-xl border border-line bg-panel/60 p-4 md:p-5"
              >
                <s.icon className="h-7 w-7 text-volt" strokeWidth={1.5} />
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-kicker text-smoke">
                    etapa {String(i + 1).padStart(2, "0")}
                  </p>
                  <p className="mt-0.5 font-grotesk text-lg font-semibold md:text-xl">{s.label}</p>
                </div>
              </motion.div>
              {i < STAGES.length - 1 && (
                <ArrowRight className="mx-1 hidden h-5 w-5 shrink-0 text-smoke md:block" />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence>
          {step >= 1 && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55 }}
              className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-[1fr_auto_1fr]"
            >
              <div className={`rounded-xl border p-5 transition-colors ${good ? "border-line opacity-50" : "border-red-400/40"}`}>
                <p className="font-mono text-[10px] uppercase tracking-kicker text-red-400">
                  prompt deficiente
                </p>
                <p className="mt-3 font-mono text-sm text-bone/80">“{PROMPT_BAD}”</p>
                <p className="mt-3 font-mono text-[11px] text-smoke">
                  Sin contexto, sin restricciones, sin criterios de éxito.
                </p>
              </div>

              <div className="flex items-center justify-center">
                <ActionButton tone="ghost" onClick={() => setGood((g) => !g)}>
                  {good ? "ver el malo" : "comparar →"}
                </ActionButton>
              </div>

              <motion.div
                animate={{ opacity: good ? 1 : 0.45, scale: good ? 1 : 0.99 }}
                className={`rounded-xl border p-5 transition-colors ${good ? "border-volt/50" : "border-line"}`}
              >
                <p className="font-mono text-[10px] uppercase tracking-kicker text-volt">
                  prompt con contexto
                </p>
                <p className="mt-3 whitespace-pre-line font-mono text-[12px] leading-relaxed text-bone/80">
                  {PROMPT_GOOD}
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {step < 1 && (
          <Reveal delay={0.8} className="mt-10 flex items-center gap-2 text-smoke">
            <ArrowDown className="h-4 w-4" />
            <span className="font-mono text-[11px] uppercase tracking-widest">
              espacio → comparación de prompts
            </span>
          </Reveal>
        )}
      </div>
    </div>
  );
}
