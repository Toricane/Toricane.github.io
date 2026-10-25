import assert from "node:assert/strict"
import { test } from "node:test"
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"
import {
  reportingPeriods,
  createClient,
  comparison,
  buildReport,
  renderHtml,
  renderMarkdown,
  demoData,
} from "./portfolio-pulse.mjs"

const periods = reportingPeriods({ month: "2027-02", now: new Date("2027-03-15T00:00:00Z") })

test("calendar and rolling periods use completed UTC days with no boundary overlap", () => {
  assert.equal(periods.current.start, "2027-02-01T00:00:00.000Z")
  assert.equal(periods.current.end, "2027-02-28T23:00:00.000Z")
  assert.equal(periods.previous.end, "2027-01-31T23:00:00.000Z")
  assert.equal(periods.current.days, 28)
  assert.equal(periods.previous.days, 31)
  const january = reportingPeriods({ now: new Date("2027-01-05T08:00:00Z") })
  assert.equal(january.current.start, "2026-12-01T00:00:00.000Z")
  assert.equal(january.previous.start, "2026-11-01T00:00:00.000Z")
  const leap = reportingPeriods({ month: "2024-02", now: new Date("2027-03-15") })
  assert.equal(leap.current.days, 29)
  const rolling = reportingPeriods({ days: "30", now: new Date("2027-03-15T17:00:00Z") })
  assert.equal(rolling.current.end, "2027-03-14T23:00:00.000Z")
  assert.equal(rolling.current.days, 30)
  assert.equal(+new Date(rolling.previous.end) + 3600000, +new Date(rolling.current.start))
  for (const args of [
    { month: "2027-13" },
    { month: "2027-04" },
    { days: "NaN" },
    { days: "0" },
    { month: "2027-02", days: "30" },
  ])
    assert.throws(() => reportingPeriods({ ...args, now: new Date("2027-03-15") }))
})

const reply = (body, status = 200) => ({
  ok: status === 200,
  status,
  headers: { get: () => null },
  json: async () => body,
})
const hit = (path_id, path, count, event = false) => ({ path_id, path, count, event, title: path })

test("HTTP failures identify the endpoint without echoing the token or response body", async () => {
  const client = createClient({
    token: "private-test-token",
    fetchImpl: async () => reply({ error: "private-test-token" }, 404),
  })
  await assert.rejects(
    () => client.period(periods.current),
    (error) => {
      assert.equal(error.message, "GoatCounter returned HTTP 404 for /api/v0/stats/hits.")
      assert.doesNotMatch(error.message, /private-test-token/)
      return true
    },
  )
})

test("client paginates all paths and scopes paginated referrers to pages, excluding events", async () => {
  const responses = [
    reply({ hits: [hit(1, "/", 20), hit(2, "click-resume:home:/", 3, true)], more: true }),
    reply({ hits: [hit(3, "/projects/demo", 9)], more: false }),
    reply({ stats: [{ name: "linkedin", count: 8 }], more: true }),
    reply({ stats: [{ name: "nfc", count: 4 }], more: false }),
  ]
  const requests = [],
    sleeps = []
  const client = createClient({
    token: "test-token",
    sleep: async (ms) => sleeps.push(ms),
    fetchImpl: async (url, options) => {
      requests.push({ url, options })
      return responses.shift()
    },
  })
  const data = await client.period(periods.current)
  assert.equal(data.rows.length, 3)
  assert.equal(data.sources.length, 2)
  assert.equal(requests[1].url.searchParams.get("exclude_paths"), "1,2")
  assert.equal(requests[2].url.searchParams.get("include_paths"), "1,3")
  assert.equal(requests[3].url.searchParams.get("offset"), "1")
  assert.equal(requests[0].options.headers.Authorization, "Bearer test-token")
  assert.equal(requests[0].options.redirect, "error")
  assert.ok(requests.every(({ url }) => url.origin === "https://prajwal.goatcounter.com"))
  assert.deepEqual(sleeps, [300, 300, 300])
})

test("client accepts empty periods, retries throttling, and rejects unauthorized or untrustworthy results", async () => {
  const responses = [reply({}, 429), reply({ hits: null, more: false })]
  let requests = 0
  const client = createClient({
    token: "test-token",
    sleep: async () => {},
    fetchImpl: async () => {
      requests++
      return responses.shift()
    },
  })
  assert.deepEqual(await client.period(periods.current), { rows: [], sources: [] })
  assert.equal(requests, 2)
  assert.throws(() => createClient({ token: "" }), /GOATCOUNTER_API_TOKEN/)
  for (const response of [
    reply({}, 401),
    reply({}, 403),
    reply({ hits: [], more: true }),
    reply({ hits: [hit(1, "/", -1)], more: false }),
    reply({ hits: [{}], more: false }),
  ]) {
    const broken = createClient({
      token: "test-token",
      sleep: async () => {},
      fetchImpl: async () => response,
    })
    await assert.rejects(
      () => broken.period(periods.current),
      (error) => !error.message.includes("test-token"),
    )
  }
  const duplicate = createClient({
    token: "test-token",
    sleep: async () => {},
    fetchImpl: async () => reply({ hits: [hit(1, "/", 1)], more: true }),
  })
  await assert.rejects(() => duplicate.period(periods.current), /repeated/)
})

