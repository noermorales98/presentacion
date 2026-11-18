# Quiz en vivo — configuración (≈5 minutos, gratis)

El quiz usa **Firebase Realtime Database** (plan Spark: gratis, **sin tarjeta**) para conectar los
celulares del público con tu presentación en tiempo real.

## 1. Crear la base de datos

1. Entra a <https://console.firebase.google.com> con tu cuenta de Google → **Agregar proyecto** (nombre: `noxy-quiz`; puedes desactivar Google Analytics).
2. Menú **Compilación → Realtime Database → Crear base de datos**. Elige la región más cercana y **modo bloqueado**.
3. Pestaña **Reglas**, pega esto y pulsa **Publicar**:

```json
{
  "rules": {
    "rooms": {
      "$room": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

4. Pestaña **Datos**: copia la URL de arriba, algo como
   `https://noxy-quiz-default-rtdb.firebaseio.com` (o `...europe-west1.firebasedatabase.app`).

## 2. Poner la URL en la app

**Local:** crea el archivo `.env.local` en la raíz del proyecto:

```
VITE_FIREBASE_DB_URL=https://noxy-quiz-default-rtdb.firebaseio.com
```

**Vercel:** Project → Settings → Environment Variables → agrega `VITE_FIREBASE_DB_URL` con esa URL
(para *Production*) y vuelve a desplegar.

> Sin la variable, el quiz funciona en **MODO LOCAL** (solo entre pestañas del mismo navegador) — sirve para probar.

## 3. Publicar en Vercel

```bash
npm run build      # comprueba que compila
npx vercel --prod  # o conecta el repo en vercel.com
```

El QR y el link se generan solos con la URL pública donde esté desplegada la presentación
(`https://tu-app.vercel.app/#/play/ABCD`).

## Cómo se juega

| Clic / → | Qué pasa |
|---|---|
| 0 (lobby) | Los jugadores escanean el QR y aparecen sus personajes |
| 1.er clic | Abre la pregunta 1. Se ve cuántos han respondido |
| 2.º clic | Cierra el tiempo → pelea → respuesta correcta + Top 5 |
| siguiente | Pregunta 2… (cada nivel cambia de escenario y de tipo de pelea) |
| último | El ganador escala la montaña |

- Puntos: **3** por respuesta correcta + **1** extra al correcto más rápido.
- Tecla **M** silencia el sonido y la música.
- Editar preguntas: `src/config/quiz.ts`.

## Seguridad / límites

Las reglas abiertas son suficientes para una charla (solo existen datos bajo `rooms/`). Después del evento
puedes borrar el nodo `rooms` desde la consola o cambiar las reglas a `false`. El plan gratuito permite
100 conexiones simultáneas — justo para ~100 personas; si esperas más, avísame.
