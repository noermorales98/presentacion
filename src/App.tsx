import { Navigate, Route, Routes } from "react-router";
import { DeckProvider } from "@/deck/DeckContext";
import FilmGrain from "@/components/FilmGrain";
import PresentPage from "@/pages/PresentPage";
import PresenterPage from "@/pages/PresenterPage";
import PlayPage from "@/pages/PlayPage";
import { useLocation } from "react-router";

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
      <FilmGrain />
      <Routes>
        <Route path="/" element={<Navigate to="/present" replace />} />
        <Route path="/present" element={<PresentPage />} />
        <Route path="/presenter" element={<PresenterPage />} />
        <Route path="*" element={<Navigate to="/present" replace />} />
      </Routes>
    </DeckProvider>
  );
}
