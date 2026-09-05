import { imageVariant } from "../imageVariant"
import { linkIconShortcodeRegex, type LinkIconMap } from "../linkIcons"

type CleanupWindow = Window & {
  addCleanup?: (cleanup: () => void) => void
  spaNavigate?: (url: URL) => Promise<void>
}

const NEWSLETTER_ENDPOINT =
  "https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fprajwalprashanth.substack.com%2Ffeed"
const NEWSLETTER_URL = "https://prajwalprashanth.substack.com/"
const CACHE_KEY = "portfolio:newsletter:v2"
const CACHE_TTL = 6 * 60 * 60 * 1000
const ENTRY_PATTERN = /^\/(projects|hackathons|awards)\/([^/]+)\/?$/
const NEWSLETTER_PREVIEW_CHARS = 300
const TAP_STICKY_DISMISS_KEY = "portfolio:tap-sticky-dismissed"
const TAP_LINKEDIN_FALLBACK = "https://linkedin.com/in/prajwal-prashanth"
const TAP_PLACE_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} '\-]{0,39}$/u
const TAP_MODEL_HINT_MS = 200

type ModalFrame = {
  slug: string
  href: string
  html: string
  title: string
}

const modalStack: ModalFrame[] = []
const contentCache = new Map<string, { html: string; title: string }>()
let returnUrl = "/"
let suppressingSpa = false

function safeUrl(value: unknown, fallback: string) {
  try {
    const url = new URL(String(value))
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : fallback
  } catch {
    return fallback
  }
}

function redirectLegacyHash() {
  if (location.pathname !== "/" && location.pathname !== "/index.html") return
  const hash = decodeURIComponent(location.hash.slice(1))
  const detail = hash.match(/^(projects|hackathons|awards)\/(.+)$/)
  if (detail) {
    location.replace(`/${detail[1]}/${detail[2]}`)
    return
  }

  const sections: Record<string, string> = {
    content: "/projects/",
    projects: "/projects/",
    hackathons: "/hackathons/",
    awards: "/awards/",
  }
  if (sections[hash]) location.replace(sections[hash])
}

function wireReel(root: ParentNode = document) {
  const viewports = [...root.querySelectorAll<HTMLElement>("[data-portfolio-reel]")]
  for (const viewport of viewports) {
    if (viewport.dataset.reelWired === "true") continue
    viewport.dataset.reelWired = "true"

    const host = viewport.closest(".portfolio-coverflow") ?? viewport.parentElement
    const previous = host?.querySelector<HTMLButtonElement>("[data-reel-previous]")
    const next = host?.querySelector<HTMLButtonElement>("[data-reel-next]")
    const move = (direction: number) => {
      viewport.scrollBy({ left: direction * viewport.clientWidth * 0.78, behavior: "smooth" })
    }
    const previousHandler = () => move(-1)
    const nextHandler = () => move(1)
    previous?.addEventListener("click", previousHandler)
    next?.addEventListener("click", nextHandler)

    ;(window as CleanupWindow).addCleanup?.(() => {
      previous?.removeEventListener("click", previousHandler)
      next?.removeEventListener("click", nextHandler)
      viewport.dataset.reelWired = "false"
    })
  }
}

function wireTimelineGroups(root: ParentNode = document) {
  const toggles = [...root.querySelectorAll<HTMLButtonElement>("[data-timeline-toggle]")]
  for (const toggle of toggles) {
    if (toggle.dataset.wired === "true") continue
    toggle.dataset.wired = "true"

    const onClick = () => {
      const group = toggle.closest<HTMLElement>("[data-timeline-group]")
      const children = group?.querySelector<HTMLElement>("[data-timeline-children]")
      if (!children) return
      const expanded = toggle.getAttribute("aria-expanded") === "true"
      toggle.setAttribute("aria-expanded", String(!expanded))
      children.hidden = expanded
    }
    toggle.addEventListener("click", onClick)
    ;(window as CleanupWindow).addCleanup?.(() => {
      toggle.removeEventListener("click", onClick)
      toggle.dataset.wired = "false"
    })
  }
}

function wireProjectTimeline(root: ParentNode = document) {
  const boards = [
    ...root.querySelectorAll<HTMLElement>("[data-project-timeline] .portfolio-project-timeline__board"),
  ]
  for (const board of boards) {
    if (board.dataset.wired === "true") continue
    board.dataset.wired = "true"

    const setActive = (slug: string | null) => {
      const marks = board.querySelectorAll<Element>("[data-project-slug]")
      for (const el of marks) {
        const elSlug = el.getAttribute("data-project-slug")
        el.classList.toggle("is-active", slug !== null && elSlug === slug)
      }
      board.classList.toggle("is-focusing", slug !== null)
    }

    const onOver = (event: Event) => {
      const target = (event.target as Element | null)?.closest?.("[data-project-slug]")
      if (!target || !board.contains(target)) return
      const slug = target.getAttribute("data-project-slug")
      if (slug) setActive(slug)
    }
    const onOut = (event: PointerEvent) => {
      const next = event.relatedTarget as Node | null
      if (next && board.contains(next)) return
      setActive(null)
    }

    board.addEventListener("pointerover", onOver)
    board.addEventListener("pointerout", onOut)
    ;(window as CleanupWindow).addCleanup?.(() => {
      board.removeEventListener("pointerover", onOver)
      board.removeEventListener("pointerout", onOut)
      board.dataset.wired = "false"
      setActive(null)
    })
  }
}

function headingText(node: Element | null) {
  return node?.textContent?.replace(/\s+/g, " ").trim().toLowerCase() ?? ""
}

function collectSectionNodes(startHeading: Element) {
  const nodes: Element[] = []
  let cursor = startHeading.nextElementSibling
  while (cursor && !/^H[1-6]$/.test(cursor.tagName)) {
    nodes.push(cursor)
    cursor = cursor.nextElementSibling
  }
  return nodes
}

function formatLinkDate(value: string) {
  const match = value.match(/^(\d{4})[/-](\d{2})[/-](\d{2})$/)
  if (!match) return value
  const date = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date)
}

function linkHostname(href: string) {
  try {
    const url = new URL(href, location.origin)
    if (url.origin === location.origin) {
      const section = url.pathname.split("/").filter(Boolean)[0]
      return section || "portfolio"
    }
    return url.hostname.replace(/^www\./, "")
  } catch {
    return ""
  }
}

function enhanceEntryGallery(root: ParentNode) {
  const article = root.querySelector("article")
  if (!article) return

  const galleryHeading = [...article.querySelectorAll("h2")].find(
    (heading) => headingText(heading) === "gallery",
  )
  if (!galleryHeading || galleryHeading.dataset.coverflowReady === "true") return

  const sectionNodes = collectSectionNodes(galleryHeading)
  const images = sectionNodes
    .flatMap((node) =>
      [...node.querySelectorAll("img")].map((img) => ({
        src: img.getAttribute("src") ?? "",
        alt: img.getAttribute("alt")?.trim() || img.getAttribute("title")?.trim() || "",
      })),
    )
    .filter((image) => image.src)

  if (!images.length) return

  const coverflow = document.createElement("section")
  coverflow.className = "portfolio-coverflow"
  coverflow.setAttribute("aria-label", "Gallery")

  const controls = document.createElement("div")
  controls.className = "portfolio-coverflow__controls"
  controls.innerHTML = `
    <button type="button" data-reel-previous aria-label="Previous photo">←</button>
    <button type="button" data-reel-next aria-label="Next photo">→</button>
  `

  const viewport = document.createElement("div")
  viewport.className = "portfolio-coverflow__viewport"
  viewport.dataset.portfolioReel = ""
  viewport.tabIndex = 0

  images.forEach((image, index) => {
    const figure = document.createElement("figure")
    figure.className = "portfolio-coverflow__item"
    figure.dataset.portfolioLightbox = ""
    figure.dataset.lightboxSrc = imageVariant(image.src, "full")
    figure.dataset.lightboxCaption = image.alt
    figure.setAttribute("role", "button")
    figure.tabIndex = 0
    figure.setAttribute("aria-label", image.alt ? `Expand ${image.alt}` : "Expand photo")

    const img = document.createElement("img")
    img.src = imageVariant(image.src, "small")
    img.alt = image.alt
    img.loading = index === 0 ? "eager" : "lazy"
    img.decoding = "async"
    if (index === 0) img.fetchPriority = "high"
    figure.append(img)
    if (image.alt) {
      const caption = document.createElement("figcaption")
      caption.textContent = image.alt
      figure.append(caption)
    }
    viewport.append(figure)
  })

  coverflow.append(controls, viewport)
  galleryHeading.insertAdjacentElement("afterend", coverflow)
  for (const node of sectionNodes) node.remove()
  galleryHeading.dataset.coverflowReady = "true"
}

