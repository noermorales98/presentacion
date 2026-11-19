import { motion } from "framer-motion";

/** Escena del video de demo (public/01.mp4), sin marco de navegador ni controles. */
export default function Slide04() {
  return (
    <div className="flex h-full flex-col">
      <div className="text-center">
        <h2 className="font-grotesk text-4xl font-bold tracking-tight md:text-6xl">
          Desarrollo de Software <span className="text-volt">más rápido</span>
        </h2>
        <p className="mt-3 font-grotesk text-xl leading-snug text-bone/85">
          Con IA puedo hacer el trabajo de <span className="text-volt">varias personas</span>.
        </p>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-smoke">
          Ejemplo de lo que se puede hacer con IA. No es una venta.
        </p>
      </div>

      {/* solo el video (public/01.mp4), lo más grande posible y con esquinas redondeadas */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="relative mt-6 min-h-0 flex-1"
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <video
            src={`${import.meta.env.BASE_URL}01.mp4`}
            muted
            preload="auto"
            loop
            autoPlay
            playsInline
            className="max-h-full max-w-full rounded-3xl border border-line shadow-2xl"
          />
        </div>
      </motion.div>
    </div>
  );
}
