"use client";
// Light / dark / system theme. Toggles the `.dark` class on <html> (tokens in app/globals.css).
// The no-flash inline script in app/layout.tsx applies the stored theme before first paint.
import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { DARK_MODE_ENABLED, DARK_QUERY, THEME_STORAGE_KEY } from "./themeScript";

export type Theme = "light" | "dark" | "system";

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const listeners = new Set<() => void>();

function readTheme(): Theme {
  if (!DARK_MODE_ENABLED) return "light";
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener("change", callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    media.removeEventListener("change", callback);
    window.removeEventListener("storage", callback);
  };
}

function snapshot() {
  const theme = readTheme();
  const resolved = theme === "system" ? (window.matchMedia(DARK_QUERY).matches ? "dark" : "light") : theme;
  return `${theme}:${resolved}`;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const value = useSyncExternalStore(subscribe, snapshot, () => "system:light");
  const [theme, resolvedTheme] = value.split(":") as [Theme, "light" | "dark"];

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  const setTheme = useCallback((next: Theme) => {
    try {
      if (next === "system") localStorage.removeItem(THEME_STORAGE_KEY);
      else localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage blocked (private mode) — theme still applies for this page view via the class.
    }
    listeners.forEach((listener) => listener());
  }, []);

  const context = useMemo(() => ({ theme, resolvedTheme, setTheme }), [theme, resolvedTheme, setTheme]);
  return <ThemeContext.Provider value={context}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside <ThemeProvider>");
  return context;
}
