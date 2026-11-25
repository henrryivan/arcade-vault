"use server";

import { Resend } from "resend";
import { validateContact, type ContactInput, type ContactResult } from "@/lib/contact";

/**
 * Envía el mensaje del formulario de contacto al equipo con Resend.
 * La clave de Resend y los correos viven solo en variables de entorno del servidor.
 * Al cliente solo vuelve `ok`/`error`; el detalle del fallo se registra en el servidor.
 */
export async function sendContactMessage(input: ContactInput): Promise<ContactResult> {
  // Una Server Action es un endpoint público: no se confía en que el cliente respete los tipos.
  if (
    !input ||
    typeof input.name !== "string" ||
    typeof input.email !== "string" ||
    typeof input.message !== "string"
  ) {
    return { ok: false, error: "invalid" };
  }

  // Honeypot: un bot lo rellena. Se responde "ok" sin enviar nada, para no darle pistas.
  if (typeof input.website === "string" && input.website.trim() !== "") {
    return { ok: true, name: input.name.trim() };
  }

  const checked = validateContact(input);
  if (!checked.ok) {
    return { ok: false, error: "invalid" };
  }
  const { name, email, message } = checked.value;

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const to = process.env.CONTACT_TO_EMAIL;
  if (!apiKey || !from || !to) {
    console.error(
      "[contact] Faltan variables de entorno: RESEND_API_KEY, RESEND_FROM_EMAIL y CONTACT_TO_EMAIL son obligatorias.",
    );
    return { ok: false, error: "send_failed" };
  }

  try {
    const resend = new Resend(apiKey);
    // emails.send no lanza ante errores de la API: devuelve { data, error }.
    const { error } = await resend.emails.send({
      from,
      to,
      replyTo: email,
      subject: `[Arcade Vault] Mensaje de ${name}`,
      text: `Nombre: ${name}\nCorreo: ${email}\n\nMensaje:\n${message}`,
    });
    if (error) {
      console.error("[contact] Resend rechazó el envío:", error);
      return { ok: false, error: "send_failed" };
    }
  } catch (err) {
    console.error("[contact] Error al enviar con Resend:", err);
    return { ok: false, error: "send_failed" };
  }

  return { ok: true, name };
}
