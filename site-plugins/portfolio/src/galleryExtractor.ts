import fs from "node:fs/promises"
import path from "node:path"
import { applyPortfolioDates } from "./dates"

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

/** Strip `/`, `./`, `../` so `../assets/foo.webp` becomes `assets/foo.webp`. */
function normalizeAssetSrc(src: string): string {
  let cleaned = src.trim().replace(/\\/g, "/").split("?")[0]?.split("#")[0] ?? ""
  if (!cleaned || cleaned.startsWith("http:") || cleaned.startsWith("https:")) return ""
  while (cleaned.startsWith("../") || cleaned.startsWith("./") || cleaned.startsWith("/")) {
    if (cleaned.startsWith("../")) cleaned = cleaned.slice(3)
    else if (cleaned.startsWith("./")) cleaned = cleaned.slice(2)
    else cleaned = cleaned.slice(1)
  }
  return cleaned
}

/** Resolve a content asset path and encode a PNG data URL for Satori OG images. */
async function loadOgCoverDataUrl(src: string): Promise<string | undefined> {
  const cleaned = normalizeAssetSrc(src)
  if (!cleaned) return undefined

  const root = process.cwd()
  // Prefer the full tab-panels asset — small/preview are too soft when stretched to 1200×630.
  const candidates = [
    path.join(root, "content", cleaned),
    path.join(root, "public", cleaned),
  ]

  // Avoid static `import("sharp")` — tsup/esbuild rewrites it into a broken bundled chunk.
  type SharpPipeline = {
    rotate: () => SharpPipeline
    resize: (
      w: number,
      h: number,
      opts: { fit: string; position: string; background?: { r: number; g: number; b: number; alpha: number } },
    ) => SharpPipeline
    blur: (sigma: number) => SharpPipeline
    modulate: (opts: { brightness?: number }) => SharpPipeline
    png: () => { toBuffer: () => Promise<Buffer> }
  }
  type SharpFn = (input: string) => SharpPipeline
  let sharpFn: SharpFn | undefined
  try {
    const dynamicImport = new Function("specifier", "return import(specifier)") as (
      specifier: string,
    ) => Promise<{ default?: SharpFn } & SharpFn>
    const mod = await dynamicImport("sharp")
    sharpFn = (mod.default ?? mod) as SharpFn
  } catch {
    return undefined
  }
  if (!sharpFn) return undefined

  for (const filePath of candidates) {
    try {
      await fs.access(filePath)
      // Full OG canvas size, pre-blurred — Satori has weak CSS filter support.
      const buf = await sharpFn(filePath)
        .rotate()
        .resize(1200, 630, { fit: "cover", position: "centre" })
        .blur(12)
        .modulate({ brightness: 0.82 })
        .png()
        .toBuffer()
      return `data:image/png;base64,${buf.toString("base64")}`
    } catch {
      // try next candidate
    }
  }
  return undefined
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
    markdownPlugins() {
      return [
        () => {
          return (_tree: unknown, file: { data: Record<string, unknown> }) => {
            applyPortfolioDates(file.data)
          }
        },
      ]
    },
    htmlPlugins() {
      return [
        () => {
          return async (tree: HastNode, file: { data: Record<string, unknown> }) => {
            const images = collectGalleryImages(tree)
            file.data.galleryImages = images
            const first = images[0]?.src
            file.data.ogCoverBase64 = first ? await loadOgCoverDataUrl(first) : undefined
          }
        },
      ]
    },
  }
}

GalleryExtractor.quartzCategory = "transformer" as const
