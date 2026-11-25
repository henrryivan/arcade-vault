# SPEC 02 — Home (landing) en `/` y biblioteca movida a `/juegos`

> **Status:** Aprobado
> **Depends on:** SPEC 01
> **Date:** 2026-11-24
> **Objective:** Implementar la página Home de `references/templates/home-about` como portada en `/` y mover la biblioteca actual a `/juegos`, sin implementar la página About.

## Por qué existe este spec

El SPEC 01 dejó la biblioteca en `/`. La plantilla nueva (`references/templates/home-about`) añade una landing con hero, secciones y CTAs, y espera que la biblioteca viva en otra ruta. Este spec reubica la biblioteca, añade la landing y corrige todos los enlaces que apuntaban a `/` como "biblioteca".

La plantilla nueva también incluye `about.jsx`. **No se implementa aquí.** Por regla de `CLAUDE.md`, la UI se hace con la skill `/frontend-design`, tomando la plantilla como fuente de verdad visual.

## Alcance

**Dentro:**

- Nueva página `/` con las seis secciones de `home.jsx`: hero, "¿Por qué Arcade Vault?", "Juegos disponibles ahora", stats, "Actividad en vivo", precios con FAQ y CTA final.
- Mover la biblioteca actual (`<Library />`) a `/juegos`.
- Actualizar `Nav`: enlaces Inicio (`/`), Biblioteca (`/juegos`) y Salón de la Fama (`/salon`), en escritorio y en el panel móvil. El logo lleva a `/`.
- Actualizar los enlaces internos que usaban `/` como biblioteca: "VOLVER AL VAULT" en el detalle, en el reproductor y en el salón pasan a `/juegos`.
- Revelado al hacer scroll (clase `.reveal` + `IntersectionObserver`), siluetas pixel flotantes y los cuatro iconos SVG de las tarjetas de características.
- Datos mock tipados para las secciones del home en `lib/data.ts`.
- Portar a `app/globals.css` solo las clases de la plantilla que falten para el home.

| Ruta | Pantalla | Plantilla | Cambio |
| --- | --- | --- | --- |
| `/` | Home (landing) | `home.jsx` | Nueva |
| `/juegos` | Biblioteca | `biblioteca.jsx` | Movida desde `/` |
| `/juegos/[id]` | Detalle | — | Solo enlaces |
| `/juegos/[id]/jugar` | Reproductor | — | Solo enlaces |
| `/salon` | Salón de la Fama | — | Solo enlaces |
| `/auth` | Auth | — | Sin cambios (sigue redirigiendo a `/`) |

Mapa de CTAs del home:

| Elemento | Destino |
| --- | --- |
| EXPLORAR JUEGOS, VER TODOS LOS JUEGOS →, INSERTAR MONEDA → | `/juegos` |
| CREAR CUENTA, EMPEZAR GRATIS → | `/auth` |
| VER SALÓN → | `/salon` |
| `MiniCard` de un juego | `/juegos/[id]` |

**Fuera de alcance (para specs futuros):**

- Página About (`about.jsx`), su ruta y el enlace "Acerca de" en el Nav.
- Datos reales de actividad, ranking del día o contadores. Todo es mock estático.
- Reemplazar `lib/data.ts` por una API.
- Cambios en la lógica de sesión, auth o reproductor.
- Tests automatizados e internacionalización.

## Modelo de datos

Se añaden constantes tipadas a `lib/data.ts`, portadas de los arrays inline de `home.jsx`. `GAMES` se reutiliza para los `MiniCard` (`GAMES.slice(0, 6)`).

```ts
export type RecentScore = {
  player: string;     // "NEONFOX"
  game: string;       // nombre visible, p. ej. "Caída"
  score: number;      // se muestra como "+184.220"
  ago: string;        // "hace 2 min"
  color: AccentColor;
};

export type TopPlayer = {
  rank: number;       // 1..5
  player: string;
  score: number;
};

export type HomeFeature = {
  icon: "GAMEPAD" | "FREE" | "TROPHY" | "ROCKET";
  title: string;
  desc: string;
  color: AccentColor;
};

export type HomeStat = { n: string; u: string; s: string };
export type FaqItem = { q: string; a: string };

export const HOME_FEATURES: HomeFeature[];   // 4
export const HOME_STATS: HomeStat[];         // 3
export const RECENT_SCORES: RecentScore[];   // 7
export const TOP_TODAY: TopPlayer[];         // 5
export const PRICING_PERKS: string[];        // 6
export const PRICING_FAQ: FaqItem[];         // 3
```

