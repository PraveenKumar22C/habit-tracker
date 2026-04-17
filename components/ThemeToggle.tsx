"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return <Button variant="outline" size="icon" disabled className="w-8 h-8 sm:w-9 sm:h-9" />;
  }

  const isDark = theme === "dark";

  const handleToggle = () => {
    const next = isDark ? "light" : "dark";
    // Persist explicit user preference so auto-time theme won't override it
    localStorage.setItem("theme", next);
    setTheme(next);
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleToggle}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      className="w-8 h-8 sm:w-9 sm:h-9 relative overflow-hidden hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-all duration-200"
    >
      <span
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "opacity 0.3s ease, transform 0.3s ease",
          opacity: isDark ? 1 : 0,
          transform: isDark ? "rotate(0deg) scale(1)" : "rotate(-90deg) scale(0.5)",
        }}
      >
        <Sun className="h-4 w-4" />
      </span>
      <span
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "opacity 0.3s ease, transform 0.3s ease",
          opacity: isDark ? 0 : 1,
          transform: isDark ? "rotate(90deg) scale(0.5)" : "rotate(0deg) scale(1)",
        }}
      >
        <Moon className="h-4 w-4" />
      </span>
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
