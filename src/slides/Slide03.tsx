import { motion, AnimatePresence } from "framer-motion";
import { FileCode2, Network } from "lucide-react";
import { Kicker, Reveal, CodeBlock } from "@/components/ui";

const CODE = `function guardarCliente(nombre, email) {
  const cliente = db.clientes.insert({ nombre, email });
  return cliente;
}`;

const NODES = [
  { label: "Usuarios", x: 8, y: 20 },
  { label: "Interfaz", x: 8, y: 62 },
  { label: "API", x: 42, y: 40 },
  { label: "Base de datos", x: 74, y: 16 },
  { label: "Servicios", x: 76, y: 64 },
];

const EDGES: Array<[number, number]> = [
  [0, 1],
  [1, 2],
  [2, 3],
  [2, 4],
];

/** paso 0: editor · paso 1: arquitectura (la frase final siempre es visible) */
export default function Slide03({ step }: { step: number }) {
  const showArch = step >= 1;

  return (
    <div className="flex h-full flex-col">
      <Kicker>Concepto clave</Kicker>
      <h2 className="mt-4 font-grotesk text-4xl font-bold tracking-tight md:text-6xl">
        Escribir código <span className="text-smoke">vs.</span>{" "}
        <span className="text-volt">desarrollar</span>
      </h2>

      <div className="relative mt-8 flex-1">
        <AnimatePresence mode="wait">
          {!showArch ? (
            <motion.div
              key="code"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24, scale: 0.98 }}
              transition={{ duration: 0.5 }}
              className="grid h-full grid-cols-1 items-center gap-8 md:grid-cols-2"
            >
              <div>
                <div className="flex items-center gap-3 text-smoke">
                  <FileCode2 className="h-5 w-5" />
                  <span className="font-mono text-xs uppercase tracking-kicker">nivel 1 · sintaxis</span>
                </div>
                <p className="mt-4 max-w-md font-grotesk text-xl leading-relaxed text-bone/80 md:text-2xl">
                  Un editor con código que compila. Es lo primero que aprendemos —
                  y lo que la IA hace cada vez mejor.
                </p>
              </div>
              <CodeBlock code={CODE} lang="ts" />
            </motion.div>
          ) : (
            <motion.div
              key="arch"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.5 }}
              className="grid h-full grid-cols-1 items-center gap-8 md:grid-cols-2"
            >
              <div>
                <div className="flex items-center gap-3 text-volt">
                  <Network className="h-5 w-5" />
                  <span className="font-mono text-xs uppercase tracking-kicker">nivel 2 · sistema</span>
                </div>
                <p className="mt-4 max-w-md font-grotesk text-xl leading-relaxed text-bone/80 md:text-2xl">
                  Usuarios, interfaz, API, base de datos y servicios conectados.
                  Decisiones que ningún modelo toma por ti.
                </p>
              </div>
              <div className="relative h-[300px] rounded-2xl border border-line bg-panel/60 backdrop-blur-md md:h-[340px]">
                <svg viewBox="0 0 100 84" className="absolute inset-0 h-full w-full" aria-hidden>
                  {EDGES.map(([a, b], i) => (
                    <motion.line
                      key={i}
                      x1={NODES[a].x + 9}
                      y1={NODES[a].y + 5}
                      x2={NODES[b].x + 2}
                      y2={NODES[b].y + 5}
                      stroke="#2F5BFF"
                      strokeWidth="0.35"
                      strokeDasharray="2 1.4"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 0.8 }}
                      transition={{ delay: 0.25 + i * 0.16, duration: 0.7 }}
                    />
                  ))}
                </svg>
                {NODES.map((n, i) => (
                  <motion.div
                    key={n.label}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.12 + i * 0.13 }}
                    className="absolute border border-bone/25 bg-ink px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-widest text-bone/85 md:text-[11px]"
                    style={{ left: `${n.x}%`, top: `${n.y}%` }}
                  >
                    {n.label}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Reveal show className="pb-2">
        <p className="font-grotesk text-2xl font-semibold md:text-4xl">
          “Escribir código es <span className="text-volt">solo una parte</span>.”
        </p>
      </Reveal>
    </div>
  );
}
