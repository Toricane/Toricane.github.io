import fs from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { parseArgs } from "node:util"

const API = "https://prajwal.goatcounter.com/api/v0/"
const SITE = "https://prajwal.is-a.dev"
const TRACKING_START = "2026-10-25"
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const iso = (date) => date.toISOString()

export function reportingPeriods({ month, days, now = new Date() } = {}) {
  if (month && days) throw new Error("Choose --month or --days, not both.")
  let start, boundary, previousStart
  if (days !== undefined) {
    const length = Number(days)
    if (!Number.isInteger(length) || length < 1 || length > 366)
      throw new Error("--days must be an integer from 1 to 366.")
    boundary = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    start = new Date(+boundary - length * 86400000)
    previousStart = new Date(+start - length * 86400000)
  } else {
    if (month !== undefined && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
      throw new Error("--month must use YYYY-MM.")
    start = month
      ? new Date(`${month}-01T00:00:00Z`)
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
    boundary = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1))
    if (+boundary > +now)
      throw new Error("Choose a completed month, or use --days for recent data.")
    previousStart = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - 1, 1))
  }
  // GoatCounter's hourly buckets use inclusive end bounds. Exclude next month's midnight.
  const period = (a, b) => ({
    start: iso(a),
    end: iso(new Date(+b - 3600000)),
    days: Math.round((+b - +a) / 86400000),
  })
  return { current: period(start, boundary), previous: period(previousStart, start) }
}

function count(value) {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new Error("GoatCounter returned an invalid count.")
  return value
}

export function createClient({ token, fetchImpl = fetch, sleep = delay } = {}) {
  if (!token?.trim())
    throw new Error("Set GOATCOUNTER_API_TOKEN in .env.pulse or your environment.")
  let requested = false
  async function get(endpoint, params) {
    const url = new URL(endpoint, API)
    for (const [key, value] of Object.entries(params))
      if (value !== undefined && value !== "") url.searchParams.set(key, String(value))
    for (let attempt = 0; attempt < 3; attempt++) {
      if (requested) await sleep(300) // Hosted API limit: four requests per second.
      requested = true
      let response
      try {
        response = await fetchImpl(url, {
          headers: { Authorization: `Bearer ${token.trim()}`, "Content-Type": "application/json" },
          signal: AbortSignal.timeout(20000),
          redirect: "error",
        })
      } catch {
        throw new Error(
          "Could not reach GoatCounter. Check connectivity and retry; no report was written.",
        )
      }
      if ((response.status === 429 || response.status >= 500) && attempt < 2) {
        const seconds = Number(response.headers?.get("retry-after"))
        await sleep(
          Number.isFinite(seconds) && seconds > 0
            ? Math.min(seconds * 1000, 5000)
            : 1000 * (attempt + 1),
        )
        continue
      }
      if (!response.ok) {
        const hint =
          response.status === 401 || response.status === 403
            ? " Check the token and its Read statistics permission."
            : ""
        throw new Error(`GoatCounter returned HTTP ${response.status} for ${url.pathname}.${hint}`)
      }
      try {
        return await response.json()
      } catch {
        throw new Error("GoatCounter returned invalid JSON.")
      }
    }
  }
  async function hits(period) {
    const rows = [],
      ids = new Set()
    for (let page = 0; page < 500; page++) {
      const data = await get("stats/hits", {
        start: period.start,
        end: period.end,
        limit: 100,
        exclude_paths: [...ids].join(","),
      })
      if ((data.hits !== null && !Array.isArray(data.hits)) || typeof data.more !== "boolean")
        throw new Error("Unexpected GoatCounter hits response.")
      const batch = data.hits ?? []
      for (const row of batch) {
        if (
          !Number.isSafeInteger(row.path_id) ||
          row.path_id < 1 ||
          ids.has(row.path_id) ||
          typeof row.path !== "string" ||
          typeof row.event !== "boolean"
        )
          throw new Error("Invalid or repeated GoatCounter path; pagination cannot be trusted.")
        ids.add(row.path_id)
        rows.push({
          id: row.path_id,
          path: row.path,
          title: String(row.title ?? row.path),
          event: row.event,
          count: count(row.count),
        })
      }
      if (!data.more) return rows
      if (!batch.length) throw new Error("GoatCounter pagination made no progress.")
    }
    throw new Error("GoatCounter exceeded the report pagination limit.")
  }
  async function sources(period, paths) {
    if (!paths.length) return []
    const rows = []
    for (let page = 0; page < 500; page++) {
      const data = await get("stats/toprefs", {
        start: period.start,
        end: period.end,
        limit: 100,
        offset: rows.length,
        include_paths: paths.map((row) => row.id).join(","),
      })
      if ((data.stats !== null && !Array.isArray(data.stats)) || typeof data.more !== "boolean")
        throw new Error("Unexpected GoatCounter referrer response.")
      const batch = data.stats ?? []
      for (const row of batch) {
        if (typeof row.name !== "string") throw new Error("Invalid GoatCounter referrer.")
        rows.push({ name: row.name || "Direct / unknown", count: count(row.count) })
      }
      if (!data.more) return rows
      if (!batch.length) throw new Error("GoatCounter referrer pagination made no progress.")
    }
    throw new Error("GoatCounter exceeded the report pagination limit.")
  }
  async function pageCounts(period) {
    const pages = {},
      rows = (await hits(period)).filter((row) => !row.event)
    for (const row of rows) {
      const key = canonicalPath(row.path)
      if (key !== null) pages[key] = (pages[key] ?? 0) + row.count
    }
    return { total: rows.reduce((total, row) => total + row.count, 0), pages }
  }
  return {
    pageCounts,
    async pageCount(period) {
      return (await pageCounts(period)).total
    },
    async period(period) {
      const rows = await hits(period)
      return {
        rows,
        sources: await sources(
          period,
          rows.filter((row) => !row.event),
        ),
      }
    },
  }
}

