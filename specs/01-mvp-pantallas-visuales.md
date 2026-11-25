# SPEC 01 — MVP visual de Arcade Vault (todas las pantallas)

> **Status:** Implementado
> **Depends on:** Ninguna
> **Date:** 2026-11-24
> **Objective:** Portar las cinco pantallas de `references/templates` (biblioteca, detalle, reproductor simulado, auth y salón de la fama) a rutas del App Router de Next.js con datos mock, sin implementar ningún juego real.

## Por qué existe este spec

`references/templates` es un prototipo React que corre en el navegador con Babel. Usa un router por hash y estado global en un solo `App`. El proyecto real es Next.js 16 con App Router y `cacheComponents`. Este spec traduce el prototipo a esa arquitectura y fija las decisiones que cambian respecto a la plantilla (rutas reales, TypeScript, sesión en un provider).

Los estilos ya están portados en `app/globals.css` (commit `1087867`). Este spec **no** los reescribe; solo añade lo que falte si una pantalla lo necesita. Por regla de `CLAUDE.md`, la implementación de UI se hace con la skill `/frontend-design`, tomando la plantilla como fuente de verdad visual.

## Alcance

**Dentro:**

- Cinco pantallas con las rutas de la tabla de abajo.
- `Nav` (con menú móvil tipo hamburguesa y contador de créditos fijo) y `Footer`, montados en `app/layout.tsx`.
- Datos mock tipados: 8 juegos, 5 categorías y el generador determinista `seededScores`.
- Filtro por búsqueda y categoría en la biblioteca, con estado vacío "NO HAY RESULTADOS".
- Efecto tilt en las tarjetas de juego.
- Sesión mock: iniciar sesión, crear cuenta, jugar como invitado y cerrar sesión. Se guarda `{ name }` en `localStorage`.
- Reproductor simulado: HUD (jugador, puntuación, vidas, nivel), pausa, botón FIN y modal "FIN DEL JUEGO" con campo de iniciales y botón "GUARDAR PUNTUACIÓN". La arena es decorativa.
- Fila "TU MEJOR MARCA" en el salón cuando hay sesión.
- Página 404 para un `id` de juego que no existe.

| Ruta | Pantalla | Plantilla |
| --- | --- | --- |
| `/` | Biblioteca | `biblioteca.jsx` |
| `/juegos/[id]` | Detalle del juego | `detalle.jsx` |
| `/juegos/[id]/jugar` | Reproductor simulado | `reproductor.jsx` |
| `/auth` | Iniciar sesión / Crear cuenta | `auth.jsx` |
| `/salon` | Salón de la Fama | `salon.jsx` |

**Fuera de alcance (para specs futuros):**

- Cualquier juego real (lógica, canvas, controles, colisiones).
- Backend, base de datos y autenticación real (OAuth Google/GitHub, contraseñas, sesiones en servidor). Los botones GOOGLE y GITHUB son solo visuales.
- Persistencia de puntuaciones. El botón "GUARDAR PUNTUACIÓN" solo muestra "PUNTUACIÓN GUARDADA_" y no escribe nada.
- Mostrar las puntuaciones guardadas en el salón o en el detalle.
- Sistema real de créditos. "CRÉDITOS · 03" es texto fijo.
- Tests automatizados.
- Internacionalización. La interfaz queda solo en español.

## Modelo de datos

Archivo `lib/data.ts`, portado de `data.jsx` con tipos explícitos.

```ts
export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type AccentColor = "cyan" | "magenta" | "yellow" | "green";

export type Game = {
  id: string;          // slug, p. ej. "bloque-buster"
  title: string;       // "BLOQUE BUSTER"
  short: string;       // descripción corta para la tarjeta
  long: string;        // descripción larga para el detalle
  cat: Category;
  cover: string;       // clase CSS, p. ej. "cover-bricks"
  color: AccentColor;  // color del botón JUGAR
  best: number;        // mejor puntuación global
  plays: string;       // "12.4K"
};

export type ScoreRow = {
  rank: number;
  name: string;
  score: number;
  date: string;        // "DD/MM/2026"
};

export const GAMES: Game[];                       // los 8 juegos de la plantilla
export const CATS: ("TODOS" | Category)[];        // ["TODOS", "ARCADE", ...]
export function seededScores(seed: number, count?: number): ScoreRow[];
```

Sesión, en `lib/session.tsx`:

```ts
export type User = { name: string };  // MAYÚSCULAS, máx. 10 caracteres
// localStorage key: "av_user" -> JSON de User, o ausente si no hay sesión
```

Convenciones:

- `seededScores` es determinista: mismo `seed` produce las mismas filas. Los seeds se mantienen como en la plantilla (`id.length * 17 + 3` en detalle, `id.length * 23 + 7` en salón).
- Números formateados con `toLocaleString("es-ES")`.
- Los 8 juegos conservan los textos, categorías y valores de `references/templates/data.jsx`.

## Plan de implementación

Antes de empezar, leer la guía relevante de `node_modules/next/dist/docs/01-app` (rutas dinámicas, `generateStaticParams`, `notFound`, y reglas de `cacheComponents` para `params`), como exige `AGENTS.md`.

1. Crear `lib/data.ts` con los tipos, `GAMES`, `CATS` y `seededScores`. Verificar con `npx tsc --noEmit`.
2. Crear `lib/session.tsx` (`"use client"`): `SessionProvider` con `user`, `signIn(user | null)` y `signOut()`, y el hook `useSession`. Lee `av_user` después del montaje para evitar errores de hidratación. Montarlo en `app/layout.tsx`.
3. Crear `components/nav.tsx` (cliente): logo, enlaces Biblioteca / Salón de la Fama con estado activo según `usePathname`, contador de créditos, botón de sesión y panel móvil. Montarlo en `app/layout.tsx` dentro de `#root`, antes de `<main>`.
4. Crear `components/footer.tsx` y montarlo en el layout después de `<main>`. Verificar que Nav y Footer se ven en `/`.
5. Crear `components/game-card.tsx` (cliente, con tilt) y `components/library.tsx` (cliente, hero, buscador, chips y grilla con estado vacío). Reemplazar `app/page.tsx` por la biblioteca. Las tarjetas enlazan a `/juegos/[id]`.
6. Crear `components/leaderboard.tsx` y `app/juegos/[id]/page.tsx` con `generateStaticParams` y `notFound()` para ids inválidos. Botones: JUGAR AHORA (`/juegos/[id]/jugar`) y VOLVER AL VAULT (`/`).
7. Crear `components/auth-form.tsx` (cliente) y `app/auth/page.tsx`: pestañas entrar/crear, campos de la plantilla, invitado, botones sociales decorativos. Al enviar llama a `signIn` y navega a `/` con `router.push`.
8. Crear `components/hall-of-fame.tsx` (cliente, pestañas por juego, podio, tabla y fila "TU MEJOR MARCA" si hay sesión) y `app/salon/page.tsx`.
9. Crear `components/game-player.tsx` (cliente: HUD, pausa, FIN, arena decorativa, modal con iniciales y mensaje de guardado) y `app/juegos/[id]/jugar/page.tsx` con `generateStaticParams` y `notFound()`. SALIR vuelve a `/juegos/[id]`.
10. Limpiar: borrar restos del scaffold que ya no se usen (por ejemplo `public/next.svg`, `public/vercel.svg` si nada los referencia) y ajustar `metadata` por ruta si hace falta.

## Criterios de aceptación

