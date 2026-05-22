import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SJJ595",
  description: "Gestao multi-tenant para entidades e lojas"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
