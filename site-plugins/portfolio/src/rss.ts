import fs from "node:fs/promises"
import path from "node:path"
import type { FilePath, QuartzEmitterPlugin } from "@quartz-community/types"

const SECTIONS = ["projects", "hackathons", "awards"] as const
const RSS_LIMIT = 20

type DateBucket = {
  created?: Date
  modified?: Date
  published?: Date
}

type EntryData = {
  slug?: string
  description?: string
  defaultDateType?: keyof DateBucket
  dates?: DateBucket
  frontmatter?: {
    title?: string
    description?: string
  }
}

function escapeHTML(unsafe: string) {
  return unsafe
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function isPortfolioEntry(slug: string) {
  return SECTIONS.some(
    (section) => slug.startsWith(`${section}/`) && !slug.endsWith("/index"),
  )
}

function entryDate(data: EntryData): Date | undefined {
  const dates = data.dates
  if (!dates) return undefined
  const preferred = data.defaultDateType ?? "modified"
  return dates[preferred] ?? dates.modified ?? dates.published ?? dates.created
}

function joinUrl(base: string, slug: string) {
  return `https://${[base.replace(/\/+$/, ""), slug.replace(/^\/+/, "")]
    .filter(Boolean)
    .join("/")}`
}

/**
 * RSS feed of portfolio entries only (projects / hackathons / awards).
 * Replaces Quartz ContentIndex RSS, which ranked empty tag pages first.
 */
export default (() => {
  const PortfolioRss: ReturnType<QuartzEmitterPlugin> = {
    name: "PortfolioRss",
    getQuartzComponents() {
      return []
    },
    async emit(ctx, content) {
      const cfg = ctx.cfg.configuration
      const base = cfg.baseUrl ?? ""
      const pageTitle = cfg.pageTitle ?? "Portfolio"

      const items = content
        .map(([, file]) => file.data as EntryData)
        .filter((data) => typeof data.slug === "string" && isPortfolioEntry(data.slug))
        .map((data) => ({
          slug: data.slug as string,
          title: data.frontmatter?.title?.trim() || (data.slug as string),
          description: (
            data.description ||
            data.frontmatter?.description ||
            ""
          ).trim(),
          date: entryDate(data),
        }))
        .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0))
        .slice(0, RSS_LIMIT)

      const xmlItems = items
        .map((item) => {
          const url = joinUrl(base, item.slug)
          return `<item>
    <title>${escapeHTML(item.title)}</title>
    <link>${url}</link>
    <guid>${url}</guid>
    <description><![CDATA[ ${item.description} ]]></description>
    ${item.date ? `<pubDate>${item.date.toUTCString()}</pubDate>` : ""}
  </item>`
        })
        .join("")

      const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>${escapeHTML(pageTitle)}</title>
    <link>${joinUrl(base, "")}</link>
    <description>Recent projects, hackathons, and awards on ${escapeHTML(pageTitle)}</description>
    <generator>Quartz -- prajwal.is-a.dev</generator>
    ${xmlItems}
  </channel>
</rss>
`

      const outPath = path.join(ctx.argv.output, "index.xml")
      await fs.mkdir(path.dirname(outPath), { recursive: true })
      await fs.writeFile(outPath, xml, "utf8")
      return [outPath as FilePath]
    },
  }

  return PortfolioRss
}) satisfies QuartzEmitterPlugin
