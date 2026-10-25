import assert from "node:assert/strict"
import { test } from "node:test"
import { createPublicVisitsPlugin, loadPublicVisits, publicVisitsLabel } from "./publicVisits"

const now = new Date("2026-11-15T12:00:00Z")
const response = (hits: unknown[]) =>
  new Response(JSON.stringify({ hits, more: false }), { status: 200 })

test("public count includes page paths only and exposes no credentials or detailed analytics", async () => {
  const requests: URL[] = []
  const stats = await loadPublicVisits({
    token: "private-test-token",
    now,
    loadLocalEnv: false,
    fetch: async (url, options) => {
      requests.push(new URL(String(url)))
      assert.equal(
        (options?.headers as Record<string, string>).Authorization,
        "Bearer private-test-token",
      )
      return response([
        { path_id: 1, path: "/", title: "Portfolio", count: 20, event: false },
        { path_id: 2, path: "/projects/demo", title: "Demo", count: 8, event: false },
        { path_id: 3, path: "click-email:home:/", title: "Email", count: 99, event: true },
      ])
    },
  })
  assert.deepEqual(stats, { count: 28, month: "2026-10" })
  assert.equal(requests.length, 1)
  assert.equal(requests[0].pathname, "/api/v0/stats/hits")
  assert.equal(requests[0].searchParams.get("end"), "2026-10-31T23:00:00.000Z")
  assert.doesNotMatch(JSON.stringify(stats), /private-test-token|email|projects/)
})

test("missing keys and failed requests omit the counter instead of inventing a number", async () => {
  assert.equal(await loadPublicVisits({ token: "", loadLocalEnv: false }), undefined)
  assert.equal(
    await loadPublicVisits({
      token: "test",
      loadLocalEnv: false,
      fetch: async () => new Response("denied", { status: 401 }),
    }),
    undefined,
  )
  assert.equal(publicVisitsLabel(), undefined)
  assert.equal(publicVisitsLabel({ count: -1, month: "2026-10" }), undefined)
  assert.equal(publicVisitsLabel({ count: 4, month: "2026-13" }), undefined)
  assert.equal(publicVisitsLabel({ count: 0, month: "2026-10" }), "0 page visits in Oct 2026")
  assert.equal(
    publicVisitsLabel({ count: 1234, month: "2026-10" }),
    "1,234 page visits in Oct 2026",
  )
})

test("home, entry, and collection counts share one fetch", async () => {
  let calls = 0
  const plugin = createPublicVisitsPlugin({
    token: "test",
    now,
    loadLocalEnv: false,
    fetch: async () => {
      calls++
      return response([
        { path_id: 1, path: "/projects/demo", title: "Demo", count: 8, event: false },
        { path_id: 2, path: "/projects/demo/", title: "Demo", count: 2, event: false },
        { path_id: 3, path: "/hackathons/demo", title: "Legacy demo", count: 3, event: false },
        { path_id: 4, path: "/projects/demo.html", title: "Demo", count: 1, event: false },
        { path_id: 5, path: "/old-demo", title: "Old demo", count: 4, event: false },
        {
          path_id: 6,
          path: "click-email:modal:/projects/demo",
          title: "Email",
          count: 99,
          event: true,
        },
        { path_id: 7, path: "/projects", title: "Projects", count: 12, event: false },
        { path_id: 8, path: "/projects/", title: "Projects", count: 2, event: false },
        { path_id: 9, path: "/projects/index.html", title: "Projects", count: 3, event: false },
        { path_id: 10, path: "/awards/", title: "Awards", count: 4, event: false },
      ])
    },
  })
  const factory = plugin.htmlPlugins!({} as never)[0] as () => (
    tree: unknown,
    file: any,
  ) => Promise<void>
  const transform = factory()
  await transform({}, { data: { slug: "tags/demo" } })
  assert.equal(calls, 0)
  const entry: any = {
    data: {
      slug: "projects/demo",
      aliases: ["hackathons/demo", "projects/demo/"],
      frontmatter: { aliases: ["old-demo"] },
    },
  }
  await transform({}, entry)
  assert.deepEqual(entry.data.portfolioEntryVisits, { count: 18, month: "2026-10" })
  const home: any = { data: { slug: "index" } }
  await transform({}, home)
  await transform({}, home)
  assert.equal(calls, 1)
  assert.deepEqual(home.data.portfolioPublicVisits, { count: 39, month: "2026-10" })
  const award: any = { data: { slug: "awards/new" } }
  await transform({}, award)
  assert.deepEqual(award.data.portfolioEntryVisits, { count: 0, month: "2026-10" })
  assert.equal(calls, 1)
  assert.equal(publicVisitsLabel(entry.data.portfolioEntryVisits, "entry"), "18 visits in Oct 2026")
  assert.equal(publicVisitsLabel({ count: 1, month: "2026-10" }, "entry"), "1 visit in Oct 2026")
  assert.equal(publicVisitsLabel({ count: 1, month: "2026-10" }), "1 page visit in Oct 2026")
  assert.equal("pages" in home.data.portfolioPublicVisits, false)
  const projects: any = { data: { slug: "projects/index" } }
  const awards: any = { data: { slug: "awards/index" } }
  await transform({}, projects)
  await transform({}, awards)
  assert.deepEqual(projects.data.portfolioCollectionVisits, { count: 17, month: "2026-10" })
  assert.deepEqual(awards.data.portfolioCollectionVisits, { count: 4, month: "2026-10" })
  assert.equal(calls, 1)
})

test("an unavailable snapshot removes an old entry counter rather than showing zero", async () => {
  const plugin = createPublicVisitsPlugin({ token: "", loadLocalEnv: false })
  const factory = plugin.htmlPlugins!({} as never)[0] as () => (
    tree: unknown,
    file: any,
  ) => Promise<void>
  const entry: any = {
    data: { slug: "projects/demo", portfolioEntryVisits: { count: 8, month: "2026-10" } },
  }
  await factory()({}, entry)
  assert.equal(entry.data.portfolioEntryVisits, undefined)
})
