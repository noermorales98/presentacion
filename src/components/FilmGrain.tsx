/**
 * Grano fílmico cinematográfico: capa fija sobre toda la pantalla.
 * El ruido es un SVG de turbulencia (feTurbulence) en data-URI, sin dependencias.
 * Se respeta prefers-reduced-motion (sin animación de salto de grano).
 */
export default function FilmGrain() {
  return (
    <>
      {/* capa gruesa */}
      <div aria-hidden className="film-grain pointer-events-none fixed inset-0 z-[70]" />
      {/* capa fina desfasada: densidad de grano cinematográfico */}
      <div aria-hidden className="film-grain film-grain-b pointer-events-none fixed inset-0 z-[70]" />
    </>
  );
}
