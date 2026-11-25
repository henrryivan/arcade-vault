# SPEC 03 — Página About con formulario de contacto por correo (Resend)

> **Status:** Aprobado
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-11-25
> **Objective:** Implementar la página About de `references/templates/home-about` en `/about` y hacer que su formulario de contacto envíe un correo real al equipo mediante Resend y una Server Action.

## Por qué existe este spec

El SPEC 02 dejó fuera `about.jsx` y el enlace "Acerca de" del Nav para no crear un enlace roto. La plantilla simula el envío: `onSubmit` solo muestra la terminal de éxito, sin enviar nada. Este spec implementa la página tal cual la plantilla y reemplaza ese envío simulado por uno real. Por regla de `CLAUDE.md`, la UI se hace con la skill `/frontend-design`, tomando la plantilla como fuente de verdad visual. El diseño debe quedar **idéntico** a `about.jsx` y `styles.css`.

Este spec **revierte** dos puntos del SPEC 02: el Nav vuelve a incluir "Acerca de" y pasa a existir la ruta `/about`.

## Alcance

**Dentro:**

- Nueva página `/about` con las dos secciones de `about.jsx`: "ACERCA DE ARCADE VAULT" (misión y tres destacados con icono) y "CONTÁCTANOS" (intro, tres tips y formulario), separadas por el divisor de píxeles.
- Los tres iconos SVG `HighlightIcon` (`HEART`, `BROWSER`, `PLANT`) y el revelado en scroll (`.reveal` + `IntersectionObserver`), con el mismo patrón `.reveal-on` ya usado en el home.
- Formulario con campos NOMBRE, CORREO ELECTRÓNICO y MENSAJE, animación `shake` ante validación fallida en cliente y terminal de éxito "VAULT-OS // TERMINAL" con el botón ENVIAR OTRO MENSAJE.
- Envío real con Resend desde una Server Action `sendContactMessage`.
- Validación en servidor (campos obligatorios, formato de correo, límites de longitud) y campo honeypot oculto contra bots.
- Estado de error en el formulario cuando el envío falla: se conserva lo escrito y se permite reintentar.
- Enlace "Acerca de" → `/about` en el Nav de escritorio y en el panel móvil, con estado activo en `/about`.
- Variables de entorno `RESEND_API_KEY`, `RESEND_FROM_EMAIL` y `CONTACT_TO_EMAIL`, y un `.env.example` versionado.
- `metadata` de `/about` (título "Acerca de").
- Portar a `app/globals.css` solo las clases de la plantilla que falten para About.

| Ruta | Pantalla | Plantilla | Cambio |
| --- | --- | --- | --- |
| `/about` | Acerca de + Contacto | `about.jsx` | Nueva |
| `/`, `/juegos`, `/salon`, `/auth` | — | — | Sin cambios |

**Fuera de alcance (para specs futuros):**

- Correo de confirmación al visitante (auto-respuesta).
- Límite de envíos por IP (rate limit) ni captcha.
- Guardar los mensajes en base de datos o panel de administración.
- Plantillas de correo con React Email; el correo es texto plano con cuerpo HTML mínimo.
- Enlace a About en el `Footer`.
- Tests automatizados e internacionalización.
- Cambios en sesión, auth, reproductor o biblioteca.

## Modelo de datos

No hay datos persistidos. Se añaden los tipos del formulario y de la respuesta de la Server Action en `lib/contact.ts`, compartidos por el cliente y el servidor.

```ts
export type ContactInput = {
  name: string;     // 1..60 caracteres tras trim
  email: string;    // formato de correo válido, máx. 120
  message: string;  // 1..2000 caracteres tras trim
  website: string;  // honeypot: debe llegar vacío
};

export type ContactResult =
  | { ok: true; name: string }          // name se usa en "GRACIAS, {NAME}."
  | { ok: false; error: "invalid" | "send_failed" };

export const CONTACT_LIMITS = { name: 60, email: 120, message: 2000 } as const;
```

Variables de entorno (solo servidor, sin prefijo `NEXT_PUBLIC_`):

```bash
RESEND_API_KEY=re_xxxxxxxx
RESEND_FROM_EMAIL=onboarding@resend.dev   # remitente; en producción, dominio verificado en Resend
CONTACT_TO_EMAIL=equipo@ejemplo.com       # destino de los mensajes
```

Convenciones:

- Asunto del correo: `[Arcade Vault] Mensaje de {name}`.
- `reply-to` del correo = `email` del visitante, para que el equipo responda directo.
- Cuerpo en texto plano con nombre, correo y mensaje. Los valores del visitante se escapan si se usa HTML.
- Si el honeypot llega con contenido, la acción devuelve `{ ok: true }` sin llamar a Resend, para no dar pistas al bot.

## Plan de implementación

