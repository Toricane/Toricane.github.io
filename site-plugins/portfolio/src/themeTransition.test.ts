import assert from "node:assert/strict"
import test from "node:test"
import vm from "node:vm"
import { fileURLToPath } from "node:url"
import { buildSync } from "esbuild"

const source = buildSync({
  entryPoints: [fileURLToPath(new URL("./themeTransition.ts", import.meta.url))],
  bundle: true,
  write: false,
  format: "iife",
  globalName: "effects",
}).outputFiles[0].text

function browser({ supported = true, reduced = false, interrupted = false } = {}) {
  const classes = new Set<string>()
  const animations: { frames: Keyframe[]; options: KeyframeAnimationOptions }[] = []
  let skipped = false
  const root = {
    classList: {
      add: (value: string) => classes.add(value),
      remove: (value: string) => classes.delete(value),
    },
    animate(frames: Keyframe[], options: KeyframeAnimationOptions) {
      animations.push({ frames, options })
      return { finished: Promise.resolve() }
    },
  }
  const context = vm.createContext({
    document: {
      documentElement: root,
      startViewTransition: supported
        ? (update: () => void) => {
            update()
            return {
              ready: interrupted ? Promise.reject(new Error("Hidden tab")) : Promise.resolve(),
              finished: Promise.resolve(),
              skipTransition: () => {
                skipped = true
              },
            }
          }
        : undefined,
    },
    window: { innerWidth: 1200, innerHeight: 800, matchMedia: () => ({ matches: reduced }) },
  })
  vm.runInContext(source, context)
  const controller = {
    theme: "dark",
    setPreference(theme: string) {
      this.theme = theme
    },
  }
  const origin = { getBoundingClientRect: () => ({ left: 1100, top: 10, width: 60, height: 44 }) }
  return {
    classes,
    animations,
    controller,
    skipped: () => skipped,
    run: () => context.effects.transitionTheme(controller, "light", origin),
  }
}

test("radial reveal starts at the switch center and covers the furthest viewport corner", async () => {
  const page = browser()
  await page.run()
  assert.equal(page.controller.theme, "light")
  const { frames, options } = page.animations[0]
  assert.equal(frames[0].clipPath, "circle(0px at 1130px 32px)")
  assert.equal(frames[1].clipPath, `circle(${Math.ceil(Math.hypot(1130, 768))}px at 1130px 32px)`)
  assert.equal(options.pseudoElement, "::view-transition-new(root)")
  assert.equal(page.classes.size, 0)
})

test("reduced motion fades without expanding a circle", async () => {
  const page = browser({ reduced: true })
  await page.run()
  assert.equal(page.animations[0].frames[0].opacity, 0)
  assert.equal(page.animations[0].frames[0].clipPath, undefined)
  assert.equal(page.animations[0].options.duration, 120)
})

test("unsupported and interrupted transitions still switch and clear snapshot styles", async () => {
  for (const settings of [{ supported: false }, { interrupted: true }]) {
    const page = browser(settings)
    await page.run()
    assert.equal(page.controller.theme, "light")
    assert.equal(page.animations.length, 0)
    assert.equal(page.classes.size, 0)
    assert.equal(page.skipped(), settings.interrupted === true)
  }
})