function enhanceEntryLinks(root: ParentNode) {
  const article = root.querySelector("article")
  if (!article) return

  const linksHeading = [...article.querySelectorAll("h2")].find(
    (heading) => headingText(heading) === "links",
  )
  if (!linksHeading) return

  const list = collectSectionNodes(linksHeading).find(
    (node) => node.tagName === "UL" || node.tagName === "OL",
  )
  if (!list || list.classList.contains("portfolio-entry-links")) return

  list.classList.add("portfolio-entry-links")
  for (const anchor of list.querySelectorAll("a")) {
    if (anchor.classList.contains("portfolio-bookmark")) continue

    const href = anchor.getAttribute("href") ?? ""
    const text = anchor.textContent?.replace(/\s+/g, " ").trim() ?? ""
    const parts = text.split(/\s*\|\s*/)
    let title = text
    let date = ""
    if (parts.length >= 2) {
      date = parts.pop()?.trim() ?? ""
      title = parts.join(" | ").trim() || text
    }

    const host = linkHostname(href)
    const metaParts = [host, date ? formatLinkDate(date) : ""].filter(Boolean)

    const icon = document.createElement("span")
    icon.className = "portfolio-bookmark__icon"
    icon.setAttribute("aria-hidden", "true")
    icon.textContent = href.startsWith("/") ? "↗" : "⧉"

    const body = document.createElement("span")
    body.className = "portfolio-bookmark__body"

    const titleSpan = document.createElement("span")
    titleSpan.className = "portfolio-bookmark__title"
    titleSpan.textContent = title || href

    body.append(titleSpan)
    if (metaParts.length) {
      const metaSpan = document.createElement("span")
      metaSpan.className = "portfolio-bookmark__meta"
      metaSpan.textContent = metaParts.join(" · ")
      body.append(metaSpan)
    }

    const isInternal =
      anchor.classList.contains("internal") ||
      anchor.classList.contains("internal-link") ||
      href.startsWith("/") ||
      href.startsWith(".") ||
      href.startsWith(location.origin) ||
      (!!href && !/^(https?:|mailto:|tel:|#)/i.test(href))
    anchor.classList.add("portfolio-bookmark")
    if (isInternal) anchor.classList.add("portfolio-bookmark--internal")
    if (!isInternal && !anchor.target) {
      anchor.target = "_blank"
      anchor.rel = "noreferrer"
    }
    anchor.replaceChildren(icon, body)
  }
}

function enhanceEntryContent(root: ParentNode = document) {
  enhanceEntryGallery(root)
  enhanceEntryLinks(root)
  enhanceInlineLinkIcons(root)
  wireReel(root)
}

function firstHtmlImage(value: unknown) {
  const html = String(value ?? "")
  if (!html) return ""
  const doc = new DOMParser().parseFromString(html, "text/html")
  const src = doc.querySelector("img")?.getAttribute("src")
  return src ? safeUrl(src, "") : ""
}

function newsletterImageUrl(item: Record<string, unknown>) {
  const enclosure = item.enclosure as { link?: string } | undefined
  return (
    safeUrl(item.thumbnail, "") ||
    safeUrl(enclosure?.link, "") ||
    firstHtmlImage(item.content) ||
    firstHtmlImage(item.description)
  )
}

function renderNewsletter(item: Record<string, unknown>) {
  const root = document.querySelector<HTMLElement>("[data-newsletter-card]")
  if (!root) return

  const title = root.querySelector<HTMLElement>("[data-newsletter-title]")
  const description = root.querySelector<HTMLElement>("[data-newsletter-description]")
  const date = root.querySelector<HTMLElement>("[data-newsletter-date]")
  const link = root.querySelector<HTMLAnchorElement>("[data-newsletter-link]")
  const image = root.querySelector<HTMLImageElement>("[data-newsletter-image]")

  if (title) title.textContent = String(item.title ?? "Latest newsletter")
  if (description) {
    const toPlain = (value: unknown) =>
      new DOMParser().parseFromString(String(value ?? ""), "text/html").body.textContent?.trim() ??
      ""
    const fromDescription = toPlain(item.description)
    const fromContent = toPlain(item.content)
    const plain = fromContent.length > fromDescription.length ? fromContent : fromDescription
    const clipped = plain.slice(0, NEWSLETTER_PREVIEW_CHARS).trim()
    description.textContent =
      plain.length > NEWSLETTER_PREVIEW_CHARS ? `${clipped.replace(/\s+\S*$/, "")}…` : clipped
  }
  if (date && item.pubDate) {
    const parsed = new Date(String(item.pubDate))
    date.textContent = Number.isNaN(parsed.getTime())
      ? ""
      : new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(parsed)
  }
  if (link) link.href = safeUrl(item.link, NEWSLETTER_URL)

  const imageUrl = newsletterImageUrl(item)
  if (image && imageUrl) {
    image.src = imageUrl
    image.alt = String(item.title ?? "Newsletter cover")
    image.hidden = false
  }
  root.dataset.state = "ready"
}

async function loadNewsletter() {
  const root = document.querySelector<HTMLElement>("[data-newsletter-card]")
  if (!root || root.dataset.loaded === "true") return
  root.dataset.loaded = "true"

  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "null") as {
      savedAt?: number
      item?: Record<string, unknown>
    } | null
    if (cached?.item && cached.savedAt && Date.now() - cached.savedAt < CACHE_TTL) {
      renderNewsletter(cached.item)
      return
    }
  } catch {
    localStorage.removeItem(CACHE_KEY)
  }

  const controller = new AbortController()
  ;(window as CleanupWindow).addCleanup?.(() => controller.abort())

  try {
    const response = await fetch(NEWSLETTER_ENDPOINT, { signal: controller.signal })
    if (!response.ok) throw new Error(`Newsletter request failed: ${response.status}`)
    const payload = (await response.json()) as { items?: Record<string, unknown>[] }
    const item = payload.items?.[0]
    if (!item) throw new Error("Newsletter returned no posts")
    localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), item }))
    renderNewsletter(item)
  } catch {
    root.dataset.state = "fallback"
  }
}

function wireViewToggle() {
  const collection = document.querySelector<HTMLElement>("[data-portfolio-collection]")
  if (!collection) return

  const buttons = [...collection.querySelectorAll<HTMLButtonElement>("[data-view-mode]")]
  const panels = {
    gallery: collection.querySelector<HTMLElement>('[data-view-panel="gallery"]'),
    timeline: collection.querySelector<HTMLElement>('[data-view-panel="timeline"]'),
  }

  const sortGroup = collection.querySelector<HTMLElement>("[data-sort-toggle]")

  const setMode = (mode: "gallery" | "timeline") => {
    collection.dataset.view = mode
    for (const button of buttons) {
      button.setAttribute("aria-pressed", String(button.dataset.viewMode === mode))
    }
    if (panels.gallery) panels.gallery.hidden = mode !== "gallery"
    if (panels.timeline) panels.timeline.hidden = mode !== "timeline"
    if (sortGroup) {
      sortGroup.hidden = mode !== "gallery"
      if (mode !== "gallery") sortGroup.style.display = "none"
      else sortGroup.style.removeProperty("display")
    }
  }

  const onClick = (event: Event) => {
    const target = event.currentTarget as HTMLButtonElement
    const mode = target.dataset.viewMode
    if (mode === "gallery" || mode === "timeline") setMode(mode)
  }

  for (const button of buttons) button.addEventListener("click", onClick)
  setMode((collection.dataset.view as "gallery" | "timeline") || "gallery")

  ;(window as CleanupWindow).addCleanup?.(() => {
    for (const button of buttons) button.removeEventListener("click", onClick)
  })
}

/** Case-insensitive fuzzy match: substring or ordered subsequence, per whitespace token. */
function fuzzyMatch(haystack: string, needle: string): boolean {
  const query = needle.trim().toLowerCase()
  if (!query) return true
  const text = haystack.toLowerCase()
  if (!text) return false

  return query.split(/\s+/).every((token) => {
    if (!token) return true
    if (text.includes(token)) return true
    let index = 0
    for (const char of text) {
      if (char === token[index]) index += 1
      if (index >= token.length) return true
    }
    return false
  })
}

