# SPEC 05 — Primer juego real: Asteroides

> **Status:** Implementado
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-11-27
> **Objective:** Portar el juego de `references/started-games/02-asteroids` a un motor TypeScript con canvas y conectarlo a `GamePlayer` como un juego nuevo e independiente (`id: "asteroids"`, título "ASTEROIDES"), con su HUD de plataforma sincronizado por callbacks.

## Por qué existe este spec

Hoy `components/game-player.tsx` es un mock: suma puntos aleatorios con un `setInterval` y dibuja una arena CSS falsa para los 8 juegos del catálogo. El juego de asteroides ya existe como un proyecto aparte (`game.js`, 510 líneas, vanilla JS, canvas 800×600, sin dependencias) y es el primero que se vuelve jugable de verdad. Este spec lo adapta a Next.js sin mezclarlo con el juego mock `rocas`, que aunque se parece ("Pulveriza asteroides en gravedad cero") es otra entrada del catálogo y **no se toca**.

Como `CLAUDE.md` exige, cualquier UI nueva (portada del catálogo y ajuste de la pantalla CRT) se hace con la skill `/frontend-design`, tomando como base el sistema visual existente en `app/globals.css`.

## Alcance

**Dentro:**

- Nueva entrada en `GAMES` (`lib/data.ts`): `id: "asteroids"`, `title: "ASTEROIDES"`, categoría `SHOOTER`, al final del array. Se añade al catálogo, a `/juegos/asteroids`, `/juegos/asteroids/jugar` y a las pestañas del Salón de la Fama (con puntuaciones mock, como los demás).
- Portada nueva `.cover-asteroides` en `app/globals.css` (nave + polígonos de asteroides en neón). `.cover-rocas` no se modifica.
- Motor del juego en `lib/games/asteroids/`: port a TypeScript de `game.js` (clases `Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle`, estado, `update`, `draw`) sin variables globales ni acceso a `document` a nivel de módulo.
- API del motor: `createAsteroidsGame(canvas, callbacks)` devuelve `{ pause(), resume(), restart(), stop(), destroy() }`.
- Componente de cliente `components/games/asteroids-canvas.tsx` que monta el motor en un `<canvas>` 800×600 lógico y lo limpia al desmontar.
- Integración en `GamePlayer`: si `game.id === "asteroids"`, la pantalla CRT muestra el canvas en lugar de la arena CSS falsa, y el HUD de plataforma (Puntuación, Vidas, Nivel) muestra el estado real del motor. PAUSA, REANUDAR, FIN y JUGAR DE NUEVO controlan el motor.
- El canvas **mantiene su HUD interno** (SCORE, NIVEL, vidas, contador `3x`), y la capa React pinta además el HUD externo de la plataforma. Ambos se alimentan del mismo estado del motor, que notifica a React por callbacks.
- Al perder la última vida se abre el modal "FIN DEL JUEGO" de la plataforma con la puntuación real.
- Controles de teclado del original: flechas izquierda/derecha (rotar), flecha arriba (propulsor) y Espacio (disparar). Se evita el scroll de la página con esas teclas mientras se juega.

| Elemento                     | Cambio                                                                 |
| ---------------------------- | ---------------------------------------------------------------------- |
| `lib/data.ts`                | Añade 1 juego al final de `GAMES`                                      |
| `app/globals.css`            | Añade `.cover-asteroides` y estilos del canvas dentro de `.crt-screen` |
| `components/game-player.tsx` | Rama para `asteroids`; los otros 8 juegos siguen con el mock           |
| `app/juegos/[id]/**`         | Sin cambios de código (las rutas se generan desde `GAMES`)             |
| Juego `rocas`                | Sin cambios                                                            |

**Fuera de alcance (para specs futuros):**

- Persistir la puntuación (Supabase, tablas, RLS, `localStorage`). "GUARDAR PUNTUACIÓN" sigue siendo solo confirmación visual.
- Auth real y ranking real. El leaderboard del detalle y del Salón sigue con `seededScores`.
- Controles táctiles para móvil (la ficha ya dice "TECLADO / TÁCTIL"; ese texto no se cambia aquí).
- Sonido, nuevos power-ups, OVNIs o cualquier cambio de jugabilidad.
- Un registro genérico o framework de juegos. Se ramifica por `game.id` hasta que llegue el segundo juego real (Tetris y Arkanoid están en `references/started-games`).
- Portar los otros juegos de `references/started-games`.
- Tests automatizados.

## Modelo de datos

No se persiste nada. Se añade la entrada del catálogo y los tipos del motor.

