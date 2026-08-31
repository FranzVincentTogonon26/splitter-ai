"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * next-themes provider — sets the `class` on <html> so the token overrides
 * in globals.css (.dark) flip the whole design system.
 */
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider {...props}>{children}</NextThemesProvider>
  );
}