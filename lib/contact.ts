/** Tipos y validación del formulario de contacto, compartidos por cliente y servidor. */

export type ContactInput = {
  name: string; // 1..60 caracteres tras trim
  email: string; // formato de correo válido, máx. 120
  message: string; // 1..2000 caracteres tras trim
  website: string; // honeypot: debe llegar vacío
};

export type ContactResult =
  | { ok: true; name: string } // name se usa en "GRACIAS, {NAME}."
  | { ok: false; error: "invalid" | "send_failed" };

export const CONTACT_LIMITS = { name: 60, email: 120, message: 2000 } as const;

export type ContactField = "name" | "email" | "message";

export type ContactValidation =
  | { ok: true; value: { name: string; email: string; message: string } }
  | { ok: false; fields: ContactField[] };

// Pragmático, no RFC 5322: algo@dominio.tld sin espacios.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Saltos de línea y otros caracteres de control: evitan inyección en asunto y cabeceras.
const CONTROL_CHARS_RE = /[\u0000-\u001f\u007f]/;

/**
 * Valida y normaliza (trim) los campos del formulario. Pura: sin acceso a red ni a entorno,
 * así que sirve igual en el cliente (para el shake) y en la Server Action (fuente de verdad).
 * No evalúa el honeypot: eso es responsabilidad de la acción.
 */
export function validateContact(
  input: Pick<ContactInput, "name" | "email" | "message">,
): ContactValidation {
  const name = (input.name ?? "").trim();
  const email = (input.email ?? "").trim();
  const message = (input.message ?? "").trim();
  const fields: ContactField[] = [];

  if (!name || name.length > CONTACT_LIMITS.name || CONTROL_CHARS_RE.test(name)) {
    fields.push("name");
  }
  if (
    !email ||
    email.length > CONTACT_LIMITS.email ||
    CONTROL_CHARS_RE.test(email) ||
    !EMAIL_RE.test(email)
  ) {
    fields.push("email");
  }
  if (!message || message.length > CONTACT_LIMITS.message) {
    fields.push("message");
  }

  return fields.length > 0 ? { ok: false, fields } : { ok: true, value: { name, email, message } };
}
