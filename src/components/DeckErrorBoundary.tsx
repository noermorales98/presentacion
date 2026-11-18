import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** acción de recuperación: saltar a la siguiente escena sin perder la sesión */
  onRecover: () => void;
}

interface State {
  error: Error | null;
}

/**
 * Red de seguridad del deck: si una escena lanza un error al renderizar,
 * React desmontaría TODA la app (pantalla oscura muda). Este boundary
 * muestra el error y permite seguir presentando.
 */
export default class DeckErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/95 p-10 text-bone">
        <div className="w-full max-w-xl rounded-2xl border border-line bg-panel p-8">
          <p className="font-mono text-[10px] uppercase tracking-kicker text-red-400">
            algo falló al mostrar esta escena
          </p>
          <pre className="mt-4 max-h-48 overflow-auto whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-bone/80">
            {String(this.state.error.message || this.state.error)}
          </pre>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              onClick={this.props.onRecover}
              className="rounded-full bg-volt px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-bone transition-colors hover:bg-bone hover:text-ink cursor-pointer"
            >
              Saltar a la siguiente escena →
            </button>
          </div>
          <p className="mt-4 font-mono text-[11px] leading-relaxed text-smoke">
            La presentación sigue viva. Si esto vuelve a pasar en la misma escena,
            anota el mensaje de arriba para corregirlo de raíz.
          </p>
        </div>
      </div>
    );
  }
}
