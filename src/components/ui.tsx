import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, animate, useInView } from "framer-motion";

/** kicker en mono, etiqueta superior de cada escena */
export function Kicker({ children, tone = "volt" }: { children: ReactNode; tone?: "volt" | "smoke" | "blue" }) {
  const color =
    tone === "volt" ? "text-volt" : tone === "blue" ? "text-lime" : "text-smoke";
  return (
    <p className={`font-mono text-[11px] md:text-xs tracking-kicker uppercase ${color}`}>
      {children}
    </p>
  );
}

/** entrada escalonada; `show` permite controlar la revelación por pasos */
export function Reveal({
  children,
  delay = 0,
  show = true,
  className = "",
  y = 26,
}: {
  children: ReactNode;
  delay?: number;
  show?: boolean;
  className?: string;
  y?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, scale: 0.985 }}
      animate={show ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y, scale: 0.985 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** número que cuenta hacia arriba al aparecer */
export function Counter({
  to,
  prefix = "",
  suffix = "",
  duration = 1.4,
  className = "",
}: {
  to: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setVal(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, to, duration]);

  return (
    <span ref={ref} className={`tabular ${className}`}>
      {prefix}
      {val.toLocaleString("es-MX")}
      {suffix}
    </span>
  );
}

/** etiqueta pequeña de datos */
export function Tag({ children, tone = "line" }: { children: ReactNode; tone?: "line" | "volt" | "blue" | "red" }) {
  const map = {
    line: "border-line text-smoke",
    volt: "border-volt/40 text-volt",
    blue: "border-lime/50 text-lime",
    red: "border-red-400/50 text-red-400",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] uppercase tracking-widest ${map[tone]}`}>
      {children}
    </span>
  );
}

/** bloque de código con numeración sutil */
export function CodeBlock({ code, lang = "tsx", highlight }: { code: string; lang?: string; highlight?: number[] }) {
  const lines = code.replace(/\n$/, "").split("\n");
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-[#0d0d1c]/90">
      <div className="flex items-center justify-between border-b border-line px-4 py-2">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-bone/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-bone/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-bone/15" />
        </div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-smoke">{lang}</span>
      </div>
      <pre className="px-4 py-3 text-left font-mono text-[12.5px] md:text-[13.5px] leading-relaxed overflow-x-auto">
        {lines.map((ln, i) => (
          <div key={i} className={highlight?.includes(i + 1) ? "bg-red-500/10 -mx-4 px-4" : ""}>
            <span className="select-none text-bone/25 mr-4 tabular">{String(i + 1).padStart(2, "0")}</span>
            <span className={highlight?.includes(i + 1) ? "text-red-300" : "text-bone/85"}>{ln}</span>
          </div>
        ))}
      </pre>
    </div>
  );
}

/** botón de avance reutilizable (siempre con acción real) */
export function ActionButton({
  children,
  onClick,
  tone = "volt",
}: {
  children: ReactNode;
  onClick: () => void;
  tone?: "volt" | "ghost";
}) {
  return (
    <button
      onClick={onClick}
      className={
        tone === "volt"
          ? "rounded-full bg-volt px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-bone transition-colors hover:bg-bone hover:text-ink cursor-pointer"
          : "rounded-full border border-line px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-bone/80 transition-colors hover:border-volt/60 hover:text-volt cursor-pointer"
      }
    >
      {children}
    </button>
  );
}

/** placeholder de imagen/video claramente identificado */
export function MediaSlot({
  label,
  hint,
  ratio = "16/9",
}: {
  label: string;
  hint: string;
  ratio?: string;
}) {
  return (
    <div
      className="relative flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-bone/25 bg-bone/[0.03]"
      style={{ aspectRatio: ratio }}
    >
      <span className="font-mono text-[10px] uppercase tracking-kicker text-volt">placeholder</span>
      <span className="font-grotesk text-sm text-bone/80">{label}</span>
      <span className="max-w-[80%] text-center font-mono text-[11px] text-smoke">{hint}</span>
    </div>
  );
}
