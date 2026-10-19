export type Theme = "light" | "dark"
export type ThemePreference = Theme | "system"
export const THEME_STORAGE_KEY = "theme"

export function themePreference(value: string | null): ThemePreference {
  return value === "light" || value === "dark" ? value : "system"
}

export function resolveTheme(preference: ThemePreference, prefersLight: boolean): Theme {
  return preference === "system" ? (prefersLight ? "light" : "dark") : preference
}

export type ThemeController = {
  preference: ThemePreference
  theme: Theme
  setPreference: (preference: ThemePreference) => void
}

declare global {
  interface Window {
    portfolioTheme?: ThemeController
  }
}

/** Runs in the head before paint; persists for the document's entire SPA lifetime. */
export function initializeTheme(): ThemeController {
  if (window.portfolioTheme) return window.portfolioTheme
  const root = document.documentElement
  let lightPreference: MediaQueryList | undefined
  try {
    lightPreference = window.matchMedia("(prefers-color-scheme: light)")
  } catch {
    // Older browsers and restricted contexts still get the dark default.
  }
  const readPreference = () => {
    try {
      return themePreference(window.localStorage.getItem(THEME_STORAGE_KEY))
    } catch {
      return "system" as const
    }
  }
  const controller: ThemeController = {
    preference: readPreference(),
    theme: "dark",
    setPreference(preference) {
      controller.preference = preference
      try {
        if (preference === "system") window.localStorage.removeItem(THEME_STORAGE_KEY)
        else window.localStorage.setItem(THEME_STORAGE_KEY, preference)
      } catch {
        // Switching works for this visit even when browser storage is blocked.
      }
      applyTheme()
    },
  }
  function applyTheme() {
    const theme = resolveTheme(controller.preference, lightPreference?.matches ?? false)
    // Avoid a page full of unrelated color transitions during the swap.
    root.classList.add("portfolio-theme-changing")
    root.setAttribute("saved-theme", theme)
    root.dataset.themePreference = controller.preference
    root.style.colorScheme = theme
    controller.theme = theme
    document.dispatchEvent(new CustomEvent("themechange", { detail: { theme } }))
    // Flush the new styles before re-enabling ordinary hover transitions.
    void root.offsetHeight
    window.requestAnimationFrame(() => root.classList.remove("portfolio-theme-changing"))
  }
  lightPreference?.addEventListener("change", () => {
    if (controller.preference === "system") applyTheme()
  })
  window.addEventListener("storage", (event) => {
    if (event.key !== THEME_STORAGE_KEY && event.key !== null) return
    controller.preference = readPreference()
    applyTheme()
  })
  window.portfolioTheme = controller
  applyTheme()
  return controller
}
