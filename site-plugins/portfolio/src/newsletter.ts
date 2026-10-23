import fs from "node:fs/promises"
import path from "node:path"
import type {
  FilePath,
  QuartzEmitterPlugin,
  QuartzTransformerPlugin,
} from "@quartz-community/types"
import { newsletterFallback } from "./newsletterFallback"

const FEED_URL = "https://prajwalprashanth.substack.com/feed"

export type NewsletterPost = {
  title: string
  link: string
  pubDate: string
  description: string
  thumbnail: string
}

function decodeXml(value: string): string {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (entity, key: string) => {
    const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" }
    if (!key.startsWith("#")) return named[key.toLowerCase()] ?? entity
    const point = key[1].toLowerCase() === "x" ? parseInt(key.slice(2), 16) : Number(key.slice(1))
    return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : ""
  })
}

function field(item: string, name: string): string {
  const value = item.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"))?.[1] ?? ""
  return decodeXml(value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim())
}

function publicUrl(value: string): string {
  try {
    const url = new URL(value)
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : ""
  } catch {
    return ""
  }
}

/** Read a bounded preview from RSS; never send the full feed to the browser. */
export function latestNewsletterPost(xml: string): NewsletterPost | undefined {
  const posts: NewsletterPost[] = []
  for (const [, item] of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)) {
    const title = field(item, "title")
    const link = publicUrl(field(item, "link"))
    const pubDate = field(item, "pubDate")
    if (!title || !link || !Number.isFinite(Date.parse(pubDate))) continue
    const plain = decodeXml(field(item, "description").replace(/<[^>]*>/g, " "))
      .replace(/\s+/g, " ")
      .trim()
    const description =
      plain.length > 300 ? `${plain.slice(0, 300).replace(/\s+\S*$/, "")}…` : plain
    const thumbnail = publicUrl(
      decodeXml(item.match(/<enclosure\b[^>]*\burl=["']([^"']+)["']/i)?.[1] ?? ""),
    )
    posts.push({ title, link, pubDate, description, thumbnail })
  }
  return posts.sort((a, b) => Date.parse(b.pubDate) - Date.parse(a.pubDate))[0]
}

export function isRecentNewsletter(post: NewsletterPost, now = new Date()): boolean {
  const cutoff = new Date(now)
  cutoff.setUTCDate(1)
  cutoff.setUTCMonth(cutoff.getUTCMonth() - 4)
  const lastDay = new Date(
    Date.UTC(cutoff.getUTCFullYear(), cutoff.getUTCMonth() + 1, 0),
  ).getUTCDate()
  cutoff.setUTCDate(Math.min(now.getUTCDate(), lastDay))
  const published = Date.parse(post.pubDate)
  return published >= cutoff.getTime() && published <= now.getTime()
}

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
  return (
    /<rss\b/.test(xml) &&
    /<\/rss>/.test(xml) &&
    !/<!DOCTYPE/i.test(xml) &&
    Boolean(latestNewsletterPost(xml))
  )
}

type NewsletterOptions = {
  fetch?: typeof fetch
  cachePath?: string
  loadFeed?: () => Promise<string>
}

function createNewsletterFeedLoader(options: NewsletterOptions = {}) {
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
  return () => (request ??= loadFeed())
}

/** Publish Substack's feed on this origin; visitors need no third-party RSS proxy. */
export function createNewsletterEmitter(
  options: NewsletterOptions = {},
): ReturnType<QuartzEmitterPlugin> {
  const loadFeed = options.loadFeed ?? createNewsletterFeedLoader(options)
  return {
    name: "PortfolioNewsletter",
    getQuartzComponents: () => [],
    async emit(ctx) {
      const destination = path.join(ctx.argv.output, "newsletter.xml")
      await fs.mkdir(path.dirname(destination), { recursive: true })
      await fs.writeFile(destination, await loadFeed(), "utf8")
      return [destination as FilePath]
    },
  }
}

/** One resolved feed for SSR, Markdown and the public RSS endpoint, including offline builds. */
export function createNewsletterPlugins(options: NewsletterOptions = {}) {
  const loadFeed = createNewsletterFeedLoader(options)
  const transformer: ReturnType<QuartzTransformerPlugin> = {
    name: "PortfolioNewsletterData",
    htmlPlugins: () => [
      () => async (_tree, file) => {
        if (file.data.slug === "index")
          file.data.portfolioNewsletter = latestNewsletterPost(await loadFeed())
      },
    ],
  }
  return { transformer, emitter: createNewsletterEmitter({ loadFeed }) }
}

export default (() => createNewsletterEmitter()) satisfies QuartzEmitterPlugin