Entrada nueva en `GAMES` (el texto exacto se ajusta al implementar, respetando el tono del resto):

```ts
{
  id: "asteroids",
  title: "ASTEROIDES",
  short: "Rota, dispara y sobrevive al campo de asteroides.",
  long: "Pilota tu nave en el vacío, dispara a las rocas y míralas partirse en fragmentos cada vez más rápidos. Recoge el power-up 3x para disparar en abanico. Cada nivel trae más asteroides.",
  cat: "SHOOTER",
  cover: "cover-asteroides",
  color: "cyan",
  best: 0,       // aún no hay puntuaciones reales
  plays: "0",
}
```

Tipos del motor en `lib/games/asteroids/types.ts`:

```ts
export type AsteroidsSnapshot = {
	score: number;
	lives: number; // 0..3
	level: number; // 1..n
};

export type AsteroidsCallbacks = {
	// Solo se llama cuando cambia score, vidas o nivel (no en cada frame).
	onChange: (snapshot: AsteroidsSnapshot) => void;
	// Una sola vez por partida, al perder la última vida.
	onGameOver: (snapshot: AsteroidsSnapshot) => void;
};

export type AsteroidsGame = {
	pause(): void;
	resume(): void;
	restart(): void; // nueva partida: 3 vidas, nivel 1, score 0
	stop(): void; // detiene la simulación y suelta las teclas (modal abierto, FIN)
	destroy(): void; // cancela rAF y quita todos los listeners
};
```

Estructura de archivos:

```text
lib/games/asteroids/
  engine.ts     # createAsteroidsGame(canvas, callbacks): AsteroidsGame
  entities.ts   # Bullet, Asteroid, PowerUp, Ship, Particle y constantes
  types.ts      # tipos de arriba
components/games/
  asteroids-canvas.tsx   # "use client": monta/desmonta el motor
```

Convenciones:

- Dimensiones lógicas fijas 800×600; el canvas se escala por CSS al ancho de `.crt-screen` (`aspect-ratio: 4 / 3` ya existe) sin deformarse.
- Todo el estado vive dentro de la instancia del motor (nada de globales de módulo), para que dos montajes seguidos (React Strict Mode en desarrollo) no compartan estado.
- Los listeners de teclado se registran en `window` al crear el motor y se retiran en `destroy()`.
- El motor no importa React ni nada de `next/*`.

## Plan de implementación

Antes de empezar, leer en `node_modules/next/dist/docs/01-app` las guías de componentes de cliente (`"use client"`) y las reglas de `cacheComponents`, como exige `AGENTS.md`. Leer también `references/started-games/02-asteroids/game.js` completo: es la fuente de verdad de la jugabilidad.

1. Añadir la entrada `asteroids` al final de `GAMES` en `lib/data.ts`. Verificar con `npx tsc --noEmit` y que `/juegos` muestra la tarjeta (con portada vacía por ahora) y `/juegos/asteroids` carga con "JUGAR AHORA". Confirmar que Inicio sigue mostrando los mismos 6 primeros juegos.
2. Con `/frontend-design`, crear `.cover-asteroides` en `app/globals.css` coherente con las demás portadas (fondo oscuro, trazos neón de nave y rocas). Verificar en `/juegos` y `/juegos/asteroids` que se ve distinta de `.cover-rocas`, y que `/juegos/rocas` queda igual.
3. Crear `lib/games/asteroids/types.ts` y `entities.ts`: portar las clases y constantes de `game.js` a TypeScript, recibiendo el contexto 2D y las dimensiones como parámetros en lugar de usar globales. Mantener valores idénticos (velocidades, radios, puntos, `POWERUP_*`, `TRIPLE_SPREAD`). Verificar con `npx tsc --noEmit`.
4. Crear `lib/games/asteroids/engine.ts` con `createAsteroidsGame`: estado interno, bucle `requestAnimationFrame` con `dt` limitado a 50 ms, `update`/`draw` idénticos al original, HUD interno del canvas, y la API `pause`/`resume`/`restart`/`stop`/`destroy`. Cambios respecto al original: (a) sin overlay "GAME OVER" ni reinicio con Espacio; al pasar a `gameover` se llama a `onGameOver` una sola vez y el motor deja de simular; (b) `onChange` se emite solo si cambió score, vidas o nivel; (c) `preventDefault` en flechas y Espacio solo mientras el motor está activo y el foco no está en un `input`/`textarea`; (d) `pause` congela la simulación y el parpadeo/temporizadores, y `resume` no provoca un salto de `dt`. Verificar con `npx tsc --noEmit` y `npm run lint`.
5. Crear `components/games/asteroids-canvas.tsx`: `<canvas width={800} height={600}>` con CSS para ocupar la pantalla CRT, `useEffect` que crea el motor y devuelve `destroy` como limpieza, y un `ref` o props para exponer `pause`/`resume`/`restart`/`stop` a `GamePlayer`. Verificar con `npx tsc --noEmit`.
6. Integrar en `components/game-player.tsx`: cuando `game.id === "asteroids"`, renderizar `AsteroidsCanvas` dentro de `.crt-screen` en vez de `.game-arena`; usar `onChange` para actualizar `score`, `lives` y `level` (el nivel viene del motor, no de `score / 2500`); desactivar el `setInterval` mock; conectar PAUSA/REANUDAR, FIN (llama a `stop()` y abre el modal con la puntuación actual), JUGAR DE NUEVO (`restart()` y limpia el modal) y `onGameOver` (abre el modal). Los otros 8 juegos conservan el comportamiento actual sin cambios. Verificar jugando en `/juegos/asteroids/jugar` y en `/juegos/rocas/jugar`.
7. Ajustes visuales finales con `/frontend-design` (canvas dentro del marco CRT con las scanlines existentes, texto del pie "CARGA · 1MB" si corresponde, 390 px de ancho). Ejecutar la verificación completa de los criterios de aceptación en el navegador (consola sin errores, navegar fuera y volver sin fugas) y `npm run build`.

