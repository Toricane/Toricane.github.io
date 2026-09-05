import type {
  QuartzComponent,
  QuartzComponentConstructor,
  QuartzComponentProps,
} from "@quartz-community/types"
import { toJsxRuntime } from "hast-util-to-jsx-runtime"
import { Fragment, jsx, jsxs } from "preact/jsx-runtime"
import styles from "../styles/portfolio.scss"
// @ts-expect-error - compiled to a browser script string by tsup
import script from "../scripts/portfolio.inline.ts"
import fs from "node:fs"
import path from "node:path"
import type { GalleryImage } from "../galleryExtractor"
import { imageVariant } from "../imageVariant"
import { applyLinkIconsToHast, linkIconMapFromFilenames, type LinkIconMap } from "../linkIcons"
import { displayPeriod } from "../dates"
import { buildProjectTimeline, type PauseRestart } from "../projectTimeline"

type CoverPhoto = {
  src?: string
  caption?: string
  /** Optional entry path (e.g. /awards/class-valedictorian) or external URL. */
  link?: string
}

type VisibleSignificance = "impactful" | "notable"

type Frontmatter = {
  title?: string
  description?: string
  date?: string | Date
  modified?: string | Date
  tags?: string[]
  significance?: VisibleSignificance | "minor"
  from?: string
  role?: string
  outcome?: string
  when?: string
  /** Optional curated Git-style fork source (project slug without `projects/`). */
  parent?: string
  /** Optional series name; later entries branch from the previous in the series. */
  series?: string
  photos?: CoverPhoto[]
  groups?: Record<string, string>
}

type PortfolioFile = QuartzComponentProps["allFiles"][number]
type Section = (typeof sections)[number]

type TimelineGroup = {
  when: string
  summary: string
  items: PortfolioFile[]
}

const sections = ["projects", "hackathons", "awards"] as const
const RESUME_HREF = "https://prajwal.is-a.dev/resume/"

function sectionHref(section: Section) {
  return `/${section}/`
}

function ResumeLink({ children = "resume" }: { children?: string }) {
  return (
    <a href={RESUME_HREF} data-router-ignore>
      {children}
    </a>
  )
}

function primaryNavLinks(slug: string) {
  const active = sections.find((section) => slug.startsWith(section))
  return (
    <>
      {sections.map((section) => (
        <a href={sectionHref(section)} aria-current={active === section ? "page" : undefined}>
          {section}
        </a>
      ))}
      <ResumeLink />
    </>
  )
}

function frontmatter(file: PortfolioFile): Frontmatter {
  return (file.frontmatter ?? {}) as Frontmatter
}

/** Read `pause`/`restart`, `pause1`/`restart1`, … pairs from project frontmatter. */
function projectPauseRestarts(file: PortfolioFile): PauseRestart[] {
  const data = (file.frontmatter ?? {}) as Record<string, unknown>
  const buckets = new Map<number, { pause?: string | Date; restart?: string | Date }>()

  for (const [key, value] of Object.entries(data)) {
    if (typeof value !== "string" && !(value instanceof Date)) continue
    const pauseMatch = /^pause(\d+)?$/i.exec(key)
    if (pauseMatch) {
      const index = pauseMatch[1] === undefined ? 0 : Number(pauseMatch[1])
      const bucket = buckets.get(index) ?? {}
      bucket.pause = value
      buckets.set(index, bucket)
      continue
    }
    const restartMatch = /^restart(\d+)?$/i.exec(key)
    if (restartMatch) {
      const index = restartMatch[1] === undefined ? 0 : Number(restartMatch[1])
      const bucket = buckets.get(index) ?? {}
      bucket.restart = value
      buckets.set(index, bucket)
    }
  }

  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .flatMap(([, pair]) =>
      pair.pause && pair.restart ? [{ pause: pair.pause, restart: pair.restart }] : [],
    )
}

/** Read `node`, `node1`, `node2`, … landmark dates from project frontmatter. */
function projectMilestoneNodes(file: PortfolioFile): Array<string | Date> {
  const data = (file.frontmatter ?? {}) as Record<string, unknown>
  const entries: { index: number; value: string | Date }[] = []

  for (const [key, value] of Object.entries(data)) {
    if (typeof value !== "string" && !(value instanceof Date)) continue
    const match = /^node(\d+)?$/i.exec(key)
    if (!match) continue
    const index = match[1] === undefined ? 0 : Number(match[1])
    entries.push({ index, value })
  }

  return entries.sort((a, b) => a.index - b.index).map((entry) => entry.value)
}

function cleanSlug(file: PortfolioFile) {
  return String(file.slug ?? "")
}