function itemMatchesFilters(
  item: HTMLElement,
  query: string,
  significance: string,
  tags: string[],
): boolean {
  if (significance !== "all") {
    const value = item.dataset.filterSignificance || "minor"
    if (value !== significance) return false
  }

  // Tag chips use OR: match if the item has any selected tag.
  if (tags.length) {
    const itemTags = (item.dataset.filterTags || "")
      .split("|")
      .map((tag) => tag.trim())
      .filter(Boolean)
    if (!tags.some((tag) => itemTags.includes(tag))) return false
  }

  if (query && !fuzzyMatch(item.dataset.filterText || "", query)) return false

  return true
}

function wireCollectionFilters() {
  const collection = document.querySelector<HTMLElement>("[data-portfolio-collection]")
  const root = collection?.querySelector<HTMLElement>("[data-portfolio-filters]")
  if (!collection || !root || root.dataset.wired === "true") return
  root.dataset.wired = "true"

  const toggle = collection.querySelector<HTMLButtonElement>("[data-filter-toggle]")
  const sortGroup = collection.querySelector<HTMLElement>("[data-sort-toggle]")
  const sortButtons = sortGroup
    ? [...sortGroup.querySelectorAll<HTMLButtonElement>("[data-sort-mode]")]
    : []
  const panel = root.querySelector<HTMLElement>("[data-filter-panel]")
  const badge = collection.querySelector<HTMLElement>("[data-filter-badge]")
  const search = root.querySelector<HTMLInputElement>("[data-filter-search]")
  const significanceButtons = [
    ...root.querySelectorAll<HTMLButtonElement>("[data-filter-significance]"),
  ]
  const combobox = root.querySelector<HTMLElement>("[data-tag-combobox]")
  const tagQuery = combobox?.querySelector<HTMLInputElement>("[data-tag-query]")
  const tagSelected = combobox?.querySelector<HTMLElement>("[data-tag-selected]")
  const tagOptions = combobox?.querySelector<HTMLElement>("[data-tag-options]")
  const tagOptionItems = tagOptions
    ? [...tagOptions.querySelectorAll<HTMLElement>("[data-tag-option]")]
    : []
  const empty = root.querySelector<HTMLElement>("[data-filter-empty]")
  const countVisible = collection.querySelector<HTMLElement>("[data-collection-count-visible]")
  const items = [...collection.querySelectorAll<HTMLElement>("[data-portfolio-item]")]
  const gallery = collection.querySelector<HTMLElement>('[data-view-panel="gallery"]')

  let significance = "all"
  const selectedTags = new Set<string>()
  let tagMenuOpen = false
  let panelOpen = false
  let sortMode: "significance" | "date" =
    sortButtons.find((button) => button.getAttribute("aria-pressed") === "true")?.dataset
      .sortMode === "date"
      ? "date"
      : "significance"

  const syncSortToggle = () => {
    for (const button of sortButtons) {
      button.setAttribute("aria-pressed", String(button.dataset.sortMode === sortMode))
    }
  }

  const applyGallerySort = () => {
    if (!gallery) return
    const cards = [...gallery.querySelectorAll<HTMLElement>("[data-portfolio-item]")]
    cards.sort((a, b) => {
      const sigA = Number(a.dataset.sortSignificance ?? 2)
      const sigB = Number(b.dataset.sortSignificance ?? 2)
      const recA = Number(a.dataset.sortRecency ?? 0)
      const recB = Number(b.dataset.sortRecency ?? 0)
      const titleA = a.dataset.sortTitle ?? ""
      const titleB = b.dataset.sortTitle ?? ""
      if (sortMode === "significance") {
        if (sigA !== sigB) return sigA - sigB
        if (recA !== recB) return recB - recA
        return titleA.localeCompare(titleB, undefined, { sensitivity: "base" })
      }
      if (recA !== recB) return recB - recA
      if (sigA !== sigB) return sigA - sigB
      return titleA.localeCompare(titleB, undefined, { sensitivity: "base" })
    })
    for (const card of cards) gallery.append(card)
    syncSortToggle()
  }

  const setPanelOpen = (open: boolean) => {
    panelOpen = open
    if (panel) panel.hidden = !open
    toggle?.setAttribute("aria-expanded", String(open))
    toggle?.classList.toggle("is-open", open)
    if (open) queueMicrotask(() => search?.focus())
    else setTagMenuOpen(false)
  }

  const setTagMenuOpen = (open: boolean) => {
    tagMenuOpen = open
    if (tagOptions) tagOptions.hidden = !open
    tagQuery?.setAttribute("aria-expanded", String(open))
  }

  const syncFilterBadge = (query: string, tags: string[]) => {
    if (!badge || !toggle) return
    let active = tags.length
    if (query.trim()) active += 1
    if (significance !== "all") active += 1
    badge.textContent = String(active)
    badge.hidden = active === 0
    toggle.classList.toggle("has-active", active > 0)
  }

  const renderSelectedTags = () => {
    if (!tagSelected) return
    tagSelected.replaceChildren()
    for (const option of tagOptionItems) {
      const value = option.dataset.tagOption
      if (!value || !selectedTags.has(value)) continue
      const chip = document.createElement("button")
      chip.type = "button"
      chip.className = "portfolio-filters__chip"
      chip.dataset.tagRemove = value
      chip.setAttribute("aria-label", `Remove tag ${option.dataset.tagLabel || value}`)
      chip.textContent = option.dataset.tagLabel || value
      tagSelected.append(chip)
    }
  }

  const syncTagOptions = () => {
    const query = tagQuery?.value || ""
    for (const option of tagOptionItems) {
      const value = option.dataset.tagOption || ""
      const label = option.dataset.tagLabel || value
      const selected = selectedTags.has(value)
      option.setAttribute("aria-selected", String(selected))
      option.classList.toggle("is-selected", selected)
      const visible = fuzzyMatch(`${label} ${value}`, query)
      option.hidden = !visible
      if (visible) option.style.removeProperty("display")
      else option.style.display = "none"
    }
  }

  const apply = () => {
    const query = search?.value || ""
    const tags = [...selectedTags]
    const matchedSlugs = new Set<string>()

    for (const item of items) {
      const match = itemMatchesFilters(item, query, significance, tags)
      item.hidden = !match
      // Author `display` rules beat the UA `[hidden]` stylesheet; force hide.
      if (match) item.style.removeProperty("display")
      else item.style.display = "none"
      if (!match) continue
      const slug = item.getAttribute("data-project-slug")
      if (slug) matchedSlugs.add(slug)
    }

    const projectBoard = collection.querySelector<HTMLElement>(
      "[data-project-timeline] .portfolio-project-timeline__board",
    )
    if (projectBoard) {
      const filtersActive = Boolean(query.trim()) || significance !== "all" || tags.length > 0
      for (const mark of projectBoard.querySelectorAll<SVGElement | HTMLElement>("[data-project-slug]")) {
        if (mark.matches(".portfolio-project-timeline__card")) continue
        const slug = mark.getAttribute("data-project-slug")
        if (!slug) continue
        // SVG elements ignore `hidden`; use visibility so lanes stay aligned.
        mark.style.visibility = !filtersActive || matchedSlugs.has(slug) ? "" : "hidden"
      }
    }

    for (const group of collection.querySelectorAll<HTMLElement>("[data-timeline-group]")) {
      const children = [...group.querySelectorAll<HTMLElement>("[data-portfolio-item]")]
      const anyVisible = children.some((child) => !child.hidden)
      const hideGroup = children.length > 0 && !anyVisible
      group.hidden = hideGroup
      if (hideGroup) group.style.display = "none"
      else group.style.removeProperty("display")
    }

    // Gallery + timeline both carry items; count once from the gallery panel.
    const galleryItems = [
      ...collection.querySelectorAll<HTMLElement>('[data-view-panel="gallery"] [data-portfolio-item]'),
    ]
    const visible = galleryItems.filter((item) => !item.hidden).length
    if (countVisible) countVisible.textContent = String(visible)
    if (empty) empty.hidden = visible > 0 || galleryItems.length === 0
    syncFilterBadge(query, tags)
  }

  const toggleTag = (value: string) => {
    if (!value) return
    if (selectedTags.has(value)) selectedTags.delete(value)
    else selectedTags.add(value)
    renderSelectedTags()
    syncTagOptions()
    apply()
  }

  const onSearch = () => apply()
  search?.addEventListener("input", onSearch)

  const onSignificance = (event: Event) => {
    const button = event.currentTarget as HTMLButtonElement
    const value = button.dataset.filterSignificance || "all"
    significance = value
    for (const candidate of significanceButtons) {
      candidate.setAttribute(
        "aria-pressed",
        String(candidate.dataset.filterSignificance === significance),
      )
    }
    apply()
  }
  for (const button of significanceButtons) button.addEventListener("click", onSignificance)

  const onFilterToggle = () => setPanelOpen(!panelOpen)
  toggle?.addEventListener("click", onFilterToggle)

  const onSortMode = (event: Event) => {
    const button = event.currentTarget as HTMLButtonElement
    const mode = button.dataset.sortMode
    if (mode !== "significance" && mode !== "date") return
    sortMode = mode
    applyGallerySort()
  }
  for (const button of sortButtons) button.addEventListener("click", onSortMode)

  const onTagQueryInput = () => {
    setTagMenuOpen(true)
    syncTagOptions()
  }
  const onTagQueryFocus = () => {
    setTagMenuOpen(true)
    syncTagOptions()
  }
  const onTagQueryKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      if (tagMenuOpen) {
        setTagMenuOpen(false)
        return
      }
      setPanelOpen(false)
      toggle?.focus()
      return
    }
    if (event.key === "Enter") {
      event.preventDefault()
      const first = tagOptionItems.find((option) => !option.hidden)
      const value = first?.dataset.tagOption
      if (value) {
        toggleTag(value)
        if (tagQuery) tagQuery.value = ""
        syncTagOptions()
      }
    }
  }
  const onTagOptionsClick = (event: Event) => {
    const option = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-tag-option]")
    const value = option?.dataset.tagOption
    if (!value || !tagOptions?.contains(option)) return
    toggleTag(value)
  }
  const onSelectedClick = (event: Event) => {
    const chip = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-tag-remove]")
    const value = chip?.dataset.tagRemove
    if (!value) return
    selectedTags.delete(value)
    renderSelectedTags()
    syncTagOptions()
    apply()
  }
  const onDocumentPointer = (event: Event) => {
    if (!tagMenuOpen || !combobox) return
    const target = event.target as Node | null
    if (target && combobox.contains(target)) return
    setTagMenuOpen(false)
  }
  const onPanelKeydown = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || tagMenuOpen || !panelOpen) return
    if (event.target !== search && event.target !== tagQuery) return
    setPanelOpen(false)
    toggle?.focus()
  }

  tagQuery?.addEventListener("input", onTagQueryInput)
  tagQuery?.addEventListener("focus", onTagQueryFocus)
  tagQuery?.addEventListener("keydown", onTagQueryKeydown)
  tagOptions?.addEventListener("click", onTagOptionsClick)
  tagSelected?.addEventListener("click", onSelectedClick)
  search?.addEventListener("keydown", onPanelKeydown)
  document.addEventListener("pointerdown", onDocumentPointer)

  setPanelOpen(false)
  renderSelectedTags()
  syncTagOptions()
  syncSortToggle()
  apply()

  ;(window as CleanupWindow).addCleanup?.(() => {
    search?.removeEventListener("input", onSearch)
    search?.removeEventListener("keydown", onPanelKeydown)
    toggle?.removeEventListener("click", onFilterToggle)
    for (const button of sortButtons) button.removeEventListener("click", onSortMode)
    for (const button of significanceButtons) button.removeEventListener("click", onSignificance)
    tagQuery?.removeEventListener("input", onTagQueryInput)
    tagQuery?.removeEventListener("focus", onTagQueryFocus)
    tagQuery?.removeEventListener("keydown", onTagQueryKeydown)
    tagOptions?.removeEventListener("click", onTagOptionsClick)
    tagSelected?.removeEventListener("click", onSelectedClick)
    document.removeEventListener("pointerdown", onDocumentPointer)
    root.dataset.wired = "false"
  })
}