export function comparison(current, previous, comparable = true) {
  return {
    current,
    previous,
    delta: current - previous,
    percent:
      comparable && previous >= 20 ? Math.round(((current - previous) / previous) * 100) : null,
    lowSample: current < 20 || previous < 20,
    comparable,
  }
}

function canonicalPath(raw) {
  const url = new URL(raw, SITE)
  if (url.origin !== SITE) return null
  return url.pathname.replace(/\.html$/, "").replace(/\/+$/, "") || "/"
}

function aggregate(rows, keyFor, titleFor = (row) => row.title) {
  const result = new Map()
  for (const row of rows) {
    const key = keyFor(row)
    if (key === null) continue
    const current = result.get(key) ?? { key, title: titleFor(row) ?? key, count: 0 }
    current.count += row.count
    result.set(key, current)
  }
  return result
}

function ranked(current, previous, comparable) {
  return [...new Set([...current.keys(), ...previous.keys()])]
    .map((key) => ({
      key,
      title: current.get(key)?.title ?? previous.get(key)?.title ?? key,
      ...comparison(current.get(key)?.count ?? 0, previous.get(key)?.count ?? 0, comparable),
    }))
    .sort((a, b) => b.current - a.current || b.previous - a.previous || a.key.localeCompare(b.key))
}

