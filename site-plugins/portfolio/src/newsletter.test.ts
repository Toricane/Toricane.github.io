import assert from "node:assert/strict"
import { test } from "node:test"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import type { BuildCtx } from "@quartz-community/types"
import {
  createNewsletterEmitter,
  createNewsletterPlugins,
  fallbackNewsletterFeed,
  isRecentNewsletter,
  latestNewsletterPost,
} from "./newsletter"

function context(output: string): BuildCtx {
  return { argv: { output } } as BuildCtx
}

test("freshness uses four calendar months, including month ends and future dates", () => {
  const post = latestNewsletterPost(fallbackNewsletterFeed())!
  const now = new Date("2026-10-31T12:00:00Z")
  assert.equal(isRecentNewsletter({ ...post, pubDate: "2026-06-30T12:00:00Z" }, now), true)
  assert.equal(isRecentNewsletter({ ...post, pubDate: "2026-06-30T11:59:59Z" }, now), false)
  assert.equal(isRecentNewsletter({ ...post, pubDate: "2026-11-01T00:00:00Z" }, now), false)
  assert.equal(isRecentNewsletter(post, now), false)
})

test("parses the newest valid RSS item, decodes text, and rejects unsafe links", () => {
  const older = fallbackNewsletterFeed().match(/<item>([\s\S]*?)<\/item>/)![0]
  const xml = `<rss><channel>${older}<item><title><![CDATA[Notes &amp; builds]]></title><link>https://example.com/new</link><pubDate>2026-10-20</pubDate><description><![CDATA[<p>Hardware &amp; software.</p>]]></description></item><item><title>Invalid</title><link>javascript:alert(1)</link><pubDate>2026-10-21</pubDate></item></channel></rss>`
  assert.deepEqual(latestNewsletterPost(xml), {
    title: "Notes & builds",
    link: "https://example.com/new",
    pubDate: "2026-10-20",
    description: "Hardware & software.",
    thumbnail: "",
  })
})

test("SSR and the RSS endpoint share one verified fetch, including a fresh offline cache", async () => {
  await workspace(async (directory) => {
    const cachePath = path.join(directory, "cached.xml")
    const xml = fallbackNewsletterFeed().replace(
      "Sun, 21 Sep 2025 22:24:05 GMT",
      "Tue, 20 Oct 2026 12:00:00 GMT",
    )
    await fs.writeFile(cachePath, xml)
    let requests = 0
    const plugins = createNewsletterPlugins({
      cachePath,
      fetch: (async () => {
        requests++
        throw new Error("Offline")
      }) as typeof fetch,
    })
    const file = { data: { slug: "index" } } as {
      data: { slug: string; portfolioNewsletter?: ReturnType<typeof latestNewsletterPost> }
    }
    const factory = plugins.transformer.htmlPlugins!(context(directory))[0] as unknown as () => (
      tree: unknown,
      file: unknown,
    ) => Promise<void>
    await factory()({ type: "root", children: [] }, file)
    assert.equal(file.data.portfolioNewsletter?.title, "Summer 2025")
    assert.equal(
      isRecentNewsletter(file.data.portfolioNewsletter!, new Date("2026-10-23T12:00:00Z")),
      true,
    )
    await plugins.emitter.emit(context(directory), [], { css: [], js: [], additionalHead: [] })
    assert.equal(requests, 1)
    assert.equal(await fs.readFile(path.join(directory, "newsletter.xml"), "utf8"), xml)
  })
})

async function workspace(run: (directory: string) => Promise<void>) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "portfolio-newsletter-"))
  try {
    await run(directory)
  } finally {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()))
    await fs.rm(directory, { recursive: true, force: true })
  }
}

test("publishes the direct RSS feed and shares requests across incremental emits", async () => {
  await workspace(async (directory) => {
    const xml = fallbackNewsletterFeed()
    let calls = 0
    const emitter = createNewsletterEmitter({
      cachePath: path.join(directory, "cache.xml"),
      fetch: (async (url, options) => {
        assert.equal(url, "https://prajwalprashanth.substack.com/feed")
        assert.ok(options?.signal)
        calls++
        return new Response(xml)
      }) as typeof fetch,
    })
    const first = path.join(directory, "first")
    const second = path.join(directory, "second")
    await emitter.emit(context(first), [], { css: [], js: [], additionalHead: [] })
    await emitter.emit(context(second), [], { css: [], js: [], additionalHead: [] })
    assert.equal(calls, 1)
    assert.equal(await fs.readFile(path.join(first, "newsletter.xml"), "utf8"), xml)
    assert.equal(await fs.readFile(path.join(second, "newsletter.xml"), "utf8"), xml)
    assert.equal(await fs.readFile(path.join(directory, "cache.xml"), "utf8"), xml)
  })
})

test("preserves the last good feed when the upstream request fails", async () => {
  await workspace(async (directory) => {
    const cachePath = path.join(directory, "cache.xml")
    const cached = fallbackNewsletterFeed().replace("Summer 2025", "Cached post")
    await fs.writeFile(cachePath, cached)
    const emitter = createNewsletterEmitter({
      cachePath,
      fetch: (async () => new Response("Unavailable", { status: 500 })) as typeof fetch,
    })
    await emitter.emit(context(directory), [], { css: [], js: [], additionalHead: [] })
    assert.equal(await fs.readFile(path.join(directory, "newsletter.xml"), "utf8"), cached)
  })
})

test("a fresh offline build and malformed feeds still publish the verified post", async () => {
  await workspace(async (directory) => {
    for (const body of ["<html>Service unavailable</html>", "<rss><channel></channel></rss>"]) {
      const emitter = createNewsletterEmitter({
        cachePath: path.join(directory, "missing.xml"),
        fetch: (async () => new Response(body)) as typeof fetch,
      })
      await emitter.emit(context(directory), [], { css: [], js: [], additionalHead: [] })
      const xml = await fs.readFile(path.join(directory, "newsletter.xml"), "utf8")
      assert.equal(xml, fallbackNewsletterFeed())
      assert.match(xml, /Summer 2025/)
      assert.match(xml, /<enclosure url="https:/)
    }
    const emitter = createNewsletterEmitter({
      cachePath: path.join(directory, "missing.xml"),
      fetch: (async () => {
        throw new Error("Network unavailable")
      }) as typeof fetch,
    })
    await emitter.emit(context(directory), [], { css: [], js: [], additionalHead: [] })
    assert.equal(
      await fs.readFile(path.join(directory, "newsletter.xml"), "utf8"),
      fallbackNewsletterFeed(),
    )
  })
})

test("cache write failures do not discard a successful feed", async () => {
  await workspace(async (directory) => {
    const xml = fallbackNewsletterFeed().replace("Summer 2025", "Fresh post")
    const emitter = createNewsletterEmitter({
      cachePath: directory, // A directory cannot be overwritten as a file.
      fetch: (async () => new Response(xml)) as typeof fetch,
    })
    await emitter.emit(context(directory), [], { css: [], js: [], additionalHead: [] })
    assert.equal(await fs.readFile(path.join(directory, "newsletter.xml"), "utf8"), xml)
  })
})
