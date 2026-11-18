import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";
import { Kicker } from "@/components/ui";
import { TALK } from "@/deck/DeckContext";

/** Cierre minimalista: paso 0 "Aprende a programar." · paso 1 "aprende a construir." */
export default function Slide12({ step }: { step: number }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <Kicker>Cierre</Kicker>

      <div className="mt-10">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="font-grotesk text-6xl font-bold tracking-tight text-ink md:text-8xl"
        >
          Aprende a programar.
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={step >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 font-grotesk text-6xl font-bold tracking-tight text-volt md:text-8xl"
        >
          Pero, sobre todo,
          <br />
          aprende a construir.
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={step >= 1 ? { opacity: 1 } : {}}
        transition={{ delay: 0.5, duration: 0.7 }}
        className="mt-14 flex items-center gap-6"
      >
        <div className="rounded-2xl bg-ink p-2.5">
          <QRCodeSVG value={TALK.siteUrl} size={92} bgColor="#0B0B18" fgColor="#F2EDE3" />
        </div>
        <div className="text-left">
          <p className="font-grotesk text-lg font-semibold text-ink">{TALK.studio}</p>
          <p className="font-mono text-[11px] uppercase tracking-widest text-ink/60">
            {TALK.siteUrl.replace("https://", "")} — QR configurable en src/config/presentation.ts
          </p>
          <p className="mt-2 font-mono text-[11px] text-ink/60">{TALK.speaker} · {TALK.date}</p>
        </div>
      </motion.div>
    </div>
  );
}
