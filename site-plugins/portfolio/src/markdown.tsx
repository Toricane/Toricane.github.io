import fs from "node:fs/promises"
import path from "node:path"
import { unified } from "unified"
import remarkParse from "remark-parse"
import remarkGfm from "remark-gfm"
import { toMarkdown } from "mdast-util-to-markdown"
import { gfmToMarkdown } from "mdast-util-gfm"
import type { Root, RootContent } from "mdast"
import type {
  BuildCtx,
  FilePath,
  ProcessedContent,
  QuartzEmitterPlugin,
} from "@quartz-community/types"
import { slugifyFilePath, slugTag } from "@quartz-community/utils/path"
import { hideContentDebt } from "./contentDebt"

type Page = {
  slug?: string
  filePath?: string
  aliases?: string[]
  unlisted?: boolean
  frontmatter?: Record<string, unknown> & {
    title?: string
    description?: string
    tags?: string[]
    photos?: { src: string; caption?: string; link?: string }[]
  }
}

// Served by the separate resume project, not emitted or fetched by this build.
export const RESUME_HREF = "/resume/resume.md"

function withMenu(markdown: string): string {
  return `${markdown.trim()}\n\n## Menu\n\n[Home](/index.md) · [Projects](/projects.md) · [Awards](/awards.md) · [Resume](${RESUME_HREF})\n`
}

/** Canonical agent endpoint: strip a directory slash/index and append .md. */
export function markdownPath(slug: string): string {
  const clean = slug.replace(/^\/+|\/+$/g, "").replace(/(?:^|\/)index$/, "")
  return `/${clean || "index"}.md`
}

function pagePath(slug: string): string {
  return slug === "index" ? "/" : `/${slug.replace(/\/index$/, "/")}`
}

/** Include named index and HTML forms; never emit a bare .md filename. */
export function markdownPaths(slug: string): string[] {
  const full = slug.replace(/^\/+|\/+$/g, "") || "index"
  return [
    ...new Set([
      markdownPath(slug),
      `/${full}.md`,
      `/${full}.html.md`,
      `${markdownPath(slug).slice(0, -3)}.html.md`,
    ]),
  ]
}

function aliasSlug(page: Page, alias: string): string {
  const original = page.slug === "index" ? "" : String(page.slug).replace(/\/index$/, "/")
  return alias.startsWith(".")
    ? path.posix.normalize(path.posix.join(original, "..", alias))
    : alias.replace(/^\/+/, "")
}

function title(page: Page): string {
  return String(page.frontmatter?.title ?? page.slug)
}

