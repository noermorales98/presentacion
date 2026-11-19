import { type ReactNode } from "react";
import { motion } from "framer-motion";

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

const KEYWORDS = new Set([
  "function", "const", "let", "var", "return", "if", "else", "await", "async", "import", "from", "export", "new", "true", "false", "null",
]);

/** resaltado de sintaxis mínimo (palabras clave, cadenas, números, comentarios, llamadas) */
function highlightLine(ln: string): ReactNode[] {
  const re = /(\/\/.*$|#.*$)|("[^"]*"|'[^']*'|`[^`]*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)(\s*\()?|(\s+|.)/g;
  const out: ReactNode[] = [];
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(ln))) {
    const [full, com, str, num, id, call] = m;
    if (com) out.push(<span key={k++} className="italic text-bone/40">{com}</span>);
    else if (str) out.push(<span key={k++} className="text-lime">{str}</span>);
    else if (num) out.push(<span key={k++} className="text-amber-300">{num}</span>);
    else if (id && KEYWORDS.has(id)) out.push(<span key={k++} className="font-semibold text-fuchsia-400">{id}</span>);
    else if (id && call) {
      out.push(<span key={k++} className="text-sky-300">{id}</span>);
      out.push(<span key={k++}>{call}</span>);
    } else out.push(<span key={k++}>{full}</span>);
    if (m[0] === "") re.lastIndex++;
  }
  return out;
}

/** bloque de código con colores y numeración; size lg para código protagonista */
export function CodeBlock({
  code,
  lang = "tsx",
  highlight,
  size = "md",
}: {
  code: string;
  lang?: string;
  highlight?: number[];
  size?: "md" | "lg";
}) {
  const lines = code.replace(/\n$/, "").split("\n");
  const big = size === "lg";
  return (
    <div className="overflow-hidden rounded-2xl border border-volt/30 bg-[#0a0a18]/95 backdrop-blur-md">
      <div className={`flex items-center justify-between border-b border-line bg-bone/[0.04] ${big ? "px-6 py-3.5" : "px-4 py-2"}`}>
        <div className="flex gap-2">
          <span className={`rounded-full bg-red-400/80 ${big ? "h-3.5 w-3.5" : "h-2.5 w-2.5"}`} />
          <span className={`rounded-full bg-amber-300/80 ${big ? "h-3.5 w-3.5" : "h-2.5 w-2.5"}`} />
          <span className={`rounded-full bg-lime/80 ${big ? "h-3.5 w-3.5" : "h-2.5 w-2.5"}`} />
        </div>
        <span className={`font-mono uppercase tracking-widest text-volt ${big ? "text-sm" : "text-[10px]"}`}>{lang}</span>
      </div>
      <pre
        className={`text-left font-mono overflow-x-auto ${
          big ? "px-6 py-6 text-[22px] leading-[1.7] md:text-[26px]" : "px-4 py-3 text-[15px] leading-relaxed md:text-[17px]"
        }`}
      >
        {lines.map((ln, i) => {
          const hl = highlight?.includes(i + 1);
          return (
            <div key={i} className={`text-bone/90 ${hl ? `bg-red-500/15 ${big ? "-mx-6 px-6" : "-mx-4 px-4"}` : ""}`}>
              <span className={`select-none tabular text-bone/25 ${big ? "mr-6" : "mr-4"}`}>{String(i + 1).padStart(2, "0")}</span>
              <span className={hl ? "text-red-300" : ""}>{hl ? ln : highlightLine(ln)}</span>
            </div>
          );
        })}
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
      className="relative flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-bone/25 bg-bone/[0.03] backdrop-blur-md"
      style={{ aspectRatio: ratio }}
    >
      <span className="font-mono text-[10px] uppercase tracking-kicker text-volt">placeholder</span>
      <span className="font-grotesk text-sm text-bone/80">{label}</span>
      <span className="max-w-[80%] text-center font-mono text-[11px] text-smoke">{hint}</span>
    </div>
  );
}