Convenciones:

- Textos y valores idénticos a `home.jsx`.
- Números con `toLocaleString("es-ES")`, igual que en el SPEC 01.
- Sin aleatoriedad en el render: todo es estático para no provocar errores de hidratación.

## Plan de implementación

Antes de empezar, consultar `node_modules/next/dist/docs/01-app` sobre `Link`, `usePathname` y componentes de cliente, como exige `AGENTS.md`.

1. Crear `app/juegos/page.tsx` con `<Library />` y `metadata` propia (título "Juegos"). `app/page.tsx` sigue sirviendo la biblioteca hasta el paso 6, así el sistema sigue funcionando. Verificar que `/juegos` muestra el hero de la biblioteca y 8 tarjetas.
2. Actualizar `Nav` (`components/nav.tsx`): añadir "Inicio" → `/`, apuntar "Biblioteca" a `/juegos`, logo a `/`. Estado activo: Inicio solo en `/` exacto; Biblioteca en `/juegos` y `/juegos/*`; Salón en `/salon`. Aplicarlo a los enlaces de escritorio y del panel móvil.
3. Cambiar a `/juegos` los enlaces "VOLVER AL VAULT" y equivalentes en `app/juegos/[id]/page.tsx`, `components/game-player.tsx` y `components/hall-of-fame.tsx`. Revisar `components/library.tsx` y `components/game-card.tsx` por si enlazan a `/`.
4. Añadir a `lib/data.ts` los tipos y constantes de la sección Modelo de datos. Verificar con `npx tsc --noEmit`.
5. Comparar `references/templates/home-about/styles.css` con `app/globals.css` y portar solo las clases del home que falten (`.home*`, `.home-silos`, `.silo`, `.feature-*`, `.mini-*`, `.stat-*`, `.tick*`, `.top-*`, `.price-*`, `.pc-*`, `.faq-*`, `.home-final`, `.reveal`, animaciones asociadas). No reescribir estilos existentes.
6. Crear `components/home.tsx` (cliente por el `IntersectionObserver`) con las seis secciones, `FloatingSilhouettes`, `FeatureIcon` y `MiniCard`, usando `<Link>` para todos los destinos del mapa de CTAs. Reemplazar `app/page.tsx` por `<Home />`. Respetar `prefers-reduced-motion` en el revelado y las animaciones.
7. Ajustar `metadata` de `/` (título del sitio) y de `/juegos`. Verificar que `/auth` sigue redirigiendo a `/` y que el Nav marca el enlace correcto en cada ruta.

## Criterios de aceptación

