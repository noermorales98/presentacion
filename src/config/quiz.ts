// Configuración del quiz en vivo. Editar preguntas y la URL de Firebase aquí.

/**
 * URL de tu Firebase Realtime Database (gratis, plan Spark, sin tarjeta).
 * Ejemplo: "https://mi-quiz-default-rtdb.firebaseio.com"
 * Vacío = MODO LOCAL (solo funciona entre pestañas del mismo navegador; sirve para probar).
 * Pasos: ver QUIZ-SETUP.md
 */
export const FIREBASE_DB_URL: string =
  (import.meta.env.VITE_FIREBASE_DB_URL as string | undefined) ?? "";

export type QuestionType = "choice" | "text";

export interface Question {
  type: QuestionType;
  /** texto de la pregunta */
  q: string;
  /** bloque de código opcional (se muestra en fuente monoespaciada) */
  code?: string;
  /** incisos (solo "choice") */
  options?: string[];
  /** índices de incisos correctos (puede haber más de uno) */
  correct?: number[];
  /** respuestas aceptadas (solo "text"), se comparan sin mayúsculas ni acentos */
  accepted?: string[];
  /** texto que se muestra como respuesta correcta en los resultados */
  answerLabel: string;
}

export const QUESTIONS: Question[] = [
  {
    type: "choice",
    q: "¿Cuál es el navegador \"intruso\"?",
    options: ["Node JS", "Firefox", "Safari", "Chrome"],
    correct: [0],
    answerLabel: "Node JS",
  },
  {
    type: "choice",
    q: "¿Qué etiqueta HTML se usa para poner un enlace?",
    options: ["<link>", "<a>", "<li>", "<p>"],
    correct: [1],
    answerLabel: "<a>",
  },
  {
    type: "choice",
    q: "El frontend es la parte de una aplicación que el usuario ve y con la que interactúa.",
    options: ["Verdadero", "Falso"],
    correct: [0],
    answerLabel: "Verdadero",
  },
  {
    type: "text",
    q: "Conjunto de reglas y protocolos que permite que dos aplicaciones o servicios se comuniquen entre sí (backend y frontend, por ejemplo).",
    accepted: ["api", "la api", "una api"],
    answerLabel: "API",
  },
  {
    type: "choice",
    q: "Es un framework de CSS",
    options: ["Sweet Alert", "Tailwind", "ReactCSS", "ReactRSS Feed"],
    correct: [1],
    answerLabel: "Tailwind",
  },
  {
    type: "choice",
    q: "En React, ¿qué es un componente?",
    options: [
      "Un tipo de base de datos",
      "Un comando de Git",
      "Un tipo de servidor",
      "Una pieza reutilizable de la interfaz",
    ],
    correct: [3],
    answerLabel: "Una pieza reutilizable de la interfaz",
  },
  {
    type: "choice",
    q: "¿Cuál de estos NO es un contenedor genérico de HTML?",
    options: ["<div>", "<ul>", "<li>", "<if>"],
    correct: [3],
    answerLabel: "<if>",
  },
  {
    type: "choice",
    q: "¿Qué devuelve esta función?",
    code: `<Saludo dato="Noelí" nombre="34"/>

const Saludo = ({ nombre }) => {
  return <h1>Hola, {nombre} de {dato}</h1>;
};
export default Saludo;`,
    options: ["Hola, Noelí de 34", "Hola, 34 de Noelí", "Hola, Noelí de Noelí", "Syntax error"],
    correct: [3],
    answerLabel: "Syntax error",
  },
  {
    type: "choice",
    q: "¿Cómo realizar solicitudes (GET, POST, PUT, DELETE) a APIs?",
    options: ["Axios / fetch", "SSH -a", "git pull --rebase", "git pull origin main"],
    correct: [0],
    answerLabel: "Axios / fetch",
  },
  {
    type: "choice",
    q: "Plataforma en la nube basada en Git (hay más de una correcta)",
    options: ["Vercel", "Hostinger", "Github", "Gitlab"],
    correct: [2, 3],
    answerLabel: "Github y Gitlab",
  },
];

/** puntos por respuesta correcta y bono por ser el correcto más rápido */
export const POINTS_CORRECT = 3;
export const POINTS_FASTEST_BONUS = 1;

/** pasos de la diapositiva: lobby + (pregunta, pelea) × N + jefe (dino) + final */
export const QUIZ_STEPS = 1 + QUESTIONS.length * 2 + 2;

export type QuizPhase = "lobby" | "question" | "fight" | "results" | "travel" | "boss" | "final";

/** traduce el paso de la diapositiva a fase del juego */
export function phaseOfStep(step: number): { phase: QuizPhase; q: number } {
  if (step <= 0) return { phase: "lobby", q: 0 };
  if (step >= QUIZ_STEPS - 1) return { phase: "final", q: QUESTIONS.length - 1 };
  if (step === QUIZ_STEPS - 2) return { phase: "boss", q: QUESTIONS.length - 1 };
  const i = step - 1;
  return { phase: i % 2 === 0 ? "question" : "fight", q: Math.floor(i / 2) };
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");

export function isCorrect(q: Question, answer: number | string | undefined): boolean {
  if (answer === undefined || answer === null) return false;
  if (q.type === "choice") return typeof answer === "number" && !!q.correct?.includes(answer);
  return !!q.accepted?.some((a) => norm(a) === norm(String(answer)));
}

export interface AnswerRec {
  a: number | string;
  /** marca de tiempo del servidor */
  t: number;
}
export interface ResultRec {
  ok: boolean;
  pts: number;
  fastest?: boolean;
  /** milisegundos que tardó en responder */
  ms: number;
}

/** calcula los resultados de una pregunta: 3 pts por correcta + 1 al correcto más rápido */
export function scoreQuestion(
  q: Question,
  answers: Record<string, AnswerRec>,
  startedAt: number
): Record<string, ResultRec> {
  const out: Record<string, ResultRec> = {};
  const okList: { id: string; ms: number }[] = [];
  for (const [id, rec] of Object.entries(answers)) {
    const ms = Math.max(0, (rec.t ?? startedAt) - startedAt);
    const ok = isCorrect(q, rec.a);
    out[id] = { ok, pts: ok ? POINTS_CORRECT : 0, ms };
    if (ok) okList.push({ id, ms });
  }
  okList.sort((a, b) => a.ms - b.ms);
  if (okList.length > 0) {
    const f = okList[0].id;
    out[f].pts += POINTS_FASTEST_BONUS;
    out[f].fastest = true;
  }
  return out;
}
