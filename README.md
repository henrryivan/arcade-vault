## Arcade Vault

Es una plataforma para jugar online y competir por la mayor cantidad de puntos.

## Usa Spec Driven Design

Basado en /spec y /spec-impl

Siguiendo las buenas practicas recomendadas aquí:
https://github.com/Klerith/fernando-skills

## Skills usadas

```bash
npx skills@latest add Klerith/fernando-skills
```

## Configuración

El formulario de contacto (`/about`) envía correos con [Resend](https://resend.com) desde una Server Action. Copia `.env.example` a `.env.local` y rellena las variables (solo servidor, nunca con prefijo `NEXT_PUBLIC_`):

| Variable            | Descripción                                        |
| ------------------- | -------------------------------------------------- |
| `RESEND_API_KEY`    | Clave de API de Resend.                            |
| `RESEND_FROM_EMAIL` | Remitente. En desarrollo: `onboarding@resend.dev`. |
| `CONTACT_TO_EMAIL`  | Correo que recibe los mensajes.                    |

- Con `onboarding@resend.dev` como remitente, Resend solo entrega al correo dueño de la cuenta: en desarrollo, `CONTACT_TO_EMAIL` debe ser ese correo.
- En producción hace falta un dominio verificado en Resend (<https://resend.com/domains>) y usar un remitente de ese dominio.
- Next.js lee `.env.local` al arrancar: reinicia `npm run dev` tras cambiarlo.
- Si falta alguna variable o Resend falla, el formulario muestra un aviso de error y el detalle queda en el log del servidor.

## Supabase

La infraestructura de Supabase (clientes `@supabase/ssr`, `proxy.ts` y carpeta `supabase/`) está lista; todavía no hay tablas ni Auth real. Añade a `.env.local`:

| Variable                               | Descripción                                                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | URL del proyecto (`https://<ref>.supabase.co`).                                                               |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave publishable (`sb_publishable_...`). Es pública; **nunca** pongas aquí la `secret` ni la `service_role`. |
| `SUPABASE_DB_PASSWORD`                 | Contraseña de la base de datos. Solo para la CLI, la app no la lee.                                           |
| `SUPABASE_ACCESS_TOKEN`                | Opcional. Token personal para la CLI si no puedes hacer `supabase login`. Solo CLI.                           |

- Clientes: `lib/supabase/client.ts` (navegador) y `lib/supabase/server.ts` (servidor, por petición y solo en contexto dinámico). Si falta una variable, lanzan un error que la nombra.
- `proxy.ts` refresca la sesión en cada petición; no protege rutas.
- Enlazar el proyecto (requiere `npx supabase login` previo, desde una terminal normal, no desde un entorno sin TTY):

```bash
npx supabase link --project-ref lwalpcmwgkfrsrdavqix
```

- Regenerar los tipos tras cambiar el esquema (la CLI o el MCP de Supabase):

```bash
npx supabase gen types typescript --linked --schema public > lib/supabase/database.types.ts
```

- La CLI v3 genera `supabase/config.jsonc` (no `config.toml`). No hay migraciones todavía.

## Commands

```bash
npm run dev     # dev server (http://localhost:3000)
npm run build   # production build
npm start       # serve production build
npm run lint    # eslint (flat config, eslint.config.mjs)
```
