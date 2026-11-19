import { QUIZ_STEPS } from "@/config/quiz";

// Datos centrales de la presentación. Editar textos, notas y escena 3D aquí.

export interface SceneParams {
  /** color de fondo de la escena (hex) — blanco en portada/cierre, azul y negro alternando */
  bg: string;
  /** 0 = azul eléctrico, 1 = verde lima (mezcla del anillo y partículas) */
  mix: number;
  /** inclinación del anillo en radianes */
  tiltX: number;
  tiltY: number;
  /** velocidad de rotación del anillo */
  ringSpeed: number;
  /** velocidad de deriva de las partículas */
  drift: number;
  /** escala del anillo */
  ringScale: number;
  /** opacidad del anillo 0..1 */
  ringOpacity: number;
}

export interface SlideMeta {
  id: string;
  /** kicker superior en mono */
  kicker: string;
  /** número de pasos de revelación internos (1 = sin pasos) */
  steps: number;
  scene: SceneParams;
  /** notas privadas del presentador */
  notes: string;
}

export const TALK = {
  title: "¿Y si programar ya no fuera lo más importante?",
  subtitle: "Los agentes de IA y el nuevo rol del desarrollador.",
  speaker: "Noe",
  studio: "Noxy Digital",
  date: "20 · Nov · 2026",
  /** duración de referencia solo para el cronómetro de la vista de presentador (privada) */
  durationMin: 30,
  siteUrl: "https://noxy.digital",
  /** QR final: seguirme en redes */
  linksUrl: "https://noxy.digital/links",
};

/** luminancia simple: escenas claras (portada/cierre) necesitan texto y HUD oscuros */
export function isLightScene(bg: string): boolean {
  const h = bg.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}

