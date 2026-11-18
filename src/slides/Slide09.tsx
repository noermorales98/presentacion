import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppWindow, Waypoints, BrainCircuit, Gauge, Coins, Layers } from "lucide-react";
import { Kicker, Reveal, Tag } from "@/components/ui";

// Datos DEMOSTRATIVOS (etiquetados en pantalla): ilustran el concepto.
// No son precios ni benchmarks actuales — verificarlos siempre en openrouter.ai.
const MODELS = [
  { id: "gpt", name: "GPT", costo: 3, velocidad: 3, capacidad: 3, nota: "Uso general sólido" },
  { id: "claude", name: "Claude", costo: 3, velocidad: 2, capacidad: 4, nota: "Razonamiento y código largo" },
  { id: "gemini", name: "Gemini", costo: 2, velocidad: 4, capacidad: 3, nota: "Velocidad y contexto amplio" },
  { id: "mini", name: "Modelos mini", costo: 1, velocidad: 5, capacidad: 2, nota: "Baratos para tareas simples" },
];

function Bar({ value, tone }: { value: number; tone: string }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`h-3 w-1.5 ${i <= value ? tone : "bg-bone/10"}`} />
      ))}
    </div>
  );
}

/** paso 0: diagrama · paso 1: selector de modelos */
export default function Slide09({ step }: { step: number }) {
  const [selected, setSelected] = useState(MODELS[0]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Kicker>Stack · OpenRouter</Kicker>
          <h2 className="mt-4 font-grotesk text-4xl font-bold tracking-tight md:text-6xl">
            Una API, <span className="text-volt">muchos modelos</span>
          </h2>
        </div>
        <Tag tone="blue">datos demostrativos · no son precios reales</Tag>
      </div>

      <div className="mt-8 grid flex-1 grid-cols-1 items-center gap-10 md:grid-cols-2">
        {/* diagrama */}
        <div className="flex flex-col items-stretch gap-3">
          <motion.div
            initial={{ opacity: 0, x: -22 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4 rounded-xl border border-line bg-panel/60 p-4"
          >
            <AppWindow className="h-6 w-6 text-bone/80" strokeWidth={1.4} />
            <div>
              <p className="font-grotesk text-lg font-semibold">Mi aplicación</p>
              <p className="font-mono text-[11px] text-smoke">una sola integración</p>
            </div>
          </motion.div>

          <div className="flex items-center gap-3 pl-8">
            <motion.span
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: 0.3 }}
              className="h-8 w-px origin-top bg-volt"
            />
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45 }}
              className="font-mono text-[10px] uppercase tracking-kicker text-volt"
            >
              una API · un formato
            </motion.span>
          </div>

          <motion.div
            initial={{ opacity: 0, x: -22 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.55 }}
            className="flex items-center gap-4 rounded-xl border border-volt/50 bg-volt/[0.05] p-4"
          >
            <Waypoints className="h-6 w-6 text-volt" strokeWidth={1.4} />
            <div>
              <p className="font-grotesk text-lg font-semibold">OpenRouter</p>
              <p className="font-mono text-[11px] text-smoke">enruta al modelo adecuado</p>
            </div>
          </motion.div>

          <div className="flex items-center gap-3 pl-8">
            <motion.span
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: 0.8 }}
              className="h-8 w-px origin-top bg-lime"
            />
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="font-mono text-[10px] uppercase tracking-kicker text-lime"
            >
              elige por tarea, costo y velocidad
            </motion.span>
          </div>

          <motion.div
            initial={{ opacity: 0, x: -22 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.05 }}
            className="grid grid-cols-2 gap-2"
          >
            {MODELS.slice(0, 3).map((m) => (
              <div key={m.id} className="flex items-center gap-2.5 rounded-lg border border-line bg-panel/60 px-3 py-2.5">
                <BrainCircuit className="h-4 w-4 text-bone/80" strokeWidth={1.5} />
                <span className="font-mono text-[12px] text-bone/85">{m.name}</span>
              </div>
            ))}
            <div className="flex items-center gap-2.5 border border-dashed border-bone/25 px-3 py-2.5">
              <Layers className="h-4 w-4 text-smoke" strokeWidth={1.5} />
              <span className="font-mono text-[12px] text-smoke">+ muchos más</span>
            </div>
          </motion.div>
        </div>

        {/* selector de modelos */}
        <AnimatePresence>
          {step >= 1 && (
            <motion.div
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55 }}
            >
              <p className="mb-3 font-mono text-[10px] uppercase tracking-kicker text-smoke">
                comparación ilustrativa · selecciona un modelo
              </p>
              <div className="overflow-hidden rounded-xl border border-line bg-panel/60">
                {MODELS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelected(m)}
                    className={`grid w-full cursor-pointer grid-cols-[1.2fr_1fr_1fr_1fr] items-center gap-2 border-b border-line px-4 py-3 text-left transition-colors last:border-b-0 ${
                      selected.id === m.id ? "bg-volt/[0.07]" : "hover:bg-bone/[0.03]"
                    }`}
                  >
                    <span className={`font-grotesk text-base font-semibold ${selected.id === m.id ? "text-volt" : ""}`}>
                      {m.name}
                    </span>
                    <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase text-smoke">
                      <Coins className="h-3 w-3" /> <Bar value={m.costo} tone="bg-volt" />
                    </span>
                    <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase text-smoke">
                      <Gauge className="h-3 w-3" /> <Bar value={m.velocidad} tone="bg-lime" />
                    </span>
                    <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase text-smoke">
                      <BrainCircuit className="h-3 w-3" /> <Bar value={m.capacidad} tone="bg-bone/60" />
                    </span>
                  </button>
                ))}
              </div>
              <Reveal show delay={0.1} className="mt-4">
                <p className="border-l-2 border-volt pl-4 font-mono text-[12.5px] leading-relaxed text-bone/80">
                  {selected.nota} — la idea: cambiar de modelo sin reescribir tu app.
                </p>
              </Reveal>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
