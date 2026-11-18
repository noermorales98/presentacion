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
  studio: "Noxy Digital Studio",
  date: "20 · Nov · 2026",
  /** duración de referencia solo para el cronómetro de la vista de presentador (privada) */
  durationMin: 30,
  siteUrl: "https://noxy.digital",
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
    kicker: "NOXY DIGITAL STUDIO",
    steps: 1,
    scene: { bg: "#F2EDE3", mix: 0.55, tiltX: 0.42, tiltY: -0.18, ringSpeed: 0.05, drift: 0.012, ringScale: 1.0, ringOpacity: 0.85 },
    notes:
      "Saludo rápido (30 s). Presentarme como Noe, fundador de Noxy Digital Studio en Cancún. Plantar la pregunta del título y dejar que respire 2 segundos antes de empezar. Anunciar que abriremos con un quiz en vivo desde el teléfono para despertar atención.",
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
    id: "dos-crm",
    kicker: "CASO REAL",
    steps: 2,
    scene: { bg: "#0B0B18", mix: 0.5, tiltX: 0.35, tiltY: 0.15, ringSpeed: 0.06, drift: 0.025, ringScale: 0.95, ringOpacity: 0.8 },
    notes:
      "Contar los dos proyectos sin vender humo: 6 meses / 2 programadores para el CRM de cliente; ~1 mes / 1 persona con IA para el otro CRM. Paso 2 revela los números con contadores. Aclaración obligatoria: son proyectos distintos, NO es una comparación directa de productividad.",
  },
  {
    id: "lo-que-construi",
    kicker: "DEMO · CRM",
    steps: 1,
    scene: { bg: "#050508", mix: 0.3, tiltX: 0.5, tiltY: -0.25, ringSpeed: 0.04, drift: 0.015, ringScale: 1.05, ringOpacity: 0.65 },
    notes:
      "Antes de exponer, reemplazar los placeholders en src/assets/crm/ con capturas reales (ver README). Mencionar módulos: clientes, seguimiento, pipeline. Si hay video corto, insertarlo en la zona indicada. No afirmar funcionalidades que no se muestren.",
  },
  {
    id: "flujo-ia",
    kicker: "MÉTODO",
    steps: 2,
    scene: { bg: "#0B0B18", mix: 0.7, tiltX: 0.28, tiltY: 0.4, ringSpeed: 0.1, drift: 0.035, ringScale: 0.9, ringOpacity: 0.85 },
    notes:
      "Cinco etapas: Investigar → Planear → Programar → Probar → Revisar. Paso 2 abre la comparación de prompts: mostrar primero el prompt pobre, pedir a la sala que detecte qué le falta, luego revelar el prompt con contexto y criterios de aceptación.",
  },
  {
    id: "chat-asistente-agente",
    kicker: "CONCEPTO CLAVE",
    steps: 3,
    scene: { bg: "#050508", mix: 0.4, tiltX: 0.85, tiltY: -0.1, ringSpeed: 0.08, drift: 0.03, ringScale: 1.0, ringOpacity: 0.75 },
    notes:
      "Tres niveles en pasos: Chat (responde), Asistente (contexto), Agente (herramientas y pasos). Cerrar con el flujo Modelo → Herramienta → Acción → Resultado → Evaluación y recalcar: supervisión humana y permisos explícitos siempre.",
  },
  {
    id: "grok-hermes",
    kicker: "AGENTES PROPIOS",
    steps: 1,
    scene: { bg: "#0B0B18", mix: 0.9, tiltX: 0.55, tiltY: 0.35, ringSpeed: 0.18, drift: 0.06, ringScale: 0.85, ringOpacity: 0.9 },
    notes:
      "Grok Bot: automatización de tareas y apps conectadas. Hermes: terminal y agente configurable. Los logos y videos son placeholders hasta agregar los oficiales (src/assets/agents/). Hablar de lo que hacen, no ejecutar nada en vivo salvo que se haya preparado demo real.",
  },
  {
    id: "openrouter",
    kicker: "STACK · OPENROUTER",
    steps: 2,
    scene: { bg: "#050508", mix: 0.5, tiltX: 0.2, tiltY: 0.5, ringSpeed: 0.22, drift: 0.04, ringScale: 1.15, ringOpacity: 0.9 },
    notes:
      "Explicar el diagrama: mi aplicación → OpenRouter → muchos modelos con una sola API. Paso 2 abre el selector de modelos. Los datos de costo/velocidad son DEMOSTRATIVOS (etiqueta visible), no precios reales: verificarlos siempre en openrouter.ai.",
  },
  {
    id: "demostracion",
    kicker: "DEMO EN VIVO",
    steps: 5,
    scene: { bg: "#0B0B18", mix: 0.2, tiltX: 1.25, tiltY: -0.4, ringSpeed: 0.1, drift: 0.025, ringScale: 0.95, ringOpacity: 0.7 },
    notes:
      "Terminal SIMULADA y claramente etiquetada: no es un agente real. Avanzar con flecha derecha / espacio por las 5 etapas: inspección, plan, cambios, pruebas, revisión. El ritmo lo marco yo con el teclado. Si algo falla en vivo, tener la demo real grabada en la zona preparada.",
  },
  {
    id: "ia-se-equivoca",
    kicker: "ACTIVIDAD · REVISIÓN",
    steps: 2,
    scene: { bg: "#050508", mix: 0.08, tiltX: 0.9, tiltY: -0.2, ringSpeed: 0.03, drift: 0.012, ringScale: 1.0, ringOpacity: 0.6 },
    notes:
      "Leer el código en voz alta. Votación: ¿lo aprueban sí o no? Paso 2 revela el error (concatenación directa → inyección SQL) y junto a él la versión corregida con consulta parametrizada. Mensaje: la IA acelera, pero la responsabilidad de revisar sigue siendo del desarrollador.",
  },
  {
    id: "cierre",
    kicker: "CIERRE",
    steps: 2,
    scene: { bg: "#F2EDE3", mix: 0.78, tiltX: 0.45, tiltY: 0.2, ringSpeed: 0.07, drift: 0.03, ringScale: 1.0, ringOpacity: 0.85 },
    notes:
      "Minimalismo total. Paso 1: 'Aprende a programar.' (pausa larga). Paso 2: 'Pero, sobre todo, aprende a construir.' Agradecer, mostrar el QR hacia noxy.digital y abrir 2-3 preguntas de la sala si el tiempo lo permite.",
  },
];
