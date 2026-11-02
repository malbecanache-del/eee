# La torre de Vela — versión realista

## Cómo jugar
1. Descomprimí todo en una carpeta (no muevas `models/`).
2. Doble clic en `iniciar_juego.bat` (Windows) o `./iniciar_juego.sh` (Mac/Linux). Necesita Python.
   Hace falta el servidor local porque el navegador bloquea cargar `.glb` desde `file://`.
3. **F9** dentro del juego guarda una captura PNG: mandámelas y sigo ajustando.

## Qué cambié
| Cambio | Detalle |
|---|---|
| Modelos optimizados | 16 de tus 31 `.glb`: ~250 MB → 19,7 MB (texturas a 512/1024 px, JPEG). Ver `docs/00_hoja_de_modelos.png` |
| Casas del pueblo | `stilized_house` y `mediaval_building` reemplazan a las 15 casas de cajas |
| Árboles | `oak_trees`, `pine_tree`, `pine_tree (1)` reemplazan a los árboles de esferas |
| Rocas | `rock_10`, `rock`, `mossy_rock` reemplazan a los dodecaedros |
| Plaza | `medieval_stall` en los 3 puestos + barriles (`medieval_wooden_barrel`) |
| Ruinas del Primer Faro | `ruined_round_tower` + `ruined_rock_fence` |
| Enemigos | `medieval_armour_enemy` reemplaza a los caballeros caídos |
| Espada del héroe | `greatsword02` |
| Agua | Shader propio: olas animadas, fresnel, reflejo del cielo según la hora, brillo del sol, niebla |
| Pasto | 110.000 briznas con viento, degradado base→punta, sombras y desvanecido por distancia (reemplaza los conos) |
| Luz | Tone mapping cinematográfico (ACES) + reflejos del cielo en los metales de los modelos |

## Modelos que NO usé (y por qué)
Pesan demasiado o tienen millones de polígonos para un juego web: sauce animado (760 000 triángulos), altar (460 000),
carpa (157 000), tree_scan (370 000), old_tree (125 000), kit de biblioteca (90 MB), carros, puertas, fortaleza, resto de rocas.
Se pueden agregar reduciéndolos primero.

## Pendiente
- El héroe sigue siendo el caballero original (animado por partes). El modelo del enemigo no tiene esqueleto, por eso no lo usé para el héroe.
- Pasto solo en el pueblo; el mundo abierto exterior no tiene pasto 3D todavía.
- Cabaña, granero y pozo del mundo abierto siguen con sus modelos simples.

## Versión 2 (correcciones tras tus capturas)
- **Modelos negros:** ahora cada modelo usa material propio (textura de color + normal map). Ya no usa los mapas de oclusión/metal del GLB, que era lo más probable que los oscurecía sin luz directa.
- **Tamaños:** casas 12,5 m, pinos 11 m, robles 8,5 m, rocas ~2,7 m, puestos 4,6 m, barriles 1,4 m, caballeros 2,9 m.
- **Colisiones:** el radio de choque de cada casa se ajustó al nuevo tamaño.
- **Suelo:** se eliminó la textura pixelada. Terreno con detalle procedural en 3 escalas (sin repetición visible), y camino de tierra con grano y piedritas. Ver `docs/suelo_pasto_detalle.png`.

## Versión 3
- **Todo el mapa usa modelos 3D**: se borraron los árboles, rocas y conos de trigo originales de TODO el mundo abierto (420 pinos, 170 árboles de la ciénaga, 70 árboles de campo, 260 rocas, 2200 conos de trigo).
  Pinar = `pine_tree (1)` + `pine_tree`; ciénaga = `pine_tree`; campos = `oak_trees` + 6 `old_tree` (acacia grande); rocas = `rock`, `rock_10`, `mossy_rock`.
- El trigo ahora son briznas doradas con viento (ya no hay "espinas").
- **Rendimiento**: cada modelo se fusiona en pocas mallas y se dibuja instanciado.
- **Casas**: reubicadas para no pisar los caminos (mín. 12,5 m del eje) ni chocar entre sí; el radio de colisión coincide con el tamaño.
- **Cámara**: campo de visión 62° → 55° para reducir la distorsión de perspectiva que hacía ver los postes inclinados.

