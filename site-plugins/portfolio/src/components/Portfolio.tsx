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
  cover?: string
  significance?: VisibleSignificance | "minor"
  from?: string
  role?: string
  outcome?: string
  when?: string
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

function sectionHref(section: Section) {
  return `/${section}/`
}

function frontmatter(file: PortfolioFile): Frontmatter {
  return (file.frontmatter ?? {}) as Frontmatter
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

/** Cover + gallery images, de-duplicated by path. */
function entryImages(file: PortfolioFile, limit = Infinity): GalleryImage[] {
  const data = frontmatter(file)
  const seen = new Set<string>()
  const images: GalleryImage[] = []

  const push = (src: string | undefined, alt = "") => {
    if (!src) return
    const normalized = normalizeImageSrc(src)
    const key = normalized.replace(/^\/+/, "").toLowerCase()
    if (!key || seen.has(key)) return
    seen.add(key)
    images.push({ src: normalized, alt })
  }

  push(data.cover, data.title ?? "")
  for (const image of extractedGallery(file)) push(image.src, image.alt)
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

function formatMonthYear(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date)
}

function displayDate(data: Frontmatter) {
  if (data.when) {
    const match = data.when.match(/^(\d{4})\/(\d{2})$/)
    if (match) return formatMonthYear(`${match[1]}-${match[2]}-01T00:00:00Z`)
  }
  if (!data.date) return ""
  const start = formatMonthYear(data.date)
  if (!start) return ""
  if (!data.modified) return start
  const end = formatMonthYear(data.modified)
  if (!end || end === start) return start
  return `${start} – ${end}`
}

function countLabel(section: Section, count: number) {
  if (section === "awards") return count === 1 ? "1 award" : `${count} awards`
  if (section === "hackathons") return count === 1 ? "1 hackathon" : `${count} hackathons`
  return count === 1 ? "1 item" : `${count} items`
}

function TagList({ tags = [], compact = false }: { tags?: string[]; compact?: boolean }) {
  if (!tags.length) return null
  return (
    <ul class={`portfolio-tags${compact ? " portfolio-tags--compact" : ""}`} aria-label="Tags">
      {tags.map((tag) => (
        <li>{tag.replaceAll("-", " ")}</li>
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

function CollectionCard({ file, section }: { file: PortfolioFile; section: string }) {
  const data = frontmatter(file)
  const type = section === "projects" ? "project" : section === "hackathons" ? "hackathon" : "award"
  const images = cardImages(file)
  const shown = visibleSignificance(data.significance)
  return (
    <li
      class={`portfolio-card portfolio-card--${type}`}
      data-significance={shown}
      data-portfolio-item
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
  showDate = true,
}: {
  file: PortfolioFile
  showDate?: boolean
}) {
  const data = frontmatter(file)
  const thumb = timelineThumbImage(file)
  const dateLabel = displayDate(data)
  const shown = visibleSignificance(data.significance)
  return (
    <li
      class="portfolio-timeline__item"
      data-portfolio-item
      data-significance={shown}
    >
      {showDate && dateLabel ? (
        <time class="portfolio-timeline__date">{dateLabel}</time>
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

function TimelineGroupRow({ group, section }: { group: TimelineGroup; section: Section }) {
  const hasImpactful = group.items.some((file) => frontmatter(file).significance === "impactful")
  const hasNotable = group.items.some((file) => frontmatter(file).significance === "notable")
  const category =
    hasImpactful || hasNotable
      ? ` portfolio-timeline__group--${hasImpactful ? "impactful" : "notable"}`
      : ""
  const monthLabel = displayDate({ when: group.when })

  if (group.items.length === 1) {
    return <TimelineRow file={group.items[0]} />
  }

  return (
    <li
      class={`portfolio-timeline__group${category}`}
      data-timeline-group
      data-significance={hasImpactful ? "impactful" : hasNotable ? "notable" : undefined}
    >
      {monthLabel ? (
        <time class="portfolio-timeline__date">{monthLabel}</time>
      ) : (
        <span class="portfolio-timeline__date" aria-hidden="true" />
      )}
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
            <TimelineRow file={file} showDate={false} />
          ))}
        </ol>
      </div>
    </li>
  )
}

function Collection({ section, allFiles }: { section: Section; allFiles: PortfolioFile[] }) {
  const items = itemsForSection(allFiles, section)
  const galleryItems = [...items].sort((a, b) => compareGallery(a, b, section))
  const timelineItems =
    section === "projects" ? [...items].sort(compareByRecency) : galleryItems
  const title = section[0].toUpperCase() + section.slice(1)
  const grouped = section === "projects" ? null : groupTimelineEntries(items, section, allFiles)

  return (
    <main class="portfolio-collection" data-portfolio-collection={section}>
      <div class="portfolio-heading">
        <div>
          <p>{items.length} entries</p>
          <h1>{title}</h1>
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
      <ul class="portfolio-grid" data-view-panel="gallery">
        {galleryItems.map((file) => (
          <CollectionCard file={file} section={section} />
        ))}
      </ul>
      <ol class="portfolio-timeline" data-view-panel="timeline" hidden>
        {grouped
          ? grouped.map((group) => <TimelineGroupRow group={group} section={section} />)
          : timelineItems.map((file) => <TimelineRow file={file} />)}
      </ol>
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

  return (
    <section class="portfolio-coverflow" aria-label="Photo coverflow">
      <div class="portfolio-coverflow__controls">
        <button type="button" data-reel-previous aria-label="Previous photo">
          ←
        </button>
        <button type="button" data-reel-next aria-label="Next photo">
          →
        </button>
      </div>
      <div class="portfolio-coverflow__viewport" data-portfolio-reel tabindex={0}>
        {photos.map((photo) => {
          const src = normalizeImageSrc(photo.src ?? "")
          const caption = photo.caption ?? ""
          const link = typeof photo.link === "string" ? photo.link.trim() : ""
          const media = (
            <>
              <img src={src} alt={caption} loading="lazy" decoding="async" />
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

  return (
    <div class="portfolio-entry-heading" data-portfolio-entry-heading>
      {section && (
        <a class="portfolio-back" href={sectionHref(section)}>
          ← {section}
        </a>
      )}
      {data.cover && (
        <figure class="portfolio-entry-cover">
          <img src={`/${data.cover}`} alt="" decoding="async" />
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
      <TagList tags={data.tags} compact />
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
  const active = sections.find((section) => slug.startsWith(section))
  return (
    <header class="portfolio-nav">
      <a class="portfolio-nav__brand" href="/">
        Prajwal Prashanth
      </a>
      <nav aria-label="Primary navigation">
        {sections.map((section) => (
          <a href={sectionHref(section)} aria-current={active === section ? "page" : undefined}>
            {section}
          </a>
        ))}
      </nav>
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

    return (
      <div class="portfolio-component">
        <SiteNav slug={slug} />
        {slug === "index" ? (
          <Home {...props} />
        ) : folder ? (
          <Collection section={folder} allFiles={props.allFiles} />
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
