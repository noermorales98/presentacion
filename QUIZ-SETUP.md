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

Un clic en el escenario **no** avanza nada: solo el botón verde/azul de arriba a la derecha (y las flechas solo
sirven para salir del quiz en el lobby / al final).

| Botón | Qué pasa |
|---|---|
| EMPEZAR | Abre la pregunta 1; se ve cuántos han respondido |
| CERRAR TIEMPO Y PELEAR | Pelea estilo Smash (plataformas, cajas, saltos) → zoom a los sobrevivientes → respuesta + Top 5 |
| SIGUIENTE NIVEL | Siguiente pregunta (otro escenario y otro tipo de KO) |
| ¡LLEGA EL DINO! | Dino gigante contra todos; solo el ganador (1.º lugar) lo derrota |
| VER AL GANADOR | Zoom al ganador escalando la montaña → premio: una sabrita |
| REINICIAR | Vuelve al lobby (pide confirmación); los jugadores se quedan |

- Puntos: **3** por respuesta correcta + **1** extra al correcto más rápido.
- Tecla **M** silencia el sonido y la música.
- Editar preguntas: `src/config/quiz.ts`.

## Seguridad / límites

Las reglas abiertas son suficientes para una charla (solo existen datos bajo `rooms/`). Después del evento
puedes borrar el nodo `rooms` desde la consola o cambiar las reglas a `false`. El plan gratuito permite
100 conexiones simultáneas — justo para ~100 personas; si esperas más, avísame.