function escapeLabel(text: string): string {
  return text
    .replace(/[\\[\]_*`<>]/g, "\\$&")
    .replace(/\s+/g, " ")
    .trim()
}

function sourceDateText(value: unknown): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? "")
}

function dateText(value: unknown): string {
  const text = sourceDateText(value)
  const month = text.match(/^(\d{4})[-/](\d{2})(?:-\d{2})?$/)
  return month ? `${month[1]}-${month[2]}` : text
}

function facts(page: Page): string {
  const fm = page.frontmatter ?? {}
  const rows: string[] = []
  for (const [key, label] of [
    ["from", "From"],
    ["when", "When"],
    ["date", "Started"],
    ["modified", "Ended"],
    ["significance", "Significance"],
    ["role", "Role"],
    ["outcome", "Outcome"],
  ]) {
    if (fm[key])
      rows.push(
        `- ${label}: ${escapeLabel(["when", "date", "modified"].includes(key) ? dateText(fm[key]) : String(fm[key]))}`,
      )
  }
  if (fm.date && !fm.modified) rows.push("- Status: Ongoing")
  if (Array.isArray(fm.tags) && fm.tags.length)
    rows.push(`- Tags: ${fm.tags.map(String).map(escapeLabel).join(", ")}`)
  for (const key of Object.keys(fm)
    .filter((key) => /^(pause|restart|node)\d*$/.test(key))
    .sort()) {
    rows.push(`- ${key}: ${escapeLabel(dateText(fm[key]))}`)
  }
  return rows.length ? `${rows.join("\n")}\n\n` : ""
}

function routeMap(pages: Page[]): Map<string, Page> {
  const routes = new Map<string, Page>()
  for (const page of pages) {
    for (const slug of [
      String(page.slug),
      ...(page.aliases ?? []).map((alias) => aliasSlug(page, alias)),
    ]) {
      routes.set(`/${slug}`, page)
      routes.set(pagePath(slug).replace(/\/$/, "") || "/", page)
    }
  }
  return routes
}

export function resolveMarkdownLink(
  url: string,
  slug: string,
  base: string,
  routes: Map<string, Page>,
): string {
  if (/^(?:mailto:|tel:|data:)/i.test(url)) return url
  const origin = new URL(base)
  const resolved = new URL(url, new URL(pagePath(slug), `${base}/`))
  if (resolved.origin === origin.origin) {
    let pathname = decodeURIComponent(resolved.pathname)
    const prefix = origin.pathname.replace(/\/$/, "")
    if (prefix && pathname.startsWith(`${prefix}/`)) pathname = pathname.slice(prefix.length)
    pathname = pathname.replace(/\.(?:html|md)$/, "").replace(/\/$/, "") || "/"
    const target =
      routes.get(pathname) ??
      routes.get(`/${slugifyFilePath(`${pathname.replace(/^\//, "")}.md` as FilePath)}`)
    if (target)
      return `${prefix}${markdownPath(String(target.slug))}${resolved.search}${resolved.hash}`
    return `${resolved.pathname}${resolved.search}${resolved.hash}`
  }
  return resolved.href
}

/** Serialize authored Markdown, preserving code and GFM rather than scraping HTML. */
export function cleanMarkdown(
  source: string,
  slug: string,
  base: string,
  routes: Map<string, Page>,
): string {
  const body = source
    .replace(/^\uFEFF/, "")
    .replace(/^---\s*\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)\s*(?:\r?\n|$)/, "")
  const tree = unified().use(remarkParse).use(remarkGfm).parse(body)
  function clean(node: Root | RootContent): void {
    if ("children" in node) {
      node.children = node.children.filter(
        (child) => child.type !== "html" || !/^\s*<!--[\s\S]*-->\s*$/.test(child.value),
      ) as typeof node.children
      for (const child of node.children) clean(child as RootContent)
    }
    if ("url" in node) node.url = resolveMarkdownLink(node.url, slug, base, routes)
    // Icon shortcodes are decorative; keep their adjacent readable labels.
    if (node.type === "text") node.value = node.value.replace(/(?<!\w):[a-z0-9-]+:(?=\s|$)/g, "")
  }
  clean(tree)
  hideContentDebt(tree)
  return toMarkdown(tree, { extensions: [gfmToMarkdown()] }).trim()
}

function listingMetadata(page: Page): string {
  const fm = page.frontmatter ?? {}
  const fields: string[] = []
  if (fm.when) fields.push(`When: ${dateText(fm.when)}`)
  else if (fm.date)
    fields.push(`Dates: ${dateText(fm.date)} – ${fm.modified ? dateText(fm.modified) : "ongoing"}`)
  if (fm.significance) fields.push(`Highlight: ${String(fm.significance)}`)
  if (fm.tags?.length) fields.push(`Tags: ${fm.tags.join(", ")}`)
  if (fm.from) fields.push(`From: ${String(fm.from)}`)
  return fields.length ? `\n  ${fields.map(escapeLabel).join(" · ")}` : ""
}

function searchableText(markdown: string): string {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown)
  const chunks: string[] = []
  function collect(node: Root | RootContent): void {
    if ("value" in node && node.type !== "html") chunks.push(node.value)
    if (node.type === "image" && node.alt) chunks.push(node.alt)
    if ("children" in node) for (const child of node.children) collect(child as RootContent)
  }
  collect(tree)
  return chunks.join(" ").replace(/\s+/g, " ").trim()
}

function listing(page: Page, pages: Page[]): string {
  const slug = String(page.slug)
  let entries: Page[] = []
  if (slug === "tags/index") {
    entries = pages.filter(
      (candidate) => String(candidate.slug).startsWith("tags/") && candidate.slug !== page.slug,
    )
  } else if (slug.startsWith("tags/")) {
    const tag = slug.slice(5).replace(/\/index$/, "")
    entries = pages.filter(
      (candidate) =>
        candidate.unlisted !== true &&
        candidate.frontmatter?.tags?.some((value: string) => {
          const normalized = slugTag(value)
          return normalized === tag || normalized.startsWith(`${tag}/`)
        }),
    )
  } else if (slug.endsWith("/index")) {
    const prefix = slug.slice(0, -5)
    entries = pages.filter(
      (candidate) =>
        candidate.unlisted !== true &&
        candidate.slug !== page.slug &&
        String(candidate.slug).startsWith(prefix),
    )
  }
  const rank: Record<string, number> = { spotlight: 0, featured: 1, standard: 2 }
  entries.sort((a, b) => {
    const significance =
      (rank[String(a.frontmatter?.significance)] ?? 2) -
      (rank[String(b.frontmatter?.significance)] ?? 2)
    const aDate = sourceDateText(
      a.frontmatter?.when ?? a.frontmatter?.modified ?? a.frontmatter?.date,
    )
    const bDate = sourceDateText(
      b.frontmatter?.when ?? b.frontmatter?.modified ?? b.frontmatter?.date,
    )
    return significance || bDate.localeCompare(aDate) || title(a).localeCompare(title(b))
  })
  return entries.length
    ? `## Pages\n\n${entries
        .map((entry) => {
          const description = entry.frontmatter?.description
          return `- [${escapeLabel(title(entry))}](${markdownPath(String(entry.slug))})${description ? `: ${escapeLabel(String(description))}` : ""}${listingMetadata(entry)}`
        })
        .join("\n")}\n\n`
    : ""
}

export async function markdownOutputs(
  ctx: BuildCtx,
  content: ProcessedContent[],
): Promise<Map<string, string>> {
  const base = `https://${ctx.cfg.configuration.baseUrl ?? "prajwal.is-a.dev"}`.replace(/\/$/, "")
  const pages = content.map(([, file]) => file.data as Page).filter((page) => page.slug)
  const routes = routeMap(pages)
  const outputs = new Map<string, string>()
  const owners = new Map<string, string>()
  function add(endpoint: string, value: string, owner: string): void {
    const filename = endpoint.replace(/^\//, "")
    if (filename.split("/").some((part) => part === "..") || path.posix.isAbsolute(filename))
      throw new Error(`Unsafe Markdown path: ${endpoint}`)
    const previous = owners.get(filename)
    if (previous && previous !== owner)
      throw new Error(`Markdown URL collision: ${endpoint} (${previous}, ${owner})`)
    owners.set(filename, owner)
    outputs.set(filename, value)
  }
  for (const [, file] of content) {
    const page = file.data as Page
    if (!page.slug) continue
    const slug = String(page.slug)
    const source = page.filePath ? await fs.readFile(page.filePath, "utf8") : ""
    const fm = page.frontmatter ?? {}
    const header = `# ${escapeLabel(title(page))}\n\n${fm.description ? `${escapeLabel(String(fm.description))}\n\n` : ""}`
    let value = `${header}Web page: ${pagePath(slug)}\n\n${facts(page)}${cleanMarkdown(source, slug, base, routes)}\n\n${listing(page, pages)}`
    if (Array.isArray(fm.photos)) {
      value += `## Photos\n\n${fm.photos
        .map(
          (photo: { src: string; caption?: string; link?: string }) =>
            `![${escapeLabel(photo.caption ?? "")}](${resolveMarkdownLink(photo.src, "index", base, routes)})${photo.link ? `\n\n[Related page](${resolveMarkdownLink(photo.link, slug, base, routes)})` : ""}`,
        )
        .join("\n\n")}\n`
    }
    value = withMenu(value)
    for (const target of [slug, ...(page.aliases ?? []).map((alias) => aliasSlug(page, alias))]) {
      for (const endpoint of markdownPaths(target)) add(endpoint, value, slug)
    }
  }
  // The dispatcher intentionally omits its generated error page from content.
  const error = `# Page not found\n\nThis page does not exist. Browse [Home](/index.md), [Projects](/projects.md), or [Awards](/awards.md).\n`
  for (const endpoint of markdownPaths("404")) add(endpoint, withMenu(error), "404")
  outputs.set(
    "search-index.json",
    JSON.stringify({
      version: 1,
      pages: pages
        .filter((page) => page.unlisted !== true)
        .map((page) => {
          const fm = page.frontmatter ?? {}
          const slug = String(page.slug)
          return {
            slug,
            url: pagePath(slug),
            markdownUrl: markdownPath(slug),
            title: title(page),
            description: fm.description ?? "",
            from: fm.from ?? "",
            tags: fm.tags ?? [],
            significance: fm.significance ?? null,
            when: fm.when ? dateText(fm.when) : null,
            date: fm.date ? dateText(fm.date) : null,
            modified: fm.modified ? dateText(fm.modified) : null,
            aliases: (page.aliases ?? []).map((alias) => pagePath(aliasSlug(page, alias))),
            content: searchableText(outputs.get(markdownPath(slug).slice(1)) ?? ""),
          }
        })
        .sort((a, b) => a.slug.localeCompare(b.slug)),
    }) + "\n",
  )
  outputs.set(
    "llms.txt",
    `# ${escapeLabel(ctx.cfg.configuration.pageTitle ?? "Portfolio")}

> Prajwal Prashanth is a UBC Engineering Physics student interested in AI, robotics, and quantum computing. This personal portfolio documents his projects, hackathon builds, awards, research, and leadership.

Every published page has a Markdown version: remove the trailing slash and append .md; use /index.md for home. Examples: / → /index.md; /projects/ → /projects.md; /projects/cell-safe → /projects/cell-safe.md. Named index paths and legacy aliases also work. Resolve root-relative links against this website's origin. Dates use YYYY-MM.

For search, fetch /search-index.json and search its pages locally by title, description, tags, affiliation (from), or content. Follow matching markdownUrl paths for details.

## Start here

- [About Prajwal](/index.md): Background, interests, and contact links.
- [Projects](/projects.md): Projects and hackathon builds, with dates, highlights, and tags.
- [Awards](/awards.md): Awards and accomplishments, with dates, highlights, and tags.
- [Resume](${RESUME_HREF}): Resume Markdown served by the separate resume project.
- [Search index](/search-index.json): Searchable text and metadata; schema version 1.
`,
  )
  return outputs
}

export function createMarkdownEmitter() {
  let previous = new Set<string>()
  return {
    name: "PortfolioMarkdown",
    externalResources(ctx) {
      const base = `https://${ctx.cfg.configuration.baseUrl ?? "prajwal.is-a.dev"}`.replace(
        /\/$/,
        "",
      )
      return {
        additionalHead: [
          (page: Page) => (
            <>
              <link
                rel="alternate"
                type="text/markdown"
                href={`${base}${markdownPath(String(page.slug ?? "index"))}`}
              />
              <link rel="describedby" type="text/plain" href={`${base}/llms.txt`} />
            </>
          ),
        ],
      }
    },
    async emit(ctx, content) {
      const outputs = await markdownOutputs(ctx, content)
      // Track this emitter's files only, so incremental deletions never remove assets.
      for (const filename of previous) {
        if (!outputs.has(filename))
          await fs.rm(path.join(ctx.argv.output, filename), { force: true })
      }
      const emitted: FilePath[] = []
      for (const [filename, value] of outputs) {
        const destination = path.join(ctx.argv.output, filename)
        await fs.mkdir(path.dirname(destination), { recursive: true })
        await fs.writeFile(destination, value, "utf8")
        emitted.push(destination as FilePath)
      }
      previous = new Set(outputs.keys())
      return emitted
    },
  } satisfies ReturnType<QuartzEmitterPlugin>
}

export default (() => createMarkdownEmitter()) satisfies QuartzEmitterPlugin
