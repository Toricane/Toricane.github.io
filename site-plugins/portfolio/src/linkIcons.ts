export type HastNode = {
  type?: string
  tagName?: string
  properties?: Record<string, unknown>
  value?: string
  children?: HastNode[]
}

/** key (lowercase) → site-root path like `/assets/icons/langara.webp` */
export type LinkIconMap = Record<string, string>

const SHORTCODE_PATTERN = /:([a-z0-9]+(?:-[a-z0-9]+)*):/gi
const ICON_KEY_PATTERN = /^([a-z0-9]+(?:-[a-z0-9]+)*)(\.[a-z0-9]+)$/i
const ICON_EXTENSIONS = new Set([".webp", ".png", ".jpg", ".jpeg", ".svg", ".gif"])
const EXTENSION_PRIORITY: Record<string, number> = {
  ".webp": 0,
  ".png": 1,
  ".svg": 2,
  ".jpg": 3,
  ".jpeg": 3,
  ".gif": 4,
}

/**
 * Build a shortcode map from filenames in `content/assets/icons/`.
 * `langara.webp` → `:langara:` → `/assets/icons/langara.webp`
 * If the same key exists with multiple extensions, prefer webp > png > svg > jpg > gif.
 */
export function linkIconMapFromFilenames(filenames: string[]): LinkIconMap {
  const chosen = new Map<string, { file: string; priority: number }>()

  for (const filename of filenames) {
    const match = filename.match(ICON_KEY_PATTERN)
    if (!match) continue
    const key = match[1].toLowerCase()
    const ext = match[2].toLowerCase()
    if (!ICON_EXTENSIONS.has(ext)) continue

    const priority = EXTENSION_PRIORITY[ext] ?? 99
    const existing = chosen.get(key)
    if (existing && existing.priority <= priority) continue
    chosen.set(key, { file: filename, priority })
  }

  const map: LinkIconMap = {}
  for (const [key, { file }] of chosen) {
    map[key] = `/assets/icons/${file}`
  }
  return map
}

function hasClass(node: HastNode, className: string) {
  const raw = node.properties?.className ?? node.properties?.class
  if (Array.isArray(raw)) return raw.map(String).includes(className)
  if (typeof raw === "string") return raw.split(/\s+/).includes(className)
  return false
}

function iconLabelNode(src: string, firstWord?: string): HastNode {
  const children: HastNode[] = [
    {
      type: "element",
      tagName: "img",
      properties: {
        className: ["portfolio-inline-icon"],
        src,
        alt: "",
        "aria-hidden": "true",
        loading: "lazy",
        decoding: "async",
      },
      children: [],
    },
  ]
  if (firstWord) children.push({ type: "text", value: firstWord })
  return {
    type: "element",
    tagName: "span",
    properties: { className: ["portfolio-icon-label"] },
    children,
  }
}

function prependIconToHastAnchor(anchor: HastNode, src: string) {
  if (!anchor.children) anchor.children = []
  if (anchor.children.some((child) => hasClass(child, "portfolio-icon-label"))) return

  const firstText = anchor.children.find(
    (child) => child.type === "text" && (child.value?.trim().length ?? 0) > 0,
  )
  if (firstText?.value) {
    const match = firstText.value.match(/^(\s*)(\S+)([\s\S]*)$/)
    if (match) {
      const [, leading, firstWord, rest] = match
      const label = iconLabelNode(src, firstWord)
      firstText.value = rest
      const idx = anchor.children.indexOf(firstText)
      if (leading) {
        anchor.children.splice(idx, 0, { type: "text", value: leading }, label)
      } else {
        anchor.children.splice(idx, 0, label)
      }
      return
    }
  }

  anchor.children.unshift(iconLabelNode(src))
}

function isAnchor(node: HastNode | undefined): boolean {
  return node?.type === "element" && node.tagName?.toLowerCase() === "a"
}

function nextSignificantSibling(children: HastNode[], fromIndex: number): HastNode | undefined {
  for (let i = fromIndex + 1; i < children.length; i++) {
    const sibling = children[i]
    if (sibling.type === "text" && !(sibling.value ?? "").trim()) continue
    return sibling
  }
  return undefined
}

function knownShortcodes(value: string, icons: LinkIconMap) {
  SHORTCODE_PATTERN.lastIndex = 0
  return [...value.matchAll(SHORTCODE_PATTERN)].filter((match) =>
    Boolean(icons[match[1].toLowerCase()]),
  )
}

function processTextInParent(parent: HastNode, icons: LinkIconMap) {
  const children = parent.children
  if (!children?.length) return

  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    if (child.type !== "text" || typeof child.value !== "string") continue

    const value = child.value
    const matches = knownShortcodes(value, icons)
    if (!matches.length) continue

    if (isAnchor(parent)) {
      child.value = value.replace(/:([a-z0-9]+(?:-[a-z0-9]+)*):/gi, (full, key: string) =>
        icons[key.toLowerCase()] ? "" : full,
      )
      const seen = new Set<string>()
      for (const match of matches) {
        const key = match[1].toLowerCase()
        const src = icons[key]
        if (!src || seen.has(key)) continue
        seen.add(key)
        prependIconToHastAnchor(parent, src)
      }
      if (!(child.value ?? "").length) {
        children.splice(i, 1)
        i--
      }
      continue
    }

    const replacements: HastNode[] = []
    let cursor = 0

    for (let m = 0; m < matches.length; m++) {
      const match = matches[m]
      const index = match.index ?? 0
      const key = match[1].toLowerCase()
      const src = icons[key]
      if (index > cursor) {
        replacements.push({ type: "text", value: value.slice(cursor, index) })
      }

      const afterInNode = value.slice(index + match[0].length)
      const isLast = m === matches.length - 1
      const onlyWsAfter = isLast && !afterInNode.trim()
      const following = onlyWsAfter ? nextSignificantSibling(children, i) : undefined

      if (following && isAnchor(following) && src) {
        prependIconToHastAnchor(following, src)
      } else if (src) {
        replacements.push(iconLabelNode(src))
      }

      cursor = index + match[0].length
    }

    if (cursor < value.length) {
      replacements.push({ type: "text", value: value.slice(cursor) })
    }

    children.splice(i, 1, ...replacements)
    i += Math.max(replacements.length - 1, 0)
  }
}

/** Replace `:key:` shortcodes in a hast tree using the icon map. */
export function applyLinkIconsToHast(tree: HastNode, icons: LinkIconMap) {
  if (!Object.keys(icons).length) return

  const visit = (node: HastNode) => {
    if (node.children?.length) {
      processTextInParent(node, icons)
      for (const child of node.children) {
        if (child.type === "element") visit(child)
      }
    }
  }

  visit(tree)
}

export function linkIconShortcodeRegex(icons: LinkIconMap) {
  const keys = Object.keys(icons)
    .map((key) => key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|")
  return keys ? new RegExp(`:(${keys}):`, "gi") : null
}
