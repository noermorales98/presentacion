import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  SourceCodeIcon,
  Settings02Icon,
  UserMultiple02Icon,
  ComputerIcon,
  ApiIcon,
  Database01Icon,
  CloudServerIcon,
} from "@hugeicons/core-free-icons";
import { Kicker, Reveal, CodeBlock } from "@/components/ui";

const CODE = `function guardarCliente(nombre, email) {
  const cliente = db.clientes.insert({ nombre, email });
  return cliente;
}`;

const NODES = [
  { label: "Usuarios", icon: UserMultiple02Icon, x: 15, y: 24 },
  { label: "Interfaz", icon: ComputerIcon, x: 15, y: 76 },
  { label: "API", icon: ApiIcon, x: 47, y: 50 },
  { label: "Base de datos", icon: Database01Icon, x: 80, y: 24 },
  { label: "Servicios", icon: CloudServerIcon, x: 80, y: 76 },
];

const EDGES: Array<[number, number]> = [
  [0, 1],
  [1, 2],
  [2, 3],
  [2, 4],
];


/** diagrama: las líneas se recalculan cada frame desde la posición real de los nodos, así siguen su flote */
function Arch() {
  const boxRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Array<HTMLDivElement | null>>([]);
  const lineRefs = useRef<Array<SVGLineElement | null>>([]);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      const box = boxRef.current;
      if (box) {
        const o = box.getBoundingClientRect();
        const c = nodeRefs.current.map((el) => {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { x: r.left - o.left + r.width / 2, y: r.top - o.top + r.height / 2 };
        });
        EDGES.forEach(([a, b], i) => {
          const ln = lineRefs.current[i];
          if (!ln || !c[a] || !c[b]) return;
          ln.setAttribute("x1", String(c[a]!.x));
          ln.setAttribute("y1", String(c[a]!.y));
          ln.setAttribute("x2", String(c[b]!.x));
          ln.setAttribute("y2", String(c[b]!.y));
        });
      }
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={boxRef} className="relative h-[300px] rounded-2xl border border-line bg-panel/60 backdrop-blur-md md:h-[340px]">
      <svg className="absolute inset-0 h-full w-full" aria-hidden>
        {EDGES.map((_, i) => (
          <motion.line
            key={i}
            ref={(el) => {
              lineRefs.current[i] = el;
            }}
            stroke="#2F5BFF"
            strokeWidth="2"
            strokeDasharray="8 6"
            strokeLinecap="round"
            className="flow-line"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.9 }}
            transition={{ delay: 0.3 + i * 0.15, duration: 0.6 }}
          />
        ))}
      </svg>
      {NODES.map((n, i) => (
        <div
          key={n.label}
          className="absolute"
          style={{ left: `${n.x}%`, top: `${n.y}%`, transform: "translate(-50%, -50%)" }}
        >
          <motion.div
            ref={(el) => {
              nodeRefs.current[i] = el;
            }}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1, y: [0, -9, 0, 7, 0] }}
            transition={{
              opacity: { delay: 0.12 + i * 0.13 },
              scale: { delay: 0.12 + i * 0.13 },
              y: { duration: 4 + (i % 3) * 0.7, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 },
            }}
            className="flex items-center gap-2 whitespace-nowrap rounded-lg border border-volt/40 bg-ink px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-bone/90 shadow-[0_0_24px_-6px_rgba(47,91,255,0.6)] md:text-[12px]"
          >
            <HugeiconsIcon icon={n.icon} size={22} className="text-volt" />
            {n.label}
          </motion.div>
        </div>
      ))}
    </div>
  );
}

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
              className="grid h-full grid-cols-1 items-center gap-8 md:grid-cols-[0.8fr_1.4fr]"
            >
              <div>
                <div className="flex items-center gap-3 text-smoke">
                  <HugeiconsIcon icon={SourceCodeIcon} size={28} />
                  <span className="font-mono text-xs uppercase tracking-kicker">nivel 1 · sintaxis</span>
                </div>
                <p className="mt-4 max-w-md font-grotesk text-xl leading-relaxed text-bone/80 md:text-2xl">
                  Un editor con código que compila. Es lo primero que aprendemos —
                  y lo que la IA hace cada vez mejor.
                </p>
              </div>
              <CodeBlock code={CODE} lang="ts" size="lg" />
            </motion.div>
          ) : (
            <motion.div
              key="arch"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.5 }}
              className="grid h-full grid-cols-1 items-center gap-8 md:grid-cols-[0.8fr_1.4fr]"
            >
              <div>
                <div className="flex items-center gap-3 text-volt">
                  <HugeiconsIcon icon={Settings02Icon} size={28} />
                  <span className="font-mono text-xs uppercase tracking-kicker">nivel 2 · sistema</span>
                </div>
                <p className="mt-4 max-w-md font-grotesk text-xl leading-relaxed text-bone/80 md:text-2xl">
                  Usuarios, interfaz, API, base de datos y servicios conectados.
                  Decisiones que ningún modelo toma por ti.
                </p>
              </div>
              <Arch />
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