Antes de empezar, leer en `node_modules/next/dist/docs/01-app` la guía de Server Actions y formularios (`'use server'`, invocación desde componentes de cliente) y las reglas de `cacheComponents`, como exige `AGENTS.md`. Consultar también la documentación vigente de Resend para Next.js antes de instalar el SDK.

1. Añadir el enlace "Acerca de" → `/about` en `components/nav.tsx` (escritorio y panel móvil), con estado activo para `pathname.startsWith("/about")`. Crear `app/about/page.tsx` con un esqueleto mínimo y `metadata`. Verificar que el enlace navega y se marca activo.
2. Comparar `references/templates/home-about/styles.css` con `app/globals.css` y portar solo las clases que falten para About (`.about*`, `.highlight*`, `.hl-*`, `.about-divider`, `.div-*`, `.contact-*`, `.tip*`, `.terminal-success`, `.term-*`, `.caret`, `.shake` y sus animaciones). No reescribir estilos existentes. Respetar `prefers-reduced-motion` como en el SPEC 02.
3. Crear `components/about.tsx` (cliente por el `IntersectionObserver` y el estado del formulario) con las dos secciones, el divisor, `HighlightIcon` y los textos idénticos a `about.jsx`. El formulario aún conserva el envío simulado. Reemplazar el esqueleto de `app/about/page.tsx` por `<About />`. Verificar que `/about` se ve igual que la plantilla.
4. Crear `lib/contact.ts` con los tipos, `CONTACT_LIMITS` y una función `validateContact(input)` pura, reutilizable en cliente y servidor. Verificar con `npx tsc --noEmit`.
5. Instalar `resend` (`npm install resend`). Crear `.env.example` con las tres variables y, en `.gitignore`, añadir `!.env.example` tras la línea `.env*` para que se versione. Crear `.env.local` local (no versionado) con valores reales de prueba.
6. Crear `app/about/actions.ts` (`'use server'`) con `sendContactMessage(input: ContactInput): Promise<ContactResult>`: revalida con `validateContact`, descarta si el honeypot trae contenido, comprueba que existan las tres variables, envía con Resend y mapea cualquier fallo a `{ ok: false, error: "send_failed" }` sin exponer detalles al cliente. Registrar el error real con `console.error` en el servidor.
7. Conectar el formulario: `onSubmit` valida en cliente (shake si falla, como la plantilla), llama a `sendContactMessage`, deshabilita el botón y muestra "ENVIANDO…" mientras espera. En `ok: true` muestra la terminal de éxito con el nombre. En `ok: false` muestra un aviso con estilo terminal (`[ERROR] No se pudo enviar el mensaje. Inténtalo de nuevo.`), conserva los campos y permite reintentar. Añadir el campo honeypot `website`, oculto visualmente, con `tabIndex={-1}` y `autoComplete="off"`.
8. Verificar el envío real con una clave de Resend en desarrollo y revisar que el correo llega a `CONTACT_TO_EMAIL` con `reply-to` correcto. Documentar las variables en `README.md` (sección breve de configuración).

## Criterios de aceptación

- [ ] `npm run build` termina sin errores.
- [ ] `npm run lint` termina sin errores ni warnings nuevos.
- [ ] `/about` muestra el kicker "▸ ACERCA DE", el título "ACERCA DE ARCADE VAULT" y el texto de misión de la plantilla.
- [ ] `/about` muestra exactamente 3 destacados con icono: "HECHO CON ❤️ PARA JUGADORES", "JUEGOS EN HTML — CORREN EN CUALQUIER NAVEGADOR" y "PROYECTO EN CONSTANTE CRECIMIENTO".
- [ ] `/about` muestra el divisor de píxeles y la sección "▸ CONTACTO" con el título "CONTÁCTANOS" y los tres tips (RESPUESTA EN 24-48H, SUGERENCIAS BIENVENIDAS, SIN SPAM, JAMÁS).
- [ ] El formulario tiene los campos NOMBRE, CORREO ELECTRÓNICO y MENSAJE y el botón "▶ ENVIAR MENSAJE".
- [ ] Enviar con algún campo vacío activa el efecto `shake` y no llama a la Server Action.
- [ ] Enviar con datos válidos y una clave de Resend válida entrega un correo en `CONTACT_TO_EMAIL` con asunto `[Arcade Vault] Mensaje de <nombre>`, el mensaje en el cuerpo y `reply-to` igual al correo del visitante.
- [ ] Tras un envío exitoso aparece la terminal "VAULT-OS // TERMINAL" con "MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, <NOMBRE EN MAYÚSCULAS>.".
- [ ] ENVIAR OTRO MENSAJE vuelve al formulario con los tres campos vacíos.
- [ ] Mientras la acción está en curso, el botón está deshabilitado y muestra "ENVIANDO…"; no se puede enviar dos veces.
- [ ] Con una `RESEND_API_KEY` inválida o ausente, el formulario muestra el aviso `[ERROR]`, conserva los datos escritos y **no** muestra la terminal de éxito.
- [ ] Llamar a la acción con un correo mal formado, un mensaje de más de 2000 caracteres o un campo vacío devuelve `{ ok: false, error: "invalid" }` y no llama a Resend.
- [ ] Con el campo honeypot `website` relleno no se envía ningún correo y la respuesta es `{ ok: true }`.
- [ ] `RESEND_API_KEY` no aparece en el HTML, en los bundles de cliente ni en la pestaña Network del navegador.
- [ ] `.env.example` está versionado y `.env.local` no aparece en `git status`.
- [ ] El Nav tiene los enlaces Inicio, Biblioteca, Salón de la Fama y Acerca de, en escritorio y en el panel móvil, y "Acerca de" se marca activo en `/about`.
- [ ] Las secciones con `.reveal` aparecen al hacer scroll en `/about`.
- [ ] En 390 px `/about` no tiene scroll horizontal y el formulario es usable.
- [ ] La consola del navegador no muestra errores ni warnings de hidratación en `/about`, `/` y `/juegos`.

