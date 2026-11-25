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

| Variable | Descripción |
| --- | --- |
| `RESEND_API_KEY` | Clave de API de Resend. |
| `RESEND_FROM_EMAIL` | Remitente. En desarrollo: `onboarding@resend.dev`. |
| `CONTACT_TO_EMAIL` | Correo que recibe los mensajes. |

- Con `onboarding@resend.dev` como remitente, Resend solo entrega al correo dueño de la cuenta: en desarrollo, `CONTACT_TO_EMAIL` debe ser ese correo.
- En producción hace falta un dominio verificado en Resend (<https://resend.com/domains>) y usar un remitente de ese dominio.
- Next.js lee `.env.local` al arrancar: reinicia `npm run dev` tras cambiarlo.
- Si falta alguna variable o Resend falla, el formulario muestra un aviso de error y el detalle queda en el log del servidor.

## Commands

```bash
npm run dev     # dev server (http://localhost:3000)
npm run build   # production build
npm start       # serve production build
npm run lint    # eslint (flat config, eslint.config.mjs)
```
