import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  storageKey = "anisflix-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => {
      const stored = localStorage.getItem(storageKey) as Theme;
      if (stored && ['dark', 'light', 'system'].includes(stored)) {
        return stored;
      }
      return defaultTheme;
    }
  )

  useEffect(() => {
    const root = window.document.documentElement

    // Solution : Ne pas supprimer toutes les classes d'un coup
    // Vérifier d'abord quelle classe est actuellement appliquée
    const currentTheme = root.classList.contains("dark") ? "dark" : "light"
    
    // Seulement changer si nécessaire
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light"
      
      if (currentTheme !== systemTheme) {
        root.classList.remove(currentTheme)
        root.classList.add(systemTheme)
      }
      return
    }

    if (currentTheme !== theme) {
      root.classList.remove(currentTheme)
      root.classList.add(theme)
    }
  }, [theme])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}
