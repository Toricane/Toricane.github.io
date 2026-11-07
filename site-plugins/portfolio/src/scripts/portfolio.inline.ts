import { imageVariant } from "../imageVariant"
import { adjacentEntry, collectionUrl, readCollectionState } from "../collectionState"
import { initializeTheme, type Theme } from "../theme"
import { transitionTheme } from "../themeTransition"
import { buildProjectTimeline, type ProjectTimelineInput } from "../projectTimeline"
import { linkIconShortcodeRegex, type LinkIconMap } from "../linkIcons"
import { initializeAnalytics, trackModalView, isTapLocation, analyticsPath } from "../analytics"

initializeAnalytics()

type CleanupWindow = Window & {
  addCleanup?: (cleanup: () => void) => void
  spaNavigate?: (url: URL) => Promise<void>
}

const ENTRY_PATTERN = /^\/(projects|awards)\/([^/]+)\/?$/
const TAP_STICKY_DISMISS_KEY = "portfolio:tap-sticky-dismissed"
const TAP_LINKEDIN_FALLBACK = "https://linkedin.com/in/prajwal-prashanth"
const TAP_PLACE_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} '\-]{0,39}$/u
const TAP_MODEL_HINT_MS = 200
const SESSION_GAP_MS = 20 * 60 * 1000
const SESSION_HEARTBEAT_MS = 30 * 1000
const SESSION_WHILE_MS = 7 * 24 * 60 * 60 * 1000
const VISIT_SESSION_KEY = "portfolio:sessions:visit"
const TAP_SESSION_KEY = "portfolio:sessions:tap"
const DEFAULT_HELLO = "Hello there!"

// Short, interruptible feedback. Native WAAPI keeps motion off the JS frame loop.
const feedbackAnimations = new WeakMap<Element, Animation>()
function feedback(element: Element | null, frames: Keyframe[], duration = 220) {
  if (!element) return null
  feedbackAnimations.get(element)?.cancel()
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null
  const animation = element.animate(frames, {
    duration,
    easing: "cubic-bezier(0.2, 0, 0, 1)",
  })
  feedbackAnimations.set(element, animation)
  const release = () => {
    if (feedbackAnimations.get(element) === animation) feedbackAnimations.delete(element)
  }
  animation.onfinish = release
  animation.oncancel = release
  return animation
}

type ModalFrame = {
  slug: string
  href: string
  html: string
  title: string
  entries: { href: string; trigger: HTMLAnchorElement }[]
}

const modalStack: ModalFrame[] = []
let modalVersion = 0
let modalReturnFocus: HTMLElement | null = null
const contentCache = new Map<string, { html: string; title: string }>()
let returnUrl = "/"
let suppressingSpa = false