test("report separates page visits and events, combines canonical project paths, and preserves prior-only rows", () => {
  const data = demoData()
  data.current.rows.push({
    id: 20,
    path: "/projects/cell-safe/",
    title: "cell-safe",
    count: 2,
    event: false,
  })
  data.current.rows.push({ id: 21, path: "other-event", title: "other", count: 100, event: true })
  data.previous.rows.push({
    id: 22,
    path: "/projects/old",
    title: "Old project",
    count: 8,
    event: false,
  })
  data.current.sources.push({ name: "https://prajwal.is-a.dev/projects/", count: 100 })
  const report = buildReport({ periods, ...data })
  assert.equal(report.metrics.pageVisits.current, 137)
  assert.equal(report.metrics.trackedClicks.current, 18)
  assert.equal(report.metrics.resumeClicks.current, 9)
  assert.equal(report.metrics.nfcArrivals.current, 12)
  assert.equal(report.projects.find((row) => row.key === "/projects/cell-safe").current, 26)
  assert.equal(report.projects.find((row) => row.key === "/projects/old").current, 0)
  assert.equal(
    report.sources.some((row) => row.key.startsWith("https://prajwal.is-a.dev")),
    false,
  )
  assert.match(report.warnings.join(" "), /100 other event counts/)
  assert.equal(report.metrics.trackedClicks.percent, null)
  assert.equal(comparison(30, 20).percent, 50)
  assert.equal(comparison(1, 0).percent, null)
})

test("tracking rollout and empty samples do not produce misleading percentages or recommendations", () => {
  const rollout = reportingPeriods({ month: "2026-10", now: new Date("2026-11-15") })
  const report = buildReport({ periods: rollout, ...demoData() })
  assert.equal(report.metrics.trackedClicks.comparable, false)
  assert.equal(report.metrics.pageVisits.comparable, false)
  assert.equal(report.metrics.pageVisits.percent, null)
  assert.match(report.recommendation, /Collect two complete periods/)
  const empty = buildReport({
    periods,
    current: { rows: [], sources: [] },
    previous: { rows: [], sources: [] },
  })
  assert.equal(empty.metrics.pageVisits.current, 0)
  assert.ok(empty.warnings.some((warning) => warning.includes("Small sample")))
  assert.match(renderHtml(empty), /No recorded activity/)
  assert.doesNotMatch(renderMarkdown(empty), /Infinity|NaN/)
})

test("reports escape untrusted titles and labels and identify demonstration data", () => {
  const data = demoData()
  data.current.rows[1].title = '<script>alert("x")</script>'
  data.current.sources[0].name = '<img src=x onerror="alert(1)">'
  const report = buildReport({ periods, ...data, demo: true })
  const html = renderHtml(report)
  assert.doesNotMatch(html, /<script>|<img src=x/)
  assert.match(html, /&lt;script&gt;/)
  assert.match(html, /DEMO DATA/)
  assert.match(html, /Content-Security-Policy/)
  assert.doesNotMatch(html, /<script|<link|<iframe/)
  assert.match(renderMarkdown(report), /DEMO DATA/)
})

test("CLI produces three local demo formats and refuses to write into published content", async () => {
  const privateRoot = fileURLToPath(new URL("../private/", import.meta.url))
  await fs.mkdir(privateRoot, { recursive: true })
  const directory = await fs.mkdtemp(path.join(privateRoot, "portfolio-pulse-test-"))
  const script = fileURLToPath(new URL("./portfolio-pulse.mjs", import.meta.url))
  try {
    const result = spawnSync(process.execPath, [script, "--demo", "--days", "30"], {
      cwd: directory,
      encoding: "utf8",
    })
    assert.equal(result.status, 0, result.stderr)
    const files = await fs.readdir(path.join(directory, "private/portfolio-pulse"))
    assert.deepEqual(files.map((name) => path.extname(name)).sort(), [".html", ".json", ".md"])
    const report = JSON.parse(
      await fs.readFile(
        path.join(
          directory,
          "private/portfolio-pulse",
          files.find((name) => name.endsWith(".json")),
        ),
        "utf8",
      ),
    )
    assert.equal(report.demo, true)
    const rejected = spawnSync(process.execPath, [script, "--demo", "--out", "content/reports"], {
      cwd: directory,
      encoding: "utf8",
    })
    assert.equal(rejected.status, 1)
    assert.match(rejected.stderr, /outside public/)
    const missing = spawnSync(process.execPath, [script], {
      cwd: directory,
      encoding: "utf8",
      env: { ...process.env, GOATCOUNTER_API_TOKEN: "" },
    })
    assert.equal(missing.status, 1)
    assert.match(missing.stderr, /GOATCOUNTER_API_TOKEN/)
  } finally {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(privateRoot))
    assert.ok(path.basename(directory).startsWith("portfolio-pulse-test-"))
    await fs.rm(directory, { recursive: true, force: true })
  }
})
