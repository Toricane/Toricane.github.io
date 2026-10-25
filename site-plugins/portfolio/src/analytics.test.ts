import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import vm from "node:vm"
import { transformSync } from "esbuild"
import { analyticsPath, clickKind, isTapLocation } from "./analytics"

test("tap query aliases share one analytics path without including campaign or place parameters", () => {
  for (const search of ["?tap=true", "?t=1", "?t=1&utm_source=nfc&place=Vancouver"]) {
    assert.equal(isTapLocation({ pathname: "/", search }), true)
    assert.equal(analyticsPath({ pathname: "/", search }), "/?tap=true")
  }
  assert.equal(isTapLocation({ pathname: "/", search: "?t=0&tap=false" }), false)
  assert.equal(
    analyticsPath({ pathname: "/projects/cell-safe", search: "?utm_source=linkedin" }),
    "/projects/cell-safe",
  )
  assert.equal(
    analyticsPath({ pathname: "/projects/cell-safe", search: "?t=1" }),
    "/projects/cell-safe",
  )
})

test("click categories distinguish contact, resume, social, and external project links", () => {
  const origin = "https://prajwal.is-a.dev"
  const cases: [string, string | null][] = [
    ["mailto:hello@example.com", "email"],
    ["/resume/", "resume"],
    ["https://github.com/Toricane/repo", "github"],
    ["https://linkedin.com/in/prajwal-prashanth", "linkedin"],
    ["https://demo.example.com/?secret=hidden", "outbound"],
    ["/projects/cell-safe", null],
    ["javascript:void(0)", null],
    ["https://github.com.example.com", "outbound"],
  ]
  for (const [href, kind] of cases) assert.equal(clickKind(new URL(href, origin), origin), kind)
})

test("tracking queues startup, avoids duplicate navigation, and handles dynamic modal clicks", () => {
  const listeners = new Map<string, Function>()
  const scripts: any[] = []
  const hits: any[] = []
  const location = { origin: "https://prajwal.is-a.dev", pathname: "/", search: "?t=1" }
  const window: any = {
    addEventListener: (name: string, callback: Function) => listeners.set(name, callback),
  }
  const document = {
    title: "Portfolio",
    head: { appendChild: (script: unknown) => scripts.push(script) },
    addEventListener: (name: string, callback: Function) => listeners.set(name, callback),
    createElement: () => ({ dataset: {} }),
    querySelector: () => null,
  }
  const code = transformSync(readFileSync(new URL("./analytics.ts", import.meta.url), "utf8"), {
    loader: "ts",
    format: "cjs",
  }).code
  const module: any = { exports: {} }
  vm.runInNewContext(code, {
    module,
    window,
    document,
    location,
    URL,
    URLSearchParams,
    queueMicrotask,
  })
  module.exports.initializeAnalytics()
  module.exports.initializeAnalytics()
  assert.equal(scripts.length, 1)
  assert.equal(window.goatcounter.no_onload, true)
  listeners.get("nav")!()
  window.goatcounter.count = (hit: unknown) => hits.push(hit)
  scripts[0].onload()
  assert.equal(hits.length, 1)
  assert.equal(hits[0].path, "/?tap=true")
  assert.equal(hits[0].referrer, "nfc")
  module.exports.trackModalView("/projects/cell-safe", "cell-safe")
  module.exports.trackModalView("/projects/cell-safe", "cell-safe")
  assert.equal(hits.length, 2)
  assert.equal(hits[1].title, "cell-safe")
  location.pathname = "/projects/cell-safe"
  location.search = ""
  const link = {
    href: "https://github.com/Toricane/repo?private=value",
    closest: (selector: string) => (selector === ".portfolio-modal__content" ? {} : null),
  }
  listeners.get("click")!({ type: "click", target: { closest: () => link } })
  assert.equal(hits[2].event, true)
  assert.equal(hits[2].path, "click-github:modal:/projects/cell-safe")
  assert.doesNotMatch(hits[2].path, /private|value/)
  listeners.get("auxclick")!({ type: "auxclick", button: 2 })
  assert.equal(hits.length, 3)
  listeners.get("nav")!()
  assert.equal(hits.length, 3)
  location.pathname = "/projects/"
  listeners.get("nav")!()
  assert.equal(hits[3].path, "/projects/")
  assert.equal(hits[3].referrer, "https://prajwal.is-a.dev/projects/cell-safe")
})

