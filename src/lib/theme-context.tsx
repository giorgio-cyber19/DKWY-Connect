"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: (origin?: { x: number; y: number }) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("dwky-theme");
    const valid = stored === "light" || stored === "dark" ? stored : null;
    const preferred = valid ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(preferred);
    document.documentElement.setAttribute("data-theme", preferred);
    setMounted(true);
  }, []);

  const toggleTheme = useCallback(
    (origin?: { x: number; y: number }) => {
      const next: Theme = theme === "light" ? "dark" : "light";

      const apply = () => {
        setTheme(next);
        document.documentElement.setAttribute("data-theme", next);
        window.localStorage.setItem("dwky-theme", next);
      };

      const docWithVT = document as Document & {
        startViewTransition?: (cb: () => void) => { ready: Promise<void> };
      };

      if (docWithVT.startViewTransition && origin) {
        document.documentElement.style.setProperty("--vt-x", `${origin.x}px`);
        document.documentElement.style.setProperty("--vt-y", `${origin.y}px`);
        docWithVT.startViewTransition(apply);
      } else {
        apply();
      }
    },
    [theme]
  );

  if (!mounted) {
    return <>{children}</>;
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
