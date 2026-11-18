import { Kicker, Reveal, Counter, Tag } from "@/components/ui";

interface Row {
  label: string;
  months: number;
  devs: number;
  note: string;
  tone: "blue" | "volt";
}

const ROWS: Row[] = [
  {
    label: "CRM para cliente",
    months: 6,
    devs: 2,
    note: "Requerimientos formales, revisiones con cliente, entregas por fases",
    tone: "blue",
  },
  {
    label: "CRM con apoyo de IA",
    months: 1,
    devs: 1,
    note: "Un desarrollador apoyado por IA, decisiones propias, alcance flexible",
    tone: "volt",
  },
];

/** paso 0: encuadre · paso 1: números con contadores */
export default function Slide04({ step }: { step: number }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Kicker>Caso real</Kicker>
          <h2 className="mt-4 font-grotesk text-4xl font-bold tracking-tight md:text-6xl">
            Mi <span className="text-volt">experiencia</span>
          </h2>
        </div>
        <Tag>proyectos distintos · no es comparación directa</Tag>
      </div>

      <div className="mt-10 grid flex-1 grid-cols-1 content-center gap-10 md:grid-cols-2 md:gap-16">
        {ROWS.map((r, idx) => (
          <div key={r.label} className="border-t border-line pt-6">
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="font-grotesk text-xl font-semibold md:text-2xl">{r.label}</h3>
              <span
                className={`font-mono text-[10px] uppercase tracking-kicker ${
                  r.tone === "volt" ? "text-volt" : "text-smoke"
                }`}
              >
                {r.tone === "volt" ? "con apoyo de IA" : "proyecto tradicional"}
              </span>
            </div>

            {/* barra de tiempo */}
            <div className="mt-6 h-1.5 w-full rounded-full bg-bone/10">
              <Reveal
                show={step >= 1}
                delay={0.1 + idx * 0.15}
                y={0}
                className="h-full"
              >
                <div
                  className={`h-full rounded-full ${r.tone === "volt" ? "bg-volt" : "bg-bone/25"}`}
                  style={{ width: `${(r.months / 6) * 100}%` }}
                />
              </Reveal>
            </div>

            <div className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-kicker text-smoke">duración</p>
                <p className="mt-1 font-grotesk text-5xl font-bold tabular md:text-6xl">
                  {step >= 1 ? <Counter to={r.months} suffix=" mes" /> : "—"}
                </p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-kicker text-smoke">equipo</p>
                <p className="mt-1 font-grotesk text-5xl font-bold tabular md:text-6xl">
                  {step >= 1 ? <Counter to={r.devs} suffix={r.devs === 1 ? " dev" : " devs"} /> : "—"}
                </p>
              </div>
            </div>

            <p className="mt-5 max-w-md font-mono text-[12px] leading-relaxed text-smoke">{r.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
