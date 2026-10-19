import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import vm from "node:vm"
import { buildSync } from "esbuild"

// Exercise the actual pre-paint browser bundle, including blocked browser APIs.
const source = buildSync({
  entryPoints: [fileURLToPath(new URL("./scripts/theme.inline.ts", import.meta.url))],
  bundle: true,
  write: false,
  format: "iife",
}).outputFiles[0].text

function browser({
  saved = null as string | null,
  light = false,
  blocked = false,
  media = true,
} = {}) {
  const storage = new Map<string, string>(saved ? [["theme", saved]] : [])
  const attributes = new Map<string, string>()
  const events = new EventTarget()
  const query = Object.assign(new EventTarget(), { matches: light })
  const classes = new Set<string>()
  const root = {
    setAttribute: (key: string, value: string) => attributes.set(key, value),
    dataset: {} as Record<string, string>,
    style: {} as Record<string, string>,
    classList: {
      add: (value: string) => classes.add(value),
      remove: (value: string) => classes.delete(value),
    },
    offsetHeight: 1,
  }
  const document = Object.assign(new EventTarget(), { documentElement: root })
  const window = Object.assign(events, {
    matchMedia() {
      if (!media) throw new Error("Unavailable")
      return query
    },
    localStorage: {
      getItem(key: string) {
        if (blocked) throw new Error("Blocked")
        return storage.get(key) ?? null
      },
      setItem(key: string, value: string) {
        if (blocked) throw new Error("Blocked")
        storage.set(key, value)
      },
      removeItem(key: string) {
        if (blocked) throw new Error("Blocked")
        storage.delete(key)
      },
    },
    requestAnimationFrame: (callback: () => void) => callback(),
  }) as unknown as Window & EventTarget
  const context = vm.createContext({ window, document, CustomEvent })
  vm.runInContext(source, context)
  return { window, document, query, root, storage, attributes, context }
}

test("first paint follows a light system preference, otherwise defaults to dark", () => {
  assert.equal(browser({ light: true }).attributes.get("saved-theme"), "light")
  assert.equal(browser().attributes.get("saved-theme"), "dark")
  assert.equal(browser({ media: false }).attributes.get("saved-theme"), "dark")
  assert.equal(browser({ saved: "corrupt", light: true }).attributes.get("saved-theme"), "light")
})

test("explicit choices override the system and persist across reloads", () => {
  const page = browser({ saved: "dark", light: true })
  assert.equal(page.window.portfolioTheme!.theme, "dark")
  page.window.portfolioTheme!.setPreference("light")
  assert.equal(page.storage.get("theme"), "light")
  assert.equal(browser({ saved: page.storage.get("theme")! }).window.portfolioTheme!.theme, "light")
  page.query.matches = false
  page.query.dispatchEvent(new Event("change"))
  assert.equal(page.window.portfolioTheme!.theme, "light")
})

test("System clears the override and tracks subsequent device preference changes", () => {
  const page = browser({ saved: "dark", light: true })
  page.window.portfolioTheme!.setPreference("system")
  assert.equal(page.storage.has("theme"), false)
  assert.equal(page.window.portfolioTheme!.theme, "light")
  page.query.matches = false
  page.query.dispatchEvent(new Event("change"))
  assert.equal(page.attributes.get("saved-theme"), "dark")
  assert.equal(page.root.style.colorScheme, "dark")
})

test("blocked storage still allows switching for the current visit", () => {
  const page = browser({ blocked: true })
  page.window.portfolioTheme!.setPreference("light")
  assert.equal(page.attributes.get("saved-theme"), "light")
})

test("cross-tab changes synchronize and clearing storage restores System", () => {
  const page = browser({ light: true })
  page.storage.set("theme", "dark")
  page.window.dispatchEvent(Object.assign(new Event("storage"), { key: "theme" }))
  assert.equal(page.window.portfolioTheme!.theme, "dark")
  page.storage.clear()
  page.window.dispatchEvent(Object.assign(new Event("storage"), { key: null }))
  assert.equal(page.window.portfolioTheme!.theme, "light")
  assert.equal(page.window.portfolioTheme!.preference, "system")
})

test("re-execution during navigation reuses the controller and emits compatible theme events", () => {
  const page = browser()
  const controller = page.window.portfolioTheme
  vm.runInContext(source, page.context)
  assert.equal(page.window.portfolioTheme, controller)
  let detail: unknown
  page.document.addEventListener("themechange", (event) => {
    detail = (event as CustomEvent).detail
  })
  controller!.setPreference("light")
  assert.equal((detail as { theme: string }).theme, "light")
})

function luminance(hex: string) {
  const rgb = hex.match(/[a-f\d]{2}/gi)!.map((part) => {
    const value = parseInt(part, 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722
}

test("both themes maintain AA text contrast on page, card, and raised surfaces", () => {
  const scss = readFileSync(new URL("./styles/portfolio.scss", import.meta.url), "utf8")
  for (const selector of [":root", ':root[saved-theme="light"]']) {
    const block = scss.slice(scss.indexOf(selector)).split("}")[0]
    const palette = Object.fromEntries(
      [...block.matchAll(/--portfolio-([\w-]+): (#[a-f\d]{6});/gi)].map((m) => [m[1], m[2]]),
    )
    for (const surface of ["ink", "panel", "raised"]) {
      for (const text of ["frost", "steel", "copper", "copper-soft", "gold-text", "silver-text"]) {
        const values = [luminance(palette[surface]), luminance(palette[text])].sort((a, b) => a - b)
        const ratio = (values[1] + 0.05) / (values[0] + 0.05)
        assert.ok(ratio >= 4.5, `${selector}: ${text} on ${surface} = ${ratio.toFixed(2)}:1`)
      }
    }
  }
})
