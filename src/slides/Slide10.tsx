import { Kicker } from "@/components/ui";
import Terminal, { type TerminalStage } from "@/components/Terminal";

const STAGES: TerminalStage[] = [
  {
    title: "Inspección del proyecto",
    lines: [
      "$ hermes inspect ./crm",
      "→ Estructura: Next.js 14 · app/ · components/ · lib/db.ts",
      "→ Encontrado: tabla de clientes sin filtros (lib/clientes.ts)",
      "→ Concluye: agregar filtro por etapa del pipeline",
    ],
  },
  {
    title: "Propuesta de plan",
    lines: [
      "$ hermes plan",
      "1. Leer lib/clientes.ts y el componente de la tabla",
      "2. Agregar estado de filtro (etapa) con persistencia en URL",
      "3. Escribir prueba: el filtro persiste al recargar",
      "→ Pide aprobación antes de tocar archivos",
    ],
  },
  {
    title: "Modificación de archivos",
    lines: [
      "$ hermes apply",
      "→ edit lib/clientes.ts        +12 −3",
      "→ edit components/TablaClientes.tsx   +28 −6",
      "→ create lib/__tests__/filtro.test.ts   +18",
      "→ Diff listo para revisión humana",
    ],
  },
  {
    title: "Ejecución de pruebas",
    lines: [
      "$ npm test",
      "PASS  lib/__tests__/filtro.test.ts",
      "  ✓ filtra por etapa (24 ms)",
      "  ✓ persiste al recargar (11 ms)",
      "Tests: 2 passed, 2 total",
    ],
  },
  {
    title: "Revisión de cambios",
    lines: [
      "$ hermes review",
      "→ Resumen: filtro por etapa + pruebas + persistencia en URL",
      "→ Sugerencia: extraer el filtro a un hook reutilizable",
      "→ Todo aprobado por el desarrollador (supervisión humana)",
      "$ ✔ tarea completada",
    ],
  },
];

/** Las 5 etapas se avanzan con → / espacio (sistema de pasos del deck) */
export default function Slide10({ step }: { step: number }) {
  return (
    <div className="flex h-full flex-col">
      <Kicker>Demo en vivo</Kicker>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="mt-4 font-grotesk text-4xl font-bold tracking-tight md:text-6xl">
          Vamos a <span className="text-volt">probarlo</span>
        </h2>
        <p className="max-w-sm font-mono text-[11px] leading-relaxed text-smoke">
          Escenario: un agente agrega un filtro de clientes a un pequeño CRM.
          Avanza con → o espacio. Terminal simulada — no es una ejecución real.
        </p>
      </div>

      <div className="mt-8 grid flex-1 grid-cols-1 gap-6 md:grid-cols-[2fr_1fr]">
        <Terminal stages={STAGES} stageIndex={step} />
        <div className="hidden flex-col gap-3 md:flex">
          {STAGES.map((s, i) => (
            <div
              key={s.title}
              className={`flex items-center gap-3 rounded-full border px-3 py-2 font-mono text-[11px] uppercase tracking-widest transition-colors ${
                i === step
                  ? "border-volt/60 text-volt"
                  : i < step
                    ? "border-line text-bone/50"
                    : "border-line text-smoke"
              }`}
            >
              <span className="tabular">{String(i + 1).padStart(2, "0")}</span>
              {s.title}
              {i < step && <span className="ml-auto">✓</span>}
            </div>
          ))}
          <div className="mt-auto border border-dashed border-bone/25 p-3 font-mono text-[10.5px] leading-relaxed text-smoke">
            Espacio reservado: aquí va la grabación de la demo real (video o gif)
            cuando esté disponible.
          </div>
        </div>
      </div>
    </div>
  );
}