function modalRoot() {
  return document.querySelector<HTMLElement>("[data-portfolio-modal]")
}

function normalizeEntryPath(href: string) {
  try {
    const url = new URL(href, location.origin)
    const match = url.pathname.match(ENTRY_PATTERN)
    if (!match) return null
    return {
      slug: `${match[1]}/${match[2]}`,
      href: `/${match[1]}/${match[2]}`,
    }
  } catch {
    return null
  }
}

async function fetchEntryContent(href: string) {
  const cached = contentCache.get(href)
  if (cached) return cached

  const response = await fetch(href, { headers: { Accept: "text/html" } })
  if (!response.ok) throw new Error(`Failed to load ${href}`)
  const html = await response.text()
  const doc = new DOMParser().parseFromString(html, "text/html")
  const heading = doc.querySelector("[data-portfolio-entry-heading]")
  const article = doc.querySelector("article")
  const title =
    heading?.querySelector("h1")?.textContent?.trim() ||
    doc.querySelector("title")?.textContent?.trim() ||
    "Entry"

  if (!heading && !article) throw new Error(`No portfolio content in ${href}`)

  const shell = document.createElement("div")
  shell.className = "portfolio-modal__content"
  if (heading) shell.append(heading.cloneNode(true))
  if (article) {
    const body = article.cloneNode(true) as HTMLElement
    body.querySelector("[data-portfolio-entry-heading]")?.remove()
    shell.append(body)
  }

  shell.querySelectorAll(".portfolio-back").forEach((node) => node.remove())

  const result = { html: shell.innerHTML, title }
  contentCache.set(href, result)
  return result
}

function renderModal() {
  const root = modalRoot()
  if (!root) return

  const body = root.querySelector<HTMLElement>("[data-portfolio-modal-body]")
  const back = root.querySelector<HTMLButtonElement>("[data-portfolio-modal-back]")
  const panel = root.querySelector<HTMLElement>("[data-portfolio-modal-panel]")
  const current = modalStack[modalStack.length - 1]

  if (!current || !body) {
    root.hidden = true
    root.dataset.state = ""
    document.documentElement.classList.remove("portfolio-modal-open")
    return
  }

  body.innerHTML = current.html
  const titleNode = body.querySelector("h1")
  if (titleNode) titleNode.id = "portfolio-modal-title"
  enhanceEntryContent(body)

  if (back) back.hidden = modalStack.length < 2
  root.hidden = false
  document.documentElement.classList.add("portfolio-modal-open")
  panel?.focus({ preventScroll: true })
  body.scrollTop = 0
}

function syncModalUrl(href: string) {
  suppressingSpa = true
  history.pushState({ portfolioModal: true, href, depth: modalStack.length }, "", href)
  // Release on next tick so Quartz's popstate from unrelated actions still works.
  queueMicrotask(() => {
    suppressingSpa = false
  })
}

async function openEntry(href: string, options: { nested?: boolean } = {}) {
  const entry = normalizeEntryPath(href)
  if (!entry) return false

  const root = modalRoot()
  if (!root) return false

  // Full page already showing this entry: don't reopen as modal.
  if (
    !options.nested &&
    normalizeEntryPath(location.pathname)?.href === entry.href &&
    !modalStack.length
  ) {
    return false
  }

  if (!modalStack.length) {
    returnUrl = `${location.pathname}${location.search}${location.hash}`
  }

  try {
    root.dataset.state = "loading"
    root.hidden = false
    document.documentElement.classList.add("portfolio-modal-open")
    const content = await fetchEntryContent(entry.href)
    const frame: ModalFrame = {
      slug: entry.slug,
      href: entry.href,
      html: content.html,
      title: content.title,
    }

    const top = modalStack[modalStack.length - 1]
    if (top?.href === frame.href) {
      top.html = frame.html
      top.title = frame.title
    } else if (options.nested || modalStack.length) {
      modalStack.push(frame)
    } else {
      modalStack.length = 0
      modalStack.push(frame)
    }

    renderModal()
    root.dataset.state = "ready"
    syncModalUrl(entry.href)
    return true
  } catch {
    root.hidden = true
    document.documentElement.classList.remove("portfolio-modal-open")
    return false
  }
}

function closeModal() {
  modalStack.length = 0
  renderModal()
  suppressingSpa = true
  history.pushState({}, "", returnUrl)
  queueMicrotask(() => {
    suppressingSpa = false
  })
}

function modalBack() {
  if (modalStack.length < 2) {
    closeModal()
    return
  }
  modalStack.pop()
  renderModal()
  const current = modalStack[modalStack.length - 1]
  if (current) syncModalUrl(current.href)
}

function enlargeModal() {
  const current = modalStack[modalStack.length - 1]
  if (!current) return
  modalStack.length = 0
  renderModal()
  // Real navigation so the dedicated page is shareable/bookmarkable.
  const spaNavigate = (window as CleanupWindow).spaNavigate
  if (spaNavigate) {
    void spaNavigate(new URL(current.href, location.origin))
  } else {
    location.assign(current.href)
  }
}

function lightboxRoot() {
  return document.querySelector<HTMLElement>("[data-portfolio-lightbox-root]")
}