export function buildReport({ periods, current, previous, demo = false, now = new Date() }) {
  const sum = (rows) => rows.reduce((total, row) => total + row.count, 0)
  const pages = (data) => data.rows.filter((row) => !row.event)
  const events = (data) => data.rows.filter((row) => row.event)
  const actionPattern = /^click-(resume|email|github|linkedin|outbound):([^:]+):(.+)$/
  const actions = (data) =>
    events(data).flatMap((row) => {
      const match = row.path.match(actionPattern)
      return match ? [{ ...row, kind: match[1], placement: match[2], page: match[3] }] : []
    })
  const currentPages = pages(current),
    previousPages = pages(previous)
  const currentActions = actions(current),
    previousActions = actions(previous)
  const fullTracking = periods.previous.start.slice(0, 10) >= TRACKING_START
  const changedTracking =
    periods.previous.start.slice(0, 10) < TRACKING_START &&
    periods.current.end.slice(0, 10) >= TRACKING_START
  const project = (row) => {
    const value = canonicalPath(row.path)
    return /^\/projects\/[^/]+$/.test(value ?? "") ? value : null
  }
  const tap = (row) => {
    const url = new URL(row.path, SITE)
    return (
      url.pathname === "/" &&
      (url.searchParams.get("tap") === "true" || url.searchParams.get("t") === "1")
    )
  }
  const metric = (a, b, comparable = !changedTracking) => comparison(a, b, comparable)
  const sourceMap = (data) =>
    aggregate(
      data.sources
        .filter((row) => {
          try {
            return new URL(row.name).origin !== SITE
          } catch {
            return true
          }
        })
        .map((row) => ({ ...row, title: row.name })),
      (row) => row.name,
    )
  const projects = ranked(
    aggregate(currentPages, project),
    aggregate(previousPages, project),
    !changedTracking,
  )
  const actionKinds = ranked(
    aggregate(
      currentActions,
      (row) => row.kind,
      (row) => row.kind,
    ),
    aggregate(
      previousActions,
      (row) => row.kind,
      (row) => row.kind,
    ),
    fullTracking,
  )
  const warnings = []
  if (sum(currentPages) < 50 || sum(previousPages) < 50)
    warnings.push(
      "Small sample: use raw counts as directional signals; avoid conclusions from percentage changes.",
    )
  if (!fullTracking)
    warnings.push(
      `Modal, click, NFC, and source-only tracking began ${TRACKING_START}. These periods have incomplete or changed coverage; click comparisons are suppressed.`,
    )
  if (periods.current.days !== periods.previous.days)
    warnings.push(
      "Calendar months have different lengths. Raw changes are not adjusted for days; page visits per day are included below.",
    )
  const unknown = events(current).filter((row) => !actionPattern.test(row.path))
  if (unknown.length)
    warnings.push(`${sum(unknown)} other event counts are excluded from tracked-click totals.`)
  const recommendation = !fullTracking
    ? "Collect two complete periods with the current tracking before changing the site based on engagement trends."
    : sum(currentPages) < 50
      ? "Keep collecting data. Share consistently tagged links and review a longer period before changing the home page."
      : sum(currentActions) === 0
        ? "Check that resume and contact click tracking works, then review whether those links are visible where visitors read. Zero recorded clicks alone does not prove a layout problem."
        : projects[0]?.current > 0
          ? `Review ${projects[0].title}: it received ${projects[0].current} project visits. Check that its demo, source, and next-step links are useful and easy to find.`
          : "Review the pages generating recorded clicks and keep their next-step links clear."
  return {
    version: 1,
    site: SITE,
    generatedAt: iso(now),
    demo,
    periods,
    metrics: {
      pageVisits: metric(sum(currentPages), sum(previousPages)),
      trackedClicks: metric(sum(currentActions), sum(previousActions), fullTracking),
      resumeClicks: metric(
        sum(currentActions.filter((row) => row.kind === "resume")),
        sum(previousActions.filter((row) => row.kind === "resume")),
        fullTracking,
      ),
      nfcArrivals: metric(
        sum(currentPages.filter(tap)),
        sum(previousPages.filter(tap)),
        fullTracking,
      ),
    },
    visitsPerDay: {
      current: +(sum(currentPages) / periods.current.days).toFixed(2),
      previous: +(sum(previousPages) / periods.previous.days).toFixed(2),
    },
    projects,
    actions: actionKinds,
    placements: ranked(
      aggregate(
        currentActions,
        (row) => row.placement,
        (row) => row.placement,
      ),
      aggregate(
        previousActions,
        (row) => row.placement,
        (row) => row.placement,
      ),
      fullTracking,
    ),
    actionPages: ranked(
      aggregate(
        currentActions,
        (row) => canonicalPath(row.page),
        (row) => canonicalPath(row.page),
      ),
      aggregate(
        previousActions,
        (row) => canonicalPath(row.page),
        (row) => canonicalPath(row.page),
      ),
      fullTracking,
    ),
    sources: ranked(sourceMap(current), sourceMap(previous), !changedTracking),
    warnings,
    recommendation,
    methodology:
      "Page visits sum GoatCounter per-path visitor counts; they are not site-wide unique people or raw pageview totals. Tracked clicks sum recognized click-event counts and follow GoatCounter session deduplication. Referrer counts are scoped to page paths, exclude internal referrals, and do not establish visitor-level funnels. Percent changes require a baseline of at least 20 and comparable tracking. Email and resume clicks measure intent, not completed contact or confirmed reading. Missing events before tracking was installed cannot be recovered.",
  }
}