function timestamp(value: string | Date | undefined) {
  if (!value) return 0
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

function whenKey(value: string | undefined) {
  return value && /^\d{4}\/\d{2}$/.test(value) ? value : "unknown"
}

function whenSortValue(value: string) {
  const match = value.match(/^(\d{4})\/(\d{2})$/)
  if (!match) return 0
  return Number(match[1]) * 100 + Number(match[2])
}

function normalizeImageSrc(src: string) {
  if (!src) return ""
  if (src.startsWith("http://") || src.startsWith("https://")) return src
  try {
    // Resolve relative markdown paths like ../assets/... against the site root.
    return new URL(src, "https://portfolio.local/").pathname
  } catch {
    return `/${src.replace(/^\.\//, "")}`
  }
}

function extractedGallery(file: PortfolioFile): GalleryImage[] {
  const raw = (file as { galleryImages?: GalleryImage[] }).galleryImages
  if (!Array.isArray(raw)) return []
  return raw
    .filter((image) => typeof image?.src === "string" && image.src.length > 0)
    .map((image) => ({
      src: normalizeImageSrc(image.src),
      alt: image.alt ?? "",
    }))
}

/** ## Gallery images, de-duplicated by path. First image is the card/timeline/entry hero. */
function entryImages(file: PortfolioFile, limit = Infinity): GalleryImage[] {
  const seen = new Set<string>()
  const images: GalleryImage[] = []

  for (const image of extractedGallery(file)) {
    const normalized = normalizeImageSrc(image.src)
    const key = normalized.replace(/^\/+/, "").toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    images.push({ src: normalized, alt: image.alt })
  }
  return images.slice(0, limit)
}

function cardImages(file: PortfolioFile) {
  return entryImages(file, 4).map((image) => ({
    ...image,
    src: imageVariant(image.src, "small"),
  }))
}

function timelineThumbImage(file: PortfolioFile): GalleryImage | undefined {
  const image = entryImages(file, 1)[0]
  if (!image) return undefined
  return { ...image, src: imageVariant(image.src, "preview") }
}

function isExternalLink(href: string) {
  return /^https?:\/\//i.test(href) || href.startsWith("mailto:")
}

function significanceRank(value: Frontmatter["significance"]) {
  if (value === "impactful") return 0
  if (value === "notable") return 1
  return 2
}

function visibleSignificance(value: Frontmatter["significance"]): VisibleSignificance | undefined {
  if (value === "impactful" || value === "notable") return value
  return undefined
}

function collectionGroups(allFiles: PortfolioFile[], section: Section): Record<string, string> {
  const index = allFiles.find((file) => cleanSlug(file) === `${section}/index`)
  if (!index) return {}
  const groups = frontmatter(index).groups
  if (!groups || typeof groups !== "object" || Array.isArray(groups)) return {}
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(groups)) {
    if (typeof value === "string" && value.trim()) result[key] = value.trim()
  }
  return result
}

function compareByRecency(a: PortfolioFile, b: PortfolioFile, section?: string) {
  if (section && section !== "projects") {
    return whenSortValue(whenKey(frontmatter(b).when)) - whenSortValue(whenKey(frontmatter(a).when))
  }
  const aData = frontmatter(a)
  const bData = frontmatter(b)
  return timestamp(bData.modified ?? bData.date) - timestamp(aData.modified ?? aData.date)
}

function compareByTitle(a: PortfolioFile, b: PortfolioFile) {
  return (frontmatter(a).title ?? "").localeCompare(frontmatter(b).title ?? "", undefined, {
    sensitivity: "base",
  })
}

/** Gallery: significance first, then recency, then title. Timeline stays chronological. */
function compareGallery(a: PortfolioFile, b: PortfolioFile, section: string) {
  const rank = significanceRank(frontmatter(a).significance) - significanceRank(frontmatter(b).significance)
  if (rank !== 0) return rank
  const recency = compareByRecency(a, b, section)
  return recency !== 0 ? recency : compareByTitle(a, b)
}

function itemsForSection(allFiles: PortfolioFile[], section: string) {
  return allFiles.filter((file) => {
    const slug = cleanSlug(file)
    return slug.startsWith(`${section}/`) && !slug.endsWith("/index")
  })
}

function groupTimelineEntries(
  items: PortfolioFile[],
  section: Section,
  allFiles: PortfolioFile[],
): TimelineGroup[] {
  const summaries = collectionGroups(allFiles, section)
  const groups = new Map<string, TimelineGroup>()

  for (const file of items) {
    const data = frontmatter(file)
    const when = whenKey(data.when)
    const existing = groups.get(when)
    if (existing) {
      existing.items.push(file)
      continue
    }
    groups.set(when, {
      when,
      summary: summaries[when] ?? "",
      items: [file],
    })
  }

  const sorted = [...groups.values()].sort((a, b) => whenSortValue(b.when) - whenSortValue(a.when))

  for (const group of sorted) {
    group.items.sort((a, b) => compareGallery(a, b, section))
    if (!group.summary) {
      const noun = section === "awards" ? "award" : "hackathon"
      const count = group.items.length
      group.summary = `${count} ${noun}${count === 1 ? "" : "s"}`
    }
  }

  return sorted
}

function linkFor(file: PortfolioFile) {
  return `/${cleanSlug(file)}`
}

function displayDate(data: Frontmatter) {
  return displayPeriod(data)
}

function countLabel(section: Section, count: number) {
  if (section === "awards") return count === 1 ? "1 award" : `${count} awards`
  if (section === "hackathons") return count === 1 ? "1 hackathon" : `${count} hackathons`
  return count === 1 ? "1 item" : `${count} items`
}

function tagList(tags: Frontmatter["tags"]): string[] {
  return Array.isArray(tags) ? tags.filter((tag): tag is string => typeof tag === "string" && tag.length > 0) : []
}

function filterSignificance(value: Frontmatter["significance"]): string {
  return value === "impactful" || value === "notable" || value === "minor" ? value : "minor"
}

/** Searchable blob + filter/sort keys for client-side collection controls. */
function filterDataset(
  data: Frontmatter,
  section: Section,
): {
  "data-filter-text": string
  "data-filter-tags": string
  "data-filter-significance": string
  "data-sort-significance": string
  "data-sort-recency": string
  "data-sort-title": string
} {
  const tags = tagList(data.tags)
  const text = [data.title, data.from, data.description]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .join(" ")
    .toLowerCase()
  const recency =
    section === "projects"
      ? timestamp(data.modified ?? data.date)
      : whenSortValue(whenKey(data.when))
  return {
    "data-filter-text": text,
    "data-filter-tags": tags.map((tag) => tag.toLowerCase()).join("|"),
    "data-filter-significance": filterSignificance(data.significance),
    "data-sort-significance": String(significanceRank(data.significance)),
    "data-sort-recency": String(recency),
    "data-sort-title": (data.title ?? "").toLowerCase(),
  }
}

