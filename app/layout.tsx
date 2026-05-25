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
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
try {
  const theme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (theme === "dark" || (!theme && prefersDark)) {
    document.documentElement.classList.add("dark");
  }
} catch {}
`
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