function isLightboxOpen() {
  const root = lightboxRoot()
  return Boolean(root && !root.hidden)
}

function closeLightbox() {
  const root = lightboxRoot()
  if (!root) return
  root.hidden = true
  document.documentElement.classList.remove("portfolio-lightbox-open")
  const image = root.querySelector<HTMLImageElement>("[data-portfolio-lightbox-image]")
  const caption = root.querySelector<HTMLElement>("[data-portfolio-lightbox-caption]")
  if (image) {
    image.removeAttribute("src")
    image.alt = ""
  }
  if (caption) {
    caption.textContent = ""
    caption.hidden = true
  }
}

function openLightbox(src: string, caption = "") {
  const root = lightboxRoot()
  if (!root || !src) return
  const image = root.querySelector<HTMLImageElement>("[data-portfolio-lightbox-image]")
  const captionNode = root.querySelector<HTMLElement>("[data-portfolio-lightbox-caption]")
  const panel = root.querySelector<HTMLElement>("[data-portfolio-lightbox-panel]")
  if (!image) return

  image.src = imageVariant(src, "full")
  image.alt = caption
  if (captionNode) {
    captionNode.textContent = caption
    captionNode.hidden = !caption
  }
  root.hidden = false
  document.documentElement.classList.add("portfolio-lightbox-open")
  panel?.focus({ preventScroll: true })
}

function wireLightbox() {
  const root = lightboxRoot()
  if (!root || root.dataset.wired === "true") return
  root.dataset.wired = "true"

  const onDocumentClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null
    if (!target) return

    if (target.closest("[data-portfolio-lightbox-close]")) {
      event.preventDefault()
      event.stopPropagation()
      closeLightbox()
      return
    }

    // Don't treat reel control clicks as lightbox opens.
    if (target.closest(".portfolio-coverflow__controls")) return

    const trigger = target.closest<HTMLElement>("[data-portfolio-lightbox]")
    if (!trigger) return
    if (trigger.closest("a[href]")) return

    const src = trigger.dataset.lightboxSrc || trigger.querySelector("img")?.getAttribute("src")
    if (!src) return

    event.preventDefault()
    event.stopPropagation()
    openLightbox(src, trigger.dataset.lightboxCaption ?? "")
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && isLightboxOpen()) {
      event.preventDefault()
      event.stopImmediatePropagation()
      closeLightbox()
      return
    }

    const target = event.target as HTMLElement | null
    const trigger = target?.closest?.("[data-portfolio-lightbox]") as HTMLElement | null
    if (!trigger || trigger.closest("a[href]")) return
    if (event.key !== "Enter" && event.key !== " ") return

    const src = trigger.dataset.lightboxSrc || trigger.querySelector("img")?.getAttribute("src")
    if (!src) return
    event.preventDefault()
    openLightbox(src, trigger.dataset.lightboxCaption ?? "")
  }

  document.addEventListener("click", onDocumentClick, true)
  document.addEventListener("keydown", onKeyDown)

  ;(window as CleanupWindow).addCleanup?.(() => {
    document.removeEventListener("click", onDocumentClick, true)
    document.removeEventListener("keydown", onKeyDown)
    root.dataset.wired = "false"
    closeLightbox()
  })
}

function wireModal() {
  const root = modalRoot()
  if (!root || root.dataset.wired === "true") return
  root.dataset.wired = "true"

  const onDocumentClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null
    if (!target) return

    if (target.closest("[data-portfolio-modal-close]")) {
      event.preventDefault()
      event.stopPropagation()
      closeModal()
      return
    }
    if (target.closest("[data-portfolio-modal-back]")) {
      event.preventDefault()
      event.stopPropagation()
      modalBack()
      return
    }
    if (target.closest("[data-portfolio-modal-enlarge]")) {
      event.preventDefault()
      event.stopPropagation()
      enlargeModal()
      return
    }

    const openLink = target.closest<HTMLAnchorElement>("a[href]")
    if (!openLink) return
    if (
      openLink.target === "_blank" ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return
    }

    const href = openLink.getAttribute("href")
    if (!href) return
    const entry = normalizeEntryPath(href)
    if (!entry) return

    // Already on the full entry page with no modal: allow normal SPA navigation.
    if (!modalStack.length && normalizeEntryPath(location.pathname)?.href === entry.href) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    void openEntry(entry.href, { nested: modalStack.length > 0 })
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return
    if (isLightboxOpen()) return
    if (modalStack.length) {
      event.preventDefault()
      closeModal()
    }
  }

  const onPopState = (event: PopStateEvent) => {
    if (suppressingSpa) return
    const state = event.state as { portfolioModal?: boolean; href?: string; depth?: number } | null

    if (state?.portfolioModal && state.href) {
      // Browser moved between modal frames.
      while (modalStack.length > (state.depth ?? 1)) modalStack.pop()
      if (!modalStack.length || modalStack[modalStack.length - 1]?.href !== state.href) {
        void openEntry(state.href, { nested: false }).then(() => {
          // openEntry pushes history; avoid doubling after popstate.
        })
      } else {
        renderModal()
      }
      return
    }

    if (modalStack.length) {
      modalStack.length = 0
      renderModal()
    }
  }

  document.addEventListener("click", onDocumentClick, true)
  document.addEventListener("keydown", onKeyDown)
  window.addEventListener("popstate", onPopState)

  ;(window as CleanupWindow).addCleanup?.(() => {
    document.removeEventListener("click", onDocumentClick, true)
    document.removeEventListener("keydown", onKeyDown)
    window.removeEventListener("popstate", onPopState)
    root.dataset.wired = "false"
  })
}

function styleHomeProfileLinks() {
  const last = document.querySelector(".portfolio-home-markdown > p:last-child")
  if (!last) return
  if (![...last.querySelectorAll("a")].length) return
  last.classList.add("portfolio-profile-links")
}

