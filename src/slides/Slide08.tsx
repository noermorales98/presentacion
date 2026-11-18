import { motion } from "framer-motion";
import { Zap, SquareTerminal } from "lucide-react";
import { Kicker, MediaSlot } from "@/components/ui";

const AGENTS = [
  {
    icon: Zap,
    name: "Grok Bot",
    desc: "Automatización de tareas cotidianas con aplicaciones y servicios conectados.",
    points: ["Dispara flujos entre apps", "Responde y actúa en segundo plano", "Conecta servicios que no hablan entre sí"],
    logoHint: "Logo oficial pendiente — agregar en src/assets/agents/",
  },
  {
    icon: SquareTerminal,
    name: "Hermes Agent",
    desc: "Agente configurable desde la terminal: herramientas, pasos y criterios bajo tu control.",
    points: ["Trabaja con herramientas del sistema", "Configurable por archivos de tarea", "Cada acción queda registrada"],
    logoHint: "Logo oficial pendiente — agregar en src/assets/agents/",
  },
];

export default function Slide08() {
  return (
    <div className="flex h-full flex-col">
      <Kicker>Agentes propios</Kicker>
      <h2 className="mt-4 font-grotesk text-4xl font-bold tracking-tight md:text-6xl">
        Grok Bot <span className="text-smoke">y</span> <span className="text-volt">Hermes Agent</span>
      </h2>

      <div className="mt-8 grid flex-1 grid-cols-1 gap-5 md:grid-cols-2 md:gap-8">
        {AGENTS.map((a, i) => (
          <motion.article
            key={a.name}
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.14, duration: 0.55 }}
            className="flex min-h-0 flex-col rounded-2xl border border-line bg-panel/60 p-6"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {/* logo placeholder: círculo con icono hasta agregar el logo oficial */}
                <span className="flex h-14 w-14 items-center justify-center border border-bone/20 bg-ink">
                  <a.icon className="h-7 w-7 text-volt" strokeWidth={1.4} />
                </span>
                <div>
                  <h3 className="font-grotesk text-2xl font-bold">{a.name}</h3>
                  <p className="font-mono text-[10px] uppercase tracking-kicker text-smoke">
                    {a.logoHint}
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-5 font-grotesk text-lg leading-snug text-bone/85">{a.desc}</p>

            <ul className="mt-4 space-y-2">
              {a.points.map((p) => (
                <li key={p} className="flex items-center gap-3 font-mono text-[12.5px] text-bone/80">
                  <span className="h-px w-4 bg-volt" /> {p}
                </li>
              ))}
            </ul>

            <div className="mt-5 min-h-0 flex-1">
              <MediaSlot
                label={`Video o captura · ${a.name}`}
                hint="Espacio preparado para demos reales — no se muestran ejecuciones inventadas"
                ratio="16/9"
              />
            </div>
          </motion.article>
        ))}
      </div>
    </div>
  );
}