function escape(value) {
  return String(value).replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
  )
}
function change(row) {
  if (!row.comparable) return "Tracking changed"
  if (row.previous === 0) return row.current ? "New / no baseline" : "No activity"
  return `${row.delta > 0 ? "+" : ""}${row.delta}${row.percent === null ? " · small baseline" : ` (${row.percent > 0 ? "+" : ""}${row.percent}%)`}`
}
const labels = {
  pageVisits: "Page visits",
  trackedClicks: "Tracked clicks",
  resumeClicks: "Resume clicks",
  nfcArrivals: "NFC arrivals",
}
const periodLabel = (period) => `${period.start.slice(0, 10)} – ${period.end.slice(0, 10)}`

export function renderMarkdown(report) {
  const safe = (value) =>
    String(value)
      .replace(/[\r\n]/g, " ")
      .replace(/[\\`*_{}\[\]<>#|]/g, "\\$&")
  const section = (heading, rows) =>
    `## ${heading}\n\n${
      rows.length
        ? rows
            .slice(0, 10)
            .map(
              (row) =>
                `- ${safe(row.title)}: ${row.current}; previous ${row.previous}; ${change(row)}.`,
            )
            .join("\n")
        : "No recorded activity."
    }\n`
  return `# Portfolio pulse${report.demo ? " — DEMO DATA" : ""}\n\n${periodLabel(report.periods.current)} compared with ${periodLabel(report.periods.previous)} (UTC boundaries).\n\n${Object.entries(
    report.metrics,
  )
    .map(
      ([key, row]) => `- ${labels[key]}: ${row.current}; previous ${row.previous}; ${change(row)}.`,
    )
    .join(
      "\n",
    )}\n- Page visits per day: ${report.visitsPerDay.current}; previous ${report.visitsPerDay.previous}.\n\n${report.warnings.map((warning) => `> ${safe(warning)}\n`).join("\n")}\n${section("Projects", report.projects)}\n${section("Actions", report.actions)}\n${section("Link placements", report.placements)}\n${section("Pages generating clicks", report.actionPages)}\n${section("Referrers", report.sources)}\n## Next step\n\n${safe(report.recommendation)}\n\n## How to read this\n\n${report.methodology}\n`
}