function readLinkIconMap(): LinkIconMap {
  const node = document.querySelector("[data-portfolio-link-icons]")
  if (!node?.textContent?.trim()) return {}
  try {
    const parsed = JSON.parse(node.textContent) as LinkIconMap
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

function createInlineIcon(src: string) {
  const icon = document.createElement("img")
  icon.className = "portfolio-inline-icon"
  icon.src = src
  icon.alt = ""
  icon.setAttribute("aria-hidden", "true")
  icon.loading = "lazy"
  icon.decoding = "async"
  return icon
}

/** Wrap icon + the first word so the badge never orphans on its own line. */
function prependIconToLabel(host: HTMLElement, src: string) {
  if (host.querySelector(":scope > .portfolio-icon-label, :scope > .portfolio-inline-icon")) return

  const icon = createInlineIcon(src)
  const label = document.createElement("span")
  label.className = "portfolio-icon-label"
  label.append(icon)

  const firstText = [...host.childNodes].find(
    (node) => node.nodeType === Node.TEXT_NODE && (node.textContent?.trim().length ?? 0) > 0,
  ) as Text | undefined

  if (firstText) {
    const value = firstText.textContent ?? ""
    const match = value.match(/^(\s*)(\S+)([\s\S]*)$/)
    if (match) {
      const [, leading, firstWord, rest] = match
      if (leading) host.insertBefore(document.createTextNode(leading), firstText)
      label.append(document.createTextNode(firstWord))
      firstText.textContent = rest
      host.insertBefore(label, firstText)
      return
    }
  }

  host.insertBefore(label, host.firstChild)
}

function nextElementSkippingWhitespace(node: Node): Element | null {
  let current = node.nextSibling
  while (current) {
    if (current.nodeType === Node.TEXT_NODE) {
      if ((current.textContent ?? "").trim()) return null
      current = current.nextSibling
      continue
    }
    if (current.nodeType === Node.ELEMENT_NODE) return current as Element
    current = current.nextSibling
  }
  return null
}

/**
 * Replace `:key:` shortcodes inferred from `content/assets/icons/` filenames.
 * If a shortcode sits immediately before a link, the icon merges into that link.
 */
function enhanceInlineLinkIcons(root: ParentNode = document) {
  const icons = readLinkIconMap()
  const pattern = linkIconShortcodeRegex(icons)
  if (!pattern) return

  const scopes: ParentNode[] = []
  if (root instanceof Element) {
    if (root.matches(".portfolio-home-markdown, article, .portfolio-modal__content")) {
      scopes.push(root)
    }
    scopes.push(
      ...root.querySelectorAll(".portfolio-home-markdown, article, .portfolio-modal__content"),
    )
  } else {
    scopes.push(
      ...root.querySelectorAll(".portfolio-home-markdown, article, .portfolio-modal__content"),
    )
  }

  for (const scope of scopes) {
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT)
    const textNodes: Text[] = []
    while (walker.nextNode()) textNodes.push(walker.currentNode as Text)

    for (const node of textNodes) {
      if (!node.parentElement) continue
      if (node.parentElement.closest("script, style, .portfolio-icon-label, .portfolio-bookmark")) {
        continue
      }

      const value = node.textContent ?? ""
      pattern.lastIndex = 0
      const matches = [...value.matchAll(pattern)]
      if (!matches.length) continue

      const parent = node.parentNode
      if (!parent) continue
      const parentAnchor = node.parentElement.closest("a")

      if (parentAnchor) {
        node.textContent = value.replace(pattern, (full, key: string) =>
          icons[key.toLowerCase()] ? "" : full,
        )
        const seen = new Set<string>()
        for (const match of matches) {
          const key = match[1].toLowerCase()
          const src = icons[key]
          if (!src || seen.has(key)) continue
          seen.add(key)
          prependIconToLabel(parentAnchor, src)
        }
        if (!(node.textContent ?? "").length) parent.removeChild(node)
        continue
      }

      let cursor = 0
      for (let i = 0; i < matches.length; i++) {
        const match = matches[i]
        const index = match.index ?? 0
        const key = match[1].toLowerCase()
        const src = icons[key]
        if (!src) continue

        if (index > cursor) {
          parent.insertBefore(document.createTextNode(value.slice(cursor, index)), node)
        }

        const afterInNode = value.slice(index + match[0].length)
        const isLast = i === matches.length - 1
        const following =
          isLast && !afterInNode.trim() ? nextElementSkippingWhitespace(node) : null

        if (following instanceof HTMLAnchorElement) {
          prependIconToLabel(following, src)
        } else {
          const label = document.createElement("span")
          label.className = "portfolio-icon-label"
          label.append(createInlineIcon(src))
          parent.insertBefore(label, node)
        }

        cursor = index + match[0].length
      }

      const rest = value.slice(cursor)
      if (rest) node.textContent = rest
      else parent.removeChild(node)
    }
  }
}

function enhanceHomeBioIcons() {
  const markdown = document.querySelector(".portfolio-home-markdown")
  if (!markdown) return
  enhanceInlineLinkIcons(markdown)
}

function adoptSearchIntoNav() {
  const host = document.querySelector<HTMLElement>("[data-portfolio-search-host]")
  const search = document.querySelector<HTMLElement>(".search")
  if (!host || !search || host.contains(search)) return
  host.appendChild(search)
}

function closeSearchOverlay() {
  const root = document.querySelector<HTMLElement>(".search")
  const container = root?.querySelector<HTMLElement>(".search-container")
  const button = root?.querySelector<HTMLButtonElement>(".search-button")
  const input = root?.querySelector<HTMLInputElement>(".search-bar")
  const layout = root?.querySelector<HTMLElement>(".search-layout")
  const results = root?.querySelector<HTMLElement>(".results-container")
  const preview = root?.querySelector<HTMLElement>(".preview-container")
  container?.classList.remove("active")
  button?.setAttribute("aria-expanded", "false")
  layout?.classList.remove("display-results")
  if (input) input.value = ""
  results?.replaceChildren()
  preview?.replaceChildren()
}

function currentSearchQuery(): string {
  const raw = document.querySelector<HTMLInputElement>(".search-bar")?.value ?? ""
  return raw
    .split(/\s+/)
    .filter((part) => part && !part.startsWith("#"))
    .join(" ")
    .trim()
}

/** Highlight query terms in preview text. Skips single letters (they mark every match); digits OK. */
function highlightSearchMatches(root: HTMLElement, query: string) {
  if (!query) return
  const terms = query
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2 || /^\d$/.test(term))
    .sort((a, b) => b.length - a.length)
  if (!terms.length) return
  const escaped = terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")
  if (!escaped) return
  const re = new RegExp(escaped, "gi")
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  let node = walker.nextNode()
  while (node) {
    nodes.push(node)
    node = walker.nextNode()
  }

  for (const textNode of nodes) {
    // Don't highlight inside UI chrome (toolbar / expand control).
    if (textNode.parentElement?.closest(".portfolio-search-preview__toolbar")) continue
    const value = textNode.nodeValue ?? ""
    re.lastIndex = 0
    if (!re.test(value)) continue
    re.lastIndex = 0
    const frag = document.createDocumentFragment()
    let last = 0
    let match: RegExpExecArray | null
    while ((match = re.exec(value)) !== null) {
      if (match.index > last) {
        frag.appendChild(document.createTextNode(value.slice(last, match.index)))
      }
      const mark = document.createElement("span")
      mark.className = "highlight"
      mark.textContent = match[0]
      frag.appendChild(mark)
      last = match.index + match[0].length
    }
    if (last < value.length) {
      frag.appendChild(document.createTextNode(value.slice(last)))
    }
    textNode.parentNode?.replaceChild(frag, textNode)
  }
}

function scrollPreviewToHighlight(preview: HTMLElement) {
  const highlights = Array.from(preview.getElementsByClassName("highlight")) as HTMLElement[]
  if (!highlights.length) return
  highlights.sort((a, b) => (b.textContent?.length ?? 0) - (a.textContent?.length ?? 0))
  highlights[0]?.scrollIntoView({ block: "center", inline: "nearest" })
}

function openSearchPreviewPage(href: string) {
  const query = currentSearchQuery()
  if (query) sessionStorage.setItem("search-term", query)
  closeSearchOverlay()
  // Navigate after the overlay closes so SPA swap isn't painted under an open search.
  queueMicrotask(() => {
    const spaNavigate = (window as CleanupWindow).spaNavigate
    if (spaNavigate) {
      void spaNavigate(new URL(href, location.origin))
    } else {
      location.assign(href)
    }
  })
}

/**
 * Portfolio modal-style search preview in our own pane.
 * Quartz keeps writing to `.preview-container` on hover — we hide that node and
 * never mount into it, so it can't flash or fight our scroll position.
 */