function collectionTags(files: PortfolioFile[]): string[] {
  const seen = new Set<string>()
  const ordered: string[] = []
  for (const file of files) {
    for (const tag of tagList(frontmatter(file).tags)) {
      const key = tag.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      ordered.push(tag)
    }
  }
  return ordered.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
}

/** Quartz tag page slug: lowercase, spaces → hyphens (keeps `/` for hierarchies). */
function tagSlug(tag: string) {
  return tag.trim().toLowerCase().replace(/\s+/g, "-")
}

function displayTag(tag: string) {
  return tag.replaceAll("-", " ")
}

function displayTagHeading(tag: string) {
  return displayTag(tag).replace(/\b\w/g, (char) => char.toUpperCase())
}

function tagHref(tag: string) {
  return `/tags/${tagSlug(tag)}`
}

function sectionOf(file: PortfolioFile): Section | null {
  const slug = cleanSlug(file)
  return sections.find((section) => slug.startsWith(`${section}/`) && !slug.endsWith("/index")) ?? null
}

function portfolioEntries(allFiles: PortfolioFile[]) {
  return allFiles.filter((file) => sectionOf(file) !== null)
}

/** Match Quartz hierarchy: `plugin/emitter` appears on `/tags/plugin` and `/tags/plugin/emitter`. */
function fileMatchesTag(file: PortfolioFile, targetSlug: string) {
  return tagList(frontmatter(file).tags).some((tag) => {
    const slug = tagSlug(tag)
    return slug === targetSlug || slug.startsWith(`${targetSlug}/`)
  })
}

function entryRecency(file: PortfolioFile) {
  const data = frontmatter(file)
  const section = sectionOf(file)
  if (section === "projects") return timestamp(data.modified ?? data.date)
  if (section === "hackathons" || section === "awards") return whenSortValue(whenKey(data.when))
  return Math.max(timestamp(data.modified ?? data.date), whenSortValue(whenKey(data.when)))
}

function compareTagGallery(a: PortfolioFile, b: PortfolioFile) {
  const rank =
    significanceRank(frontmatter(a).significance) - significanceRank(frontmatter(b).significance)
  if (rank !== 0) return rank
  const recency = entryRecency(b) - entryRecency(a)
  return recency !== 0 ? recency : compareByTitle(a, b)
}

function allPortfolioTags(allFiles: PortfolioFile[]): { tag: string; count: number }[] {
  const counts = new Map<string, { tag: string; count: number }>()
  for (const file of portfolioEntries(allFiles)) {
    for (const tag of tagList(frontmatter(file).tags)) {
      const key = tagSlug(tag)
      const existing = counts.get(key)
      if (existing) {
        existing.count += 1
      } else {
        counts.set(key, { tag, count: 1 })
      }
    }
  }
  return [...counts.values()].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count
    return displayTag(a.tag).localeCompare(displayTag(b.tag), undefined, { sensitivity: "base" })
  })
}

