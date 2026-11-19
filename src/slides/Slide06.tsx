import { motion } from "framer-motion";
import { Sparkles, Zap, SquareTerminal, Waypoints, MessageCircleQuestion, ArrowRight } from "lucide-react";
import { Kicker } from "@/components/ui";

const asset = (f: string) => `${import.meta.env.BASE_URL}${f}`;

const OTHERS = [
  { icon: Zap, name: "Grok Bot", desc: "Automatiza tareas y apps conectadas.", logo: "grok-bot-logo.png" },
  { icon: SquareTerminal, name: "Hermes", desc: "Agente configurable desde la terminal.", logo: "hermes.png" },
  { icon: Waypoints, name: "OpenRouter", desc: "Una sola integración, muchos modelos.", logo: "openrouter.avif" },
];

/** hueco claramente marcado donde irían logos o videos reales */
function LogoSlot({ name, src }: { name: string; src?: string }) {
  if (src)
    return <img src={asset(src)} alt={`Logo de ${name}`} className="h-12 w-12 shrink-0 rounded-lg object-cover" />;
  return (
    <span
      className="flex h-12 w-12 shrink-0 flex-col items-center justify-center border border-dashed border-bone/25 bg-bone/[0.03] backdrop-blur-md text-center font-mono text-[8px] uppercase leading-tight text-smoke"
      title={`Logo oficial de ${name} pendiente`}
    >
      logo
      <br />
      pendiente
    </span>
  );
}

export default function Slide06() {
  return (
    <div className="flex h-full flex-col">
      <Kicker>Mis herramientas</Kicker>
      <h2 className="mt-4 font-grotesk text-4xl font-bold tracking-tight md:text-6xl">
        Con qué <span className="text-volt">construyo</span>
      </h2>

      <div className="mt-8 grid flex-1 grid-cols-1 gap-5 md:grid-cols-[1.5fr_1fr]">
        {/* 1 · destacada */}
        <motion.article
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.55 }}
          className="flex min-h-0 flex-col rounded-2xl border border-volt/50 bg-volt/[0.05] backdrop-blur-md p-7"
        >
          <div className="flex items-center gap-4">
            <LogoSlot name="Claude" src="claude.jpg" />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-kicker text-volt">1 · destacada</p>
              <h3 className="font-grotesk text-3xl font-bold">Claude + MCP</h3>
            </div>
            <Sparkles className="ml-auto h-6 w-6 text-volt" strokeWidth={1.4} />
          </div>

          <p className="mt-4 font-grotesk text-3xl font-bold leading-tight">
            Le hablo a <span className="text-volt">mi CRM</span>.
          </p>

          <div className="mt-5 grid flex-1 grid-cols-[1fr_auto_1fr] items-stretch gap-4">
            <div className="rounded-xl border border-line flex flex-col justify-center bg-ink/60 backdrop-blur-md p-5">
              <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-kicker text-smoke">
                <MessageCircleQuestion className="h-3.5 w-3.5" /> pregunta
              </p>
              <p className="mt-2 font-grotesk text-2xl leading-snug text-bone/90">“¿Qué clientes llevan una semana sin seguimiento?”</p>
            </div>
            <div className="flex items-center">
              <ArrowRight className="h-4 w-4 text-volt" />
            </div>
            <div className="rounded-xl border border-volt/40 flex flex-col justify-center bg-ink/60 backdrop-blur-md p-5">
              <p className="font-mono text-[10px] uppercase tracking-kicker text-volt">acción</p>
              <p className="mt-2 font-grotesk text-2xl leading-snug text-bone/90">“Crea un recordatorio para esos clientes.”</p>
            </div>
          </div>

          {/* video (public/02.mp4, muy panorámico): lo más grande que quepa */}
          <video
            src={`${import.meta.env.BASE_URL}02.mp4`}
            muted
            preload="auto"
            loop
            autoPlay
            playsInline
            className="mt-5 block w-full rounded-xl border border-line"
          />
        </motion.article>

        {/* 2–4 */}
        <div className="flex min-h-0 flex-col gap-5">
          {OTHERS.map((o, i) => (
            <motion.article
              key={o.name}
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.12, duration: 0.55 }}
              className="flex flex-1 items-center gap-4 rounded-2xl border border-line bg-panel/60 backdrop-blur-md p-5"
            >
              <LogoSlot name={o.name} src={o.logo} />
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-kicker text-smoke">{i + 2}</p>
                <h3 className="flex items-center gap-2 font-grotesk text-2xl font-bold">
                  {o.name} <o.icon className="h-4 w-4 text-volt" strokeWidth={1.5} />
                </h3>
                <p className="mt-1 font-grotesk text-base leading-snug text-bone/80">{o.desc}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </div>
  );
}