function wireSearchPortfolioPreview() {
  const search = document.querySelector<HTMLElement>(".search")
  if (!search || search.dataset.portfolioPreview === "true") return
  search.dataset.portfolioPreview = "true"

  let requestId = 0
  let activeHref = ""
  let activeQuery = ""
  let loadingHref = ""
  let savedScrollTop = 0
  /** Raw entry HTML from fetchEntryContent — re-highlight when the query changes. */
  const htmlCache = new Map<string, string>()

  const cardHref = (card: Element | null): string | null => {
    if (!(card instanceof HTMLAnchorElement) || card.classList.contains("no-match")) return null
    return card.getAttribute("href") || (card.id ? `/${card.id}` : "") || null
  }

  /** Focused card, else first match — keeps preview in sync when the query changes. */
  const preferredResultHref = (): string | null =>
    cardHref(search.querySelector(".result-card.focus:not(.no-match)")) ??
    cardHref(search.querySelector(".result-card:not(.no-match)"))

  /**
   * Sibling pane Quartz does not own. Wait until Quartz has created both columns,
   * then keep order: results → preview-container (hidden) → our pane.
   * Inserting earlier makes us the first flex child (empty left / results right).
   */
  const ensurePane = (): HTMLElement | null => {
    const layout = search.querySelector<HTMLElement>(".search-layout")
    if (!layout) return null

    const results = layout.querySelector<HTMLElement>(".results-container")
    const quartzPreview = layout.querySelector<HTMLElement>(".preview-container")
    if (!results || !quartzPreview) return null

    layout.dataset.portfolioPreviewOwned = "true"

    let pane = layout.querySelector<HTMLElement>("[data-portfolio-search-preview-pane]")
    if (!pane) {
      pane = document.createElement("div")
      pane.className = "portfolio-search-preview-pane"
      pane.dataset.portfolioSearchPreviewPane = "true"
      pane.addEventListener(
        "scroll",
        () => {
          savedScrollTop = pane!.scrollTop
        },
        { passive: true },
      )
    }

    // Re-assert order every call — Quartz may recreate/reorder columns.
    if (layout.firstElementChild !== results) layout.prepend(results)
    if (results.nextElementSibling !== quartzPreview) results.after(quartzPreview)
    if (quartzPreview.nextElementSibling !== pane) quartzPreview.after(pane)

    return pane
  }

  const buildWrap = (entryHref: string, html: string, query: string): HTMLElement => {
    const wrap = document.createElement("div")
    wrap.className = "portfolio-search-preview"
    wrap.dataset.portfolioPreviewHref = entryHref
    wrap.dataset.portfolioPreviewQuery = query

    const toolbar = document.createElement("div")
    toolbar.className = "portfolio-search-preview__toolbar"
    const expand = document.createElement("a")
    expand.className = "portfolio-search-preview__expand"
    expand.href = entryHref
    expand.setAttribute("aria-label", "Open full page")
    expand.innerHTML = `<span aria-hidden="true">↗</span><span>Open full page</span>`
    expand.addEventListener("click", (event) => {
      event.preventDefault()
      event.stopPropagation()
      openSearchPreviewPage(entryHref)
    })
    toolbar.append(expand)

    const shell = document.createElement("div")
    shell.className = "portfolio-modal__content"
    shell.innerHTML = html
    highlightSearchMatches(shell, query)
    wrap.replaceChildren(toolbar, shell)
    enhanceEntryContent(shell)
    return wrap
  }

  const show = (pane: HTMLElement, wrap: HTMLElement, scrollToMatch: boolean) => {
    pane.replaceChildren(wrap)
    if (scrollToMatch) {
      pane.scrollTop = 0
      requestAnimationFrame(() => {
        scrollPreviewToHighlight(pane)
        savedScrollTop = pane.scrollTop
      })
      return
    }
    pane.scrollTop = savedScrollTop
  }

  const render = async (rawHref: string) => {
    const entry = normalizeEntryPath(rawHref)
    const pane = ensurePane()
    if (!pane) return

    if (!entry) {
      activeHref = ""
      loadingHref = ""
      pane.replaceChildren()
      return
    }

    const query = currentSearchQuery()
    const painted = pane.querySelector<HTMLElement>("[data-portfolio-preview-href]")
    if (
      painted?.dataset.portfolioPreviewHref === entry.href &&
      painted.dataset.portfolioPreviewQuery === query
    ) {
      activeHref = entry.href
      activeQuery = query
      return
    }

    // Already fetching this entry — don't start parallel loads (observer re-entry).
    if (loadingHref === entry.href && activeQuery === query) return

    const id = ++requestId
    const hrefChanged = activeHref !== entry.href
    const queryChanged = activeQuery !== query
    activeHref = entry.href
    activeQuery = query

    const mountFromHtml = (html: string) => {
      loadingHref = ""
      const wrap = buildWrap(entry.href, html, query)
      show(pane, wrap, hrefChanged || queryChanged)
    }

    const cachedHtml = htmlCache.get(entry.href)
    if (cachedHtml) {
      mountFromHtml(cachedHtml)
      return
    }

    loadingHref = entry.href
    const loading = document.createElement("div")
    loading.className = "portfolio-search-preview"
    loading.dataset.portfolioPreviewHref = entry.href
    loading.dataset.portfolioPreviewQuery = query
    loading.dataset.loading = "true"
    loading.innerHTML = `<p class="portfolio-search-preview__status">Loading…</p>`
    pane.replaceChildren(loading)

    try {
      const content = await fetchEntryContent(entry.href)
      if (id !== requestId || activeHref !== entry.href) return
      htmlCache.set(entry.href, content.html)
      mountFromHtml(content.html)
    } catch {
      if (id === requestId) {
        activeHref = ""
        loadingHref = ""
        pane.replaceChildren()
      }
    }
  }

  const onResultsInteract = (event: Event) => {
    const card = (event.target as Element | null)?.closest?.(".result-card")
    const href = cardHref(card ?? null)
    if (!href) return
    void render(href)
  }

  /** Follow the current results list (not the previously opened entry). */
  const syncToResults = () => {
    const href = preferredResultHref()
    if (href) {
      void render(href)
      return
    }
    // No matches — clear the stale preview and cancel in-flight mounts.
    requestId += 1
    activeHref = ""
    activeQuery = ""
    loadingHref = ""
    ensurePane()?.replaceChildren()
  }

  let syncTimer = 0
  const scheduleSyncToResults = () => {
    window.clearTimeout(syncTimer)
    // Let Quartz finish replacing cards / applying `.focus` before we read them.
    syncTimer = window.setTimeout(syncToResults, 0)
  }

  const onSearchInput = () => {
    scheduleSyncToResults()
  }

  /** Only watch the results list — never the preview pane (that caused a freeze loop). */
  let resultsObserver: MutationObserver | null = null
  const watchResults = () => {
    const results = search.querySelector(".results-container")
    if (!results || results.dataset.portfolioPreviewWatch === "true") return
    results.dataset.portfolioPreviewWatch = "true"
    resultsObserver?.disconnect()
    resultsObserver = new MutationObserver(() => {
      scheduleSyncToResults()
    })
    // childList only — subtree would re-fire on every highlight rewrite inside cards.
    resultsObserver.observe(results, { childList: true })
  }

  // search-layout / results-container are created lazily when search opens.
  // Stay attached until both Quartz columns exist — early disconnect left the pane
  // as the first flex child and skipped the results observer (page freeze / empty left).
  const layoutObserver = new MutationObserver(() => {
    const pane = ensurePane()
    watchResults()
    const watching = search.querySelector(".results-container")?.dataset.portfolioPreviewWatch === "true"
    if (!pane || !watching) return
    layoutObserver.disconnect()
    scheduleSyncToResults()
  })
  layoutObserver.observe(search, { childList: true, subtree: true })

  search.addEventListener("mouseover", onResultsInteract)
  search.addEventListener("focusin", onResultsInteract)
  search.querySelector(".search-bar")?.addEventListener("input", onSearchInput)
  ensurePane()
  watchResults()

  ;(window as CleanupWindow).addCleanup?.(() => {
    window.clearTimeout(syncTimer)
    layoutObserver.disconnect()
    resultsObserver?.disconnect()
    search.removeEventListener("mouseover", onResultsInteract)
    search.removeEventListener("focusin", onResultsInteract)
    search.querySelector(".search-bar")?.removeEventListener("input", onSearchInput)
    search.querySelector(".results-container")?.removeAttribute("data-portfolio-preview-watch")
    search.querySelector(".search-layout")?.removeAttribute("data-portfolio-preview-owned")
    search.querySelector("[data-portfolio-search-preview-pane]")?.remove()
    search.dataset.portfolioPreview = "false"
    activeHref = ""
    activeQuery = ""
    loadingHref = ""
    savedScrollTop = 0
    htmlCache.clear()
  })
}

function closeNavMenu() {
  const toggle = document.querySelector<HTMLButtonElement>("[data-portfolio-menu-toggle]")
  const menu = document.querySelector<HTMLElement>("[data-portfolio-menu]")
  if (!toggle || !menu) return
  menu.hidden = true
  toggle.setAttribute("aria-expanded", "false")
  toggle.setAttribute("aria-label", "Open menu")
}

function wireNavMenu() {
  const toggle = document.querySelector<HTMLButtonElement>("[data-portfolio-menu-toggle]")
  const menu = document.querySelector<HTMLElement>("[data-portfolio-menu]")
  const actions = toggle?.closest(".portfolio-nav__actions")
  if (!toggle || !menu || !actions || toggle.dataset.menuWired === "true") return
  toggle.dataset.menuWired = "true"

  const setOpen = (open: boolean) => {
    menu.hidden = !open
    toggle.setAttribute("aria-expanded", open ? "true" : "false")
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu")
  }

  const onToggle = (event: Event) => {
    event.stopPropagation()
    setOpen(menu.hidden)
  }
  const onDocClick = (event: MouseEvent) => {
    if (!actions.contains(event.target as Node)) closeNavMenu()
  }
  const onKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") closeNavMenu()
  }
  const onSearchOpen = () => {
    if (document.querySelector(".search-container.active")) closeNavMenu()
  }

  toggle.addEventListener("click", onToggle)
  document.addEventListener("click", onDocClick)
  document.addEventListener("keydown", onKeydown)
  document.addEventListener("click", onSearchOpen, true)

  ;(window as CleanupWindow).addCleanup?.(() => {
    toggle.removeEventListener("click", onToggle)
    document.removeEventListener("click", onDocClick)
    document.removeEventListener("keydown", onKeydown)
    document.removeEventListener("click", onSearchOpen, true)
    toggle.dataset.menuWired = "false"
    closeNavMenu()
  })
}

type TapNavigatorUAData = {
  getHighEntropyValues?: (hints: string[]) => Promise<{
    model?: string
    platform?: string
  }>
}

let tapModeGeneration = 0
let tapBannerObserver: IntersectionObserver | null = null

