import fs from "node:fs/promises"
import path from "node:path"
import type { FilePath, QuartzEmitterPlugin } from "@quartz-community/types"
import { newsletterFallback } from "./newsletterFallback"

const FEED_URL = "https://prajwalprashanth.substack.com/feed"

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

export function fallbackNewsletterFeed(): string {
  const post = newsletterFallback
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><item>
    <title>${escapeXml(post.title)}</title><link>${escapeXml(post.link)}</link>
    <pubDate>${escapeXml(post.pubDate)}</pubDate><description>${escapeXml(post.description)}</description>
    <enclosure url="${escapeXml(post.thumbnail)}" type="image/jpeg" />
  </item></channel></rss>`
}

function validFeed(xml: string): boolean {
  return /<rss\b/.test(xml) && /<item\b/.test(xml) && /<\/rss>/.test(xml) && !/<!DOCTYPE/i.test(xml)
}

/** Publish Substack's feed on this origin; visitors need no third-party RSS proxy. */
export function createNewsletterEmitter(
  options: {
    fetch?: typeof fetch
    cachePath?: string
  } = {},
): ReturnType<QuartzEmitterPlugin> {
  const cachePath = options.cachePath ?? path.join(process.cwd(), ".quartz-cache", "newsletter.xml")
  let request: Promise<string> | undefined
  async function loadFeed() {
    try {
      const response = await (options.fetch ?? fetch)(FEED_URL, {
        signal: AbortSignal.timeout(10_000),
      })
      if (!response.ok) throw new Error(`Substack returned HTTP ${response.status}`)
      const xml = await response.text()
      if (!validFeed(xml)) throw new Error("Substack returned an invalid or empty feed")
      // A read-only cache must not prevent publishing a successfully fetched feed.
      try {
        await fs.mkdir(path.dirname(cachePath), { recursive: true })
        await fs.writeFile(cachePath, xml, "utf8")
      } catch {
        /* The verified snapshot remains available on the next build. */
      }
      return xml
    } catch (error) {
      console.warn(`[PortfolioNewsletter] ${String(error)}; using the last verified feed.`)
      try {
        const cached = await fs.readFile(cachePath, "utf8")
        if (validFeed(cached)) return cached
      } catch {
        /* Fresh builds use the checked-in verified post below. */
      }
      return fallbackNewsletterFeed()
    }
  }
  return {
    name: "PortfolioNewsletter",
    getQuartzComponents: () => [],
    async emit(ctx) {
      request ??= loadFeed()
      const destination = path.join(ctx.argv.output, "newsletter.xml")
      await fs.mkdir(path.dirname(destination), { recursive: true })
      await fs.writeFile(destination, await request, "utf8")
      return [destination as FilePath]
    },
  }
}

export default (() => createNewsletterEmitter()) satisfies QuartzEmitterPlugin
