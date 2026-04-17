"use client";

import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { type ReactNode, useEffect } from "react";

function TimeBasedThemeApplier() {
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored && stored !== "system") return; 

    const hour = new Date().getHours();
    const shouldBeDark = hour < 6 || hour >= 19;
    setTheme(shouldBeDark ? "dark" : "light");
  }, []); 

  return null;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem={false}
      storageKey="theme"
    >
      <TimeBasedThemeApplier />
      {children}
    </NextThemesProvider>
  );
}
