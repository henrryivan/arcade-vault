import type { Metadata } from "next";

export const metadata: Metadata = { title: "Acerca de" };

export default function AboutPage() {
  return (
    <main style={{ padding: "48px 24px" }}>
      <h1 className="pixel neon-cyan">ACERCA DE</h1>
    </main>
  );
}
