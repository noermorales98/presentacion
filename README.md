# Noxy Digital — Presentación interactiva

**¿Y si programar ya no fuera lo más importante?** — Charla de 30 minutos sobre IA,
agentes y nuevas formas de desarrollar. App web en React (12 escenas, fondo 3D con
anillo y partículas que cambian por diapositiva, fondo de color dinámico por escena —
portada y cierre en blanco, azul y negro alternando en medio —, grano fílmico,
terminal simulada, PWA). El quiz se juega en **Wayground** (escena 02 con QR).

## Instalar dependencias

```bash
npm install
```

## Ejecutar localmente

```bash
npm run dev
```

Abre `http://localhost:3000` → redirige a `#/present`.

## Compilar para producción

```bash
npm run build     # genera dist/
npm run preview   # sirve la compilación en local
```

## Rutas

| Ruta | Uso |
|---|---|
| `#/present` | Pantalla principal (proyectar esta) |
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

## Agregar capturas del CRM

1. Guarda las imágenes en `src/assets/crm/` (por ejemplo `clientes.png`).
2. En `src/slides/Slide05.tsx` sustituye cada `<MediaSlot … />` por:

```tsx
import capturaClientes from "@/assets/crm/clientes.png";
<img src={capturaClientes} alt="Módulo de clientes" className="h-full w-full object-cover" />
```

## Incorporar demos de video

En `src/slides/Slide08.tsx` (agentes) y `src/slides/Slide10.tsx` (terminal) hay zonas
preparadas. Coloca los archivos en `src/assets/agents/` y usa:

```tsx
<video src={demo} controls muted playsInline className="h-full w-full object-cover" />
```

Para iframes (por ejemplo una demo embebida), inserta el `<iframe>` en el mismo lugar.

## Desplegar

Build estático en `dist/` — compatible con cualquier hosting estático
(Vercel, Netlify, GitHub Pages…). `base: './'` ya está configurado para rutas relativas.

## Activar modo presentador

Pulsa `P` en `#/present` (o abre `#/presenter` en otra ventana). Las notas y el
cronómetro viven solo en esa ventana; la audiencia ve `#/present`.

## Probar el funcionamiento offline

1. `npm run build && npm run preview`.
2. DevTools → Network → Offline, y recarga: la presentación, los diagramas y la
   terminal simulada siguen funcionando.
3. El indicador `OFFLINE` aparece en el HUD. La primera visita necesita conexión
   (el service worker se instala al cargar).

## Estructura

```
src/
  config/        textos, link de Wayground, escena 3D y color de fondo por diapositiva
  deck/          estado del deck (diapositiva, pasos, cronómetro, sync entre ventanas)
  slides/        las 12 escenas
  components/    fondo 3D, terminal, grano fílmico, chrome (HUD), átomos de UI
  pages/         present, presenter
public/          iconos PWA
```
