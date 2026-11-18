import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, ArrowUpLeft } from "lucide-react";
import { Kicker, MediaSlot } from "@/components/ui";

const HOTSPOTS = [
  { id: "clientes", label: "Clientes", x: 16, y: 30, desc: "Alta y seguimiento de clientes" },
  { id: "pipeline", label: "Pipeline", x: 50, y: 58, desc: "Etapas del proceso comercial" },
  { id: "tareas", label: "Tareas", x: 82, y: 34, desc: "Recordatorios y actividad del día" },
];

/** Mockup de navegador con placeholders para capturas reales del CRM.
 *  Sustituir: guardar capturas en src/assets/crm/ e importarlas (ver README). */
export default function Slide05() {
  const [active, setActive] = useState<(typeof HOTSPOTS)[number] | null>(null);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Kicker>Demo · CRM</Kicker>
          <h2 className="mt-4 font-grotesk text-4xl font-bold tracking-tight md:text-6xl">
            Lo que <span className="text-volt">construí</span>
          </h2>
        </div>
        <p className="max-w-sm font-mono text-[11px] leading-relaxed text-smoke">
          Pasa el cursor sobre los puntos para señalar módulos. Las capturas son
          placeholders: agrégalas en src/assets/crm/ antes de la charla.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="mt-8 flex-1 overflow-hidden rounded-2xl border border-line bg-panel/70"
      >
        {/* barra del navegador */}
        <div className="flex items-center gap-3 border-b border-line px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-bone/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-bone/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-bone/15" />
          </div>
          <div className="flex flex-1 items-center gap-2 border border-line bg-ink px-3 py-1 font-mono text-[11px] text-smoke">
            <Lock className="h-3 w-3 text-volt" /> crm.noxy.digital
          </div>
        </div>

        <div className="grid h-[calc(100%-49px)] grid-cols-1 gap-3 p-3 md:grid-cols-3">
          {HOTSPOTS.map((h) => (
            <div key={h.id} className="relative min-h-0">
              <div className="h-full overflow-hidden">
                <MediaSlot
                  label={`Captura · ${h.label}`}
                  hint="Reemplazar con imagen real (README → Agregar capturas)"
                  ratio="4/3"
                />
              </div>
              <button
                onClick={() => setActive(active?.id === h.id ? null : h)}
                onMouseEnter={() => setActive(h)}
                className="absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-volt bg-ink/80 text-volt transition-transform hover:scale-110"
                aria-label={`Señalar módulo ${h.label}`}
              >
                <ArrowUpLeft className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </motion.div>

      <div className="mt-4 flex h-10 items-center">
        {active ? (
          <motion.p
            key={active.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-mono text-xs uppercase tracking-widest text-volt"
          >
            {active.label} — <span className="text-bone/80 normal-case tracking-normal">{active.desc}</span>
          </motion.p>
        ) : (
          <p className="font-mono text-[11px] uppercase tracking-widest text-smoke">
            Tres módulos principales · arquitectura por fases
          </p>
        )}
      </div>
    </div>
  );
}
