import path from "node:path"
import { imageVariant } from "./imageVariant"
import { readableThumbnailColor } from "./timelineColors"

/** Find the most common visible hue, ignoring neutral backgrounds and transparency. */
function dominantVisibleHue(pixels: Uint8Array): [number, number, number] | undefined {
  const bins = Array.from({ length: 12 }, () => ({ count: 0, r: 0, g: 0, b: 0 }))
  let visible = 0,
    colorful = 0
  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index + 3] < 128) continue
    visible++
    const r = pixels[index],
      g = pixels[index + 1],
      b = pixels[index + 2]
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b),
      delta = max - min
    if (max < 35 || min > 235 || delta / max < 0.25) continue
    let hue =
      max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4
    hue = (hue * 60 + 360) % 360
    const bin = bins[Math.round(hue / 30) % bins.length]
    bin.count++
    bin.r += r
    bin.g += g
    bin.b += b
    colorful++
  }
  // Small colored artifacts shouldn't override a predominantly neutral image.
  if (colorful < Math.max(1, visible * 0.08)) return undefined
  const dominant = bins.reduce((best, bin) => (bin.count > best.count ? bin : best))
  return [dominant.r / dominant.count, dominant.g / dominant.count, dominant.b / dominant.count]
}

/** No network fetches: remote/missing thumbnails simply use the palette fallback. */
export async function loadThumbnailColor(
  src: string,
  contentRoot: string,
): Promise<string | undefined> {
  if (/^[a-z][a-z\d+.-]*:/i.test(src) || src.startsWith("//")) return undefined
  const root = path.resolve(contentRoot)
  const resolveAsset = (value: string) => {
    const cleaned = value
      .replace(/\\/g, "/")
      .split(/[?#]/)[0]
      .replace(/^(?:\.{1,2}\/|\/)+/, "")
    const target = path.resolve(root, cleaned)
    return target.startsWith(root + path.sep) ? target : undefined
  }
  const candidates = [...new Set([imageVariant(src, "preview"), src].map(resolveAsset))]
  try {
    // Match the OG image loader: keep sharp out of the bundled plugin resources.
    const dynamicImport = new Function("specifier", "return import(specifier)") as (
      specifier: string,
    ) => Promise<{ default: typeof import("sharp") }>
    const { default: sharp } = await dynamicImport("sharp")
    for (const candidate of candidates) {
      if (!candidate) continue
      try {
        const sample = await sharp(candidate).rotate().resize(64, 42, { fit: "cover" }).toBuffer()
        const pixels = await sharp(sample).ensureAlpha().raw().toBuffer()
        const hue = dominantVisibleHue(pixels)
        if (hue) return readableThumbnailColor(...hue)
        const { dominant } = await sharp(sample).stats()
        return readableThumbnailColor(dominant.r, dominant.g, dominant.b)
      } catch {
        // Try the full image if its preview variant is absent or unreadable.
      }
    }
  } catch {
    // sharp is optional for the plugin; the timeline remains usable without it.
  }
  return undefined
}
