# La torre de Vela — versión online (v7)

## Probarlo en tu PC
1. Instalá Node.js 18+ (nodejs.org).
2. Doble clic en `iniciar_online.bat` (Windows) o `./iniciar_online.sh` (Mac/Linux). Abrí http://localhost:8000 en dos pestañas para ver a "otro jugador".
3. Escribí tu nombre en la pantalla de inicio. **Enter** abre el chat (Enter envía, Esc cancela).

## Jugar con amigos
- **Misma red/Wi‑Fi:** pasales `http://TU_IP_LOCAL:8000`.
- **Por internet desde tu PC:** corré el servidor y abrí un túnel (`cloudflared tunnel --url http://localhost:8000` o `ngrok http 8000`); compartí el link que te da.
- **Hosting fijo (gratis):** subí esta carpeta a un repo de GitHub y creá un "Web Service" en Render.com (Build: vacío, Start: `node server.js`). Sirve el juego y el WebSocket desde la misma URL.
- **Juego en GitHub Pages + servidor aparte:** GitHub Pages no corre servidores. Poné el servidor en Render y editá `DEFAULT_SERVER` al inicio de `multiplayer.js` con su URL (`wss://tu-app.onrender.com`), o abrí el juego con `?server=wss://tu-app.onrender.com`.

## Qué se comparte y qué no
- Compartido: jugadores (posición, caminar, correr, atacar, bloquear, saltar, esquivar), nombres, chat y la hora del día.
- Todavía NO compartido: enemigos, dragón, misiones y objetos (cada jugador tiene su propia partida). No hay daño entre jugadores.
- Límite 20 jugadores (`MAX_PLAYERS=30 node server.js` para cambiarlo). Si el servidor se cae, el juego sigue en modo solo y reintenta conectarse.
- `iniciar_juego.bat/.sh` (Python) sigue sirviendo para jugar solo.

## Cambios v8
- Sin intro ni pantalla de título: ponés tu nombre, **Jugar** (o Enter) y entrás directo al mundo.
- Sin pausa: Esc/Tab/M abren el menú, inventario o mapa pero el mundo sigue corriendo (nadie queda flotando).
- Las sombras (enemigos comunes) de cada jugador se ven en su lugar para los demás. Son solo visuales: cada uno pelea con las suyas; guardianes y dragón siguen siendo por jugador.