- [ ] `npm run build` termina sin errores.
- [ ] `npm run lint` termina sin errores ni warnings nuevos.
- [ ] `/` muestra el título "EL ARCADE / CLÁSICO ESTÁ / DE VUELTA" y los botones EXPLORAR JUEGOS y CREAR CUENTA.
- [ ] `/` muestra las secciones `// 01` a `// 04` y el bloque final "¿LISTO PARA JUGAR?".
- [ ] La sección "¿POR QUÉ ARCADE VAULT?" muestra exactamente 4 tarjetas con icono.
- [ ] "JUEGOS DISPONIBLES AHORA" muestra exactamente 6 `MiniCard`, los 6 primeros de `GAMES`.
- [ ] Hacer clic en una `MiniCard` navega a `/juegos/<id>` de ese juego.
- [ ] EXPLORAR JUEGOS, VER TODOS LOS JUEGOS → e INSERTAR MONEDA → navegan a `/juegos`.
- [ ] CREAR CUENTA y EMPEZAR GRATIS → navegan a `/auth`.
- [ ] VER SALÓN → navega a `/salon`.
- [ ] "ÚLTIMAS PUNTUACIONES" muestra 7 filas y "TOP JUGADORES · HOY" muestra 5 filas, con las tres primeras destacadas.
- [ ] La sección de precios muestra "$0 / SIEMPRE", 6 ventajas y 3 preguntas frecuentes.
- [ ] Las secciones con `.reveal` aparecen al hacer scroll.
- [ ] `/juegos` muestra la biblioteca completa: hero, buscador, chips y 8 tarjetas.
- [ ] En `/juegos`, el filtro por búsqueda y por categoría funciona igual que en el SPEC 01 (p. ej. chip SHOOTER muestra INVASORES y ROCAS).
- [ ] El Nav tiene los enlaces Inicio, Biblioteca y Salón de la Fama, y no tiene "Acerca de".
- [ ] El enlace activo del Nav es Inicio en `/`, Biblioteca en `/juegos` y `/juegos/*`, y Salón en `/salon`.
- [ ] El logo del Nav lleva a `/`.
- [ ] "VOLVER AL VAULT" en el detalle, el reproductor y el salón lleva a `/juegos`.
- [ ] Entrar con usuario "px_kai" en `/auth` redirige a `/` y muestra el home con "PX_KAI ▾" en el Nav.
- [ ] En un ancho de 390 px el Nav muestra `≡` y el panel móvil lista Inicio, Biblioteca, Salón y Cuenta o Iniciar Sesión.
- [ ] En 390 px el home no tiene scroll horizontal.
- [ ] No existe ninguna ruta `/about` ni referencia a `about.jsx` en el código.
- [ ] La consola del navegador no muestra errores ni warnings de hidratación en `/`, `/juegos`, `/juegos/bloque-buster`, `/auth` y `/salon`.

## Decisiones

- **Sí:** Home en `/` y biblioteca en `/juegos`. Es lo que pidió el usuario y encaja con que `/juegos/[id]` ya cuelga de `/juegos`.
- **No:** mantener la biblioteca en `/` y poner el home en otra ruta. La portada de un sitio debe estar en la raíz.
- **Sí:** omitir el enlace "Acerca de" del Nav. Evita un enlace roto hasta que exista About.
- **No:** dejar "Acerca de" apuntando a `/about` con 404.
- **Sí:** auth redirige a `/` (el home), sin cambios sobre el SPEC 01. El usuario lo confirmó.
- **Sí:** datos del home como constantes tipadas en `lib/data.ts`. Mantiene un único lugar para reemplazarlos por una API.
- **No:** arrays inline en el componente, como en la plantilla. Mezcla datos y presentación.
- **Sí:** `Home` como componente de cliente por el `IntersectionObserver`. El contenido sigue renderizándose en el servidor; el efecto solo añade la clase `in`.
- **Sí:** mapa de CTAs según la plantilla. El usuario lo confirmó.
- **Sí:** respetar `prefers-reduced-motion` en el revelado y en las animaciones. La plantilla no lo hace, pero es una mejora sin coste de alcance.
- **Sí:** portar solo las clases CSS que falten. No reescribir `app/globals.css`.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Contenido `.reveal` invisible si el `IntersectionObserver` falla o JS está desactivado | Que el estado oculto solo se aplique cuando el efecto ya corrió en el cliente, o que `prefers-reduced-motion` muestre todo de inmediato. |
| Enlaces a `/` olvidados que antes significaban "biblioteca" | Buscar `href="/"` y `push("/")` en `app/` y `components/` en el paso 3 y revisar cada resultado. |
| Colisión de nombres CSS al portar (`.stat-*`, `.top-*`) con clases existentes de `globals.css` | Comparar antes de copiar en el paso 5; renombrar con prefijo `home-` si hay conflicto de significado. |
| Desbordamiento horizontal en móvil por las siluetas flotantes | Contenedor `.home-silos` con `overflow: hidden`; verificar a 390 px. |

## Qué **no** está en este spec

- Página About y su enlace en el Nav.
- Datos reales de actividad, ranking o estadísticas.
- Cambios en auth, sesión, reproductor o salón más allá de los enlaces.
- Tests automatizados e internacionalización.

Cada uno de estos puntos, si se aborda, va en su propio spec.
