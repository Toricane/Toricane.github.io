/** Both addresses represent the same NFC/tap landing experience. */
export function isTapLocation(location: { pathname: string; search: string }): boolean {
  const params = new URLSearchParams(location.search)
  return params.get("tap") === "true" || params.get("t") === "1"
}

export function analyticsPath(location: { pathname: string; search: string }): string {
  const home = location.pathname === "/" || location.pathname === "/index.html"
  return home && isTapLocation(location) ? "/?tap=true" : location.pathname
}

export function campaignCleanUrl(location: {
  pathname: string
  search: string
  hash?: string
}): string | null {
  const params = new URLSearchParams(location.search)
  const keys = [...params.keys()].filter((key) => /^utm_/i.test(key))
  if (!keys.length) return null
  for (const key of keys) params.delete(key)
  const query = params.toString()
  return `${location.pathname}${query ? `?${query}` : ""}${location.hash ?? ""}`
}

function cleanCampaignUrl() {
  const clean = campaignCleanUrl(location)
  if (clean === null) return
  try {
    history.replaceState(history.state, "", clean)
  } catch {
    // A restricted History API must not interrupt navigation or tracking.
  }
}

type Hit = { path: string; title: string; event?: boolean; referrer?: string }
const ANALYTICS_ORIGIN = "https://prajwal.is-a.dev"
type AnalyticsWindow = Window & {
  goatcounter?: { no_onload?: boolean; count?: (hit: Hit) => void }
  portfolioAnalytics?: boolean
}

let lastPage = ""
const pending: Hit[] = []
let sessionExcluded = false
let preferencesWired = false

function analyticsExcluded(): boolean {
  try {
    return sessionExcluded || localStorage.getItem("skipgc") === "t"
  } catch {
    return sessionExcluded
  }
}

function applyAnalyticsPreference(): boolean {
  const action = location.hash
  if (!["#disable-goatcounter", "#enable-goatcounter", "#toggle-goatcounter"].includes(action))
    return false
  const disabled =
    action === "#toggle-goatcounter" ? !analyticsExcluded() : action === "#disable-goatcounter"
  sessionExcluded = disabled
  if (disabled) pending.length = 0
  let saved = true
  try {
    if (disabled) localStorage.setItem("skipgc", "t")
    else localStorage.removeItem("skipgc")
  } catch {
    saved = false
  }
  // Consume the command before the remote script can toggle it a second time.
  history.replaceState(history.state, "", `${location.pathname}${location.search}`)
  const notice =
    document.querySelector<HTMLElement>("[data-portfolio-analytics-status]") ??
    document.createElement("p")
  notice.dataset.portfolioAnalyticsStatus = ""
  notice.className = "portfolio-analytics-status"
  notice.setAttribute("role", "status")
  notice.textContent = saved
    ? `Analytics ${disabled ? "DISABLED" : "ENABLED"} in this browser.`
    : `Analytics ${disabled ? "DISABLED" : "ENABLED"} for this visit. Your browser blocked saving this preference.`
  if (!notice.isConnected) document.body.prepend(notice)
  return true
}

function send(hit: Hit) {
  if (location.origin !== ANALYTICS_ORIGIN || analyticsExcluded()) return
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
      : new URLSearchParams(location.search).get("utm_source")?.trim() || undefined
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
  if (location.origin !== ANALYTICS_ORIGIN) {
    cleanCampaignUrl()
    return
  }
  if (!preferencesWired) {
    preferencesWired = true
    window.addEventListener("hashchange", () => {
      if (applyAnalyticsPreference()) initializeAnalytics()
    })
  }
  applyAnalyticsPreference()
  if (analyticsExcluded()) {
    cleanCampaignUrl()
    return
  }
  const win = window as AnalyticsWindow
  if (win.portfolioAnalytics) return
  win.portfolioAnalytics = true
  win.goatcounter = { no_onload: true }

  const page = () => {
    trackModalView(analyticsPath(location), document.title)
    if (win.goatcounter?.count) cleanCampaignUrl()
  }
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
    // count.js reads location.search synchronously while creating its requests.
    // Keep campaign tags until every queued request has captured them.
    cleanCampaignUrl()
  }
  script.onerror = () => {
    pending.length = 0
    cleanCampaignUrl()
  }
  document.head.appendChild(script)
}
