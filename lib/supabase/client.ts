import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
export function createClient() {
	// Acceso literal a process.env.NEXT_PUBLIC_*: Next.js solo las inlinea así en el bundle.
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
	return createBrowserClient<Database>(url, key);
}
