import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'

export type ThemeName = 'purple' | 'blue' | 'green' | 'orange'

interface ThemeColors {
  primary: string
  primaryDark: string
  ring: string
  ringDark: string
  accentSoft: string
  accentSoftDark: string
  accentSoftForeground: string
  accentSoftForegroundDark: string
}

const THEME_DEFINITIONS: Record<ThemeName, ThemeColors> = {
  purple: {
    primary: '#aa3bff',
    primaryDark: '#c084fc',
    ring: '#aa3bff',
    ringDark: '#c084fc',
    accentSoft: 'rgba(170, 59, 255, 0.1)',
    accentSoftDark: 'rgba(192, 132, 252, 0.15)',
    accentSoftForeground: '#aa3bff',
    accentSoftForegroundDark: '#c084fc',
  },
  blue: {
    primary: '#2563eb',
    primaryDark: '#60a5fa',
    ring: '#2563eb',
    ringDark: '#60a5fa',
    accentSoft: 'rgba(37, 99, 235, 0.1)',
    accentSoftDark: 'rgba(96, 165, 250, 0.15)',
    accentSoftForeground: '#2563eb',
    accentSoftForegroundDark: '#60a5fa',
  },
  green: {
    primary: '#16a34a',
    primaryDark: '#4ade80',
    ring: '#16a34a',
    ringDark: '#4ade80',
    accentSoft: 'rgba(22, 163, 74, 0.1)',
    accentSoftDark: 'rgba(74, 222, 128, 0.15)',
    accentSoftForeground: '#16a34a',
    accentSoftForegroundDark: '#4ade80',
  },
  orange: {
    primary: '#ea580c',
    primaryDark: '#fb923c',
    ring: '#ea580c',
    ringDark: '#fb923c',
    accentSoft: 'rgba(234, 88, 12, 0.1)',
    accentSoftDark: 'rgba(251, 146, 60, 0.15)',
    accentSoftForeground: '#ea580c',
    accentSoftForegroundDark: '#fb923c',
  },
}

interface ThemeContextType {
  theme: ThemeName
  setTheme: (theme: ThemeName) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const VALID_THEMES: Set<ThemeName> = new Set(['purple', 'blue', 'green', 'orange'])

function isValidTheme(value: unknown): value is ThemeName {
  return typeof value === 'string' && VALID_THEMES.has(value as ThemeName)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    const stored = localStorage.getItem('theme')
    return isValidTheme(stored) ? stored : 'purple'
  })

  const setTheme = (newTheme: ThemeName) => {
    setThemeState(newTheme)
    localStorage.setItem('theme', newTheme)
    applyTheme(newTheme)
  }

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

function applyTheme(themeName: ThemeName) {
  const colors = THEME_DEFINITIONS[themeName]
  const root = document.documentElement

  // Always apply light mode colors - don't respond to system dark mode preference
  root.style.setProperty('--primary', colors.primary)
  root.style.setProperty('--ring', colors.ring)
  root.style.setProperty('--accent-soft', colors.accentSoft)
  root.style.setProperty('--accent-soft-foreground', colors.accentSoftForeground)
}
