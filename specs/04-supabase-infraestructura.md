# SPEC 04 — Infraestructura de Supabase en Next.js

> **Status:** Implementado
> **Depends on:** SPEC 03
> **Date:** 2026-11-27
> **Objective:** Dejar Supabase conectado al proyecto Next.js (SDK, clientes de servidor y navegador, variables de entorno, proxy de refresco de sesión y carpeta `supabase/` para migraciones) sin tablas ni cambios visibles de UI.

## Por qué existe este spec

El proyecto Supabase ya existe (`lwalpcmwgkfrsrdavqix`, URL `https://lwalpcmwgkfrsrdavqix.supabase.co`), está vacío (sin tablas en `public`) y el commit `12ca655` añadió `.mcp.json` y `SUPABASE_DB_PASSWORD` a `.env.example`. Pero el código todavía no usa Supabase: la sesión es un mock en `localStorage` (`lib/session.tsx`) y los juegos y puntuaciones viven en `lib/data.ts`.

Este spec solo pone la **base técnica**. Auth real y migración de datos a tablas van en specs posteriores, para no mezclar cuatro dominios en uno. Por regla de `CLAUDE.md`, no hay UI nueva; si la hubiera, se haría con `/frontend-design`.

## Alcance

**Dentro:**

- Dependencias `@supabase/supabase-js` y `@supabase/ssr`.
- Variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (clave moderna `sb_publishable_...`), documentadas en `.env.example` y `README.md`.
- Cliente de navegador (`lib/supabase/client.ts`) y cliente de servidor (`lib/supabase/server.ts`) basados en `@supabase/ssr`.
- Refresco de sesión mediante `proxy.ts` (convención de Next.js 16; sustituye a `middleware.ts`) con helper `lib/supabase/proxy.ts`. Hoy no hay usuarios; el proxy deja la infraestructura lista y no protege ninguna ruta.
- Carpeta `supabase/` creada con Supabase CLI (`supabase init`) y proyecto enlazado (`supabase link`), sin migraciones.
- Tipos de base de datos: archivo `lib/supabase/database.types.ts` generado (vacío de tablas por ahora) y clientes tipados con `Database`.
- Verificación de la conexión con un script temporal que se elimina al terminar.

| Elemento                                            | Cambio                      |
| --------------------------------------------------- | --------------------------- |
| Rutas (`/`, `/juegos`, `/salon`, `/auth`, `/about`) | Sin cambios                 |
| `lib/session.tsx`, `components/auth-form.tsx`       | Sin cambios (sigue el mock) |
| `lib/data.ts`                                       | Sin cambios                 |

**Fuera de alcance (para specs futuros):**

- Supabase Auth real (registro, login, logout, OAuth) y reemplazo de `lib/session.tsx`.
- Tablas, políticas RLS y migración de `GAMES`, puntuaciones y perfiles desde `lib/data.ts`.
- Storage, Realtime y Edge Functions.
- Protección de rutas.
- Entorno local con Docker (`supabase start`) y ramas de base de datos.
- Tests automatizados.

## Modelo de datos

No introduce datos persistidos ni tablas. Solo variables de entorno y el archivo de tipos generado.

```bash
# Públicas: se exponen al navegador, por eso es obligatorio que la clave sea la publishable (nunca la secret/service_role).
NEXT_PUBLIC_SUPABASE_URL=https://lwalpcmwgkfrsrdavqix.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxx

# Ya existente: solo para la CLI (supabase link / db push). Nunca en código de la app.
SUPABASE_DB_PASSWORD=XXXXX
```

Estructura de archivos nueva:

```text
lib/supabase/
  client.ts          # createBrowserClient<Database>()
  server.ts          # createServerClient<Database>() con cookies() de next/headers
  proxy.ts           # updateSession(request): refresca la sesión y devuelve la respuesta
  database.types.ts  # generado con la CLI o el MCP
proxy.ts             # raíz: export async function proxy(request) + config.matcher
supabase/
  config.jsonc       # generado por supabase init (la CLI v3 ya no genera config.toml)
```

