import { useEffect, useRef, useState, type ComponentType } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { registerSW } from "virtual:pwa-register";
import Background3D from "@/components/Background3D";
import Chrome from "@/components/Chrome";
import DeckErrorBoundary from "@/components/DeckErrorBoundary";
import { useDeck } from "@/deck/DeckContext";
import { SLIDES, isLightScene } from "@/config/presentation";
import { quizGate } from "@/quiz/gate";
import Slide01 from "@/slides/Slide01";
import Slide02 from "@/slides/Slide02";
import Slide03 from "@/slides/Slide03";
import Slide04 from "@/slides/Slide04";
import Slide05 from "@/slides/Slide05";
import Slide06 from "@/slides/Slide06";
import Slide07 from "@/slides/Slide07";
import Slide08 from "@/slides/Slide08";
import Slide09 from "@/slides/Slide09";
import Slide10 from "@/slides/Slide10";
import Slide11 from "@/slides/Slide11";
import Slide12 from "@/slides/Slide12";

const SLIDE_COMPONENTS: ComponentType<{ step: number }>[] = [
  Slide01, Slide02, Slide03, Slide04, Slide05, Slide06,
  Slide07, Slide08, Slide09, Slide10, Slide11, Slide12,
];

/** lienzo de diseño 16:9 — todo el contenido se dibuja aquí y se escala a la pantalla real */
const STAGE_W = 1600;
const STAGE_H = 900;

/** escala para que el escenario quepa completo en cualquier resolución u orientación */
function useStageScale() {
  const calc = () =>
    Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
  const [scale, setScale] = useState(calc);
  useEffect(() => {
    const update = () => setScale(calc());
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return scale;
}

export default function PresentPage() {
  const deck = useDeck();
  const scale = useStageScale();
  const Slide = SLIDE_COMPONENTS[deck.slide];
  const scene = SLIDES[deck.slide].scene;

  // registro del service worker (PWA / offline)
  useEffect(() => {
    registerSW({ immediate: true });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (SLIDES[deck.slide].id === "quiz") {
        const nav: Record<string, number> = { ArrowRight: 1, " ": 1, PageDown: 1, ArrowLeft: -1, PageUp: -1 };
        if (e.key in nav && !quizGate.allowKey(nav[e.key])) {
          e.preventDefault();
          return;
        }
      }
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      switch (e.key) {
        case "ArrowRight":
        case " ":
        case "PageDown":
          e.preventDefault();
          deck.goNext();
          break;
        case "ArrowLeft":
        case "PageUp":
          e.preventDefault();
          deck.goPrev();
          break;
        case "Home":
          e.preventDefault();
          deck.goTo(0);
          break;
        case "End":
          e.preventDefault();
          deck.goTo(SLIDES.length - 1);
          break;
        case "f":
        case "F":
          if (document.fullscreenElement) document.exitFullscreen();
          else document.documentElement.requestFullscreen().catch(() => {});
          break;
        case "p":
        case "P":
          deck.openPresenter();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deck]);

  // clic en la zona derecha avanza; zona izquierda retrocede
  const onClickStage = (e: React.MouseEvent) => {
    if (deck.meta.id === "quiz") return; // en el quiz solo avanzan los botones
    if ((e.target as HTMLElement).closest("button, a, input")) return;
    if (e.clientX > window.innerWidth * 0.66) deck.goNext();
    else if (e.clientX < window.innerWidth * 0.2) deck.goPrev();
  };

  // deslizar en pantallas táctiles (móvil / tablet)
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (deck.meta.id === "quiz") return;
    const s = touchStart.current;
    touchStart.current = null;
    if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) deck.goNext();
      else deck.goPrev();
    }
  };

  const light = isLightScene(scene.bg);

  return (
    <div
      className="relative h-full w-full cursor-default select-none overflow-hidden"
      onClick={onClickStage}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* fondo que cambia de color por escena: blanco → azul/negro → blanco */}
      <motion.div
        aria-hidden
        className="fixed inset-0 z-0"
        initial={{ backgroundColor: SLIDES[0].scene.bg }}
        animate={{ backgroundColor: scene.bg }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      />

      <Background3D scene={scene} />

      {/* kicker de escena */}
      <AnimatePresence mode="wait">
        <motion.p
          key={deck.meta.id}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.35 }}
          className={`fixed left-6 top-6 z-30 font-mono text-[10px] uppercase tracking-kicker md:left-10 md:top-8 ${
            light ? "text-ink/50" : "text-smoke"
          }`}
        >
          {deck.meta.kicker}
        </motion.p>
      </AnimatePresence>

      {/* escenario 16:9 escalado: mismo diseño en móvil, tablet y PC, en
          cualquier resolución u orientación — nada se desborda ni queda gigante */}
      <main className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
        <div
          /* shrink-0: si el flex lo comprime, el scale se aplica sobre un
             lienzo deformado y todo el deck se desborda en pantallas angostas */
          className="pointer-events-auto relative shrink-0"
          style={{
            width: STAGE_W,
            height: STAGE_H,
            transform: `scale(${scale})`,
          }}
        >
          <div className="h-full px-[112px] pb-[72px] pt-[99px]">
            {/* sin mode="wait": la entrada se monta de inmediato; un exit lento
                nunca puede dejar la pantalla vacía */}
            <AnimatePresence>
              <motion.div
                key={deck.slide}
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="h-full"
              >
                {/* key por escena: si una escena falla, la red de seguridad se
                    reinicia al cambiar de diapositiva */}
                <DeckErrorBoundary
                  key={`eb-${deck.slide}`}
                  onRecover={() => deck.goNext()}
                >
                  <Slide step={deck.step} />
                </DeckErrorBoundary>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>

      <Chrome light={light} />
    </div>
  );
}
