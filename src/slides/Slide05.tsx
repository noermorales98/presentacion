import { motion } from "framer-motion";
import { MessageSquare, UserRound, Bot } from "lucide-react";
import { Kicker } from "@/components/ui";

const LEVELS = [
  { icon: MessageSquare, name: "Chat", desc: "Responde.", detail: "Pregunta → respuesta. No recuerda ni actúa." },
  { icon: UserRound, name: "Asistente", desc: "Trabaja con contexto.", detail: "Recuerda el hilo, tu proyecto y tus preferencias." },
  { icon: Bot, name: "Agente", desc: "Usa herramientas y ejecuta pasos.", detail: "Planea, llama herramientas y completa tareas." },
];

const PROMPT_BAD = `Hazme un CRM.`;

const PROMPT_GOOD = `Contexto: CRM para seguimiento de clientes en Next.js 14.
Tarea: agregar filtro por etapa del pipeline en la tabla de clientes.
Restricciones: no tocar la API de pagos; TypeScript estricto.
Criterios de aceptación: el filtro persiste al recargar y tiene prueba unitaria.`;

/** todo visible a la vez: escalera Chat → Asistente → Agente y, debajo, prompt pobre vs. con contexto */
export default function Slide05() {
  return (
    <div className="flex h-full flex-col">
      <Kicker>Cómo hablarle a la IA</Kicker>
      <h2 className="mt-4 font-grotesk text-4xl font-bold tracking-tight md:text-6xl">
        Mientras mejor le hablas, <span className="text-volt">mejor responde</span>
      </h2>

      <div className="mt-8 flex flex-1 flex-col justify-center gap-8">
        <div className="grid grid-cols-3 items-end gap-5">
          {LEVELS.map((lv, i) => {
            const last = i === LEVELS.length - 1;
            return (
              <motion.div
                key={lv.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.12, duration: 0.5 }}
                style={{ minHeight: 150 + i * 36 }}
                className={`flex flex-col justify-end rounded-xl border p-5 ${last ? "border-volt/50 bg-volt/[0.04] backdrop-blur-md" : "border-line bg-panel/50 backdrop-blur-md"}`}
              >
                <div className="flex items-center gap-3">
                  <lv.icon className={`h-7 w-7 ${last ? "text-volt" : "text-bone/80"}`} strokeWidth={1.4} />
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-kicker text-smoke">escalón {i + 1}</p>
                    <h3 className="font-grotesk text-2xl font-bold">{lv.name}</h3>
                  </div>
                </div>
                <p className={`mt-3 font-grotesk text-lg ${last ? "text-volt" : "text-bone/85"}`}>{lv.desc}</p>
                <p className="mt-2 font-mono text-[12px] leading-relaxed text-smoke">{lv.detail}</p>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.55 }}
          className="grid grid-cols-[1fr_1.5fr] gap-5"
        >
          <div className="rounded-xl border border-red-400/40 p-5">
            <p className="font-mono text-[10px] uppercase tracking-kicker text-red-400">prompt pobre</p>
            <p className="mt-3 font-mono text-lg text-bone/80">“{PROMPT_BAD}”</p>
            <p className="mt-3 font-mono text-[11px] text-smoke">Sin contexto, sin restricciones, sin criterios de éxito.</p>
          </div>
          <div className="rounded-xl border border-volt/50 p-5">
            <p className="font-mono text-[10px] uppercase tracking-kicker text-volt">prompt con contexto y criterios</p>
            <p className="mt-3 whitespace-pre-line font-mono text-[12.5px] leading-relaxed text-bone/85">{PROMPT_GOOD}</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
