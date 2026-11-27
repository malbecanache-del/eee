# La torre de Vela — v9: combate, interfaz, final cooperativo y celular

## Cómo jugar
- **Solo / con amigos:** `iniciar_online.bat` (Windows) o `iniciar_online.sh` (Mac/Linux). Necesita Node 18+.
  Abrí `http://localhost:8000`. Para jugar con amigos, usá un nombre de **sala** en la pantalla de inicio
  y tocá "Copiar link para invitar". Cada sala admite hasta 20 jugadores (`MAX_PLAYERS`).
- Con `iniciar_juego` (sin servidor) el juego funciona solo, sin online.
- **Celular:** abrí el link desde el navegador. Se activa solo el modo táctil. Se puede probar en PC con `?touch=1`.

## Bug del mapa viejo al empezar
Los modelos 3D (~37 MB) se bajan en segundo plano; antes se podía entrar antes de que terminaran y se veían
las casas/árboles de cajas y conos. Ahora "Jugar" espera a que todo esté cargado (barra de progreso).
Si la carga falla aparece "Reintentar" o "Jugar con gráficos básicos".

## Combate (todo configurable en `combat.js`, objetos `CFG` y `MON`)
| Monstruo | HP | Daño | Resistencia |
|---|---|---|---|
| Caballero caído | 100 | 10 | 0 % |
| Acechador | 60 | 7 | 0 % |
| Centinela de hierro | 180 | 18 | 35 % |
| Guardián de ceniza | 200 | 18 | 25 % |
| Dragón Ancestral | 1200 (compartida online) | 20–70 | 10 % |

- Espada: 25 de daño (+10 con el poder de la historia, +10 con armadura pesada). Un golpe por espadazo y por enemigo.
- Jugador: 100 HP, 0,7 s de invulnerabilidad tras recibir un golpe; bloqueo (solo de frente), esquive e armadura pesada reducen daño.
- Al morir: pantalla de muerte, pérdida del 25 % de ascuas, reinicio junto al último fuego.
- Los monstruos sueltan a veces una esencia verde que cura 25 HP.

## Final cooperativo
El Dragón Ancestral tiene una sola barra de vida para toda la sala. Cuantos más jugadores peleen
(los que golpearon en los últimos 25 s), más aguanta: 1 jugador = vida normal, 20 jugadores ≈ x12.
Al caer, todos ven la tabla de héroes y pueden ver el final juntos. A los 90 s el dragón vuelve a despertar.
Menú → "Atajo: ir al Dragón" lleva directo a la guarida con el poder ya conseguido.

## Archivos nuevos
`combat.js` (combate), `ui.js` (interfaz), `mobile.js` (táctil). `server.js` ahora maneja salas y el jefe compartido.
