import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";
import { Kicker } from "@/components/ui";
import { TALK } from "@/deck/DeckContext";

/** Última escena: mensaje final y QR para seguirme en redes */
export default function Slide09() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <Kicker>Cierre</Kicker>

      <motion.p
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="mt-10 font-grotesk text-6xl font-bold leading-tight tracking-tight text-ink md:text-7xl"
      >
        Aprende a programar.
        <br />
        <span className="text-volt">Pero, sobre todo, aprende a construir.</span>
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.7 }}
        className="mt-14 flex items-center gap-6"
      >
        <div className="rounded-2xl bg-ink p-2.5">
          <QRCodeSVG value={TALK.linksUrl} size={110} bgColor="#0B0B18" fgColor="#F2EDE3" />
        </div>
        <div className="text-left">
          <p className="font-grotesk text-xl font-semibold text-ink">Sígueme en redes</p>
          <p className="font-mono text-[11px] uppercase tracking-widest text-ink/60">
            {TALK.linksUrl.replace("https://", "")}
          </p>
          <p className="mt-2 font-mono text-[11px] text-ink/60">
            {TALK.speaker} · {TALK.studio}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
