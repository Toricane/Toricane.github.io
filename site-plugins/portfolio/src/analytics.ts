/** Both addresses represent the same NFC/tap landing experience. */
export function isTapLocation(location: { pathname: string; search: string }): boolean {
  const params = new URLSearchParams(location.search)
  return params.get("tap") === "true" || params.get("t") === "1"
}

export function analyticsPath(location: { pathname: string; search: string }): string {
  const home = location.pathname === "/" || location.pathname === "/index.html"
  return home && isTapLocation(location) ? "/?tap=true" : location.pathname
}

type Hit = { path: string; title: string; event?: boolean; referrer?: string }
const ANALYTICS_ORIGIN = "https://prajwal.is-a.dev"
type AnalyticsWindow = Window & {
  goatcounter?: { no_onload?: boolean; count?: (hit: Hit) => void }
  portfolioAnalytics?: boolean
}

let lastPage = ""
const pending: Hit[] = []

function send(hit: Hit) {
  if (location.origin !== ANALYTICS_ORIGIN) return
  const counter = (window as AnalyticsWindow).goatcounter
  try {
    if (counter?.count) counter.count(hit)
    else if (pending.length < 30) pending.push(hit)
  } catch {
    // Analytics must never interrupt navigation or a contact action.
  }
}

export function trackModalView(path: string, title: string) {
  if (path === lastPage) return
  const referrer = lastPage
    ? new URL(lastPage, location.origin).href
    : path === "/?tap=true"
      ? "nfc"
      : undefined
  lastPage = path
  send({ path, title, referrer })
}

/** Stable, bounded categories; never send email addresses, queries, or link text. */
export function clickKind(url: URL, ownOrigin: string): string | null {
  if (url.protocol === "mailto:") return "email"
  if (!/^https?:$/.test(url.protocol)) return null
  if (url.origin === ownOrigin) return /^\/resume(?:\/|$)/.test(url.pathname) ? "resume" : null
  if (/(^|\.)github\.com$/.test(url.hostname)) return "github"
  if (/(^|\.)linkedin\.com$/.test(url.hostname)) return "linkedin"
  return "outbound"
}

export function initializeAnalytics() {
  // Do not even load the remote tracker on local/LAN/preview copies.
  if (location.origin !== ANALYTICS_ORIGIN) return
  const win = window as AnalyticsWindow
  if (win.portfolioAnalytics) return
  win.portfolioAnalytics = true
  win.goatcounter = { no_onload: true }

  const page = () => trackModalView(analyticsPath(location), document.title)
  document.addEventListener("nav", page)
  window.addEventListener("popstate", () => queueMicrotask(page))
  const onClick = (event: MouseEvent) => {
    if (event.type === "auxclick" && event.button !== 1) return
    const link = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href]")
    if (!link) return
    const kind = clickKind(new URL(link.href), location.origin)
    if (!kind) return
    const placement = link.closest("[data-portfolio-tap-bar]")
      ? "tap-bar"
      : link.closest("[data-portfolio-tap-banner]")
        ? "tap-banner"
        : link.closest(".portfolio-modal__content")
          ? "modal"
          : link.closest(".portfolio-nav")
            ? "menu"
            : link.closest(".portfolio-footer")
              ? "footer"
              : link.closest(".portfolio-home-shell")
                ? "home"
                : "entry"
    const source = analyticsPath(location)
    send({
      path: `click-${kind}:${placement}:${source}`,
      title: `${kind} (${placement})`,
      event: true,
      ...(source === "/?tap=true" ? { referrer: "nfc" } : {}),
    })
  }
  document.addEventListener("click", onClick, true)
  document.addEventListener("auxclick", onClick, true)

  page()
  const script = document.createElement("script")
  script.src = "https://gc.zgo.at/count.js"
  script.async = true
  script.dataset.goatcounter = "https://prajwal.goatcounter.com/count"
  script.onload = () => {
    for (const hit of pending.splice(0)) send(hit)
  }
  script.onerror = () => {
    pending.length = 0
  }
  document.head.appendChild(script)
}
