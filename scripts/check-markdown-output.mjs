import fs from "node:fs/promises"
import path from "node:path"
import assert from "node:assert/strict"
import { unified } from "unified"
import remarkParse from "remark-parse"

const output = path.resolve(process.argv[2] ?? "public")
async function files(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory()
          ? files(path.join(directory, entry.name))
          : [path.join(directory, entry.name)],
      ),
    )
  ).flat()
}
const paths = await files(output)
const relative = (filename) => path.relative(output, filename).replaceAll("\\", "/")
const emitted = new Set(paths.map(relative))
let pages = 0
let redirects = 0
for (const filename of paths.filter((filename) => filename.endsWith(".html"))) {
  const html = await fs.readFile(filename, "utf8")
  // Search Console's static ownership token is an asset, not a page.
  if (html.startsWith("google-site-verification:")) continue
  const slug = relative(filename).slice(0, -5)
  const canonical = `${slug.replace(/(?:^|\/)index$/, "") || "index"}.md`
  assert.ok(emitted.has(canonical), `Missing Markdown for ${relative(filename)}: ${canonical}`)
  assert.ok(emitted.has(`${slug}.html.md`), `Missing explicit HTML Markdown form: ${slug}.html.md`)
  const isRedirect = /http-equiv="refresh"/i.test(html)
  if (isRedirect) redirects++
  else {
    assert.match(
      html,
      /rel="alternate" type="text\/markdown"/,
      `Missing Markdown discovery link: ${slug}`,
    )
    assert.match(
      html,
      /rel="describedby" type="text\/plain"/,
      `Missing llms.txt discovery link: ${slug}`,
    )
    pages++
  }
}
assert.ok(pages > 0, "No generated HTML pages found")
for (const filename of paths.filter(
  (filename) => filename.endsWith(".md") || relative(filename) === "llms.txt",
)) {
  const markdown = await fs.readFile(filename, "utf8")
  function inspect(node) {
    // Literal examples in code blocks are content, not published authoring debt.
    if (node.type === "code" || node.type === "inlineCode") return
    if (node.type === "html")
      assert.doesNotMatch(node.value, /<!--/, `Comment leaked into ${relative(filename)}`)
    if (node.type === "paragraph") {
      const text = (node.children ?? [])
        .filter((child) => child.type === "text")
        .map((child) => child.value)
        .join("")
      assert.doesNotMatch(
        text,
        /^\s*\[Replace with:[\s\S]*\]\s*$/i,
        `Authoring prompt leaked into ${relative(filename)}`,
      )
    }
    if (node.url?.startsWith("/") && !node.url.startsWith("//")) {
      const target = decodeURIComponent(
        new URL(node.url, "https://prajwal.is-a.dev").pathname,
      ).slice(1)
      // The separate resume project provides this same-origin endpoint.
      if (target.endsWith(".md") && target !== "resume/resume.md")
        assert.ok(emitted.has(target), `Broken Markdown link in ${relative(filename)}: ${target}`)
    }
    for (const child of node.children ?? []) inspect(child)
  }
  inspect(unified().use(remarkParse).parse(markdown))
}
assert.ok(emitted.has("llms.txt"), "Missing llms.txt")
const index = JSON.parse(await fs.readFile(path.join(output, "search-index.json"), "utf8"))
assert.equal(index.version, 1)
assert.ok(index.pages.length > 0, "Empty agent search index")
assert.equal(
  new Set(index.pages.map((page) => page.slug)).size,
  index.pages.length,
  "Duplicate search results",
)
for (const page of index.pages) {
  assert.ok(
    emitted.has(page.markdownUrl.slice(1)),
    `Search result has no Markdown: ${page.markdownUrl}`,
  )
  assert.equal(typeof page.content, "string")
  assert.ok(Array.isArray(page.tags))
}
assert.ok(emitted.has("index.md"), "Missing home Markdown")
assert.ok(
  [...emitted].every((filename) => !/(?:^|\/)\.(?:html\.)?md$/.test(filename)),
  "Bare .md endpoint must not be emitted",
)
console.log(
  `Markdown coverage verified: ${pages} pages, ${redirects} aliases, ${paths.filter((filename) => filename.endsWith(".md")).length} Markdown endpoints, ${index.pages.length} searchable pages, and llms.txt.`,
)
