"use client";

import { Moon, Sun } from "lucide-react";
import { useState } from "react";

export function ThemeToggle({ theme, label }: { theme: "dark" | "light"; label: string }) {
  const [current, setCurrent] = useState(theme);

  function toggle() {
    const next = current === "dark" ? "light" : "dark";
    setCurrent(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    document.cookie = `radar_theme=${next}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-ink-muted transition-colors hover:border-line hover:bg-panel-soft hover:text-ink focus-ring"
    >
      {current === "dark" ? (
        <Moon className="h-4 w-4" aria-hidden />
      ) : (
        <Sun className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}
