import assert from "node:assert/strict"
import test from "node:test"
import { collectGalleryImages } from "./galleryExtractor"
import { imageVariant } from "./imageVariant"

test("relative tab-panel paths select variants and preserve query strings and anchors", () => {
  for (const prefix of ["/", "./", "../", "../../", ""]) {
    assert.equal(
      imageVariant(`${prefix}assets/tab-panels/example.webp?v=2#photo`, "small"),
      "/assets/tab-panels/small/example.webp?v=2#photo",
    )
  }
  assert.equal(
    imageVariant("../assets/tab-panels/small/example.webp", "full"),
    "/assets/tab-panels/example.webp",
  )
  for (const src of [
    "https://example.com/photo.webp",
    "//example.com/photo.webp",
    "data:image/png;base64,abc",
    "../assets/coverflow/photo.webp",
  ]) {
    assert.equal(imageVariant(src, "small"), src)
  }
})

test("Gallery HTML uses lazy thumbnails while metadata keeps originals and other sections stay intact", () => {
  const heading = (text: string) => ({ tagName: "h2", children: [{ value: text }] })
  const image = (src: string) => ({ tagName: "img", properties: { src, alt: "Photo" } })
  const before = image("../assets/tab-panels/before.webp")
  const gallery = image("../assets/tab-panels/example.webp")
  const after = image("../assets/tab-panels/after.webp")
  const tree = {
    children: [
      before,
      heading("Gallery"),
      { tagName: "p", children: [gallery] },
      heading("Overview"),
      after,
    ],
  }
  const metadata = collectGalleryImages(tree)
  assert.deepEqual(metadata, [{ src: "../assets/tab-panels/example.webp", alt: "Photo" }])
  assert.deepEqual(gallery.properties, {
    src: "/assets/tab-panels/small/example.webp",
    alt: "Photo",
    loading: "lazy",
    decoding: "async",
  })
  assert.equal(before.properties.src, "../assets/tab-panels/before.webp")
  assert.equal(after.properties.src, "../assets/tab-panels/after.webp")
  assert.equal(imageVariant(gallery.properties.src, "full"), "/assets/tab-panels/example.webp")
})