## Versión 4 — optimización + más realismo
**Por qué laggeaba la v3:** dibujaba todos los árboles del mapa (~6 millones de triángulos) en cada cuadro, y otra vez más para las sombras, aunque estuvieran a 300 m o detrás de la cámara.

**Optimización**
- El mundo se divide en bloques de 64 m. Solo se dibujan los que están en pantalla (o a menos de 55 m, para que sus sombras no desaparezcan).
- LOD: más allá de 90 m los árboles y rocas se dibujan como versiones simples (~40 triángulos en vez de miles).
- Las sombras solo las proyectan objetos a menos de 70 m.
- Mallas indexadas (3× menos vértices que en la v3).
- Resolución automática: arranca en un máximo de 1,5× y baja sola hasta 0,6× si los FPS caen de 40; sube de nuevo si hay margen. Si sigue bajo 50 FPS, las sombras se actualizan cada 2 cuadros.
- Se quitaron 110.000 briznas fijas; ahora el pasto se genera por celdas alrededor del jugador (máx. ~64.000 briznas).

**Más realismo**
- Pasto en TODO el mapa según el bioma: verde en la aldea, seco en la costa, oscuro en el pinar, oliva y alto en la ciénaga, dorado y alto en los trigales; casi nada en las cumbres.
- Flores silvestres (blancas, amarillas, violetas, rojas) en aldea, costa y trigales.
- Polen/polvo flotando de día y luciérnagas de noche.
- Viñeta suave en los bordes de la pantalla.

## Versión 5 — protagonista nuevo: Hooded Shadowguard (riggeado y animado)
El modelo de Meshy venía sin esqueleto (T-pose, 160.000 triángulos). Lo riggeé automáticamente:
- **Esqueleto de 19 huesos**: cadera, columna, pecho, cabeza, capa, y por cada lado clavícula, brazo, antebrazo, mano, muslo, pantorrilla y pie.
- **Pesos de piel calculados por zonas** (hombro con clavícula para que no se arrugue, tabardo semi-fijo a la cadera, capa con hueso propio que vuela al correr).
- **Animación**: el esqueleto copia las rotaciones que el juego ya calculaba para el caballero viejo, así funcionan TODOS los estados: caminar, correr (sprint), agacharse, saltar, aterrizar, esquivar, bloquear (con escudo) y atacar (con la espada en la mano). Más respiración, balanceo de cabeza, giro de torso al caminar e inclinación del pecho al golpear.
- La espada (`greatsword02`) está en la mano derecha del modelo y el escudo en el antebrazo izquierdo.
- Altura 2,35 m, mira hacia +Z como el juego. Texturas a 1024 px. Archivo: `models/heroe.glb` (5,8 MB).
- Si `heroe.glb` no carga, el juego usa el caballero viejo.
Capturas de verificación en `docs/`: `heroe_hoja_animaciones.png`, `heroe_animacion.gif`, `heroe_rig_poses.png`.

**Limitaciones**: las animaciones son procedurales (no hay clips de muerte ni de herida); los dedos no se mueven; la capa no tiene física real, solo un hueso que oscila; el modo "armadura pesada" solo aclara el color del personaje.

## Versión 6 — héroe "negro" y "chico"
- **Negro**: la textura de Meshy es muy oscura (albedo lineal mediano 0,008; el pasto ronda 0,10–0,20) y el sol bajo del atardecer la dejaba casi negra. Solución: textura levantada (gamma 0,75, mediana ahora 0,026), un relleno de luz ambiente propio del material del héroe (+20 % del color base, no afecta al resto del mundo) y un leve brillo extra (×1,1). Simulación en `docs/heroe_antes_despues_luz.png`.
- **Chico**: el caballero viejo tenía hombros de 1,2 m de ancho y este es más angosto, por eso parecía menor. Ahora mide ~3 m (escala ×1,3; espada y escudo escalan con él) y la cámara apunta más alto (2,1 m en lugar de 1,7 m).
- Si querés otro tamaño, buscá `root.scale.setScalar(1.3)` en `index.html`; si lo querés más claro u oscuro, buscá `setRGB(1.1,1.1,1.1)` y `diffuseColor.rgb*.2`.
