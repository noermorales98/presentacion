import { motion } from "framer-motion";
import { MessageSquare, UserRound, Bot, ShieldCheck, ArrowRight } from "lucide-react";
import { Kicker, Reveal } from "@/components/ui";

const LEVELS = [
  {
    icon: MessageSquare,
    name: "Chat",
    desc: "Responde.",
    detail: "Pregunta → respuesta. No recuerda ni actúa.",
  },
  {
    icon: UserRound,
    name: "Asistente",
    desc: "Trabaja con contexto.",
    detail: "Recuerda el hilo, tu proyecto y tus preferencias.",
  },
  {
    icon: Bot,
    name: "Agente",
    desc: "Usa herramientas y ejecuta pasos.",
    detail: "Planea, llama herramientas y completa tareas.",
  },
];

const FLOW = ["Modelo", "Herramienta", "Acción", "Resultado", "Evaluación"];

/** pasos 0..2 revelan los tres niveles; el flujo aparece con el agente */
export default function Slide07({ step }: { step: number }) {
  return (
    <div className="flex h-full flex-col">
      <Kicker>Concepto clave</Kicker>
      <h2 className="mt-4 font-grotesk text-4xl font-bold tracking-tight md:text-6xl">
        Chat <span className="text-smoke">·</span> Asistente <span className="text-smoke">·</span>{" "}
        <span className="text-volt">Agente</span>
      </h2>

      <div className="mt-10 flex flex-1 flex-col justify-center gap-10">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
          {LEVELS.map((lv, i) => {
            const on = step >= i;
            const last = i === LEVELS.length - 1;
            return (
              <motion.div
                key={lv.name}
                initial={false}
                animate={{ opacity: on ? 1 : 0.28, y: on ? 0 : 14 }}
                transition={{ duration: 0.5 }}
                className={`rounded-xl border p-6 ${last && on ? "border-volt/50 bg-volt/[0.04]" : "border-line bg-panel/50"}`}
              >
                <lv.icon className={`h-8 w-8 ${last && on ? "text-volt" : "text-bone/80"}`} strokeWidth={1.4} />
                <p className="mt-5 font-mono text-[10px] uppercase tracking-kicker text-smoke">
                  nivel {i + 1}
                </p>
                <h3 className="mt-1 font-grotesk text-2xl font-bold">{lv.name}</h3>
                <p className={`mt-2 font-grotesk text-lg ${last && on ? "text-volt" : "text-bone/85"}`}>
                  {lv.desc}
                </p>
                <p className="mt-3 font-mono text-[12px] leading-relaxed text-smoke">{lv.detail}</p>
              </motion.div>
            );
          })}
        </div>

        <Reveal show={step >= 2} delay={0.2}>
          <div className="rounded-xl border border-line bg-panel/50 p-5">
            <p className="mb-4 font-mono text-[10px] uppercase tracking-kicker text-smoke">
              flujo de un agente
            </p>
            <div className="flex flex-wrap items-center gap-y-3">
              {FLOW.map((f, i) => (
                <div key={f} className="flex items-center">
                  <motion.span
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + i * 0.14 }}
                    className={`rounded-full border px-3.5 py-2 font-mono text-[12px] uppercase tracking-widest ${
                      i === FLOW.length - 1
                        ? "border-volt/50 text-volt"
                        : "border-bone/20 text-bone/85"
                    }`}
                  >
                    {f}
                  </motion.span>
                  {i < FLOW.length - 1 && <ArrowRight className="mx-2 h-4 w-4 text-smoke" />}
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-2 border-t border-line pt-4 font-mono text-[11px] uppercase tracking-widest text-smoke">
              <span className="flex items-center gap-2 text-volt">
                <ShieldCheck className="h-4 w-4" /> permisos explícitos
              </span>
              <span>supervisión humana en cada paso crítico</span>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
