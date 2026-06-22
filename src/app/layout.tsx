import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Quiniela Mundial 2026",
  description: "Tabla de posiciones de la quiniela del Mundial 2026",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="bg-gray-950 text-gray-100 min-h-screen antialiased">
        <NavBar />
        {children}
      </body>
    </html>
  );
}
