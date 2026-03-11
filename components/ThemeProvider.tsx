'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ReactNode } from 'react';

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"   // ← was "system", now always dark by default
      enableSystem={false}  // ← disable system override so user preference wins
    >
      {children}
    </NextThemesProvider>
  );
}