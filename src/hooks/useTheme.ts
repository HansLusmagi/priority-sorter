import { useState, useEffect, useCallback } from "react"

type Theme = "dark" | "light"

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      return (localStorage.getItem("ps-theme") as Theme) || "dark"
    } catch {
      return "dark"
    }
  })

  useEffect(() => {
    document.documentElement.className = theme
    try {
      localStorage.setItem("ps-theme", theme)
    } catch {}
  }, [theme])

  const toggle = useCallback(() => {
    setThemeState((t) => (t === "dark" ? "light" : "dark"))
  }, [])

  return { theme, toggle }
}
