import assert from "node:assert/strict"
import test from "node:test"
import os from "node:os"
import path from "node:path"
import fs from "node:fs/promises"
import sharp from "sharp"
import { assignTimelineColors, readableThumbnailColor, TIMELINE_PALETTE } from "./timelineColors"
import { loadThumbnailColor } from "./thumbnailColor"
import { buildProjectTimeline } from "./projectTimeline"

test("overlapping ranges get different fallback colors, including the same start month", () => {
  const tracks = Array.from({ length: 12 }, (_, index) => ({
    slug: `project-${index}`,
    startAbsolute: 1,
    endAbsolute: 10,
  }))
  const assigned = assignTimelineColors(tracks, [])
  assert.equal(new Set(assigned.values()).size, 12)
  assert.ok([...assigned.values()].every((color) => TIMELINE_PALETTE.includes(color)))
  assert.deepEqual(assignTimelineColors([...tracks].reverse(), []), assigned)
})

test("thumbnail preference wins; overlapping fallbacks also avoid future thumbnail colors", () => {
  const tracks = [
    { slug: "fallback", startAbsolute: 1, endAbsolute: 10 },
    { slug: "photo", startAbsolute: 2, endAbsolute: 9 },
    { slug: "pin", startAbsolute: 2, endAbsolute: 9 },
  ]
  const colors = assignTimelineColors(tracks, [
    { slug: "photo", thumbnailColor: "#f0a07a", timelineColor: "#6ea8ff" },
    { slug: "pin", timelineColor: "#8fd4a8" },
  ])
  assert.equal(colors.get("photo"), "#f0a07a")
  assert.equal(colors.get("pin"), "#8fd4a8")
  assert.notEqual(colors.get("fallback"), colors.get("photo"))
  assert.notEqual(colors.get("fallback"), colors.get("pin"))
})

test("invalid overrides cannot become CSS and reuse is allowed for separate ranges", () => {
  const tracks = [
    { slug: "one", startAbsolute: 1, endAbsolute: 1 },
    { slug: "two", startAbsolute: 2, endAbsolute: 2 },
  ]
  const colors = assignTimelineColors(tracks, [{ slug: "one", timelineColor: "red; display:none" }])
  assert.ok(/^#[0-9a-f]{6}$/.test(colors.get("one")!))
  const reused = assignTimelineColors(
    tracks,
    tracks.map((track) => ({ ...track, timelineColor: "#6ea8ff" })),
  )
  assert.equal(new Set(reused.values()).size, 1)
})

test("Catalyst and Buildplate overlapping ranges receive different automatic colors", () => {
  const model = buildProjectTimeline([
    { slug: "the-catalyst", title: "The Catalyst", start: "2025-09-01", end: "2026-06-01" },
    { slug: "buildplate", title: "Buildplate", start: "2026-06-01", end: "2026-08-01" },
  ])!
  assert.notEqual(model.tracks[0].color, model.tracks[1].color)
  for (const mark of [...model.nodes, ...model.segments, ...model.connectors]) {
    assert.equal(mark.color, model.tracks.find((track) => track.slug === mark.slug)!.color)
  }
})

test("dominant thumbnail extraction follows preview priority and handles absent/remote images", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "portfolio-colors-"))
  try {
    const full = path.join(root, "assets/tab-panels/photo.png")
    const preview = path.join(root, "assets/tab-panels/preview/photo.png")
    await fs.mkdir(path.dirname(preview), { recursive: true })
    await sharp({ create: { width: 64, height: 42, channels: 3, background: "#0000ff" } })
      .png()
      .toFile(full)
    const fullColor = await loadThumbnailColor("/assets/tab-panels/photo.png", root)
    assert.equal(fullColor, readableThumbnailColor(8, 8, 248))
    await sharp({ create: { width: 64, height: 42, channels: 3, background: "#ff0000" } })
      .png()
      .toFile(preview)
    const previewColor = await loadThumbnailColor("/assets/tab-panels/photo.png", root)
    assert.equal(previewColor, readableThumbnailColor(248, 8, 8))
    assert.notEqual(fullColor, previewColor)
    // A white background must not hide a meaningful red area in the thumbnail.
    const redPatch = await sharp({
      create: { width: 20, height: 20, channels: 3, background: "#ff0000" },
    })
      .png()
      .toBuffer()
    await sharp({ create: { width: 64, height: 42, channels: 3, background: "#ffffff" } })
      .composite([{ input: redPatch, top: 0, left: 0 }])
      .png()
      .toFile(preview)
    assert.equal(await loadThumbnailColor("/assets/tab-panels/photo.png", root), previewColor)
    assert.equal(await loadThumbnailColor("/missing.png", root), undefined)
    assert.equal(await loadThumbnailColor("https://example.com/photo.png", root), undefined)
    assert.equal(await loadThumbnailColor("/assets/../../outside.png", root), undefined)
    assert.equal(readableThumbnailColor(0, 0, 0), "#b7c2cf")
  } finally {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()))
    assert.ok(path.basename(root).startsWith("portfolio-colors-"))
    await fs.rm(root, { recursive: true, force: true })
  }
})
