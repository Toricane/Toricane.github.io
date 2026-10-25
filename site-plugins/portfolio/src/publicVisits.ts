import type { QuartzTransformerPlugin } from "@quartz-community/types"
// @ts-expect-error - shared Node.js report/client module; bundled into the build-side plugin.
import { createClient, reportingPeriods } from "../../../scripts/portfolio-pulse.mjs"

export type PublicVisits = { count: number; month: string }
type VisitSnapshot = { summary: PublicVisits; pages: Record<string, number> }
type Options = { token?: string; fetch?: typeof fetch; now?: Date; loadLocalEnv?: boolean }

/** Build-side snapshot only; attach individual aggregates, never this full map, to page data. */
async function loadVisitSnapshot(options: Options = {}): Promise<VisitSnapshot | undefined> {
  let token = options.token ?? process.env.GOATCOUNTER_API_TOKEN
  if (!token && options.loadLocalEnv !== false) {
    try {
      process.loadEnvFile(".env.pulse")
    } catch {
      /* No local key is required to build the site. */
    }
    token = process.env.GOATCOUNTER_API_TOKEN
  }
  if (!token) return undefined
  try {
    const period = reportingPeriods({ now: options.now }).current as { start: string; end: string }
    const client = createClient({ token, fetchImpl: options.fetch })
    const { total, pages } = (await client.pageCounts(period)) as {
      total: number
      pages: Record<string, number>
    }
    return { summary: { count: total, month: period.start.slice(0, 7) }, pages }
  } catch {
    console.warn("[PortfolioPublicVisits] Count unavailable; omitting the public counter.")
    return undefined
  }
}

export async function loadPublicVisits(options: Options = {}): Promise<PublicVisits | undefined> {
  return (await loadVisitSnapshot(options))?.summary
}

export function publicVisitsLabel(
  stats?: PublicVisits,
  scope: "site" | "entry" = "site",
): string | undefined {
  if (
    !stats ||
    !Number.isSafeInteger(stats.count) ||
    stats.count < 0 ||
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(stats.month)
  )
    return undefined
  const month = new Intl.DateTimeFormat("en", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${stats.month}-01T00:00:00Z`))
  return `${stats.count.toLocaleString("en")} ${scope === "entry" ? "visit" : "page visit"}${stats.count === 1 ? "" : "s"} in ${month}`
}

export function createPublicVisitsPlugin(
  options: Options = {},
): ReturnType<QuartzTransformerPlugin> {
  let request: Promise<VisitSnapshot | undefined> | undefined
  return {
    name: "PortfolioPublicVisits",
    htmlPlugins: () => [
      () => async (_tree, file) => {
        const slug = String(file.data.slug ?? "")
        const entry = /^(projects|awards)\/[^/]+$/.test(slug) && !slug.endsWith("/index")
        const collection = /^(projects|awards)\/index$/.test(slug)
        if (slug !== "index" && !entry && !collection) return
        const snapshot = await (request ??= loadVisitSnapshot(options))
        if (slug === "index") file.data.portfolioPublicVisits = snapshot?.summary
        if (entry || collection) {
          const key = entry ? "portfolioEntryVisits" : "portfolioCollectionVisits"
          if (!snapshot) {
            file.data[key] = undefined
            return
          }
          const aliases = [
            ...(Array.isArray(file.data.aliases) ? file.data.aliases : []),
            ...(Array.isArray(file.data.frontmatter?.aliases) ? file.data.frontmatter.aliases : []),
          ].filter((alias): alias is string => typeof alias === "string")
          const paths = new Set([
            `/${slug}`,
            ...(collection ? [`/${slug.replace(/\/index$/, "")}`] : []),
            ...aliases.map((alias) => {
              const base = alias.startsWith(".")
                ? `${slug.substring(0, slug.lastIndexOf("/") + 1)}`
                : ""
              const url = new URL(`${base}${alias}`, "https://prajwal.is-a.dev/")
              return url.origin === "https://prajwal.is-a.dev"
                ? url.pathname.replace(/\.html$/, "").replace(/\/+$/, "")
                : ""
            }),
          ])
          file.data[key] = {
            count: [...paths].reduce((total, path) => total + (snapshot.pages[path] ?? 0), 0),
            month: snapshot.summary.month,
          }
        }
      },
    ],
  }
}
