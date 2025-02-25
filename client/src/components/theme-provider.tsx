"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: string
  storageKey?: string
  attribute?: string
  value?: {
    light: string
    dark: string
    system: string
  }
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  attribute = "class",
  enableSystem = true,
  ...props
}: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute={attribute}
      defaultTheme={defaultTheme}
      enableSystem={enableSystem}
      storageKey={storageKey}
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}