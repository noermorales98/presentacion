import { useRef } from "react";
import { motion, useAnimationFrame } from "framer-motion";
import { Kicker } from "@/components/ui";

const FAMOUS = [
  { file: "elon.svg", name: "Elon" },
  { file: "jeff.svg", name: "Jeff" },
  { file: "mark.svg", name: "Mark" },
  { file: "steve.svg", name: "Steve" },
];

const RX = 520; // radio horizontal de la órbita (px del lienzo)
const RY = 250; // radio vertical
const SIZE = 150;

/** Cierre, parte 1: una pregunta, con los rostros orbitando en círculo sobre el texto */
export default function Slide08() {
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useAnimationFrame((t) => {
    const base = t / 1000 * 0.35; // vueltas lentas
    refs.current.forEach((el, i) => {
      if (!el) return;
      const a = base + (i * Math.PI * 2) / FAMOUS.length;
      const bob = Math.sin(t / 700 + i * 1.7) * 10; // flotar
      el.style.transform = `translate(${Math.cos(a) * RX - SIZE / 2}px, ${Math.sin(a) * RY - SIZE / 2 + bob}px)`;
    });
  });

  return (
    <div className="relative flex h-full flex-col items-center justify-center text-center">
      <Kicker>Cierre</Kicker>
      <motion.p
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="mt-10 max-w-[1100px] font-grotesk text-6xl font-bold leading-tight tracking-tight text-balance text-ink md:text-7xl"
      >
        Si tuvieras a un empresario famoso de frente,{" "}
        <span className="text-volt">¿qué le preguntarías?</span>
      </motion.p>

      {/* órbita centrada; las imágenes van por encima del texto */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-0 w-0">
        {FAMOUS.map((f, i) => (
          <div
            key={f.file}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className="absolute left-0 top-0"
            style={{ width: SIZE, height: SIZE, transform: `translate(${-SIZE / 2}px, ${-SIZE / 2}px)` }}
          >
            <img
              src={`${import.meta.env.BASE_URL}${f.file}`}
              alt={f.name}
              className="h-full w-full rounded-full border-4 border-ink bg-bone object-cover shadow-xl"
              style={{ imageRendering: "pixelated" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
