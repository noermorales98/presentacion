import { useEffect, useRef, useState } from "react";
import { Tag } from "@/components/ui";

export interface TerminalStage {
  title: string;
  lines: string[];
}

/** terminal de demostración SIMULADA: teclea las líneas de cada etapa */
export default function Terminal({ stages, stageIndex }: { stages: TerminalStage[]; stageIndex: number }) {
  const [typed, setTyped] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const stage = stages[Math.min(stageIndex, stages.length - 1)] ?? { title: "", lines: [] as string[] };

  useEffect(() => {
    setTyped([]);
    setDone(false);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTyped(stage.lines);
      setDone(true);
      return;
    }
    let line = 0;
    let ch = 0;
    let cancelled = false;
    const id = window.setInterval(() => {
      if (cancelled) return;
      if (line >= stage.lines.length) {
        window.clearInterval(id);
        setDone(true);
        return;
      }
      ch += 3 + Math.floor(Math.random() * 3);
      // congelar los valores en constantes: la actualización de estado puede
      // ejecutarse después de que line/ch avancen, y si capturara las variables
      // por referencia leería un índice fuera del arreglo (crash en Safari/iPad)
      const curLine = line;
      const curCh = ch;
      const text = stage.lines[curLine] ?? "";
      setTyped((prev) => {
        const next = [...prev];
        next[curLine] = text.slice(0, curCh);
        return next;
      });
      if (ch >= text.length) {
        line += 1;
        ch = 0;
      }
    }, 32);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [stageIndex, stage]);

  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight });
  }, [typed]);

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-line bg-[#07070f] text-left">
      <div className="flex items-center justify-between border-b border-line px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-bone/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-bone/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-bone/15" />
        </div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-smoke">
          noe@noxy: agente-demo
        </span>
        <Tag tone="red">simulación</Tag>
      </div>
      <div className="border-b border-line px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-volt">
        Etapa {Math.min(stageIndex, stages.length - 1) + 1}/{stages.length} · {stage.title}
      </div>
      <div ref={boxRef} className="h-[300px] overflow-y-auto px-4 py-3 font-mono text-[12.5px] md:text-[13px] leading-relaxed">
        {typed.map((ln, i) => (
          <p key={i} className={ln.startsWith("$") ? "text-volt" : "text-bone/85"}>
            {ln || "\u00A0"}
          </p>
        ))}
        {!done && <span className="inline-block h-4 w-2 animate-pulse bg-volt align-middle" />}
        {done && <p className="mt-1 text-smoke">— espacio / → para la siguiente etapa —</p>}
      </div>
    </div>
  );
}
