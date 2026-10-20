import type { Theme, ThemeController } from "./theme"

/** Reveal a real snapshot of the new theme, keeping the old page underneath. */
export async function transitionTheme(
  controller: ThemeController,
  theme: Theme,
  origin: HTMLElement,
): Promise<void> {
  if (!document.startViewTransition) {
    controller.setPreference(theme)
    return
  }

  const root = document.documentElement
  const bounds = origin.getBoundingClientRect()
  const x = bounds.left + bounds.width / 2
  const y = bounds.top + bounds.height / 2
  const radius = Math.ceil(
    Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)),
  )
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  root.classList.add("portfolio-theme-reveal")
  try {
    const transition = document.startViewTransition(() => controller.setPreference(theme))
    try {
      await transition.ready
      const animation = root.animate(
        reducedMotion
          ? [{ opacity: 0 }, { opacity: 1 }]
          : [
              { clipPath: `circle(0px at ${x}px ${y}px)` },
              { clipPath: `circle(${radius}px at ${x}px ${y}px)` },
            ],
        {
          duration: reducedMotion ? 120 : 650,
          easing: "cubic-bezier(0.2, 0, 0, 1)",
          pseudoElement: "::view-transition-new(root)",
          fill: "both",
        },
      )
      await animation.finished
    } catch {
      // Hidden tabs, interrupted transitions, and partial API support still switch.
      transition.skipTransition()
    }
    await transition.finished
  } catch {
    controller.setPreference(theme)
  } finally {
    root.classList.remove("portfolio-theme-reveal")
  }
}
