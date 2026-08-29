type HastNode = {
  type?: string
  tagName?: string
  properties?: Record<string, unknown>
  value?: string
  children?: HastNode[]
}

export type GalleryImage = {
  src: string
  alt: string
}

function textOf(node: HastNode | undefined): string {
  if (!node) return ""
  if (typeof node.value === "string") return node.value
  if (!node.children?.length) return ""
  return node.children.map(textOf).join("")
}

function collectGalleryImages(tree: HastNode): GalleryImage[] {
  const children = tree.children ?? []
  const images: GalleryImage[] = []
  let inGallery = false

  for (const child of children) {
    const tag = child.tagName?.toLowerCase()
    if (tag === "h1" || tag === "h2" || tag === "h3" || tag === "h4" || tag === "h5" || tag === "h6") {
      const heading = textOf(child).trim().toLowerCase()
      inGallery = heading === "gallery"
      continue
    }
    if (!inGallery) continue

    const stack: HastNode[] = [child]
    while (stack.length) {
      const node = stack.pop()!
      if (node.tagName?.toLowerCase() === "img") {
        const src = String(node.properties?.src ?? "").trim()
        if (src) {
          images.push({
            src,
            alt: String(node.properties?.alt ?? "").trim(),
          })
        }
        continue
      }
      if (node.children?.length) stack.push(...node.children)
    }
  }

  return images
}

export default function GalleryExtractor() {
  return {
    name: "GalleryExtractor",
    htmlPlugins() {
      return [
        () => {
          return (tree: HastNode, file: { data: Record<string, unknown> }) => {
            file.data.galleryImages = collectGalleryImages(tree)
          }
        },
      ]
    },
  }
}

GalleryExtractor.quartzCategory = "transformer" as const
