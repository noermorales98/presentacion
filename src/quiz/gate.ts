// Evita avanzar el quiz por accidente: en la diapositiva del quiz solo avanzan los botones en pantalla.
export const quizGate = {
  /** dir: +1 siguiente, -1 anterior (teclado). Los botones no pasan por aquí. */
  allowKey: (_dir: number): boolean => true,
};
