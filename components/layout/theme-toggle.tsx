"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleTheme() {
    const nextIsDark = !isDark;
    document.documentElement.classList.toggle("dark", nextIsDark);
    localStorage.setItem("theme", nextIsDark ? "dark" : "light");
    setIsDark(nextIsDark);
  }

  const Icon = isDark ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-foreground shadow-sm hover:bg-background"
      title={isDark ? "Usar tema claro" : "Usar tema escuro"}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">
        {isDark ? "Usar tema claro" : "Usar tema escuro"}
      </span>
    </button>
  );
}
