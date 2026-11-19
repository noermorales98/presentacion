import { useEffect, useRef } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router";
import { DeckProvider, useDeck } from "@/deck/DeckContext";
import { SLIDES } from "@/config/presentation";
import FilmGrain from "@/components/FilmGrain";
import PresentPage from "@/pages/PresentPage";
import PresenterPage from "@/pages/PresenterPage";
import PlayPage from "@/pages/PlayPage";

/** /1 … /N: cada diapositiva tiene su ruta (#/1 = portada). Un número fuera de rango vuelve a /1. */
function SlideRoute() {
  const { n } = useParams();
  const num = Number(n);
  if (!/^\d+$/.test(n ?? "") || num < 1 || num > SLIDES.length) return <Navigate to="/1" replace />;
  return <PresentPage />;
}

/** mantiene la URL y la diapositiva activa sincronizadas en ambos sentidos */
function UrlSync() {
  const deck = useDeck();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const m = /^\/(\d+)$/.exec(pathname);
  const prevSlide = useRef(deck.slide);

  // URL → diapositiva (entrar directo a /5, atrás/adelante del navegador)
  useEffect(() => {
    if (!m) return;
    const i = Number(m[1]) - 1;
    if (i >= 0 && i < SLIDES.length && i !== deck.slide) deck.goTo(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // diapositiva → URL (solo cuando la diapositiva cambia, para no pisar la URL al cargar)
  useEffect(() => {
    if (prevSlide.current === deck.slide) return;
    prevSlide.current = deck.slide;
    if (m && pathname !== `/${deck.slide + 1}`) navigate(`/${deck.slide + 1}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck.slide]);

  return null;
}

export default function App() {
  const { pathname } = useLocation();
  // vista del celular del público: sin presentación ni grano
  if (pathname.startsWith("/play")) {
    return (
      <Routes>
        <Route path="/play/:room" element={<PlayPage />} />
      </Routes>
    );
  }
  return (
    <DeckProvider>
      <UrlSync />
      <FilmGrain />
      <Routes>
        <Route path="/" element={<Navigate to="/1" replace />} />
        <Route path="/present" element={<Navigate to="/1" replace />} />
        <Route path="/presenter" element={<PresenterPage />} />
        <Route path="/:n" element={<SlideRoute />} />
        <Route path="*" element={<Navigate to="/1" replace />} />
      </Routes>
    </DeckProvider>
  );
}