## Criterios de aceptación

- [ ] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores ni warnings nuevos.
- [ ] `GAMES` contiene el juego `asteroids` con título "ASTEROIDES" y `rocas` sigue idéntico; ninguno comparte `cover`.
- [ ] `/juegos` lista 9 juegos y el filtro SHOOTER incluye "ASTEROIDES" y "ROCAS" como tarjetas distintas con portadas distintas.
- [ ] `/juegos/asteroids` y `/juegos/asteroids/jugar` cargan; `/juegos/rocas/jugar` sigue mostrando el mock con la arena CSS.
- [ ] Inicio sigue mostrando los mismos 6 primeros juegos que antes.
- [ ] En `/juegos/asteroids/jugar` se ve un canvas con 4 asteroides grandes y la nave parpadeando (invencible 3 s) en el centro, y el HUD interno del canvas muestra SCORE, NIVEL y 3 iconos de vida.
- [ ] Flechas izquierda/derecha rotan la nave, flecha arriba acelera con llama del propulsor, Espacio dispara, y la página no hace scroll al pulsarlas.
- [ ] Destruir un asteroide grande suma 20, mediano 50 y pequeño 100 puntos, y los grandes y medianos se parten en dos del tamaño inferior.
- [ ] El HUD de la plataforma muestra Puntuación, Vidas y Nivel con los mismos valores que el HUD del canvas en todo momento (sin desfase visible).
- [ ] Chocar con un asteroide resta una vida, la nave reaparece a los 2 s con 3 s de invencibilidad, y al limpiar todos los asteroides sube el nivel (con `3 + nivel` asteroides).
- [ ] El power-up `3x` aparece, se recoge al tocarlo y activa el disparo triple 5 s, con el contador `3x  N.Ns` visible en el canvas.
- [ ] PAUSA congela asteroides, nave y temporizadores; REANUDAR continúa sin saltos ni pérdida de vidas.
- [ ] Al perder la última vida se abre el modal "FIN DEL JUEGO" con la puntuación real, sin overlay "GAME OVER" en el canvas, y Espacio ya no reinicia la partida.
- [ ] Con el modal abierto se pueden escribir espacios en el campo de iniciales y las flechas/Espacio no disparan ni hacen `preventDefault` sobre el input.
- [ ] FIN abre el modal con la puntuación actual y detiene el juego.
- [ ] JUGAR DE NUEVO empieza una partida con score 0, 3 vidas y nivel 1.
- [ ] "GUARDAR PUNTUACIÓN" muestra la confirmación visual y no escribe nada en Supabase ni en `localStorage`.
- [ ] Salir con SALIR o navegando a otra ruta y volver no deja el bucle ni los listeners activos (una sola instancia: la nave no se mueve el doble de rápido tras volver).
- [ ] En desarrollo (Strict Mode) el juego no arranca dos veces ni duplica disparos por pulsación.
- [ ] A 390 px de ancho no hay scroll horizontal y el canvas conserva la proporción 4:3 sin deformarse.
- [ ] La consola del navegador no muestra errores ni warnings de hidratación en `/juegos`, `/juegos/asteroids`, `/juegos/asteroids/jugar` y `/salon`.

## Decisiones