test("local, LAN, file, and preview copies never load the tracker or send modal views", () => {
  const code = transformSync(readFileSync(new URL("./analytics.ts", import.meta.url), "utf8"), {
    loader: "ts",
    format: "cjs",
  }).code
  for (const origin of [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://[::1]:8080",
    "http://192.168.1.10:8080",
    "https://preview.example.com",
    "null",
  ]) {
    const module: any = { exports: {} }
    const unexpected = () => assert.fail(`Analytics ran on ${origin}`)
    const window = { goatcounter: { count: unexpected }, addEventListener: unexpected }
    const document = { addEventListener: unexpected, createElement: unexpected }
    vm.runInNewContext(code, {
      module,
      window,
      document,
      location: { origin },
      URL,
      URLSearchParams,
    })
    module.exports.initializeAnalytics()
    module.exports.trackModalView("/projects/cell-safe", "cell-safe")
  }
})

test("exclusion confirms on-page without a remote tracker and works during same-page navigation", () => {
  const code = transformSync(readFileSync(new URL("./analytics.ts", import.meta.url), "utf8"), {
    loader: "ts",
    format: "cjs",
  }).code
  for (const blockedStorage of [false, true]) {
    const values = new Map<string, string>()
    const listeners = new Map<string, Function>()
    const notices: any[] = []
    const scripts: any[] = []
    const hits: any[] = []
    const location = {
      origin: "https://prajwal.is-a.dev",
      pathname: "/",
      search: "",
      hash: "#disable-goatcounter",
    }
    const history = {
      state: null,
      replaceState: () => {
        location.hash = ""
      },
    }
    const localStorage = {
      getItem: (key: string) => values.get(key),
      setItem: (key: string, value: string) => {
        if (blockedStorage) throw new Error("blocked")
        values.set(key, value)
      },
      removeItem: (key: string) => {
        if (blockedStorage) throw new Error("blocked")
        values.delete(key)
      },
    }
    const window: any = {
      addEventListener: (name: string, fn: Function) => listeners.set(name, fn),
    }
    const document = {
      title: "Portfolio",
      querySelector: () => notices[0] ?? null,
      createElement: () => ({ dataset: {}, setAttribute: () => {}, isConnected: false }),
      body: {
        prepend: (notice: any) => {
          notice.isConnected = true
          notices.push(notice)
        },
      },
      head: { appendChild: (script: unknown) => scripts.push(script) },
      addEventListener: (name: string, fn: Function) => listeners.set(name, fn),
    }
    const module: any = { exports: {} }
    vm.runInNewContext(code, {
      module,
      window,
      document,
      location,
      history,
      localStorage,
      URL,
      URLSearchParams,
      queueMicrotask,
    })
    module.exports.initializeAnalytics()
    assert.equal(scripts.length, 0)
    assert.equal(location.hash, "")
    assert.match(notices[0].textContent, /DISABLED/)
    if (blockedStorage) assert.match(notices[0].textContent, /for this visit/)
    else assert.equal(values.get("skipgc"), "t")
    window.goatcounter = { count: (hit: unknown) => hits.push(hit) }
    module.exports.trackModalView("/projects/cell-safe", "cell-safe")
    assert.equal(hits.length, 0)
    // Explicit disable remains disabled even when opened repeatedly.
    location.hash = "#disable-goatcounter"
    listeners.get("hashchange")!()
    assert.match(notices[0].textContent, /DISABLED/)
    assert.equal(scripts.length, 0)
    location.hash = "#enable-goatcounter"
    listeners.get("hashchange")!()
    assert.match(notices[0].textContent, /ENABLED/)
    assert.equal(scripts.length, 1)
    assert.equal(notices.length, 1)
    window.goatcounter.count = (hit: unknown) => hits.push(hit)
    scripts[0].onload()
    assert.equal(hits.length, 1)
    location.hash = "#toggle-goatcounter"
    listeners.get("hashchange")!()
    assert.match(notices[0].textContent, /DISABLED/)
    module.exports.trackModalView("/projects/jarvis", "jarvis")
    assert.equal(hits.length, 1)
  }
})
