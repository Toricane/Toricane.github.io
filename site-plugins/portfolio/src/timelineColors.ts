/** Shared by the build and browser when laying out project timelines. */
export const TIMELINE_PALETTE = [
  "#e2b15a",
  "#6ea8ff",
  "#8fd4a8",
  "#c7a0ff",
  "#f0a07a",
  "#7fd3d3",
  "#e58fb3",
  "#b7c2cf",
  "#ff7f8d",
  "#bfdb69",
  "#8f98ff",
  "#ded4b9",
]

export function validTimelineColor(value: unknown): string | undefined {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value.trim())
    ? value.trim().toLowerCase()
    : undefined
}

/** Preserve the image hue, lifting dark/muted colors for the dark graph surface. */
export function readableThumbnailColor(r: number, g: number, b: number): string {
  const channels = [r, g, b].map((value) => value / 255)
  const max = Math.max(...channels),
    min = Math.min(...channels)
  const delta = max - min
  const lightness = (max + min) / 2
  if (delta < 0.06) return "#b7c2cf"
  const saturation = delta / (1 - Math.abs(2 * lightness - 1))
  let hue =
    max === channels[0]
      ? ((channels[1] - channels[2]) / delta) % 6
      : max === channels[1]
        ? (channels[2] - channels[0]) / delta + 2
        : (channels[0] - channels[1]) / delta + 4
  hue = (hue * 60 + 360) % 360
  const s = Math.max(0.35, Math.min(0.8, saturation))
  const l = Math.max(0.68, Math.min(0.78, lightness))
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = l - c / 2
  const rgb =
    hue < 60
      ? [c, x, 0]
      : hue < 120
        ? [x, c, 0]
        : hue < 180
          ? [0, c, x]
          : hue < 240
            ? [0, x, c]
            : hue < 300
              ? [x, 0, c]
              : [c, 0, x]
  return `#${rgb
    .map((value) =>
      Math.round((value + m) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`
}

type ColorTrack = {
  slug: string
  startAbsolute: number
  endAbsolute: number
}
type ColorPreference = { slug: string; thumbnailColor?: string; timelineColor?: string }

function distance(a: string, b: string): number {
  const rgb = (hex: string) =>
    [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16))
  const first = rgb(a),
    second = rgb(b)
  return first.reduce((total, value, index) => total + (value - second[index]) ** 2, 0)
}

export function assignTimelineColors(
  tracks: ColorTrack[],
  preferences: ColorPreference[],
): Map<string, string> {
  const colors = new Map<string, string>()
  // Thumbnail colors take priority; explicit overrides are for the no-image fallback.
  // Reserve them first, including projects that start later in an overlapping span.
  for (const preference of preferences) {
    const color =
      validTimelineColor(preference.thumbnailColor) ?? validTimelineColor(preference.timelineColor)
    if (color) colors.set(preference.slug, color)
  }
  const ordered = [...tracks].sort(
    (a, b) => a.startAbsolute - b.startAbsolute || a.slug.localeCompare(b.slug),
  )
  for (const track of ordered) {
    if (colors.has(track.slug)) continue
    const neighbors = tracks
      .filter(
        (other) =>
          other.slug !== track.slug &&
          other.startAbsolute <= track.endAbsolute &&
          track.startAbsolute <= other.endAbsolute,
      )
      .map((other) => colors.get(other.slug))
      .filter((color): color is string => !!color)
    // A slug-based initial choice avoids assigning the same first color to every
    // isolated project. The overlap score takes priority over that initial choice.
    const hash = [...track.slug].reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 0)
    const candidates = TIMELINE_PALETTE.map(
      (_, index) => TIMELINE_PALETTE[(index + hash) % TIMELINE_PALETTE.length],
    )
    let best = candidates[0],
      bestScore = -1
    for (const candidate of candidates) {
      const score = neighbors.length
        ? Math.min(...neighbors.map((color) => distance(candidate, color)))
        : 0
      if (score > bestScore) {
        best = candidate
        bestScore = score
      }
    }
    colors.set(track.slug, best)
  }
  return colors
}