Convenciones:

- La URL y la clave publishable se leen solo de `process.env`; si falta alguna, los helpers lanzan un error claro al crearse el cliente.
- Ninguna clave `secret`/`service_role` se añade al proyecto.
- El cliente de servidor se crea por petición (no como singleton), como exige el SDK.

## Plan de implementación

Antes de empezar, leer en `node_modules/next/dist/docs/01-app` las guías de `proxy` (convención de archivo), `cookies()` y las reglas de `cacheComponents`, como exige `AGENTS.md`. Consultar también la guía vigente de Supabase para Next.js con `@supabase/ssr` (MCP `search_docs`).

1. Instalar dependencias: `npm install @supabase/supabase-js @supabase/ssr`. Verificar con `npm run build` que el proyecto sigue compilando.
2. Obtener la URL (`get_project_url`) y la clave publishable (`get_publishable_keys`, usando solo una con `disabled` falso y formato `sb_publishable_...`). Añadir las dos variables nuevas a `.env.local` y, con valores de ejemplo, a `.env.example` (sin tocar las variables de Resend ni `SUPABASE_DB_PASSWORD`). Verificar con `git status` que `.env.local` no aparece.
3. Generar `lib/supabase/database.types.ts` con `generate_typescript_types` del MCP (esquema `public` vacío). Verificar con `npx tsc --noEmit`.
4. Crear `lib/supabase/client.ts` y `lib/supabase/server.ts` tipados con `Database`. Verificar con `npx tsc --noEmit`.
5. Crear `lib/supabase/proxy.ts` (`updateSession`) y `proxy.ts` en la raíz con un `matcher` que excluya `_next/static`, `_next/image`, `favicon.ico` e imágenes. El proxy no redirige ni bloquea nada. Verificar que `/`, `/juegos`, `/salon`, `/auth` y `/about` siguen cargando y que `npm run build` termina sin errores.
6. Ejecutar `npx supabase init` (genera `supabase/config.jsonc`) y `npx supabase link --project-ref lwalpcmwgkfrsrdavqix` usando `SUPABASE_DB_PASSWORD`. No crear migraciones. Revisar qué archivos de `supabase/` deben ir a `.gitignore` (p. ej. `supabase/.temp`).
7. Verificar la conexión con un script temporal fuera de `app/` que use el cliente de servidor para una consulta trivial (p. ej. `auth.getSession()` o listar `public` con el cliente) y confirmar que responde sin error. Eliminar el script al terminar. Documentar en `README.md` las variables nuevas y los comandos `supabase link` / generación de tipos.

## Criterios de aceptación

- [ ] `npm run build` termina sin errores.
- [ ] `npm run lint` termina sin errores ni warnings nuevos.
- [ ] `npx tsc --noEmit` termina sin errores.
- [ ] `package.json` incluye `@supabase/supabase-js` y `@supabase/ssr`.
- [ ] `.env.example` está versionado e incluye `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; `.env.local` no aparece en `git status`.
- [ ] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` empieza por `sb_publishable_` y no existe ninguna clave `secret` ni `service_role` en el repositorio ni en `.env.example`.
- [ ] Existen `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/proxy.ts`, `lib/supabase/database.types.ts` y `proxy.ts` en la raíz.
- [ ] `supabase/config.jsonc` existe y `npx supabase link` al proyecto `lwalpcmwgkfrsrdavqix` termina sin errores.
- [ ] La carpeta `supabase/` no contiene migraciones y `supabase/.temp` no aparece en `git status`.
- [ ] La verificación con el cliente de servidor responde sin error contra el proyecto real, y el script temporal ya no existe.
- [ ] Con las variables ausentes, crear un cliente lanza un error que nombra la variable faltante.
- [ ] `/`, `/juegos`, `/juegos/bloque-buster`, `/salon`, `/auth` y `/about` cargan igual que antes; entrar con "px_kai" en `/auth` sigue funcionando con el mock.
- [ ] La consola del navegador no muestra errores ni warnings de hidratación en esas rutas.
- [ ] La clave publishable no aparece más veces de las esperables en los bundles (solo como valor inlineado de `NEXT_PUBLIC_*`) y `SUPABASE_DB_PASSWORD` no aparece en ningún bundle ni en el HTML.