function linkedInHref() {
  const fromPage = document.querySelector<HTMLAnchorElement>(
    ".portfolio-home-markdown a[href*='linkedin.com']",
  )
  return fromPage?.href || TAP_LINKEDIN_FALLBACK
}

function timeOfDayPhrase(date = new Date()) {
  const hour = date.getHours()
  if (hour < 5) return "tonight"
  if (hour < 12) return "this morning"
  if (hour < 17) return "this afternoon"
  if (hour < 21) return "this evening"
  return "tonight"
}

function placeFromSearch(params: URLSearchParams) {
  const raw = params.get("at")?.trim() ?? ""
  if (!raw || raw.length > 40 || !TAP_PLACE_PATTERN.test(raw)) return null
  return raw
}

function isGenericPlatform(value: string) {
  return /^(android|ios|iphone|linux|windows|mac(?:os|intosh)?|chrome os)$/i.test(value.trim())
}

function looksLikeHardwareSku(model: string) {
  return /^(SM-|LM-|XT\d)/i.test(model) || /^[A-Z0-9._-]{8,}$/i.test(model)
}

function sanitizeModel(model: string) {
  const trimmed = model.trim()
  if (!trimmed || trimmed === "K" || trimmed.length > 40) return null
  if (!/^[\p{L}\p{N}][\p{L}\p{N} .'+-]{0,39}$/u.test(trimmed)) return null
  if (isGenericPlatform(trimmed) || looksLikeHardwareSku(trimmed)) return null
  return trimmed
}

function coarseDeviceLabel(ua: string) {
  if (/iPhone/i.test(ua)) return "iPhone"
  if (/Android/i.test(ua)) return "Android"
  return null
}

function pickDeviceLabel(model: string | undefined, platform: string | undefined, fallback: string | null) {
  const fromModel = model ? sanitizeModel(model) : null
  if (fromModel) return fromModel
  if (fallback) return fallback
  if (platform && /android/i.test(platform)) return "Android"
  if (platform && /iphone|ios/i.test(platform)) return "iPhone"
  return null
}

async function deviceLabel(fallback: string | null) {
  const uaData = (navigator as Navigator & { userAgentData?: TapNavigatorUAData }).userAgentData
  if (!uaData?.getHighEntropyValues) return fallback
  try {
    const high = await Promise.race([
      uaData.getHighEntropyValues(["model", "platform"]),
      new Promise<null>((resolve) => window.setTimeout(() => resolve(null), TAP_MODEL_HINT_MS)),
    ])
    if (!high) return fallback
    return pickDeviceLabel(high.model, high.platform, fallback)
  } catch {
    return fallback
  }
}

function tapGreeting(time: string, device: string | null, place: string | null) {
  const head = `Nice to meet you ${time}`
  if (device && place) return `${head}, ${device} user, at ${place}`
  if (device) return `${head}, ${device} user`
  if (place) return `${head} at ${place}`
  return head
}

function fillTapBanner(banner: HTMLAnchorElement, greeting: string) {
  banner.setAttribute("aria-label", `${greeting}! Connect on LinkedIn`)
  const greetingNode = banner.querySelector("[data-tap-greeting]")
  if (greetingNode) greetingNode.textContent = `${greeting}!`
}

function clearTapMode() {
  tapModeGeneration += 1
  tapBannerObserver?.disconnect()
  tapBannerObserver = null
  document.documentElement.removeAttribute("data-tap")
  document.documentElement.removeAttribute("data-tap-bar")
  document.querySelector("[data-portfolio-tap-banner]")?.remove()
  document.querySelector("[data-portfolio-tap-bar]")?.remove()
}

function stickyDismissed() {
  try {
    return sessionStorage.getItem(TAP_STICKY_DISMISS_KEY) === "1"
  } catch {
    return false
  }
}

function setTapBarVisible(visible: boolean) {
  if (stickyDismissed() || !visible) {
    document.documentElement.setAttribute("data-tap-bar", "hidden")
    return
  }
  document.documentElement.setAttribute("data-tap-bar", "shown")
}

function dismissTapSticky() {
  try {
    sessionStorage.setItem(TAP_STICKY_DISMISS_KEY, "1")
  } catch {
    // Private mode can throw; still hide for this page.
  }
  tapBannerObserver?.disconnect()
  tapBannerObserver = null
  setTapBarVisible(false)
}

function wireTapStickyVisibility(banner: Element) {
  tapBannerObserver?.disconnect()
  if (stickyDismissed()) {
    setTapBarVisible(false)
    return
  }

  tapBannerObserver = new IntersectionObserver(
    (entries) => {
      const entry = entries[0]
      if (!entry) return
      setTapBarVisible(!entry.isIntersecting)
    },
    { threshold: 0 },
  )
  tapBannerObserver.observe(banner)
}

function mountTapSticky(href: string) {
  if (stickyDismissed()) {
    setTapBarVisible(false)
    return
  }
  if (document.querySelector("[data-portfolio-tap-bar]")) return

  const bar = document.createElement("div")
  bar.className = "portfolio-tap-bar"
  bar.dataset.portfolioTapBar = ""

  const cta = document.createElement("a")
  cta.className = "portfolio-tap-bar__cta"
  cta.href = href
  cta.rel = "noopener noreferrer"
  cta.textContent = "Connect on LinkedIn"

  const dismiss = document.createElement("button")
  dismiss.type = "button"
  dismiss.className = "portfolio-tap-bar__dismiss"
  dismiss.setAttribute("aria-label", "Dismiss connect bar")
  dismiss.textContent = "×"
  dismiss.addEventListener("click", dismissTapSticky)

  bar.append(cta, dismiss)
  document.body.append(bar)
  setTapBarVisible(false)
}

function mountTapBanner(href: string, greeting: string) {
  const home = document.querySelector(".portfolio-home-copy")
  const heading = home?.querySelector("h1")
  if (!home || !heading) return null

  const existing = document.querySelector<HTMLAnchorElement>("[data-portfolio-tap-banner]")
  if (existing) {
    fillTapBanner(existing, greeting)
    return existing
  }

  const banner = document.createElement("a")
  banner.className = "portfolio-tap-banner"
  banner.dataset.portfolioTapBanner = ""
  banner.href = href
  banner.rel = "noopener noreferrer"

  const greetingNode = document.createElement("span")
  greetingNode.dataset.tapGreeting = ""
  greetingNode.className = "portfolio-tap-banner__greeting"

  const action = document.createElement("span")
  action.className = "portfolio-tap-banner__action"
  action.textContent = "connect on LinkedIn"

  banner.append(greetingNode, action)
  fillTapBanner(banner, greeting)
  heading.insertAdjacentElement("afterend", banner)
  return banner
}

async function initTapMode() {
  const params = new URLSearchParams(location.search)
  const home = document.querySelector(".portfolio-home-shell")
  if (params.get("tap") !== "true" || !home) {
    clearTapMode()
    return
  }

  const generation = ++tapModeGeneration
  document.documentElement.dataset.tap = "true"

  const href = linkedInHref()
  const time = timeOfDayPhrase()
  const place = placeFromSearch(params)
  const coarse = coarseDeviceLabel(navigator.userAgent)
  const banner = mountTapBanner(href, tapGreeting(time, coarse, place))
  mountTapSticky(href)
  if (banner) wireTapStickyVisibility(banner)

  ;(window as CleanupWindow).addCleanup?.(() => {
    if (generation === tapModeGeneration) clearTapMode()
  })

  const device = await deviceLabel(coarse)
  if (generation !== tapModeGeneration) return
  if (device !== coarse) {
    mountTapBanner(href, tapGreeting(time, device, place))
  }
}

function initializePortfolio() {
  // Fresh page render from SPA clears modal chrome; reset stack.
  if (!document.querySelector("[data-portfolio-modal]:not([hidden])")) {
    modalStack.length = 0
  }
  if (!isLightboxOpen()) {
    closeLightbox()
  }
  redirectLegacyHash()
  adoptSearchIntoNav()
  wireSearchPortfolioPreview()
  wireNavMenu()
  closeNavMenu()
  wireReel()
  wireTimelineGroups()
  wireProjectTimeline()
  wireViewToggle()
  wireCollectionFilters()
  wireLightbox()
  wireModal()
  // Full entry pages get the same gallery coverflow + bookmark links as the modal.
  if (normalizeEntryPath(location.pathname) || document.querySelector("[data-portfolio-entry-heading]")) {
    enhanceEntryContent(document)
  }
  styleHomeProfileLinks()
  enhanceHomeBioIcons()
  void loadNewsletter()
  void initTapMode()
}

document.addEventListener("nav", initializePortfolio)
document.addEventListener("render", initializePortfolio)
