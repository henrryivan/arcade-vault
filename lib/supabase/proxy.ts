import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";
// Refresca la sesión de Supabase en cada petición. No redirige ni bloquea rutas.
export async function updateSession(request: NextRequest) {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
	if (!url) {
		throw new Error(
			"Falta la variable de entorno NEXT_PUBLIC_SUPABASE_URL",
		);
	}
	if (!key) {
		throw new Error(
			"Falta la variable de entorno NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
		);
	}
	let supabaseResponse = NextResponse.next({ request });
	const supabase = createServerClient<Database>(url, key, {
		cookies: {
			getAll() {
				return request.cookies.getAll();
			},
			setAll(cookiesToSet) {
				cookiesToSet.forEach(({ name, value }) =>
					request.cookies.set(name, value),
				);
				supabaseResponse = NextResponse.next({ request });
				cookiesToSet.forEach(({ name, value, options }) =>
					supabaseResponse.cookies.set(name, value, options),
				);
			},
		},
	});
	// No ejecutar lógica entre createServerClient y getClaims(): dispara el
	// refresco del token y escribe las cookies actualizadas en la respuesta.
	await supabase.auth.getClaims();
	return supabaseResponse;
}
