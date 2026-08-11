import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "light",
  toggle: () => undefined,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stocke = localStorage.getItem("kn_theme") as Theme | null;
    const prefere = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    setTheme(stocke ?? prefere);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggle = () =>
    setTheme((t) => {
      const suivant = t === "dark" ? "light" : "dark";
      localStorage.setItem("kn_theme", suivant);
      return suivant;
    });

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