- **Sí:** motor TypeScript propio en `lib/games/asteroids/` con callbacks hacia React. El HUD de la plataforma necesita leer score, vidas y nivel reales, pausar y recibir el game over, algo que un `iframe` no permite.
- **No:** `iframe` con `index.html` en `public/`. Aísla bien pero deja al HUD, la pausa y el modal desconectados del juego.
- **Sí:** juego nuevo `asteroids` / "ASTEROIDES", separado de `rocas`. El usuario pidió explícitamente que no se mezclen: cada juego es independiente aunque se parezcan.
- **No:** reutilizar `rocas` ni su portada, ni retocar su texto o datos.
- **Sí:** id `asteroids` (decisión del usuario) con título visible en español "ASTEROIDES". La URL queda `/juegos/asteroids`.
- **Sí:** portada propia `.cover-asteroides`. Dos tarjetas con la misma portada se confundirían.
- **Sí:** el canvas conserva su HUD interno y React pinta el HUD externo, ambos sincronizados desde el estado del motor. Decisión del usuario; mantiene la fidelidad visual del original y la consistencia con los otros juegos.
- **No:** quitar el HUD del canvas ni ocultar el de la plataforma.
- **Sí:** jugabilidad idéntica al original. Los únicos cambios son los necesarios para convivir con la plataforma: sin overlay "GAME OVER", sin reinicio con Espacio, pausa real, limpieza de listeners y bloqueo del scroll.
- **Sí:** al game over se usa el modal "FIN DEL JUEGO" de la plataforma. Es el flujo ya definido para todos los juegos.
- **No:** overlay de canvas y modal a la vez; sería redundante.
- **Sí:** puntuación solo mostrada, sin persistir. Tablas, RLS y Auth son otro dominio (continuación del SPEC 04).
- **No:** `localStorage`; añadiría una persistencia que luego habría que migrar.
- **Sí:** `best: 0` y `plays: "0"` en el catálogo, porque no existen datos reales todavía. El leaderboard sigue siendo `seededScores`, como en los otros juegos.
- **Sí:** ramificar por `game.id === "asteroids"` en `GamePlayer`. Con un solo juego real, un registro genérico sería abstracción prematura.
- **No:** registro/framework de juegos; se evaluará al portar el segundo juego.
- **Sí:** estado del motor dentro de la instancia, sin globales. Evita estados compartidos al remontar el componente (Strict Mode, navegación).
- **No:** controles táctiles en este spec; ampliarían el alcance y tienen su propio diseño.

## Riesgos

| Riesgo                                                                                                                       | Mitigación                                                                                                         |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Fuga del bucle `requestAnimationFrame` o de listeners al navegar o en Strict Mode, con juego acelerado o disparos duplicados | `destroy()` cancela rAF y quita listeners; criterios de aceptación para remontar y Strict Mode.                    |
| `preventDefault` sobre Espacio o flechas rompe el input de iniciales del modal                                               | El motor solo bloquea teclas mientras está activo y el foco no está en un `input`; `stop()` en game over y FIN.    |
| Re-renders de React por frame ralentizan el juego                                                                            | `onChange` solo se emite cuando cambia score, vidas o nivel; el dibujo vive fuera del árbol de React.              |
| Desfase entre HUD del canvas y HUD externo                                                                                   | Ambos leen el mismo estado del motor; `onChange` se emite en el mismo `update` que cambia el valor.                |
| `cacheComponents` y componentes de cliente que tocan `window`/`document`                                                     | El motor solo accede al DOM dentro de `createAsteroidsGame`, llamado desde un `useEffect`; nada a nivel de módulo. |
| Colisión de nombres CSS con `.cover-rocas` o clases de la arena mock                                                         | Clase propia `.cover-asteroides`; estilos del canvas acotados a `.crt-screen canvas`.                              |
| El canvas pierde nitidez al escalarse en pantallas pequeñas o de alta densidad                                               | Resolución lógica fija 800×600 y escalado por CSS; ajustar en el paso 7 con `/frontend-design` si hace falta.      |
| Estilos CRT (scanlines, viñeta) tapan o atenúan el canvas                                                                    | Revisar el apilado (`z-index`) de `.crt-screen::before/::after` en el paso 7.                                      |

## Qué **no** está en este spec

- Persistencia de puntuaciones y ranking real (Supabase, `localStorage`).
- Auth real.
- Controles táctiles y sonido.
- Cambios de jugabilidad o nuevos power-ups.
- Registro genérico de juegos.
- Port de Tetris, Arkanoid u otros juegos de `references/started-games`.
- Cambios en el juego `rocas`.
- Tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propio spec.
