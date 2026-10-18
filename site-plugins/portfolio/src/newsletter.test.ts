import assert from "node:assert/strict"
import { test } from "node:test"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import type { BuildCtx } from "@quartz-community/types"
import { createNewsletterEmitter, fallbackNewsletterFeed } from "./newsletter"

function context(output: string): BuildCtx {
  return { argv: { output } } as BuildCtx
}

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