- [ ] `npm run build` termina sin errores.
- [ ] `npm run lint` termina sin errores ni warnings nuevos.
- [ ] `/` muestra el hero "ARCADE VAULT" y 8 tarjetas de juego.
- [ ] Escribir "caí" en el buscador deja solo la tarjeta CAÍDA.
- [ ] Elegir el chip SHOOTER muestra exactamente INVASORES y ROCAS.
- [ ] Una búsqueda sin coincidencias muestra "NO HAY RESULTADOS".
- [ ] Hacer clic en una tarjeta o en JUGAR navega a `/juegos/<id>` de ese juego.
- [ ] `/juegos/bloque-buster` muestra título, descripción larga, tres estadísticas y 10 filas de puntuaciones, con las tres primeras destacadas.
- [ ] Recargar `/juegos/bloque-buster` muestra las mismas 10 puntuaciones (determinista).
- [ ] `/juegos/no-existe` y `/juegos/no-existe/jugar` muestran la página 404.
- [ ] JUGAR AHORA lleva a `/juegos/<id>/jugar`; VOLVER AL VAULT lleva a `/`.
- [ ] En el reproductor la puntuación sube sola; PAUSA la detiene y muestra "EN PAUSA"; REANUDAR la retoma.
- [ ] FIN abre el modal "FIN DEL JUEGO" con la puntuación final.
- [ ] En el modal, GUARDAR PUNTUACIÓN muestra "PUNTUACIÓN GUARDADA_" y no escribe en `localStorage`.
- [ ] JUGAR DE NUEVO reinicia el HUD a 0 puntos, 3 vidas y nivel 01.
- [ ] SALIR del reproductor vuelve a `/juegos/<id>`.
- [ ] En `/auth`, la pestaña CREAR CUENTA añade el campo "Correo electrónico".
- [ ] Entrar con usuario "px_kai" deja `av_user = {"name":"PX_KAI"}` en `localStorage`, redirige a `/` y el Nav muestra "PX_KAI ▾".
- [ ] JUGAR COMO INVITADO redirige a `/` y el Nav sigue mostrando "Iniciar Sesión".
- [ ] Hacer clic en "PX_KAI ▾" cierra la sesión y borra `av_user`.
- [ ] Recargar la página con sesión iniciada mantiene el nombre en el Nav, sin warnings de hidratación en la consola.
- [ ] `/salon` muestra podio (1.º, 2.º y 3.º), tabla de 12 filas y una pestaña por cada uno de los 8 juegos.
- [ ] Cambiar de pestaña en `/salon` cambia el podio y la tabla.
- [ ] Con sesión iniciada, `/salon` muestra la fila "TU MEJOR MARCA EN <JUEGO>"; sin sesión, no.
- [ ] En un ancho de 390 px el Nav muestra el botón `≡` y abre y cierra el panel móvil.
- [ ] El enlace activo del Nav se resalta en `/`, `/juegos/*` (Biblioteca) y `/salon`.
- [ ] La consola del navegador no muestra errores en ninguna de las cinco rutas.

## Decisiones

- **Sí:** rutas reales del App Router. Dan URLs compartibles, `<Link>` con prefetch y encajan con `cacheComponents` y `partialPrefetching`.
- **No:** SPA con router por hash como la plantilla. Va contra el App Router y pierde SSR y prefetch.
- **Sí:** sesión mock en `localStorage` bajo la clave `av_user`, igual que la plantilla. Es lo mínimo para que Nav y Salón reaccionen al usuario.
- **No:** cookie y Server Actions. Es sobreingeniería para un MVP visual sin backend.
- **Sí:** datos mock tipados en `lib/data.ts`, con `seededScores` determinista. Evita desajustes de hidratación y deja un único punto para reemplazarlo por una API.
- **Sí:** reproductor simulado con puntaje aleatorio, pausa y modal de fin. Valida el flujo completo de pantallas sin escribir un juego.
- **No:** persistir puntuaciones. Se decidió que el modal solo confirme el guardado; la persistencia llega con el backend o en otro spec.
- **No:** tests automatizados. La verificación es manual más `build` y `lint`.
- **Sí:** componentes de cliente solo donde hay estado o eventos (Nav, Library, GameCard, AuthForm, HallOfFame, GamePlayer). Las páginas siguen siendo componentes de servidor.
- **Sí:** estado de pestaña del salón en el cliente (no en query string), como la plantilla. Si se quiere compartir una pestaña concreta, va en otro spec.
- **Sí:** no reescribir los estilos ya portados en `app/globals.css`. Solo se añaden clases si falta algo.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Error de hidratación al leer `localStorage` en el primer render | `SessionProvider` empieza con `user = null` y lee `av_user` en un `useEffect`. |
| Puntuación aleatoria del reproductor distinta entre servidor y cliente | El `setInterval` solo corre en un efecto del cliente; el render inicial usa `score = 0`. |
| `cacheComponents` exige tratar `params` como dato dinámico en rutas `[id]` | Usar `generateStaticParams` con los 8 ids y consultar la guía de Next 16 antes del paso 6. |
| Clases CSS de la plantilla no presentes en `globals.css` | Comparar con `references/templates/styles.css` al terminar cada pantalla y copiar solo lo que falte. |
| `localStorage` bloqueado o con JSON inválido | Envolver la lectura en `try/catch` y tratarlo como "sin sesión". |

## Qué **no** está en este spec

- Ningún juego jugable.
- Backend, cuentas reales u OAuth.
- Guardar o mostrar puntuaciones reales.
- Créditos funcionales.
- Tests automatizados e internacionalización.

Cada uno de estos puntos, si se aborda, va en su propio spec.