function redirectLegacyHash() {
  if (location.pathname !== "/" && location.pathname !== "/index.html") return
  const hash = decodeURIComponent(location.hash.slice(1))
  const detail = hash.match(/^(projects|hackathons|awards)\/(.+)$/)
  if (detail) {
    const section = detail[1] === "hackathons" ? "projects" : detail[1]
    location.replace(`/${section}/${detail[2]}`)
    return
  }

  const sections: Record<string, string> = {
    content: "/projects/",
    projects: "/projects/",
    hackathons: "/tags/hackathon",
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
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const move = (direction: number) => {
      viewport.scrollBy({
        left: direction * viewport.clientWidth * 0.78,
        behavior: motion.matches ? "auto" : "smooth",
      })
    }
    const previousHandler = () => move(-1)
    const nextHandler = () => move(1)
    previous?.addEventListener("click", previousHandler)
    next?.addEventListener("click", nextHandler)

    if (!viewport.hasAttribute("data-reel-autoplay")) {
      ;(window as CleanupWindow).addCleanup?.(() => {
        previous?.removeEventListener("click", previousHandler)
        next?.removeEventListener("click", nextHandler)
        viewport.dataset.reelWired = "false"
      })
      continue
    }

    const pause = host?.querySelector<HTMLButtonElement>("[data-reel-pause]")
    let timer: ReturnType<typeof setTimeout> | undefined
    let inView = false
    let hovered = false
    let focused = false
    let paused = false
    const schedule = () => {
      clearTimeout(timer)
      if (
        motion.matches ||
        !inView ||
        hovered ||
        focused ||
        paused ||
        document.hidden ||
        document.querySelector(".portfolio-lightbox:not([hidden]), .portfolio-modal:not([hidden])")
      )
        return
      timer = setTimeout(() => {
        const items = [...viewport.querySelectorAll<HTMLElement>(".portfolio-coverflow__item")]
        const nextItem = items.find(
          (item) => item.offsetLeft - viewport.offsetLeft > viewport.scrollLeft + 12,
        )
        const atEnd = viewport.scrollLeft >= viewport.scrollWidth - viewport.clientWidth - 12
        viewport.scrollTo({
          left: !atEnd && nextItem ? nextItem.offsetLeft - viewport.offsetLeft : 0,
          behavior: "smooth",
        })
        schedule()
      }, 6000)
    }
    const updatePause = () => {
      if (pause) {
        pause.hidden = motion.matches
        pause.setAttribute(
          "aria-label",
          paused ? "Play automatic photos" : "Pause automatic photos",
        )
        pause.setAttribute("aria-pressed", String(paused))
      }
      schedule()
    }
    const togglePause = () => {
      paused = !paused
      updatePause()
    }
    const onEnter = () => {
      hovered = true
      schedule()
    }
    const onLeave = () => {
      hovered = false
      schedule()
    }
    const onFocus = () => {
      focused = true
      schedule()
    }
    const onBlur = (event: FocusEvent) => {
      focused = host?.contains(event.relatedTarget as Node) ?? false
      schedule()
    }
    const stopForInteraction = () => {
      paused = true
      updatePause()
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting
        schedule()
      },
      { threshold: 0.25 },
    )
    observer.observe(viewport)
    pause?.addEventListener("click", togglePause)
    host?.addEventListener("pointerenter", onEnter)
    host?.addEventListener("pointerleave", onLeave)
    host?.addEventListener("focusin", onFocus)
    host?.addEventListener("focusout", onBlur as EventListener)
    viewport.addEventListener("pointerdown", stopForInteraction)
    previous?.addEventListener("click", stopForInteraction)
    next?.addEventListener("click", stopForInteraction)
    document.addEventListener("visibilitychange", schedule)
    motion.addEventListener("change", updatePause)
    updatePause()

    ;(window as CleanupWindow).addCleanup?.(() => {
      previous?.removeEventListener("click", previousHandler)
      next?.removeEventListener("click", nextHandler)
      clearTimeout(timer)
      observer?.disconnect()
      pause?.removeEventListener("click", togglePause)
      host?.removeEventListener("pointerenter", onEnter)
      host?.removeEventListener("pointerleave", onLeave)
      host?.removeEventListener("focusin", onFocus)
      host?.removeEventListener("focusout", onBlur as EventListener)
      viewport.removeEventListener("pointerdown", stopForInteraction)
      previous?.removeEventListener("click", stopForInteraction)
      next?.removeEventListener("click", stopForInteraction)
      document.removeEventListener("visibilitychange", schedule)
      motion.removeEventListener("change", updatePause)
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
    ...root.querySelectorAll<HTMLElement>(
      "[data-project-timeline] .portfolio-project-timeline__board",
    ),
  ]
  for (const board of boards) {
    if (board.dataset.wired === "true") continue
    board.dataset.wired = "true"

    let activeSlug: string | null = null
    const marksBySlug = new Map<string, Element[]>()
    const indexMarks = () => {
      activeSlug = null
      marksBySlug.clear()
      for (const mark of board.querySelectorAll<Element>("[data-project-slug]")) {
        const slug = mark.getAttribute("data-project-slug")!
        const marks = marksBySlug.get(slug) ?? []
        marks.push(mark)
        marksBySlug.set(slug, marks)
      }
    }
    indexMarks()
    const setActive = (slug: string | null) => {
      if (slug === activeSlug) return
      for (const mark of marksBySlug.get(activeSlug ?? "") ?? []) mark.classList.remove("is-active")
      for (const mark of marksBySlug.get(slug ?? "") ?? []) mark.classList.add("is-active")
      activeSlug = slug
      board.classList.toggle("is-focusing", slug !== null)
    }

    const onOver = (event: Event) => {
      const target = (event.target as Element | null)?.closest?.("[data-project-slug]")
      if (!target || !board.contains(target)) return
      const slug = target.getAttribute("data-project-slug")
      if (slug) setActive(slug)
    }
    const onOut = (event: PointerEvent) => {
      const next = (event.relatedTarget as Element | null)?.closest?.("[data-project-slug]")
      if (next && board.contains(next)) return
      const focused = board.querySelector<HTMLElement>(".portfolio-project-timeline__card:focus")
      setActive(focused?.dataset.projectSlug ?? null)
    }
    const onFocusOut = (event: FocusEvent) => {
      const next = (event.relatedTarget as Element | null)?.closest?.("[data-project-slug]")
      setActive(next && board.contains(next) ? next.getAttribute("data-project-slug") : null)
    }
    // Touch feedback shares the link's normal opening gesture.
    const onTouchEnd = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") setActive(null)
    }

    board.addEventListener("pointerover", onOver)
    board.addEventListener("pointerout", onOut)
    board.addEventListener("pointerdown", onOver)
    board.addEventListener("pointerup", onTouchEnd)
    board.addEventListener("pointercancel", onTouchEnd)
    board.addEventListener("focusin", onOver)
    board.addEventListener("focusout", onFocusOut)
    board.addEventListener("portfolio:timelineupdated", indexMarks)
    ;(window as CleanupWindow).addCleanup?.(() => {
      board.removeEventListener("pointerover", onOver)
      board.removeEventListener("pointerout", onOut)
      board.removeEventListener("pointerdown", onOver)
      board.removeEventListener("pointerup", onTouchEnd)
      board.removeEventListener("pointercancel", onTouchEnd)
      board.removeEventListener("focusin", onOver)
      board.removeEventListener("focusout", onFocusOut)
      board.removeEventListener("portfolio:timelineupdated", indexMarks)
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

type EntryImage = { src: string; alt: string }

function entryImageFrom(img: Element): EntryImage | null {
  const src = img.getAttribute("src") ?? ""
  if (!src) return null
  return {
    src,
    alt: img.getAttribute("alt")?.trim() || img.getAttribute("title")?.trim() || "",
  }
}

function imagesIn(node: Element): EntryImage[] {
  if (node.tagName === "IMG") {
    const image = entryImageFrom(node)
    return image ? [image] : []
  }
  return [...node.querySelectorAll("img")]
    .map(entryImageFrom)
    .filter((image): image is EntryImage => image !== null)
}

function buildCoverflow(images: EntryImage[], ariaLabel: string) {
  const coverflow = document.createElement("section")
  coverflow.className = "portfolio-coverflow"
  coverflow.setAttribute("aria-label", ariaLabel)

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
  return coverflow
}

function buildInlineFigure(image: EntryImage) {
  const figure = document.createElement("figure")
  figure.className = "portfolio-inline-image"
  figure.dataset.portfolioLightbox = ""
  figure.dataset.lightboxSrc = imageVariant(image.src, "full")
  figure.dataset.lightboxCaption = image.alt
  figure.setAttribute("role", "button")
  figure.tabIndex = 0
  figure.setAttribute("aria-label", image.alt ? `Expand ${image.alt}` : "Expand photo")

  const img = document.createElement("img")
  img.src = imageVariant(image.src, "small")
  img.alt = image.alt
  img.loading = "lazy"
  img.decoding = "async"
  figure.append(img)
  if (image.alt) {
    const caption = document.createElement("figcaption")
    caption.textContent = image.alt
    figure.append(caption)
  }
  return figure
}

function isImageOnlyBlock(el: Element) {
  if (
    el.classList.contains("portfolio-coverflow") ||
    el.classList.contains("portfolio-inline-image") ||
    el.classList.contains("portfolio-coverflow__item") ||
    el.classList.contains("portfolio-entry-links") ||
    /^H[1-6]$/.test(el.tagName)
  ) {
    return false
  }
  if (el.tagName === "IMG") return true

  const images = el.querySelectorAll("img")
  if (!images.length) return false

  const clone = el.cloneNode(true) as Element
  for (const img of clone.querySelectorAll("img")) img.remove()
  for (const caption of clone.querySelectorAll("figcaption")) caption.remove()
  return (clone.textContent?.replace(/\s+/g, "") ?? "") === ""
}

function enhanceEntryGallery(root: ParentNode) {
  const article = root.querySelector("article")
  if (!article) return

  const galleryHeading = [...article.querySelectorAll("h2")].find(
    (heading) => headingText(heading) === "gallery",
  )
  if (!galleryHeading || galleryHeading.dataset.coverflowReady === "true") return

  const sectionNodes = collectSectionNodes(galleryHeading)
  const images = sectionNodes.flatMap(imagesIn)
  if (!images.length) return

  galleryHeading.insertAdjacentElement("afterend", buildCoverflow(images, "Gallery"))
  for (const node of sectionNodes) node.remove()
  galleryHeading.dataset.coverflowReady = "true"
}

function entryMarkdownHost(article: Element) {
  const heading = [...article.querySelectorAll("h2")].find((node) => headingText(node) !== "")
  return heading?.parentElement ?? article
}

function enhanceInlineImages(root: ParentNode) {
  const article = root.querySelector("article")
  if (!article) return

  const host = entryMarkdownHost(article)
  const groups: Element[][] = []
  let current: Element[] = []
  for (const el of [...host.children]) {
    if (isImageOnlyBlock(el)) {
      current.push(el)
      continue
    }
    if (current.length) groups.push(current)
    current = []
  }
  if (current.length) groups.push(current)

  for (const group of groups) {
    const images = group.flatMap(imagesIn)
    if (!images.length) continue
    const replacement =
      images.length === 1 ? buildInlineFigure(images[0]) : buildCoverflow(images, "Photos")
    group[0].replaceWith(replacement)
    for (const extra of group.slice(1)) extra.remove()
  }
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
  enhanceInlineImages(root)
  enhanceEntryLinks(root)
  enhanceInlineLinkIcons(root)
  wireReel(root)
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
    collection.dispatchEvent(new Event("portfolio:viewchange"))
  }

  const onClick = (event: Event) => {
    const target = event.currentTarget as HTMLButtonElement
    const mode = target.dataset.viewMode
    if (mode === "gallery" || mode === "timeline") {
      setMode(mode)
      collection.dispatchEvent(new Event("portfolio:collectionchange"))
    }
  }

  for (const button of buttons) button.addEventListener("click", onClick)
  const requestedView = new URLSearchParams(location.search).get("view")
  setMode(
    requestedView === "timeline"
      ? "timeline"
      : (collection.dataset.view as "gallery" | "timeline") || "gallery",
  )

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
    const value = item.dataset.filterSignificance || "standard"
    if (significance === "highlights" && value !== "spotlight" && value !== "featured") return false
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

const timelineLayoutCache = new WeakMap<
  HTMLElement,
  {
    source: string
    inputs: ProjectTimelineInput[]
    original: ReturnType<typeof buildProjectTimeline>
    signature?: string
  }
>()

function refreshProjectTimeline(
  board: HTMLElement,
  cards: HTMLElement[],
  matchedSlugs: Set<string>,
  compact: boolean,
) {
  const source = board.dataset.timelineInputs || "[]"
  let cached = timelineLayoutCache.get(board)
  if (!cached || cached.source !== source) {
    const inputs: ProjectTimelineInput[] = JSON.parse(source)
    cached = { source, inputs, original: buildProjectTimeline(inputs) }
    timelineLayoutCache.set(board, cached)
  }
  const signature = JSON.stringify([compact, [...matchedSlugs].sort()])
  if (cached.signature === signature) return
  const { inputs, original } = cached
  const model = buildProjectTimeline(
    inputs.filter((input) => matchedSlugs.has(input.slug)),
    {
      laneWidth: compact && original ? original.geometry.laneWidth * 0.5 : undefined,
    },
  )
  const months = board.querySelector<HTMLElement>(".portfolio-project-timeline__months")!
  const slots = board.querySelector<HTMLElement>(".portfolio-project-timeline__cards")!
  const svg = board.querySelector<SVGSVGElement>("svg")!
  const cardBySlug = new Map(cards.map((card) => [card.dataset.projectSlug, card]))
  // Retain unmatched cards for later filter changes without allocating grid rows.
  const hiddenCards = document.createElement("div")
  hiddenCards.style.display = "none"
  for (const card of cards) hiddenCards.append(card)
  slots.replaceChildren(hiddenCards)
  months.replaceChildren()
  svg.replaceChildren()
  board.classList.remove("is-focusing")
  board.hidden = !model
  board.style.display = model ? "" : "none"
  if (!model) {
    cached.signature = signature
    board.dispatchEvent(new Event("portfolio:timelineupdated"))
    return
  }

  // Keep each project's identifying hue when filtering changes lane packing.
  const colors = new Map(original!.tracks.map((track) => [track.slug, track.color]))
  for (const mark of [
    ...model.tracks,
    ...model.branches,
    ...model.connectors,
    ...model.segments,
    ...model.nodes,
  ]) {
    mark.color = colors.get(mark.slug) ?? mark.color
  }

  const { geometry } = model
  board.style.gridTemplateRows = geometry.rowHeights.map((height) => `${height}px`).join(" ")
  board.style.setProperty("--pt-months", String(model.months.length))
  board.style.setProperty("--pt-lanes", String(model.laneCount))
  board.style.setProperty("--pt-graph-w", `${geometry.svgWidth}px`)
  svg.setAttribute("width", String(geometry.svgWidth))
  svg.setAttribute("height", String(geometry.svgHeight))
  svg.setAttribute("viewBox", `0 0 ${geometry.svgWidth} ${geometry.svgHeight}`)

  let previousYear: number | undefined
  model.months.forEach((month, row) => {
    const label = document.createElement("div")
    label.className = "portfolio-project-timeline__month"
    label.dataset.month = month.key
    label.style.gridRow = String(row + 1)
    const text = document.createElement("span")
    if (month.kind === "gap") {
      label.classList.add("portfolio-project-timeline__month--gap")
      text.className = "portfolio-project-timeline__gap-label"
      text.textContent = month.label
    } else {
      label.dataset.season = ["winter", "spring", "summer", "fall"][
        Math.floor((month.month % 12) / 3)
      ]
      label.dataset.yearDigit = String(month.year % 10)
      if (previousYear !== month.year) {
        const year = document.createElement("span")
        year.className = "portfolio-project-timeline__year"
        year.textContent = String(month.year)
        label.append(year)
      }
      previousYear = month.year
      text.className = "portfolio-project-timeline__month-label"
      text.textContent = new Date(Date.UTC(month.year, month.month - 1, 1))
        .toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })
        .toUpperCase()
    }
    label.append(text)
    months.append(label)
    const slot = document.createElement("div")
    slot.className = "portfolio-project-timeline__card-slot"
    slot.dataset.month = month.key
    slot.style.gridRow = String(row + 1)
    for (const track of model.tracks) {
      if (track.bottomRow !== row) continue
      const card = cardBySlug.get(track.slug)
      if (card) {
        card.classList.remove("is-active")
        const dot = card.querySelector<HTMLElement>(".portfolio-project-timeline__card-dot")
        if (dot) {
          dot.style.setProperty("--pt-color", track.color)
        }
        slot.append(card)
      }
    }
    slots.append(slot)
  })

  const addMark = (
    tag: string,
    slug: string,
    className: string,
    attributes: Record<string, string | number>,
  ) => {
    const mark = document.createElementNS("http://www.w3.org/2000/svg", tag)
    mark.setAttribute("class", className)
    mark.setAttribute("data-project-slug", slug)
    for (const [key, value] of Object.entries(attributes)) mark.setAttribute(key, String(value))
    svg.append(mark)
  }
  for (const connector of model.connectors) {
    addMark(
      "path",
      connector.slug,
      "portfolio-project-timeline__connector portfolio-project-timeline__color",
      { d: connector.path, fill: "none", style: `--pt-color: ${connector.color}` },
    )
  }
  for (const branch of model.branches) {
    addMark(
      "path",
      branch.slug,
      "portfolio-project-timeline__branch portfolio-project-timeline__color",
      { d: branch.path, fill: "none", style: `--pt-color: ${branch.color}` },
    )
  }
  for (const segment of model.segments) {
    addMark(
      "line",
      segment.slug,
      `portfolio-project-timeline__segment portfolio-project-timeline__segment--${segment.style} portfolio-project-timeline__color`,
      {
        x1: segment.x,
        y1: segment.y1,
        x2: segment.x,
        y2: segment.y2,
        style: `--pt-color: ${segment.color}`,
      },
    )
  }
  for (const node of model.nodes) {
    addMark(
      "circle",
      node.slug,
      `portfolio-project-timeline__node portfolio-project-timeline__node--${node.kind} portfolio-project-timeline__color`,
      { cx: node.x, cy: node.y, r: geometry.nodeRadius, style: `--pt-color: ${node.color}` },
    )
  }
  cached.signature = signature
  board.dispatchEvent(new Event("portfolio:timelineupdated"))
}

function wireCollectionFilters() {
  const collection = document.querySelector<HTMLElement>("[data-portfolio-collection]")
  const root = collection?.querySelector<HTMLElement>("[data-portfolio-filters]")
  if (!collection || !root || root.dataset.wired === "true") return
  root.dataset.wired = "true"

  const compactTimeline = window.matchMedia("(max-width: 720px)")

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
  const projectBoard = collection.querySelector<HTMLElement>(
    "[data-project-timeline] .portfolio-project-timeline__board",
  )
  const projectCards = items.filter((item) => item.matches(".portfolio-project-timeline__card"))
  let matchedSlugs = new Set<string>()
  let timelineDirty = true

  const galleryCards = gallery
    ? [...gallery.querySelectorAll<HTMLElement>("[data-portfolio-item]")]
    : []
  const visibleRects = () => {
    const rects = new Map<HTMLElement, DOMRect>()
    if (!gallery || gallery.hidden || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return rects
    // Read all positions before writing; do not wake offscreen card descendants.
    for (const card of galleryCards) {
      if (card.hidden) continue
      const rect = card.getBoundingClientRect()
      if (rect.bottom > 0 && rect.top < window.innerHeight) rects.set(card, rect)
    }
    return rects
  }
  const settleGallery = (before: Map<HTMLElement, DOMRect>) => {
    if (!gallery || gallery.hidden || !before.size) return
    for (const card of galleryCards) feedbackAnimations.get(card)?.cancel()
    const after = visibleRects()
    for (const [card, rect] of after) {
      const old = before.get(card)
      if (old) {
        const x = old.left - rect.left
        const y = old.top - rect.top
        if (Math.abs(x) + Math.abs(y) > 1)
          feedback(card, [{ transform: `translate(${x}px, ${y}px)` }, { transform: "none" }])
      } else {
        feedback(
          card,
          [
            { opacity: 0, transform: "translateY(6px)" },
            { opacity: 1, transform: "none" },
          ],
          180,
        )
      }
    }
  }

  const updateVisibleTimeline = () => {
    if (!projectBoard || !timelineDirty || collection.dataset.view !== "timeline") return
    refreshProjectTimeline(projectBoard, projectCards, matchedSlugs, compactTimeline.matches)
    timelineDirty = false
  }

  const initialState = readCollectionState(new URLSearchParams(location.search))
  let significance = initialState.highlights ? "highlights" : "all"
  const knownTags = new Set(tagOptionItems.map((option) => option.dataset.tagOption))
  const selectedTags = new Set(initialState.tags.filter((tag) => knownTags.has(tag)))
  if (search) search.value = initialState.query
  let tagMenuOpen = false
  let panelOpen = false
  let sortMode = initialState.sort
  let initialized = false
  let searchHistoryActive = false
  const saveState = (replace = false) => {
    if (!initialized || modalStack.length) return
    const href = collectionUrl(location.href, {
      view: collection.dataset.view === "timeline" ? "timeline" : "gallery",
      sort: sortMode,
      query: search?.value ?? "",
      highlights: significance === "highlights",
      tags: [...selectedTags],
    })
    if (href === `${location.pathname}${location.search}${location.hash}`) return
    if (replace) history.replaceState(history.state, "", href)
    else history.pushState({}, "", href)
  }

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

  let searchTimer = 0
  const apply = () => {
    window.clearTimeout(searchTimer)
    const before = visibleRects()
    const query = search?.value || ""
    const tags = [...selectedTags]
    matchedSlugs = new Set<string>()

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

    timelineDirty = true
    updateVisibleTimeline()

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
      ...collection.querySelectorAll<HTMLElement>(
        '[data-view-panel="gallery"] [data-portfolio-item]',
      ),
    ]
    const visible = galleryItems.filter((item) => !item.hidden).length
    if (countVisible) countVisible.textContent = String(visible)
    if (empty) empty.hidden = visible > 0 || galleryItems.length === 0
    syncFilterBadge(query, tags)
    settleGallery(before)
  }

  const toggleTag = (value: string) => {
    if (!value) return
    if (selectedTags.has(value)) selectedTags.delete(value)
    else selectedTags.add(value)
    renderSelectedTags()
    syncTagOptions()
    apply()
    searchHistoryActive = false
    saveState()
  }

  const onSearch = () => {
    window.clearTimeout(searchTimer)
    searchTimer = window.setTimeout(() => {
      apply()
      saveState(searchHistoryActive)
      searchHistoryActive = true
    }, 100)
  }
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
    searchHistoryActive = false
    saveState()
  }
  for (const button of significanceButtons) button.addEventListener("click", onSignificance)

  const onFilterToggle = () => setPanelOpen(!panelOpen)
  toggle?.addEventListener("click", onFilterToggle)

  const onSortMode = (event: Event) => {
    const button = event.currentTarget as HTMLButtonElement
    const mode = button.dataset.sortMode
    if (mode !== "significance" && mode !== "date") return
    sortMode = mode
    const before = visibleRects()
    applyGallerySort()
    settleGallery(before)
    searchHistoryActive = false
    saveState()
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
    searchHistoryActive = false
    saveState()
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

  compactTimeline.addEventListener("change", apply)
  collection.addEventListener("portfolio:viewchange", updateVisibleTimeline)
  const onCollectionChange = () => {
    searchHistoryActive = false
    saveState()
  }
  const onSearchBlur = () => {
    searchHistoryActive = false
  }
  collection.addEventListener("portfolio:collectionchange", onCollectionChange)
  search?.addEventListener("blur", onSearchBlur)

  setPanelOpen(false)
  renderSelectedTags()
  syncTagOptions()
  syncSortToggle()
  applyGallerySort()
  for (const button of significanceButtons)
    button.setAttribute("aria-pressed", String(button.dataset.filterSignificance === significance))
  apply()
  initialized = true
  if (initialState.query || initialState.tags.length || initialState.highlights) setPanelOpen(true)

  ;(window as CleanupWindow).addCleanup?.(() => {
    window.clearTimeout(searchTimer)
    for (const card of galleryCards) feedbackAnimations.get(card)?.cancel()
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
    compactTimeline.removeEventListener("change", apply)
    collection.removeEventListener("portfolio:viewchange", updateVisibleTimeline)
    collection.removeEventListener("portfolio:collectionchange", onCollectionChange)
    search?.removeEventListener("blur", onSearchBlur)
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

function renderModalMinimap(root: HTMLElement, current?: ModalFrame) {
  const map = root.querySelector<HTMLElement>("[data-modal-minimap]")
  const svg = map?.querySelector("svg")
  if (!map || !svg) return

  const activeIndex = current?.entries.findIndex((entry) => entry.href === current.href) ?? -1
  const active = current?.entries[activeIndex]?.trigger
  const gallery = active?.closest<HTMLElement>(
    '[data-portfolio-collection="projects"] [data-view-panel="gallery"]:not([hidden])',
  )
  map.hidden = !gallery
  if (!current || !gallery || !map.getClientRects().length) return

  const bounds = gallery.getBoundingClientRect()
  if (!bounds.width || !bounds.height) return
  // Measure card slots instead of their contents so the map follows the real grid layout.
  const tiles = current.entries.flatMap((entry, index) => {
    const card = entry.trigger.closest<HTMLElement>(".portfolio-card:not([hidden])")
    if (!card || !gallery.contains(card)) return []
    const rect = card.getBoundingClientRect()
    const link = document.createElementNS("http://www.w3.org/2000/svg", "a")
    const title = document.createElementNS("http://www.w3.org/2000/svg", "title")
    title.textContent = card.querySelector("h2")?.textContent?.trim() || entry.href
    link.setAttribute("href", entry.href)
    link.setAttribute("aria-label", title.textContent)
    link.setAttribute("data-modal-step", String(index - activeIndex))
    const tile = document.createElementNS("http://www.w3.org/2000/svg", "rect")
    tile.setAttribute("x", String(rect.left - bounds.left))
    tile.setAttribute("y", String(rect.top - bounds.top))
    tile.setAttribute("width", String(rect.width))
    tile.setAttribute("height", String(rect.height))
    tile.setAttribute("rx", "12")
    const significance = card.dataset.significance
    if (significance) tile.setAttribute("data-significance", significance)
    if (index === activeIndex) {
      tile.classList.add("is-current")
      link.setAttribute("aria-current", "true")
    }
    link.append(title, tile)
    return [link]
  })
  svg.setAttribute("viewBox", `0 0 ${bounds.width} ${bounds.height}`)
  svg.replaceChildren(...tiles)
}

function renderModal(direction?: -1 | 1) {
  modalVersion += 1
  const root = modalRoot()
  if (!root) return

  root.querySelector(".portfolio-modal__scroll--outgoing")?.remove()
  let body = root.querySelector<HTMLElement>("[data-portfolio-modal-body]")
  if (body) feedbackAnimations.get(body)?.cancel()
  const back = root.querySelector<HTMLButtonElement>("[data-portfolio-modal-back]")
  const panel = root.querySelector<HTMLElement>("[data-portfolio-modal-panel]")
  const current = modalStack[modalStack.length - 1]

  if (!current || !body) {
    root.hidden = true
    renderModalMinimap(root)
    root.dataset.state = ""
    document.documentElement.classList.remove("portfolio-modal-open")
    if (modalReturnFocus?.isConnected) modalReturnFocus.focus({ preventScroll: true })
    modalReturnFocus = null
    return
  }

  let outgoing: HTMLElement | undefined
  if (direction && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    outgoing = body
    body = outgoing.cloneNode(false) as HTMLElement
    const scrollTop = outgoing.scrollTop
    outgoing.style.top = `${outgoing.offsetTop}px`
    outgoing.style.height = `${outgoing.offsetHeight}px`
    outgoing.classList.add("portfolio-modal__scroll--outgoing")
    outgoing.removeAttribute("data-portfolio-modal-body")
    outgoing.inert = true
    outgoing.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"))
    outgoing.after(body)
    outgoing.scrollTop = scrollTop
  }

  body.innerHTML = current.html
  const titleNode = body.querySelector("h1")
  if (titleNode) titleNode.id = "portfolio-modal-title"
  enhanceEntryContent(body)

  if (back) back.hidden = modalStack.length < 2
  const navigation = root.querySelector<HTMLElement>("[data-modal-navigation]")
  if (navigation) navigation.hidden = current.entries.length < 2
  for (const step of [-1, 1]) {
    const button = root.querySelector<HTMLButtonElement>(`[data-modal-step="${step}"]`)
    if (button) button.disabled = !adjacentEntry(current.entries, current.href, step)
  }
  const position = root.querySelector<HTMLElement>("[data-modal-position]")
  if (position)
    position.textContent = `${current.entries.findIndex((entry) => entry.href === current.href) + 1} of ${current.entries.length}`
  root.hidden = false
  document.documentElement.classList.add("portfolio-modal-open")
  renderModalMinimap(root, current)
  panel?.focus({ preventScroll: true })
  body.scrollTop = 0
  if (outgoing && direction) {
    const slideOut = feedback(outgoing, [
      { transform: "none" },
      { transform: `translateX(${-direction * 100}%)` },
    ])
    feedback(body, [{ transform: `translateX(${direction * 100}%)` }, { transform: "none" }])
    const removeOutgoing = () => outgoing.remove()
    if (slideOut) void slideOut.finished.then(removeOutgoing, removeOutgoing)
    else removeOutgoing()
  } else if (!direction) {
    feedback(panel, [
      { opacity: 0, transform: "translateY(10px) scale(0.985)" },
      { opacity: 1, transform: "none" },
    ])
  }
  trackModalView(current.href, current.title)
}

function syncModalUrl(href: string, replace = false) {
  suppressingSpa = true
  const state = { portfolioModal: true, href, depth: modalStack.length }
  if (replace) history.replaceState(state, "", href)
  else history.pushState(state, "", href)
  // Release on next tick so Quartz's popstate from unrelated actions still works.
  queueMicrotask(() => {
    suppressingSpa = false
  })
}

async function openEntry(
  href: string,
  options: {
    nested?: boolean
    replace?: boolean
    trigger?: HTMLAnchorElement
    direction?: -1 | 1
  } = {},
) {
  const entry = normalizeEntryPath(href)
  if (!entry) return false

  const root = modalRoot()
  if (!root) return false
  const requestVersion = ++modalVersion
  const panel = root.querySelector("[data-portfolio-modal-panel]")
  if (panel) feedbackAnimations.get(panel)?.cancel()

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
    modalReturnFocus =
      options.trigger ??
      (document.activeElement instanceof HTMLElement ? document.activeElement : null)
  }

  const previous = modalStack.at(-1)
  const group = options.trigger?.closest("ul, [data-view-panel], .portfolio-coverflow__viewport")
  const entries = options.replace
    ? (previous?.entries ?? [])
    : options.nested
      ? []
      : [...(group?.querySelectorAll<HTMLAnchorElement>("a[data-portfolio-open], a[href]") ?? [])]
          .filter(
            (link) =>
              !link.closest("[hidden]") && normalizeEntryPath(link.getAttribute("href") ?? ""),
          )
          .map((trigger) => ({
            href: normalizeEntryPath(trigger.getAttribute("href")!)!.href,
            trigger,
          }))
          .filter(
            (entry, index, all) =>
              all.findIndex((candidate) => candidate.href === entry.href) === index,
          )

  try {
    root.dataset.state = options.direction ? "switching" : "loading"
    root.hidden = false
    document.documentElement.classList.add("portfolio-modal-open")
    const content = await fetchEntryContent(entry.href)
    if (requestVersion !== modalVersion) return true
    const frame: ModalFrame = {
      slug: entry.slug,
      href: entry.href,
      html: content.html,
      title: content.title,
      entries,
    }

    const top = modalStack[modalStack.length - 1]
    if (options.replace && top) {
      modalStack[modalStack.length - 1] = frame
    } else if (top?.href === frame.href) {
      top.html = frame.html
      top.title = frame.title
    } else if (options.nested || modalStack.length) {
      modalStack.push(frame)
    } else {
      modalStack.length = 0
      modalStack.push(frame)
    }

    renderModal(options.direction)
    root.dataset.state = "ready"
    syncModalUrl(entry.href, options.replace)
    return true
  } catch {
    if (requestVersion !== modalVersion) return true
    if (options.direction) {
      root.dataset.state = "ready"
      return false
    }
    root.hidden = true
    document.documentElement.classList.remove("portfolio-modal-open")
    return false
  }
}

function stepModal(step: number) {
  const current = modalStack.at(-1)
  const root = modalRoot()
  if (
    !step ||
    !current ||
    root?.dataset.state !== "ready" ||
    root.querySelector(".portfolio-modal__scroll--outgoing")
  )
    return
  const next = adjacentEntry(current.entries, current.href, step)
  if (next) void openEntry(next.href, { replace: true, direction: step < 0 ? -1 : 1 })
}

function closeModal() {
  const version = ++modalVersion
  const panel = modalRoot()?.querySelector<HTMLElement>("[data-portfolio-modal-panel]")
  const animation = feedback(
    panel ?? null,
    [
      { opacity: 1, transform: "none" },
      { opacity: 0, transform: "translateY(6px) scale(0.99)" },
    ],
    150,
  )
  modalStack.length = 0
  const finish = () => {
    if (version === modalVersion) renderModal()
  }
  if (animation) void animation.finished.then(finish, () => {})
  else finish()
  suppressingSpa = true
  history.pushState({}, "", returnUrl)
  trackModalView(analyticsPath(location), document.title)
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

let lightboxReturnFocus: HTMLElement | null = null
let lightboxVersion = 0

function imageFlight(image: HTMLImageElement, source: DOMRect, reverse = false) {
  const destination = image.getBoundingClientRect()
  if (!source.width || !source.height || !destination.width || !destination.height) return null
  const transform = `translate(${source.left + source.width / 2 - destination.left - destination.width / 2}px, ${source.top + source.height / 2 - destination.top - destination.height / 2}px) scale(${source.width / destination.width}, ${source.height / destination.height})`
  const frames = [
    { transform, opacity: 0.5 },
    { transform: "none", opacity: 1 },
  ]
  return feedback(image, reverse ? frames.reverse() : frames, reverse ? 170 : 260)
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
  if (!root || root.hidden) return
  const version = ++lightboxVersion
  const image = root.querySelector<HTMLImageElement>("[data-portfolio-lightbox-image]")
  const source = lightboxReturnFocus?.querySelector("img") ?? lightboxReturnFocus
  const rect = source?.getBoundingClientRect()
  const animation =
    image &&
    rect &&
    rect.bottom > 0 &&
    rect.top < innerHeight &&
    !lightboxReturnFocus?.closest("main.portfolio-home")
      ? imageFlight(image, rect, true)
      : null
  const finish = () => {
    if (version !== lightboxVersion) return
    root.hidden = true
    document.documentElement.classList.remove("portfolio-lightbox-open")
    const caption = root.querySelector<HTMLElement>("[data-portfolio-lightbox-caption]")
    if (image) {
      image.removeAttribute("src")
      image.alt = ""
    }
    if (caption) {
      caption.textContent = ""
      caption.hidden = true
    }
    if (lightboxReturnFocus?.isConnected) lightboxReturnFocus.focus({ preventScroll: true })
    lightboxReturnFocus = null
  }
  if (animation) void animation.finished.then(finish, () => {})
  else finish()
}

function openLightbox(src: string, caption = "", trigger?: HTMLElement) {
  const root = lightboxRoot()
  if (!root || !src) return
  const image = root.querySelector<HTMLImageElement>("[data-portfolio-lightbox-image]")
  const captionNode = root.querySelector<HTMLElement>("[data-portfolio-lightbox-caption]")
  const panel = root.querySelector<HTMLElement>("[data-portfolio-lightbox-panel]")
  if (!image) return

  const version = ++lightboxVersion
  feedbackAnimations.get(image)?.cancel()
  const source = trigger?.querySelector("img") ?? trigger
  const rect = source?.getBoundingClientRect()

  lightboxReturnFocus = trigger ?? null
  image.src = imageVariant(src, "full")
  image.alt = caption
  if (captionNode) {
    captionNode.textContent = caption
    captionNode.hidden = !caption
  }
  root.hidden = false
  document.documentElement.classList.add("portfolio-lightbox-open")
  panel?.focus({ preventScroll: true })
  if (rect && !trigger?.closest("main.portfolio-home"))
    void image.decode().then(
      () => {
        if (version === lightboxVersion && !root.hidden) imageFlight(image, rect)
      },
      () => {},
    )
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
    openLightbox(src, trigger.dataset.lightboxCaption ?? "", trigger)
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
    openLightbox(src, trigger.dataset.lightboxCaption ?? "", trigger)
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

    const step = target.closest("[data-modal-step]")
    if (step) {
      event.preventDefault()
      event.stopPropagation()
      stepModal(Number(step.getAttribute("data-modal-step")))
      return
    }

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
    // This document capture handler runs before the search widget's handlers.
    if (openLink.matches(".result-card") && window.matchMedia("(max-width: 800px)").matches) {
      event.preventDefault()
      event.stopImmediatePropagation()
      openSearchPreviewPage(href)
      return
    }
    const entry = normalizeEntryPath(href)
    if (!entry) return

    // Already on the full entry page with no modal: allow normal SPA navigation.
    if (!modalStack.length && normalizeEntryPath(location.pathname)?.href === entry.href) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    void openEntry(entry.href, { nested: modalStack.length > 0, trigger: openLink })
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (isLightboxOpen() || !modalStack.length) return
    const target = event.target as HTMLElement | null
    if (event.key === "Escape") {
      event.preventDefault()
      closeModal()
      return
    }
    if (event.key === "Tab") {
      const focusable = [
        ...root.querySelectorAll<HTMLElement>(
          "button:not(:disabled), a[href], input, [tabindex='0']",
        ),
      ].filter((node) => !node.closest("[hidden], [inert]") && node.getClientRects().length)
      const first = focusable[0],
        last = focusable.at(-1)
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === root.querySelector("[data-portfolio-modal-panel]"))
      ) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
      return
    }
    if (
      event.repeat ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      target?.closest("input, textarea, select, [contenteditable], .portfolio-coverflow") ||
      window.getSelection()?.toString()
    )
      return
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault()
      stepModal(event.key === "ArrowLeft" ? -1 : 1)
    }
  }

  const onPopState = (event: PopStateEvent) => {
    if (suppressingSpa) return
    const state = event.state as { portfolioModal?: boolean; href?: string; depth?: number } | null

    if (state?.portfolioModal && state.href) {
      // Browser moved between modal frames.
      while (modalStack.length > (state.depth ?? 1)) modalStack.pop()
      if (!modalStack.length || modalStack[modalStack.length - 1]?.href !== state.href) {
        void openEntry(state.href, { nested: false, replace: true }).then(() => {
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
  const onResize = () => renderModalMinimap(root, modalStack.at(-1))
  window.addEventListener("resize", onResize)

  ;(window as CleanupWindow).addCleanup?.(() => {
    document.removeEventListener("click", onDocumentClick, true)
    document.removeEventListener("keydown", onKeyDown)
    window.removeEventListener("popstate", onPopState)
    window.removeEventListener("resize", onResize)
    modalVersion += 1
    modalReturnFocus = null
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
        const following = isLast && !afterInNode.trim() ? nextElementSkippingWhitespace(node) : null

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
    // SHOW_TEXT guarantees text nodes; TreeWalker exposes the broader Node type.
    nodes.push(node as Text)
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
    // Phones use one results list and navigate on selection, avoiding two scroll panes.
    if (window.matchMedia("(max-width: 800px)").matches) return
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
    const results = search.querySelector<HTMLElement>(".results-container")
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
    const watching =
      search.querySelector<HTMLElement>(".results-container")?.dataset.portfolioPreviewWatch ===
      "true"
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

function modelFromUserAgent(ua: string) {
  const linux = ua.match(/\(Linux;\s*Android\s+[\d.]+;\s*([^;)]+?)(?:\s+Build\/[^;)]*)?\)/i)
  if (linux) {
    const cleaned = sanitizeModel(linux[1])
    if (cleaned) return cleaned
  }
  const gecko = ua.match(/\(Android\s+[\d.]+;\s*(?:Mobile|Tablet);\s*(?!rv:)([^;)]+)/i)
  if (gecko) {
    const cleaned = sanitizeModel(gecko[1])
    if (cleaned) return cleaned
  }
  return null
}

function pickDeviceLabel(
  model: string | undefined,
  platform: string | undefined,
  fallback: string | null,
) {
  const fromModel = model ? sanitizeModel(model) : null
  if (fromModel) return fromModel
  if (fallback) return fallback
  if (platform && /android/i.test(platform)) return "Android"
  if (platform && /iphone|ios/i.test(platform)) return "iPhone"
  return null
}

async function deviceLabel(fallback: string | null) {
  const fromUa = modelFromUserAgent(navigator.userAgent)
  const uaData = (navigator as Navigator & { userAgentData?: TapNavigatorUAData }).userAgentData
  if (!uaData?.getHighEntropyValues) return fromUa ?? fallback
  try {
    const high = await Promise.race([
      uaData.getHighEntropyValues(["model", "platform"]),
      new Promise<null>((resolve) => window.setTimeout(() => resolve(null), TAP_MODEL_HINT_MS)),
    ])
    if (!high) return fromUa ?? fallback
    return pickDeviceLabel(high.model, high.platform, fromUa ?? fallback)
  } catch {
    return fromUa ?? fallback
  }
}

type SessionRecord = {
  count: number
  lastSeenAt: number
  sessionStartedAt: number
  previousStartedAt: number
  activeMs: number
}

let sessionHeartbeat: number | null = null

function emptySession(): SessionRecord {
  return { count: 0, lastSeenAt: 0, sessionStartedAt: 0, previousStartedAt: 0, activeMs: 0 }
}

function readSession(key: string): SessionRecord {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return emptySession()
    const parsed = JSON.parse(raw) as Partial<SessionRecord>
    return {
      count: Number(parsed.count) || 0,
      lastSeenAt: Number(parsed.lastSeenAt) || 0,
      sessionStartedAt: Number(parsed.sessionStartedAt) || 0,
      previousStartedAt: Number(parsed.previousStartedAt) || 0,
      activeMs: Number(parsed.activeMs) || 0,
    }
  } catch {
    return emptySession()
  }
}

function writeSession(key: string, record: SessionRecord) {
  try {
    localStorage.setItem(key, JSON.stringify(record))
  } catch {
    // Private mode or blocked storage.
  }
}

function touchSession(key: string, now = Date.now(), accumulate = false): SessionRecord {
  const record = readSession(key)
  const stale = !record.lastSeenAt || now - record.lastSeenAt > SESSION_GAP_MS
  if (stale) {
    record.previousStartedAt = record.sessionStartedAt
    record.count += 1
    record.sessionStartedAt = now
  } else if (accumulate && record.lastSeenAt) {
    record.activeMs += Math.max(0, now - record.lastSeenAt)
  }
  record.lastSeenAt = now
  writeSession(key, record)
  return record
}

function tapQueryActive() {
  return isTapLocation(location)
}

function stampSessionHidden(key: string, now: number) {
  const record = readSession(key)
  if (!record.count) return
  record.lastSeenAt = now
  writeSession(key, record)
}

function pulseSessions() {
  if (document.visibilityState !== "visible") return
  const now = Date.now()
  touchSession(VISIT_SESSION_KEY, now, true)
  if (tapQueryActive()) touchSession(TAP_SESSION_KEY, now, true)
}

function wireSessionHeartbeat() {
  if (sessionHeartbeat != null) return
  sessionHeartbeat = window.setInterval(pulseSessions, SESSION_HEARTBEAT_MS)
  const onVisibility = () => {
    const now = Date.now()
    if (document.visibilityState === "hidden") {
      stampSessionHidden(VISIT_SESSION_KEY, now)
      if (tapQueryActive()) stampSessionHidden(TAP_SESSION_KEY, now)
      return
    }
    pulseSessions()
  }
  document.addEventListener("visibilitychange", onVisibility)
  ;(window as CleanupWindow).addCleanup?.(() => {
    if (sessionHeartbeat != null) {
      window.clearInterval(sessionHeartbeat)
      sessionHeartbeat = null
    }
    document.removeEventListener("visibilitychange", onVisibility)
  })
}

function ordinal(n: number) {
  const teens = n % 100
  if (teens >= 11 && teens <= 13) return `${n}th`
  switch (n % 10) {
    case 1:
      return `${n}st`
    case 2:
      return `${n}nd`
    case 3:
      return `${n}rd`
    default:
      return `${n}th`
  }
}

function beenAWhile(record: SessionRecord, now = Date.now()) {
  return Boolean(record.previousStartedAt) && now - record.previousStartedAt >= SESSION_WHILE_MS
}

function visitPhrase(count: number, longAbsence: boolean) {
  if (count < 2) return null
  const base =
    count === 2
      ? "Welcome back"
      : count === 3
        ? "Good to see you again"
        : count === 4
          ? "Still here, I see"
          : count === 5
            ? "Making this a habit"
            : `Back for the ${ordinal(count)} time, eh`
  return longAbsence ? `${base} — it's been a while!` : `${base}!`
}

function tapCountPhrase(count: number) {
  if (count === 2) return "Second tap!"
  if (count === 3) return "Third tap!"
  if (count === 4) return "Fourth tap!"
  if (count === 5) return "Fifth tap!"
  return `${ordinal(count)} tap!`
}

function composeTapGreeting(
  visit: SessionRecord,
  tap: SessionRecord,
  time: string,
  device: string | null,
  place: string | null,
) {
  const meet = tapGreeting(time, device, place)
  const returning = visitPhrase(visit.count, beenAWhile(visit))
  if (!returning) return `${meet}!`
  if (tap.count < 2) return `${returning} ${meet}!`
  return `${returning} ${tapCountPhrase(tap.count)}`
}

function applyVisitHello(phrase: string) {
  const paragraph = document.querySelector(".portfolio-home-markdown > p")
  if (!paragraph) return
  const existing = paragraph.querySelector("[data-portfolio-visit-hello]")
  if (existing) {
    existing.textContent = phrase
    return
  }
  if (phrase === DEFAULT_HELLO) return

  const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT)
  let node = walker.nextNode()
  while (node) {
    const value = node.nodeValue ?? ""
    const index = value.indexOf(DEFAULT_HELLO)
    if (index !== -1) {
      const span = document.createElement("span")
      span.dataset.portfolioVisitHello = ""
      span.textContent = phrase
      const parent = node.parentNode
      if (!parent) return
      if (index > 0) parent.insertBefore(document.createTextNode(value.slice(0, index)), node)
      parent.insertBefore(span, node)
      node.nodeValue = value.slice(index + DEFAULT_HELLO.length)
      return
    }
    node = walker.nextNode()
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
  const line = greeting.endsWith("!") ? greeting : `${greeting}!`
  banner.setAttribute("aria-label", `${line} Connect on LinkedIn`)
  const greetingNode = banner.querySelector("[data-tap-greeting]")
  if (greetingNode) greetingNode.textContent = line
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
  const ctaArrow = document.createElement("span")
  ctaArrow.setAttribute("aria-hidden", "true")
  ctaArrow.textContent = "↗"
  cta.append(ctaArrow)

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
  action.textContent = "Connect on LinkedIn"
  const actionArrow = document.createElement("span")
  actionArrow.setAttribute("aria-hidden", "true")
  actionArrow.textContent = "↗"
  action.append(actionArrow)

  banner.append(greetingNode, action)
  fillTapBanner(banner, greeting)
  heading.insertAdjacentElement("afterend", banner)
  return banner
}

async function initHomeGreetings() {
  const visit = touchSession(VISIT_SESSION_KEY)
  wireSessionHeartbeat()

  const home = document.querySelector(".portfolio-home-shell")
  const isTap = tapQueryActive()
  if (!isTap || !home) {
    clearTapMode()
    if (home) applyVisitHello(visitPhrase(visit.count, beenAWhile(visit)) ?? DEFAULT_HELLO)
    return
  }

  applyVisitHello(DEFAULT_HELLO)

  const tap = touchSession(TAP_SESSION_KEY)
  const generation = ++tapModeGeneration
  document.documentElement.dataset.tap = "true"

  const href = linkedInHref()
  const time = timeOfDayPhrase()
  const place = placeFromSearch(new URLSearchParams(location.search))
  const coarse = modelFromUserAgent(navigator.userAgent) ?? coarseDeviceLabel(navigator.userAgent)
  const banner = mountTapBanner(href, composeTapGreeting(visit, tap, time, coarse, place))
  mountTapSticky(href)
  if (banner) wireTapStickyVisibility(banner)

  ;(window as CleanupWindow).addCleanup?.(() => {
    if (generation === tapModeGeneration) clearTapMode()
  })

  const device = await deviceLabel(coarse)
  if (generation !== tapModeGeneration) return
  if (device !== coarse) {
    mountTapBanner(href, composeTapGreeting(visit, tap, time, device, place))
  }
}

function wireThemeControls() {
  const controller = initializeTheme()
  const host = document.querySelector<HTMLElement>("[data-portfolio-theme]")
  const toggle = host?.querySelector<HTMLButtonElement>("[data-theme-toggle]")
  if (!host || !toggle || host.dataset.wired === "true") return
  host.dataset.wired = "true"
  let requested: Theme = controller.theme
  let switching = false
  let disposed = false
  const sync = () => {
    toggle.setAttribute("aria-checked", String(controller.theme === "dark"))
    toggle.title = `Switch to ${controller.theme === "dark" ? "light" : "dark"} mode`
    if (!switching) requested = controller.theme
  }
  const onToggle = async () => {
    requested = requested === "dark" ? "light" : "dark"
    if (switching) return
    switching = true
    closeNavMenu()
    try {
      // Coalesce quick taps to the latest intent without overlapping snapshots.
      while (!disposed && requested !== controller.theme) {
        await transitionTheme(controller, requested, toggle)
      }
    } finally {
      switching = false
      sync()
    }
  }
  toggle.addEventListener("click", onToggle)
  document.addEventListener("themechange", sync)
  sync()
  ;(window as CleanupWindow).addCleanup?.(() => {
    disposed = true
    toggle.removeEventListener("click", onToggle)
    document.removeEventListener("themechange", sync)
    host.dataset.wired = "false"
  })
}

function initializePortfolio() {
  wireThemeControls()
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
  if (
    normalizeEntryPath(location.pathname) ||
    document.querySelector("[data-portfolio-entry-heading]")
  ) {
    enhanceEntryContent(document)
  }
  styleHomeProfileLinks()
  enhanceHomeBioIcons()
  void initHomeGreetings()
}

document.addEventListener("nav", initializePortfolio)
document.addEventListener("render", initializePortfolio)