export function renderHtml(report) {
  const table = (heading, rows) =>
    `<section><h2>${heading}</h2>${
      rows.length
        ? `<div class="table"><table><thead><tr><th scope="col">Name</th><th scope="col">Current</th><th scope="col">Previous</th><th scope="col">Change</th></tr></thead><tbody>${rows
            .slice(0, 10)
            .map(
              (row) =>
                `<tr><th scope="row">${escape(row.title)}${row.title !== row.key ? `<small>${escape(row.key)}</small>` : ""}</th><td>${row.current}</td><td>${row.previous}</td><td>${escape(change(row))}</td></tr>`,
            )
            .join("")}</tbody></table></div>`
        : `<p class="muted">No recorded activity.</p>`
    }</section>`
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>Portfolio pulse · ${report.periods.current.start.slice(0, 10)}</title><style>
:root{color-scheme:dark light;--bg:#0f161e;--panel:#17232e;--ink:#e7edf3;--muted:#b7c4cf;--line:#3b4d5e;--accent:#f0bc86;font-family:system-ui,sans-serif;background:var(--bg);color:var(--ink)}*{box-sizing:border-box}body{margin:0;padding:clamp(16px,4vw,48px);line-height:1.6}main{max-width:1100px;margin:auto}header{padding:20px 0 32px;border-bottom:1px solid var(--line)}h1{font-size:clamp(32px,5vw,56px);line-height:1.1;margin:8px 0 18px;letter-spacing:-.04em}h2{font-size:22px;margin:0 0 16px}p{margin:8px 0}.eyebrow{color:var(--accent);font-size:13px;text-transform:uppercase;letter-spacing:.12em}.muted,small{color:var(--muted)}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr));gap:16px;margin:28px 0}.card,section,aside{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:24px;min-width:0}.card strong{font-size:38px;display:block;line-height:1.3}.card span{font-size:14px;color:var(--muted)}section{margin:18px 0}aside{border-left:4px solid var(--accent);margin:20px 0}.table{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:15px}th,td{text-align:right;padding:12px 10px;border-bottom:1px solid var(--line);vertical-align:top}th:first-child{text-align:left;min-width:150px;overflow-wrap:anywhere}thead th{color:var(--muted);font-weight:500}tbody th{font-weight:500}small{display:block;font-size:12px;overflow-wrap:anywhere}footer{padding:24px 0;color:var(--muted);font-size:14px}li{margin:6px 0}@media(prefers-color-scheme:light){:root{--bg:#f3f5f7;--panel:#fff;--ink:#17232e;--muted:#4b5b69;--line:#c5ced6;--accent:#8c4a18}}@media(max-width:500px){section,.card,aside{padding:16px}th,td{padding:10px 6px}}@media print{body{padding:0}section,.card{break-inside:avoid}:root{--bg:#fff;--panel:#fff;--ink:#111;--muted:#444;--line:#bbb;--accent:#333}}
</style></head><body><main><header><p class="eyebrow">Prajwal · portfolio analytics${report.demo ? " · DEMO DATA — not real traffic" : ""}</p><h1>Monthly pulse</h1><p>${periodLabel(report.periods.current)}</p><p class="muted">Compared with ${periodLabel(report.periods.previous)} · UTC boundaries</p></header><div class="cards">${Object.entries(
    report.metrics,
  )
    .map(
      ([key, row]) =>
        `<div class="card"><div>${labels[key]}</div><strong>${row.current}</strong><span>Previous ${row.previous} · ${escape(change(row))}</span></div>`,
    )
    .join(
      "",
    )}</div><p class="muted">Page visits per day: ${report.visitsPerDay.current} · Previous ${report.visitsPerDay.previous}</p>${report.warnings.length ? `<aside aria-label="Interpretation notes"><ul>${report.warnings.map((warning) => `<li>${escape(warning)}</li>`).join("")}</ul></aside>` : ""}${table("Projects people opened", report.projects)}${table("Actions people took", report.actions)}${table("Where links worked", report.placements)}${table("Pages generating clicks", report.actionPages)}${table("Referrers", report.sources)}<aside><h2>One next step</h2><p>${escape(report.recommendation)}</p></aside><footer><h2>How to read this</h2><p>${escape(report.methodology)}</p><p>Generated ${escape(report.generatedAt)}. No external assets or live API calls are used by this report.</p></footer></main></body></html>`
}

export function demoData() {
  const row = (id, path, count, event = false, title = path) => ({ id, path, count, event, title })
  return {
    current: {
      rows: [
        row(1, "/", 80),
        row(2, "/projects/cell-safe", 24, false, "cell-safe"),
        row(3, "/projects/jarvis", 19, false, "JARVIS"),
        row(4, "/?tap=true", 12),
        row(5, "click-resume:home:/", 9, true),
        row(6, "click-github:modal:/projects/cell-safe", 5, true),
        row(7, "click-linkedin:tap-bar:/?tap=true", 4, true),
      ],
      sources: [
        { name: "linkedin", count: 32 },
        { name: "github", count: 16 },
        { name: "nfc", count: 12 },
        { name: "Direct / unknown", count: 75 },
      ],
    },
    previous: {
      rows: [
        row(1, "/", 62),
        row(2, "/projects/cell-safe", 20, false, "cell-safe"),
        row(3, "/projects/jarvis", 10, false, "JARVIS"),
        row(4, "/?tap=true", 7),
        row(5, "click-resume:home:/", 4, true),
      ],
      sources: [
        { name: "linkedin", count: 20 },
        { name: "github", count: 10 },
        { name: "nfc", count: 7 },
        { name: "Direct / unknown", count: 62 },
      ],
    },
  }
}

export async function main(args = process.argv.slice(2)) {
  const { values } = parseArgs({
    args,
    options: {
      month: { type: "string" },
      days: { type: "string" },
      out: { type: "string" },
      demo: { type: "boolean" },
      help: { type: "boolean" },
    },
    strict: true,
  })
  if (values.help) {
    console.log(
      "node scripts/portfolio-pulse.mjs [--month YYYY-MM | --days 30] [--out DIRECTORY] [--demo]\nDefault: last complete calendar month; reports saved under private/portfolio-pulse.\nSet GOATCOUNTER_API_TOKEN in .env.pulse or your environment.",
    )
    return
  }
  const periods = reportingPeriods({ month: values.month, days: values.days })
  let data
  if (values.demo) data = demoData()
  else {
    if (!process.env.GOATCOUNTER_API_TOKEN) {
      try {
        process.loadEnvFile(".env.pulse")
      } catch (error) {
        if (error.code !== "ENOENT") throw new Error("Could not read .env.pulse.")
      }
    }
    const client = createClient({ token: process.env.GOATCOUNTER_API_TOKEN })
    data = {
      current: await client.period(periods.current),
      previous: await client.period(periods.previous),
    }
  }
  const report = buildReport({ periods, ...data, demo: !!values.demo })
  const output = path.resolve(values.out ?? "private/portfolio-pulse")
  for (const directory of ["public", "content"]) {
    const relative = path.relative(path.resolve(directory), output)
    if (
      relative === "" ||
      (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))
    )
      throw new Error(
        "Choose an output folder outside public/ and content/ so reports are not published with the site.",
      )
  }
  await fs.mkdir(output, { recursive: true })
  const label = values.days
    ? `${periods.current.start.slice(0, 10)}-${values.days}days`
    : periods.current.start.slice(0, 7)
  const basename = `portfolio-pulse-${label}${values.demo ? "-demo" : ""}`
  for (const [extension, value] of [
    ["html", renderHtml(report)],
    ["md", renderMarkdown(report)],
    ["json", JSON.stringify(report, null, 2) + "\n"],
  ]) {
    const target = path.join(output, `${basename}.${extension}`)
    await fs.writeFile(`${target}.tmp`, value, { mode: 0o600 })
    await fs.rename(`${target}.tmp`, target)
  }
  console.log(
    `${values.demo ? "Demo" : "Portfolio"} pulse saved to ${path.join(output, basename)}.{html,md,json}`,
  )
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    const token = process.env.GOATCOUNTER_API_TOKEN
    console.error(token ? error.message.replaceAll(token, "[redacted]") : error.message)
    process.exitCode = 1
  })
}