export const SLIDES: SlideMeta[] = [
  {
    id: "portada",
    kicker: "NOXY DIGITAL",
    steps: 1,
    scene: { bg: "#F2EDE3", mix: 0.55, tiltX: 0.42, tiltY: -0.18, ringSpeed: 0.05, drift: 0.012, ringScale: 1.0, ringOpacity: 0.85 },
    notes:
      "(1 min) Todo el texto aparece solo, sin clics. Dejar el título en pantalla y SILENCIO de 2-3 segundos antes de hablar. Luego lanzar la pregunta: 'Hoy cualquiera crea software sin saber programar. ¿Dónde quedamos nosotros?' y dejar que respire. Presentarme: Noe, fundador de Noxy Digital, Cancún. Ingeniero en Desarrollo Web, ayudo a negocios y marcas a aprovechar mejor la tecnología. Cerrar anunciando el quiz en vivo desde el teléfono.",
  },
  {
    id: "quiz",
    kicker: "QUIZ · EN VIVO",
    steps: QUIZ_STEPS,
    scene: { bg: "#F7F7F7", mix: 0.85, tiltX: 0.65, tiltY: 0.3, ringSpeed: 0.16, drift: 0.05, ringScale: 0.82, ringOpacity: 0.0 },
    notes:
      "Quiz en vivo. Lobby: el público escanea el QR (o abre el link) y su personaje aparece. Clic / → empieza. Cada pregunta = 2 clics: (1) abre la pregunta y los celulares responden — se ve cuántos han respondido; (2) cierra el tiempo y comienza la pelea; al terminar salen la respuesta correcta y el Top 5. Siguiente clic = siguiente nivel. Último clic = el ganador escala la montaña. 3 pts por correcta + 1 pt al correcto más rápido. Tecla M = silenciar. Antes de la charla: probar con el celular y revisar que Firebase esté configurado (QUIZ-SETUP.md).",
  },
  {
    id: "codigo-vs-sistema",
    kicker: "CONCEPTO CLAVE",
    steps: 2,
    scene: { bg: "#050508", mix: 0.15, tiltX: 1.1, tiltY: -0.35, ringSpeed: 0.07, drift: 0.02, ringScale: 1.08, ringOpacity: 0.7 },
    notes:
      "Mostrar el editor con la frase 'Escribir código es solo una parte' visible desde el inicio; un clic revela la arquitectura. La idea: el valor está en el sistema completo, no en la sintaxis. Preguntar a la sala: ¿qué es más difícil de mantener, código o decisiones?",
  },
  {
    id: "demo-noxthy",
    kicker: "",
    steps: 1,
    scene: { bg: "#0B0B18", mix: 0.5, tiltX: 0.35, tiltY: 0.15, ringSpeed: 0.06, drift: 0.025, ringScale: 0.95, ringOpacity: 0.8 },
    notes:
      "(5 min) Decir desde el inicio: es un ejemplo de lo que se puede hacer con IA, NO es una venta. Salir de la presentación y mostrar el CRM noxthy.co en vivo. Explicar qué funciones usan IA por dentro y cómo usarlas. No afirmar funcionalidades que no se muestren. El video public/01.mp4 ya está en la escena (Desarrollo de Software más rápido: con IA hago el trabajo de varias personas); también sirve de respaldo si falla internet. Volver a la presentación con la tecla de flecha.",
  },
  {
    id: "hablarle-a-la-ia",
    kicker: "CÓMO HABLARLE A LA IA",
    steps: 1,
    scene: { bg: "#050508", mix: 0.4, tiltX: 0.85, tiltY: -0.1, ringSpeed: 0.08, drift: 0.03, ringScale: 1.0, ringOpacity: 0.75 },
    notes:
      "(3 min) Todo visible de una vez. Arriba, la escalera: Chat (responde) → Asistente (contexto) → Agente (herramientas y pasos); supervisión humana y permisos explícitos siempre. Abajo, un prompt pobre (\'Hazme un CRM\') contra uno con contexto, restricciones y criterios de aceptación; pedir a la sala qué le falta al pobre. Mensaje: mientras mejor le hablas, mejor responde.",
  },
  {
    id: "mis-herramientas",
    kicker: "MIS HERRAMIENTAS",
    steps: 1,
    scene: { bg: "#0B0B18", mix: 0.7, tiltX: 0.28, tiltY: 0.4, ringSpeed: 0.1, drift: 0.035, ringScale: 0.9, ringOpacity: 0.85 },
    notes:
      "(7 min) Claude + MCP: 3 min. Es la destacada: 'le hablo a mi CRM'. Pregunta: '¿Qué clientes llevan una semana sin seguimiento?'; acción: 'Crea un recordatorio para esos clientes'. Mostrar demo real solo si está preparada. Grok Bot: 1 min — automatiza tareas y apps conectadas. Hermes: 1 min — agente configurable desde la terminal. OpenRouter: 1 min — una sola integración, muchos modelos (no dar precios ni velocidades; verificarlos en openrouter.ai si preguntan). El video de Claude + MCP (public/02.mp4) se reproduce solo en la tarjeta.",
  },
  {
    id: "ia-se-equivoca",
    kicker: "ACTIVIDAD · REVISIÓN",
    steps: 2,
    scene: { bg: "#050508", mix: 0.08, tiltX: 0.9, tiltY: -0.2, ringSpeed: 0.03, drift: 0.012, ringScale: 1.0, ringOpacity: 0.6 },
    notes:
      "(3 min) Leer el código en voz alta y votar: ¿lo aprobarías? (Sí / No, espera…). Clic 2 revela: error = clave escrita en el código; riesgo = al subirlo a GitHub cualquiera la ve y gasta tu dinero; corrección = import.meta.env.VITE_OPENROUTER_KEY y un .env en .gitignore. Matiz importante: las variables VITE_ se incluyen en el JavaScript del navegador, así que se ven igual; para claves sensibles hay que usar un backend que guarde la clave y llame a OpenRouter. La clave del ejemplo es falsa. Mensaje: la IA te da código que funciona, no siempre código seguro.",
  },
  {
    id: "pregunta-final",
    kicker: "CIERRE",
    steps: 1,
    scene: { bg: "#F2EDE3", mix: 0.78, tiltX: 0.45, tiltY: 0.2, ringSpeed: 0.07, drift: 0.03, ringScale: 1.0, ringOpacity: 0.85 },
    notes:
      "(1 min) Pregunta a la sala: 'Si tuvieras a un empresario famoso de frente, ¿qué le preguntarías?' Dejar 2-3 respuestas. Puente: no necesitan un empresario famoso; tienen profesores, libros, cursos. Estudien. Aprendan.",
  },
  {
    id: "cierre",
    kicker: "CIERRE",
    steps: 1,
    scene: { bg: "#F2EDE3", mix: 0.4, tiltX: 0.3, tiltY: 0.1, ringSpeed: 0.06, drift: 0.025, ringScale: 1.05, ringOpacity: 0.85 },
    notes:
      "(1 min) 'Aprende a programar. Pero, sobre todo, aprende a construir.' Pausa larga. El QR lleva a noxy.digital/links para seguirme en redes (noxthy.co es solo el CRM). Agradecer y abrir 2-3 preguntas si hay tiempo.",
  },
];
