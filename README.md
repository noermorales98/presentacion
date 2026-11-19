# Noxy Digital — Presentación interactiva

**¿Y si programar ya no fuera lo más importante?** — Charla de 30 minutos sobre IA,
agentes y nuevas formas de desarrollar. App web en React (9 escenas, fondo 3D con
anillo y partículas que cambian por diapositiva, fondo de color dinámico por escena —
portada y cierre en blanco, azul y negro alternando en medio —, grano fílmico,
PWA). El quiz se juega en **Wayground** (escena 02 con QR).

## Instalar dependencias

```bash
npm install
```

## Ejecutar localmente

```bash
npm run dev
```

Abre `http://localhost:3000` → redirige a `#/1`.

## Compilar para producción

```bash
npm run build     # genera dist/
npm run preview   # sirve la compilación en local
```

## Rutas

| Ruta | Uso |
|---|---|
| `#/1` … `#/9` | Cada diapositiva tiene su ruta (`#/1` portada, `#/2` quiz…). Proyectar esta; la URL cambia al avanzar y entrar directo a una ruta abre esa diapositiva. `#/present` redirige a `#/1` |
| `#/presenter` | Vista del presentador: notas privadas, cronómetro, control |

## Controles

- `→` / `Espacio` / clic derecho: siguiente diapositiva o revelación
- `←` / clic izquierdo: anterior
- `F`: pantalla completa · `P`: abrir vista del presentador
- `Home` / `End`: primera / última diapositiva

## Cambiar los textos

Todo el contenido está separado del diseño:

- `src/config/presentation.ts` — título, subtítulo, fecha, speaker, notas del
  presentador, **link del juego en Wayground** (`TALK.waygroundUrl`) y los
  **parámetros de la escena 3D y del fondo** por diapositiva (`bg`: color de fondo
  de la escena; mezcla azul↔lima, inclinación, velocidad del anillo, deriva).

## Conectar el juego de Wayground

La escena 02 muestra el QR para entrar al juego. Al llegar el link real:

1. Pegar el link en `TALK.waygroundUrl` (`src/config/presentation.ts`).
2. Volver a compilar — el QR se genera solo con esa URL.

Mientras el link esté vacío, la escena muestra un placeholder identificado
("QR pendiente"). Las preguntas y puntos viven en Wayground; esta app no las gestiona.

## Escenas

| # | Escena | Min |
|---|---|---|
| 1 | Portada + presentación personal, todo visible sin clics (completar `[X]` años en `Slide01.tsx`) | 1 |
| 2 | Quiz (Wayground / quiz propio) | 6 |
| 3 | Código vs sistema | 2 |
| 4 | Video de demo (noxthy.co) | 5 |
| 5 | Cómo hablarle a la IA | 3 |
| 6 | Mis herramientas (Claude + MCP, Grok Bot, Hermes, OpenRouter) | 7 |
| 7 | La IA se equivoca (clave API en el código) | 3 |
| 8 | Cierre: pregunta "si tuvieras a un empresario famoso de frente…" | 1 |
| 9 | Mensaje final + QR para seguirme en redes (`TALK.linksUrl` = noxy.digital/links) | 1 |

## Demo noxthy.co

La escena 4 muestra solo `public/01.mp4` (en bucle, sin sonido ni controles, esquinas redondeadas). Para cambiar el video, sustituye ese archivo.
También puedes salir a noxthy.co para la demo en vivo.

## Logos y videos de herramientas

Los logos salen de `public/` (`claude.jpg`, `grok-bot-logo.png`, `hermes.png`, `openrouter.avif`)
y el video de Claude + MCP es `public/02.mp4`. `LogoSlot` muestra un hueco marcado si falta un logo.

## Desplegar

Build estático en `dist/` — compatible con cualquier hosting estático
(Vercel, Netlify, GitHub Pages…). `base: './'` ya está configurado para rutas relativas.

## Activar modo presentador

Pulsa `P` en cualquier diapositiva (o abre `#/presenter` en otra ventana). Las notas y el
cronómetro viven solo en esa ventana; la audiencia ve `#/1`…`#/9`.

## Internet lento: precarga y caché

Al abrir la presentación, el service worker guarda en caché todo el código, las fuentes
(incluida la del juego), el motor del quiz, las imágenes y los videos (`01.mp4`, `02.mp4`,
calidad original, ~28 MB en total). En la esquina superior derecha aparece
`CARGANDO n/N` y luego `LISTO`.

**Antes de la charla:** abre `npm run preview` (o la URL desplegada) **una vez con buena
conexión**, espera a ver `LISTO` y no borres los datos del navegador. Desde ahí
la presentación, los videos y el juego cargan desde el disco, sin red.
Para probarlo: DevTools → Network → Offline y recarga.

Lo único que sí necesita red durante el juego es la conexión de los celulares del
público (Firebase); la pantalla del juego en sí ya está guardada.

Los videos se usan tal cual, sin recomprimir (la caché evita volver a descargarlos).
Si agregas más archivos pesados a `public/`, añádelos a la lista de `src/preload.ts`.

## Estructura

```
src/
  config/        textos, link de Wayground, escena 3D y color de fondo por diapositiva
  deck/          estado del deck (diapositiva, pasos, cronómetro, sync entre ventanas)
  slides/        las 9 escenas (Slide01…Slide09)
  components/    fondo 3D, grano fílmico, chrome (HUD), átomos de UI
  pages/         present, presenter
public/          iconos PWA
```