## Decisiones

- **Sí:** ruta `/about`. Coincide con el nombre de la plantilla y con la petición del usuario ("About page"). El resto de rutas del sitio está en español (`/juegos`, `/salon`); si se prefiere `/acerca-de`, se cambia en otro spec.
- **No:** `/acerca-de`. Rompería la correspondencia directa con `about.jsx`.
- **Sí:** Server Action para el envío. La clave de Resend nunca llega al cliente y no se añade un endpoint público.
- **No:** Route Handler `POST /api/contact`. Es otra superficie pública sin beneficio hoy.
- **Sí:** remitente, destino y clave en variables de entorno. Permite cambiar de correo sin tocar el código y usar `onboarding@resend.dev` en desarrollo.
- **No:** correos hardcodeados en el código.
- **Sí:** mostrar error real cuando falla el envío, conservando lo escrito. La plantilla simulaba éxito siempre; con un envío real eso ocultaría mensajes perdidos.
- **No:** mostrar éxito siempre.
- **Sí:** validación en servidor además de la de cliente. El cliente nunca es de fiar; los mismos límites viven en `lib/contact.ts`.
- **Sí:** honeypot como única defensa anti-spam. Sin dependencias, sin captcha y sin fricción para el usuario.
- **No:** rate limit por IP. Exige almacenamiento externo y es otro alcance; queda como riesgo.
- **No:** correo de confirmación al visitante. Duplica el volumen de envíos y abre la puerta a usar el formulario para enviar correo a terceros.
- **Sí:** `reply-to` = correo del visitante. El equipo responde sin copiar y pegar.
- **Sí:** no exponer detalles del error de Resend al cliente. Solo `send_failed`; el detalle va a `console.error` del servidor.
- **Sí:** reactivar "Acerca de" en el Nav. Ya no es un enlace roto y revierte la decisión del SPEC 02.
- **Sí:** reutilizar el patrón `.reveal-on` del home para el revelado. Evita contenido invisible sin JS.
- **Sí:** no reescribir `app/globals.css`; solo portar las clases que falten.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Resend con `onboarding@resend.dev` solo entrega al correo dueño de la cuenta | En desarrollo, `CONTACT_TO_EMAIL` debe ser ese correo. Para producción hace falta un dominio verificado en Resend; queda documentado en el README. |
| Spam o abuso del formulario (sin rate limit) | Honeypot, validación de longitudes y revisión del consumo en el panel de Resend. Rate limit queda para un spec futuro. |
| Inyección de cabeceras o HTML en el correo con datos del visitante | El asunto se construye con el nombre ya recortado y sin saltos de línea; el cuerpo es texto plano o con valores escapados. |
| Variables de entorno ausentes en producción | La acción las comprueba y devuelve `send_failed` sin romper la página; el error queda en logs del servidor. |
| `cacheComponents` y Server Actions: reglas distintas a Next.js anterior | Leer la guía de Server Actions de `node_modules/next/dist/docs/01-app` antes del paso 6. |
| Colisión de nombres CSS al portar (`.tip`, `.highlight`) con clases existentes | Comparar antes de copiar en el paso 2; renombrar con prefijo `about-` si hay conflicto de significado. |
| `.env*` está en `.gitignore`, por lo que `.env.example` no se versionaría | Añadir la excepción `!.env.example` en el paso 5 y verificarlo con `git status`. |

## Qué **no** está en este spec

- Correo de confirmación al visitante.
- Rate limit, captcha o cualquier anti-spam más allá del honeypot.
- Guardar mensajes en base de datos o panel de administración.
- Plantillas de correo con React Email.
- Enlace a About en el `Footer`.
- Cambios en home, biblioteca, salón, auth o reproductor.
- Tests automatizados e internacionalización.

Cada uno de estos puntos, si se aborda, va en su propio spec.