function CollectionFilters({ tags }: { tags: string[] }) {
  return (
    <div class="portfolio-filters" data-portfolio-filters>
      <div
        class="portfolio-filters__panel"
        id="portfolio-filters-panel"
        data-filter-panel
        hidden
      >
        <label class="portfolio-filters__search">
          <span class="portfolio-filters__label">Search</span>
          <input
            type="search"
            data-filter-search
            placeholder="Title, from, description…"
            autocomplete="off"
            spellcheck={false}
          />
        </label>
        {tags.length > 0 && (
          <div class="portfolio-filters__group portfolio-filters__group--tags" data-filter-tags>
            <span class="portfolio-filters__label" id="portfolio-filter-tags-label">
              Tags
            </span>
            <div
              class="portfolio-filters__combobox"
              data-tag-combobox
              aria-labelledby="portfolio-filter-tags-label"
            >
              <div class="portfolio-filters__selected" data-tag-selected />
              <input
                type="text"
                data-tag-query
                placeholder="Filter tags…"
                autocomplete="off"
                spellcheck={false}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded="false"
                aria-controls="portfolio-filter-tag-list"
                aria-haspopup="listbox"
              />
              <ul
                class="portfolio-filters__options"
                id="portfolio-filter-tag-list"
                data-tag-options
                role="listbox"
                aria-multiselectable="true"
                hidden
              >
                {tags.map((tag) => {
                  const value = tag.toLowerCase()
                  const label = tag.replaceAll("-", " ")
                  return (
                    <li
                      role="option"
                      data-tag-option={value}
                      data-tag-label={label}
                      aria-selected="false"
                    >
                      {label}
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        )}
        <div
          class="portfolio-filters__group portfolio-filters__group--significance"
          role="group"
          aria-label="Significance"
        >
          <span class="portfolio-filters__label">Significance</span>
          <div class="portfolio-filters__chips">
            <button type="button" data-filter-significance="all" aria-pressed="true">
              All
            </button>
            <button type="button" data-filter-significance="impactful" aria-pressed="false">
              Impactful
            </button>
            <button type="button" data-filter-significance="notable" aria-pressed="false">
              Notable
            </button>
          </div>
        </div>
      </div>
      <p class="portfolio-filters__empty" data-filter-empty hidden>
        No entries match these filters.
      </p>
    </div>
  )
}

function TagList({
  tags,
  compact = false,
  linked = false,
}: {
  tags?: string[] | null
  compact?: boolean
  /** Use only outside nested anchors (entry heading / tag pages). Cards keep plain chips. */
  linked?: boolean
}) {
  // Frontmatter may pass explicit `null`, which bypasses a default param of [].
  const list = Array.isArray(tags) ? tags.filter((tag): tag is string => typeof tag === "string") : []
  if (!list.length) return null
  return (
    <ul class={`portfolio-tags${compact ? " portfolio-tags--compact" : ""}`} aria-label="Tags">
      {list.map((tag) => (
        <li>
          {linked ? <a href={tagHref(tag)}>{displayTag(tag)}</a> : displayTag(tag)}
        </li>
      ))}
    </ul>
  )
}

function collageClass(count: number) {
  if (count <= 4) return `portfolio-card__collage portfolio-card__collage--${count}`
  return "portfolio-card__collage portfolio-card__collage--many"
}

function CardMedia({ images }: { images: GalleryImage[] }) {
  if (!images.length) return null
  if (images.length === 1) {
    return (
      <figure class="portfolio-card__media">
        <img src={images[0].src} alt={images[0].alt} loading="eager" decoding="async" />
      </figure>
    )
  }

  const count = images.length
  const sideRows = count <= 4 ? count - 1 : Math.ceil((count - 1) / 2)
  return (
    <div
      class={collageClass(count)}
      style={
        {
          "--collage-rows": String(sideRows),
        } as Record<string, string>
      }
    >
      {images.map((image, index) => (
        <figure>
          <img
            src={image.src}
            alt={image.alt}
            loading={index === 0 ? "eager" : "lazy"}
            decoding="async"
          />
        </figure>
      ))}
    </div>
  )
}

function TimelineThumb({ image }: { image?: GalleryImage }) {
  if (!image) return null
  return <img src={image.src} alt={image.alt || ""} loading="lazy" decoding="async" />
}

function CollectionCard({ file, section }: { file: PortfolioFile; section: Section }) {
  const data = frontmatter(file)
  const type = section === "projects" ? "project" : section === "hackathons" ? "hackathon" : "award"
  const images = cardImages(file)
  const shown = visibleSignificance(data.significance)
  const filters = filterDataset(data, section)
  return (
    <li
      class={`portfolio-card portfolio-card--${type}`}
      data-significance={shown}
      data-portfolio-item
      {...filters}
    >
      <a href={linkFor(file)} data-portfolio-open={cleanSlug(file)}>
        <CardMedia images={images} />
        <div class="portfolio-card__body">
          <div class="portfolio-card__meta">
            <span>{displayDate(data)}</span>
            {shown && <span>{shown}</span>}
          </div>
          <h2>{data.title}</h2>
          {data.from && <p class="portfolio-card__from">{data.from}</p>}
          {data.description && <p>{data.description}</p>}
          <TagList tags={data.tags} compact />
        </div>
      </a>
    </li>
  )
}

function TimelineRow({
  file,
  section,
  showDate = true,
}: {
  file: PortfolioFile
  section: Section
  showDate?: boolean
}) {
  const data = frontmatter(file)
  const thumb = timelineThumbImage(file)
  const shown = visibleSignificance(data.significance)
  const filters = filterDataset(data, section)
  return (
    <li
      class="portfolio-timeline__item"
      data-portfolio-item
      data-significance={shown}
      {...filters}
    >
      {showDate ? (
        <TimelineWhenLabel when={data.when} />
      ) : (
        <span class="portfolio-timeline__date" aria-hidden="true" />
      )}
      <div class="portfolio-timeline__rail" aria-hidden="true">
        <span />
      </div>
      <a href={linkFor(file)} data-portfolio-open={cleanSlug(file)}>
        <div class="portfolio-timeline__body">
          <div class="portfolio-timeline__media">{thumb && <TimelineThumb image={thumb} />}</div>
          <div>
            <h2>{data.title}</h2>
            {data.from && <p class="portfolio-card__from">{data.from}</p>}
            {data.description && <p>{data.description}</p>}
            <TagList tags={data.tags} compact />
          </div>
        </div>
      </a>
    </li>
  )
}

function projectParentSlug(value: string | undefined): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim().replace(/^\/+|\/+$/g, "")
  if (!trimmed) return undefined
  if (trimmed.startsWith("projects/")) return trimmed
  return `projects/${trimmed}`
}

function ProjectTimelineCard({ file }: { file: PortfolioFile }) {
  const data = frontmatter(file)
  const thumb = timelineThumbImage(file)
  const shown = visibleSignificance(data.significance)
  const slug = cleanSlug(file)
  const filters = filterDataset(data, "projects")
  return (
    <a
      class="portfolio-project-timeline__card"
      href={linkFor(file)}
      data-portfolio-open={slug}
      data-project-slug={slug}
      data-portfolio-item
      data-significance={shown}
      {...filters}
    >
      <div class="portfolio-project-timeline__card-media">
        {thumb && <TimelineThumb image={thumb} />}
      </div>
      <div class="portfolio-project-timeline__card-body">
        <h2>{data.title}</h2>
        {(data.from || (Array.isArray(data.tags) && data.tags.length > 0)) && (
          <div class="portfolio-project-timeline__card-meta">
            {data.from && <p class="portfolio-card__from">{data.from}</p>}
            <TagList tags={data.tags} compact />
          </div>
        )}
        {data.description && <p>{data.description}</p>}
      </div>
    </a>
  )
}

function ProjectTimeline({ files }: { files: PortfolioFile[] }) {
  const fileBySlug = new Map(files.map((file) => [cleanSlug(file), file]))
  const model = buildProjectTimeline(
    files.map((file) => {
      const data = frontmatter(file)
      return {
        slug: cleanSlug(file),
        title: data.title ?? cleanSlug(file),
        start: data.date ?? "",
        end: data.modified,
        pauses: projectPauseRestarts(file),
        nodes: projectMilestoneNodes(file),
        parent: projectParentSlug(data.parent),
        series: typeof data.series === "string" ? data.series : undefined,
      }
    }),
  )

  if (!model) {
    return (
      <div class="portfolio-project-timeline" data-view-panel="timeline" data-project-timeline hidden>
        <p class="portfolio-project-timeline__empty">No projects with dates to show.</p>
      </div>
    )
  }

  const { geometry } = model
  const tracksByStartRow = new Map<number, typeof model.tracks>()
  for (const track of model.tracks) {
    const list = tracksByStartRow.get(track.bottomRow) ?? []
    list.push(track)
    tracksByStartRow.set(track.bottomRow, list)
  }

  return (
    <div
      class="portfolio-project-timeline"
      data-view-panel="timeline"
      data-project-timeline
      hidden
    >
      <ul class="portfolio-project-timeline__legend" aria-label="Timeline legend">
        <li>
          <span class="portfolio-project-timeline__legend-node portfolio-project-timeline__legend-node--start" />
          Started
        </li>
        <li>
          <span class="portfolio-project-timeline__legend-node portfolio-project-timeline__legend-node--end" />
          Completed
        </li>
        <li>
          <span class="portfolio-project-timeline__legend-node portfolio-project-timeline__legend-node--ongoing" />
          Ongoing
        </li>
        <li class="portfolio-project-timeline__legend-pair">
          <span class="portfolio-project-timeline__legend-item">
            <span class="portfolio-project-timeline__legend-pause" />
            Paused
          </span>
          <span class="portfolio-project-timeline__legend-item">
            <span class="portfolio-project-timeline__legend-branch" />
            Branch
          </span>
        </li>
      </ul>
      <div
        class="portfolio-project-timeline__board"
        style={
          {
            "--pt-months": String(model.months.length),
            "--pt-lanes": String(model.laneCount),
            "--pt-row-h": `${geometry.rowHeight}px`,
            "--pt-graph-w": `${geometry.svgWidth}px`,
            gridTemplateRows: geometry.rowHeights.map((height) => `${height}px`).join(" "),
          } as Record<string, string>
        }
      >
        <div class="portfolio-project-timeline__months" aria-hidden="true">
          {model.months.map((month, index) => {
            if (month.kind === "gap") {
              return (
                <div
                  class="portfolio-project-timeline__month portfolio-project-timeline__month--gap"
                  data-month={month.key}
                  style={{ gridRow: String(index + 1) }}
                >
                  <span class="portfolio-project-timeline__gap-label">{month.label}</span>
                </div>
              )
            }
            const prev = [...model.months.slice(0, index)]
              .reverse()
              .find((entry) => entry.kind === "month")
            const showYear = !prev || prev.year !== month.year
            return (
              <div
                class="portfolio-project-timeline__month"
                data-month={month.key}
                data-season={seasonForMonth(month.month)}
                data-year-digit={String(month.year % 10)}
                style={{ gridRow: String(index + 1) }}
              >
                {showYear && (
                  <span class="portfolio-project-timeline__year">{month.year}</span>
                )}
                <span class="portfolio-project-timeline__month-label">
                  {monthLabelShort(month.month)}
                </span>
              </div>
            )
          })}
        </div>
        <div class="portfolio-project-timeline__graph" aria-hidden="true">
          <svg
            class="portfolio-project-timeline__svg"
            width={geometry.svgWidth}
            height={geometry.svgHeight}
            viewBox={`0 0 ${geometry.svgWidth} ${geometry.svgHeight}`}
            role="presentation"
          >
            {model.branches.map((branch) => (
              <path
                class={`portfolio-project-timeline__branch portfolio-project-timeline__color-${branch.colorIndex}`}
                data-project-slug={branch.slug}
                d={branch.path}
                fill="none"
              />
            ))}
            {model.segments.map((segment) => (
              <line
                class={`portfolio-project-timeline__segment portfolio-project-timeline__segment--${segment.style} portfolio-project-timeline__color-${segment.colorIndex}`}
                data-project-slug={segment.slug}
                x1={segment.x}
                y1={segment.y1}
                x2={segment.x}
                y2={segment.y2}
              />
            ))}
            {model.nodes.map((node) => (
              <circle
                class={`portfolio-project-timeline__node portfolio-project-timeline__node--${node.kind} portfolio-project-timeline__color-${node.colorIndex}`}
                data-project-slug={node.slug}
                cx={node.x}
                cy={node.y}
                r={geometry.nodeRadius}
              />
            ))}
          </svg>
        </div>
        <div class="portfolio-project-timeline__cards">
          {model.months.map((month, row) => {
            const tracks = tracksByStartRow.get(row) ?? []
            return (
              <div
                class="portfolio-project-timeline__card-slot"
                data-month={month.key}
                style={{ gridRow: String(row + 1) }}
              >
                {tracks.map((track) => {
                  const file = fileBySlug.get(track.slug)
                  if (!file) return null
                  return <ProjectTimelineCard file={file} />
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function monthLabelShort(month: number): string {
  const date = new Date(Date.UTC(2000, month - 1, 1))
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    timeZone: "UTC",
  })
    .format(date)
    .toUpperCase()
}

function seasonForMonth(month: number): "winter" | "spring" | "summer" | "fall" {
  if (month === 12 || month <= 2) return "winter"
  if (month <= 5) return "spring"
  if (month <= 8) return "summer"
  return "fall"
}

function whenParts(when: string | undefined): { year: number; month: number } | null {
  const key = whenKey(when)
  const match = key.match(/^(\d{4})\/(\d{2})$/)
  if (!match) return null
  return { year: Number(match[1]), month: Number(match[2]) }
}

function TimelineWhenLabel({ when }: { when?: string }) {
  const parts = whenParts(when)
  if (!parts) {
    const fallback = displayDate({ when })
    return fallback ? (
      <time class="portfolio-timeline__date">{fallback}</time>
    ) : (
      <span class="portfolio-timeline__date" aria-hidden="true" />
    )
  }
  return (
    <time
      class="portfolio-timeline__date"
      dateTime={`${parts.year}-${String(parts.month).padStart(2, "0")}`}
      data-season={seasonForMonth(parts.month)}
      data-year-digit={String(parts.year % 10)}
    >
      <span class="portfolio-timeline__year">{parts.year}</span>
      <span class="portfolio-timeline__month-label">{monthLabelShort(parts.month)}</span>
    </time>
  )
}

function TimelineGroupRow({ group, section }: { group: TimelineGroup; section: Section }) {
  const hasImpactful = group.items.some((file) => frontmatter(file).significance === "impactful")
  const hasNotable = group.items.some((file) => frontmatter(file).significance === "notable")
  const category =
    hasImpactful || hasNotable
      ? ` portfolio-timeline__group--${hasImpactful ? "impactful" : "notable"}`
      : ""
  if (group.items.length === 1) {
    return <TimelineRow file={group.items[0]} section={section} />
  }

  return (
    <li
      class={`portfolio-timeline__group${category}`}
      data-timeline-group
      data-significance={hasImpactful ? "impactful" : hasNotable ? "notable" : undefined}
    >
      <TimelineWhenLabel when={group.when} />
      <div class="portfolio-timeline__rail" aria-hidden="true">
        <span />
      </div>
      <div class="portfolio-timeline__group-panel">
        <button
          type="button"
          class="portfolio-timeline__summary"
          data-timeline-toggle
          aria-expanded="false"
        >
          <span class="portfolio-timeline__chevron" aria-hidden="true">
            ▾
          </span>
          <span class="portfolio-timeline__summary-title">{group.summary}</span>
          <span class="portfolio-timeline__summary-count">{countLabel(section, group.items.length)}</span>
        </button>
        <ol class="portfolio-timeline__children" data-timeline-children hidden>
          {group.items.map((file) => (
            <TimelineRow file={file} section={section} showDate={false} />
          ))}
        </ol>
      </div>
    </li>
  )
}

function TagCollection({ tag, allFiles }: { tag: string; allFiles: PortfolioFile[] }) {
  const items = portfolioEntries(allFiles)
    .filter((file) => fileMatchesTag(file, tag))
    .sort(compareTagGallery)
  const countLabelText =
    items.length === 1 ? "1 entry with this tag" : `${items.length} entries with this tag`

  return (
    <main class="portfolio-collection portfolio-tag-page" data-portfolio-collection="tags" data-view="gallery">
      <div class="portfolio-heading">
        <div>
          <a class="portfolio-back" href="/tags/">
            ← Tags
          </a>
          <p>{countLabelText}</p>
          <h1>{displayTagHeading(tag)}</h1>
        </div>
      </div>
      {items.length === 0 ? (
        <p class="portfolio-filters__empty">No portfolio entries use this tag.</p>
      ) : (
        <ul class="portfolio-grid" data-view-panel="gallery">
          {items.map((file) => {
            const section = sectionOf(file)!
            return <CollectionCard file={file} section={section} />
          })}
        </ul>
      )}
    </main>
  )
}

function TagIndex({ allFiles }: { allFiles: PortfolioFile[] }) {
  const tags = allPortfolioTags(allFiles)
  const total = tags.reduce((sum, entry) => sum + entry.count, 0)

  return (
    <main class="portfolio-collection portfolio-tag-page" data-portfolio-collection="tags" data-view="gallery">
      <div class="portfolio-heading">
        <div>
          <p>
            {tags.length} tag{tags.length === 1 ? "" : "s"}
            {" · "}
            {total} tagged entr{total === 1 ? "y" : "ies"}
          </p>
          <h1>Tags</h1>
        </div>
      </div>
      {tags.length === 0 ? (
        <p class="portfolio-filters__empty">No tags yet.</p>
      ) : (
        <ul class="portfolio-tag-cloud" aria-label="All tags">
          {tags.map(({ tag, count }) => (
            <li>
              <a href={tagHref(tag)}>
                <span class="portfolio-tag-cloud__name">{displayTag(tag)}</span>
                <span class="portfolio-tag-cloud__count">{count}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

function Collection({ section, allFiles }: { section: Section; allFiles: PortfolioFile[] }) {
  const items = itemsForSection(allFiles, section)
  const galleryItems = [...items].sort((a, b) => compareGallery(a, b, section))
  const title = section[0].toUpperCase() + section.slice(1)
  const grouped = section === "projects" ? null : groupTimelineEntries(items, section, allFiles)
  const tags = collectionTags(items)

  return (
    <main class="portfolio-collection" data-portfolio-collection={section} data-view="gallery">
      <div class="portfolio-heading">
        <div>
          <p data-collection-count>
            <span data-collection-count-visible>{items.length}</span>
            {" of "}
            {items.length} entries
          </p>
          <h1>{title}</h1>
        </div>
        <div class="portfolio-heading__actions">
          <div class="portfolio-heading__toggles">
            <div class="portfolio-view-toggle" role="group" aria-label="Sort order" data-sort-toggle>
              <button type="button" data-sort-mode="significance" aria-pressed="true">
                Significance
              </button>
              <button type="button" data-sort-mode="date" aria-pressed="false">
                Date
              </button>
            </div>
            <div class="portfolio-view-toggle" role="group" aria-label="View mode">
              <button type="button" data-view-mode="gallery" aria-pressed="true">
                Gallery
              </button>
              <button type="button" data-view-mode="timeline" aria-pressed="false">
                Timeline
              </button>
            </div>
          </div>
          <button
            type="button"
            class="portfolio-filter-toggle"
            data-filter-toggle
            aria-expanded="false"
            aria-controls="portfolio-filters-panel"
          >
            Filter
            <span class="portfolio-filter-toggle__badge" data-filter-badge hidden>
              0
            </span>
          </button>
        </div>
      </div>
      <CollectionFilters tags={tags} />
      <ul class="portfolio-grid" data-view-panel="gallery">
        {galleryItems.map((file) => (
          <CollectionCard file={file} section={section} />
        ))}
      </ul>
      {section === "projects" ? (
        <ProjectTimeline files={items} />
      ) : (
        <ol class="portfolio-timeline" data-view-panel="timeline" hidden>
          {grouped!.map((group) => (
            <TimelineGroupRow group={group} section={section} />
          ))}
        </ol>
      )}
    </main>
  )
}

function coverPhotos(allFiles: PortfolioFile[]): CoverPhoto[] {
  const file = allFiles.find((candidate) => cleanSlug(candidate) === "coverflow")
  if (!file) return []
  const photos = frontmatter(file).photos
  if (!Array.isArray(photos)) return []
  return photos.filter((photo) => typeof photo?.src === "string" && photo.src.length > 0)
}

let cachedLinkIcons: LinkIconMap | null = null

/** Infer `:key:` shortcodes from filenames in `content/assets/icons/`. */
function linkIcons(): LinkIconMap {
  if (cachedLinkIcons) return cachedLinkIcons
  const dir = path.join(process.cwd(), "content", "assets", "icons")
  try {
    cachedLinkIcons = linkIconMapFromFilenames(fs.readdirSync(dir))
  } catch {
    cachedLinkIcons = {}
  }
  return cachedLinkIcons
}

function PhotoCoverflow({ allFiles }: { allFiles: PortfolioFile[] }) {
  const photos = coverPhotos(allFiles)
  if (!photos.length) return null

  const firstSrc = normalizeImageSrc(photos[0]?.src ?? "")

  return (
    <section class="portfolio-coverflow" aria-label="Photo coverflow">
      {firstSrc && (
        <link rel="preload" as="image" href={firstSrc} fetchpriority="high" />
      )}
      <div class="portfolio-coverflow__controls">
        <button type="button" data-reel-previous aria-label="Previous photo">
          ←
        </button>
        <button type="button" data-reel-next aria-label="Next photo">
          →
        </button>
      </div>
      <div class="portfolio-coverflow__viewport" data-portfolio-reel tabindex={0}>
        {photos.map((photo, index) => {
          const src = normalizeImageSrc(photo.src ?? "")
          const caption = photo.caption ?? ""
          const link = typeof photo.link === "string" ? photo.link.trim() : ""
          const priority = index === 0
          const media = (
            <>
              <img
                src={src}
                alt={caption}
                loading={priority ? "eager" : "lazy"}
                decoding="async"
                {...(priority ? { fetchpriority: "high" as const } : {})}
              />
              {caption && <figcaption>{caption}</figcaption>}
            </>
          )

          if (link) {
            const external = isExternalLink(link)
            return (
              <a
                class="portfolio-coverflow__item"
                href={link}
                {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
              >
                {media}
              </a>
            )
          }

          return (
            <figure
              class="portfolio-coverflow__item"
              data-portfolio-lightbox
              data-lightbox-src={imageVariant(src, "full")}
              data-lightbox-caption={caption}
              role="button"
              tabindex={0}
              aria-label={caption ? `Expand ${caption}` : "Expand photo"}
            >
              {media}
            </figure>
          )
        })}
      </div>
    </section>
  )
}

function Newsletter() {
  return (
    <article class="newsletter-card" id="newsletter" data-newsletter-card data-state="loading">
      <div class="newsletter-card__copy">
        <p class="newsletter-card__eyebrow">
          Latest newsletter update <span data-newsletter-date />
        </p>
        <h2 data-newsletter-title>Latest newsletter</h2>
        <p data-newsletter-description>Loading the latest post…</p>
        <a
          href="https://prajwalprashanth.substack.com/"
          data-newsletter-link
          target="_blank"
          rel="noreferrer"
        >
          Read on Substack <span aria-hidden="true">↗</span>
        </a>
      </div>
      <img data-newsletter-image alt="" hidden loading="lazy" decoding="async" />
    </article>
  )
}

function Home(props: QuartzComponentProps) {
  const icons = linkIcons()
  const tree = props.tree as Parameters<typeof applyLinkIconsToHast>[0]
  applyLinkIconsToHast(tree, icons)
  const content = toJsxRuntime(tree as Parameters<typeof toJsxRuntime>[0], {
    Fragment,
    jsx,
    jsxs,
    elementAttributeNameCase: "html",
  })
  const counts = Object.fromEntries(
    sections.map((section) => [section, itemsForSection(props.allFiles, section).length]),
  )
  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: "Prajwal Prashanth",
      url: "https://prajwal.is-a.dev",
      jobTitle: "Student Developer",
      sameAs: [
        "https://linkedin.com/in/prajwal-prashanth",
        "https://github.com/Toricane",
        "https://x.com/PrajwalP028",
      ],
    },
  }

  return (
    <main class="portfolio-home-shell">
      <section class="portfolio-home-copy">
        <h1>Prajwal Prashanth</h1>
        <div class="portfolio-home-markdown">{content}</div>
        <nav class="portfolio-section-links" aria-label="Portfolio sections">
          {sections.map((section) => (
            <a href={sectionHref(section)}>
              <span>{section}</span>
              <small>{counts[section]}</small>
            </a>
          ))}
        </nav>
      </section>
      <aside class="portfolio-home-media">
        <PhotoCoverflow allFiles={props.allFiles} />
        <Newsletter />
      </aside>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />
    </main>
  )
}

function EntryHeading({ fileData }: QuartzComponentProps) {
  const data = (fileData.frontmatter ?? {}) as Frontmatter
  const slug = String(fileData.slug ?? "")
  const section = sections.find((candidate) => slug.startsWith(`${candidate}/`))
  const hero = entryImages(fileData as PortfolioFile, 1)[0]

  return (
    <div class="portfolio-entry-heading" data-portfolio-entry-heading>
      {section && (
        <a class="portfolio-back" href={sectionHref(section)}>
          ← {section}
        </a>
      )}
      {hero && (
        <figure class="portfolio-entry-cover">
          <img src={hero.src} alt={hero.alt || ""} decoding="async" />
        </figure>
      )}
      <h1>{data.title}</h1>
      {(data.from || displayDate(data)) && (
        <p class="portfolio-entry-heading__meta">
          {data.from && <span>{data.from}</span>}
          {data.from && displayDate(data) && <span aria-hidden="true">·</span>}
          {displayDate(data) && <span>{displayDate(data)}</span>}
        </p>
      )}
      <TagList tags={data.tags} compact linked />
      {data.description && <p class="portfolio-entry-heading__description">{data.description}</p>}
      {(data.role || data.outcome) && (
        <dl class="portfolio-entry-facts">
          {data.role && (
            <div>
              <dt>Role</dt>
              <dd>{data.role}</dd>
            </div>
          )}
          {data.outcome && (
            <div>
              <dt>Outcome</dt>
              <dd>{data.outcome}</dd>
            </div>
          )}
        </dl>
      )}
    </div>
  )
}

function SiteNav({ slug }: { slug: string }) {
  return (
    <header class="portfolio-nav">
      <a class="portfolio-nav__brand" href="/">
        Prajwal Prashanth
      </a>
      <div class="portfolio-nav__actions">
        <div class="portfolio-nav__search-host" data-portfolio-search-host />
        <nav class="portfolio-nav__links" aria-label="Primary navigation">
          {primaryNavLinks(slug)}
        </nav>
        <button
          type="button"
          class="portfolio-nav__menu-toggle"
          data-portfolio-menu-toggle
          aria-expanded="false"
          aria-controls="portfolio-nav-menu"
          aria-label="Open menu"
        >
          <span class="portfolio-nav__hamburger" aria-hidden="true" />
        </button>
        <nav
          id="portfolio-nav-menu"
          class="portfolio-nav__menu"
          data-portfolio-menu
          aria-label="Primary navigation"
          hidden
        >
          {primaryNavLinks(slug)}
        </nav>
      </div>
    </header>
  )
}

function ModalHost() {
  return (
    <div class="portfolio-modal" data-portfolio-modal hidden>
      <div class="portfolio-modal__backdrop" data-portfolio-modal-close tabindex={-1} />
      <div class="portfolio-modal__controls">
        <button type="button" data-portfolio-modal-close aria-label="Close">
          ×
        </button>
        <button type="button" data-portfolio-modal-enlarge aria-label="Open full page">
          ↗
        </button>
        <button type="button" data-portfolio-modal-back aria-label="Back" hidden>
          ←
        </button>
      </div>
      <div
        class="portfolio-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="portfolio-modal-title"
        data-portfolio-modal-panel
        tabindex={-1}
      >
        <div class="portfolio-modal__scroll" data-portfolio-modal-body />
      </div>
    </div>
  )
}

function LightboxHost() {
  return (
    <div class="portfolio-lightbox" data-portfolio-lightbox-root hidden>
      <div class="portfolio-lightbox__backdrop" data-portfolio-lightbox-close tabindex={-1} />
      <button
        type="button"
        class="portfolio-lightbox__close"
        data-portfolio-lightbox-close
        aria-label="Close image"
      >
        ×
      </button>
      <figure
        class="portfolio-lightbox__figure"
        role="dialog"
        aria-modal="true"
        aria-label="Expanded photo"
        data-portfolio-lightbox-panel
        tabindex={-1}
      >
        <img data-portfolio-lightbox-image alt="" />
        <figcaption data-portfolio-lightbox-caption hidden />
      </figure>
    </div>
  )
}

function SiteFooter() {
  return (
    <footer class="portfolio-footer">
      <span>© {new Date().getFullYear()} Prajwal Prashanth</span>
      <nav aria-label="Footer navigation">
        <a href="/index.xml">RSS</a>
        <ResumeLink>Resume</ResumeLink>
        <a href="https://github.com/Toricane">GitHub</a>
        <a href="https://linkedin.com/in/prajwal-prashanth">LinkedIn</a>
      </nav>
    </footer>
  )
}

function LinkIconsData() {
  const icons = linkIcons()
  if (!Object.keys(icons).length) return null
  return (
    <script
      type="application/json"
      data-portfolio-link-icons
      dangerouslySetInnerHTML={{ __html: JSON.stringify(icons) }}
    />
  )
}

export default (() => {
  const Portfolio: QuartzComponent = (props: QuartzComponentProps) => {
    const slug = String(props.fileData.slug ?? "")
    const folder = sections.find((section) => slug === `${section}/index`)
    const dataOnly = slug === "404" || slug === "coverflow"
    const isTagIndex = slug === "tags" || slug === "tags/index"
    const tagName =
      slug.startsWith("tags/") && slug !== "tags/index" ? slug.slice("tags/".length) : null

    return (
      <div class="portfolio-component">
        <SiteNav slug={slug} />
        {slug === "index" ? (
          <Home {...props} />
        ) : folder ? (
          <Collection section={folder} allFiles={props.allFiles} />
        ) : isTagIndex ? (
          <TagIndex allFiles={props.allFiles} />
        ) : tagName ? (
          <TagCollection tag={tagName} allFiles={props.allFiles} />
        ) : dataOnly ? null : (
          <EntryHeading {...props} />
        )}
        <SiteFooter />
        <ModalHost />
        <LightboxHost />
        <LinkIconsData />
      </div>
    )
  }

  Portfolio.css = styles
  Portfolio.afterDOMLoaded = script
  return Portfolio
}) satisfies QuartzComponentConstructor
