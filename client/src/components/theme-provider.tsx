"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: string
  storageKey?: string
  attribute?: string
  enableSystem?: boolean
}

export function ThemeProvider({ 
  children,
  defaultTheme = "dark",
  storageKey = "vite-ui-theme",
  attribute = "class",
  enableSystem = true,
}: ThemeProviderProps) {
  return (
    <NextThemesProvider
      {...{
        defaultTheme,
        storageKey,
        attribute,
        enableSystem,
      }}
    >
      {children}
    </NextThemesProvider>
  )
}