## Decisiones

- **Sí:** spec solo de infraestructura. Auth real y tablas son dominios distintos con sus propias decisiones (RLS, perfiles, esquema); juntarlos haría un spec demasiado grande.
- **No:** reemplazar `lib/session.tsx` ni migrar `lib/data.ts` aquí.
- **Sí:** `@supabase/ssr` con clientes separados de navegador y servidor. Es el patrón oficial para App Router y deja listas las cookies de sesión para el spec de Auth.
- **No:** un único cliente `supabase-js` global. No gestiona cookies del servidor.
- **Sí:** clave publishable `sb_publishable_...`. Formato moderno, rotación independiente y menos privilegio.
- **No:** clave legacy `anon` (JWT).
- **Sí:** `proxy.ts` aunque aún no haya usuarios. Refrescar la sesión en cada petición es la configuración estándar y evita retocarlo al llegar Auth. No bloquea rutas.
- **No:** `middleware.ts`. Next.js 16 lo reemplaza por `proxy.ts`.
- **Sí:** Supabase CLI y carpeta `supabase/` versionada. Las migraciones futuras quedan en el repositorio y son revisables.
- **No:** aplicar cambios solo con el MCP `apply_migration`; no quedarían versionados.
- **Sí:** `supabase link` pero **no** `supabase start`. Evita requerir Docker; el desarrollo apunta al proyecto remoto.
- **Sí:** tipos de base de datos generados desde ahora, para que los clientes ya nazcan tipados y se regeneren al añadir tablas.
- **Sí:** verificación con script temporal eliminado al final. Confirma la conexión sin dejar rutas de diagnóstico públicas.
- **No:** página `/estado` permanente.
- **Sí:** `SUPABASE_DB_PASSWORD` solo para la CLI; la app nunca la lee.

## Riesgos

| Riesgo                                                                                                  | Mitigación                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Exponer por error una clave `secret`/`service_role` con prefijo `NEXT_PUBLIC_`                          | En el paso 2 usar solo claves `sb_publishable_...`; criterio de aceptación que busca claves privadas en el repo y en los bundles.                        |
| `cacheComponents` y acceso a `cookies()` en el cliente de servidor: reglas distintas a Next.js anterior | Leer las guías de `cookies()` y `cacheComponents` en `node_modules/next/dist/docs/01-app` antes del paso 4; el cliente solo se usa en contexto dinámico. |
| `proxy.ts` mal configurado rompe o ralentiza todas las rutas                                            | `matcher` que excluye estáticos; verificar rutas y `npm run build` en el paso 5. El proxy no redirige.                                                   |
| `.env*` en `.gitignore`: `.env.example` debe seguir versionado                                          | Mantener la excepción `!.env.example` ya existente y comprobar con `git status`.                                                                         |
| `supabase link` falla o pide login/contraseña                                                           | Requiere `npx supabase login` previo y `SUPABASE_DB_PASSWORD` correcta; si falla, queda documentado en el README y el paso se repite.                    |
| Archivos temporales de la CLI (`supabase/.temp`) versionados por error                                  | Añadirlos a `.gitignore` en el paso 6 y revisar con `git status`.                                                                                        |

## Qué **no** está en este spec

- Supabase Auth y reemplazo del login mock.
- Tablas, RLS y migración de datos desde `lib/data.ts`.
- Storage, Realtime y Edge Functions.
- Protección de rutas.
- Entorno local con Docker y ramas de base de datos.
- Tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propio spec.
