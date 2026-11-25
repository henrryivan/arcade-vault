import type { Metadata } from "next";
import { Home } from "@/components/home";

export const metadata: Metadata = {
  title: { absolute: "Arcade Vault" },
  description:
    "Juega los mejores clásicos arcade en tu navegador, gratis y sin descargas, y compite por el puntaje más alto.",
};

export default function HomePage() {
  return <Home />;
}
