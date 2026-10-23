import assert from "node:assert/strict"
import { test } from "node:test"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { VFile } from "vfile"
import type { BuildCtx, FullSlug, ProcessedContent } from "@quartz-community/types"
import {
  createMarkdownEmitter,
  RESUME_HREF,
  cleanMarkdown,
  markdownOutputs,
  markdownPath,
  markdownPaths,
  resolveMarkdownLink,
} from "./markdown"

const base = "https://prajwal.is-a.dev"
function page(slug: string, frontmatter = {}, extra = {}): ProcessedContent {
  const file = new VFile("")
  file.data = { slug: slug as FullSlug, frontmatter: { title: slug, ...frontmatter }, ...extra }
  return [{ type: "root", children: [] }, file]
}
function context(output: string): BuildCtx {
  return {
    argv: { output },
    cfg: { configuration: { baseUrl: "prajwal.is-a.dev", pageTitle: "Portfolio" } },
  } as BuildCtx
}

test("home Markdown keeps stories before narrative chapters and includes their documented outcomes", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "portfolio-home-markdown-"))
  try {
    const source = path.join(directory, "index.md")
    await fs.writeFile(
      source,
      "Hello.\n\n## Building with people\n\nTeaching chess.\n\n## Contact\n\nEmail me.\n",
    )
    const outputs = await markdownOutputs(context(directory), [
      page("index", {}, { filePath: source }),
      page(
        "projects/example",
        { title: "Example", significance: "spotlight", when: "2026/09" },
        {
          homeProjectStory: { contribution: "Designed the pipeline.", result: "Won a team prize." },
        },
      ),
    ])
    const home = outputs.get("index.md")!
    assert.ok(home.indexOf("Selected projects") < home.indexOf("Building with people"))
    assert.ok(home.indexOf("Building with people") < home.indexOf("## Contact"))
    assert.match(home, /My contribution: Designed the pipeline/)
    assert.match(home, /The result: Won a team prize/)
    assert.match(home, /Teaching chess/)
  } finally {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()))
    await fs.rm(directory, { recursive: true, force: true })
  }
})

test("root, folders, tags and explicit HTML/index URL forms", () => {
  assert.equal(markdownPath("index"), "/index.md")
  assert.equal(markdownPath("/"), "/index.md")
  assert.equal(markdownPath("projects/index"), "/projects.md")
  assert.equal(markdownPath("projects/"), "/projects.md")
  assert.equal(markdownPath("tags/hackathon"), "/tags/hackathon.md")
  for (const slug of ["index", "/", "projects/index", "projects/"]) {
    assert.ok(markdownPaths(slug).every((endpoint) => !/\/(?:\.md|\.html\.md)$/.test(endpoint)))
  }
  assert.equal(RESUME_HREF, "/resume/resume.md")
  assert.ok(markdownPaths("projects/index").includes("/projects/index.md"))
  assert.ok(markdownPaths("projects/index").includes("/projects.html.md"))
})

test("Markdown links resolve relative pages, anchors, assets and external links", () => {
  const target = { slug: "projects/cell-safe" }
  const routes = new Map([["/projects/cell-safe", target]])
  assert.equal(
    resolveMarkdownLink("cell-safe#result", "projects/other", base, routes),
    "/projects/cell-safe.md#result",
  )
  assert.equal(
    resolveMarkdownLink("/projects/cell-safe.html?q=x", "index", base, routes),
    "/projects/cell-safe.md?q=x",
  )
  assert.equal(
    resolveMarkdownLink("../assets/a.webp", "projects/other", base, routes),
    "/assets/a.webp",
  )
  assert.equal(
    resolveMarkdownLink(`${base}/assets/a.webp?size=2#caption`, "index", base, routes),
    "/assets/a.webp?size=2#caption",
  )
  assert.equal(
    resolveMarkdownLink("https://example.org/a", "index", base, routes),
    "https://example.org/a",
  )
  assert.equal(
    resolveMarkdownLink("mailto:a@example.org", "index", base, routes),
    "mailto:a@example.org",
  )
})

test("cleaned export removes authoring debt but retains tables and code", () => {
  const source =
    "---\ntitle: Hidden metadata\n---\n\nHello :ubc: [University](https://example.org).\n\n## Empty\n\n[Replace with: copy.]\n\n## Table\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n<!-- source notes -->\n\n```md\n[Replace with: literal code.]\n```\n"
  const output = cleanMarkdown(source, "index", base, new Map())
  assert.doesNotMatch(output, /Hidden metadata|## Empty|source notes|:ubc:/)
  assert.match(output, /\| A\s*\| B/)
  assert.match(output, /```md\n\[Replace with: literal code\.\]/)
})

test("generated listings, aliases, metadata, discovery and incremental deletions", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "portfolio-markdown-"))
  try {
    const source = path.join(directory, "entry.md")
    await fs.writeFile(source, "## Result\n\nBuilt a prototype.\n")
    const content = [
      page("index"),
      page(
        "projects/index",
        { description: "Projects" },
        { aliases: ["hackathons/index", "hackathons"] },
      ),
      page(
        "projects/cell-safe",
        {
          title: "Cell Safe",
          description: "Emergency prototype",
          when: "2026/09",
          from: "Challenge",
          tags: ["hackathon"],
          significance: "spotlight",
        },
        { filePath: source, aliases: ["hackathons/old"] },
      ),
      page("tags/index"),
      page("tags/hackathon"),
      page("awards/index"),
      page("awards/winner", { when: "2026/09", significance: "featured", tags: ["data"] }),
      page("projects/range", {
        date: "2025-01-02",
        modified: "2025-03-04",
        significance: "standard",
        tags: ["robotics"],
      }),
      page("projects/ongoing", { date: "2026-01-02", significance: "standard" }),
      page("projects/unlisted", { description: "Unlisted content" }, { unlisted: true }),
    ]
    const ctx = context(directory)
    const outputs = await markdownOutputs(ctx, content)
    assert.equal(outputs.get("hackathons/old.md"), outputs.get("projects/cell-safe.md"))
    assert.equal(outputs.get("hackathons.md"), outputs.get("projects.md"))
    assert.match(outputs.get("projects.md")!, /Cell Safe.*cell-safe.md.*Emergency prototype/)
    assert.match(
      outputs.get("projects.md")!,
      /When: 2026-09 · Highlight: spotlight · Tags: hackathon · From: Challenge/,
    )
    assert.match(
      outputs.get("projects.md")!,
      /Dates: 2025-01 – 2025-03 · Highlight: standard · Tags: robotics/,
    )
    assert.match(outputs.get("projects.md")!, /Dates: 2026-01 – ongoing/)
    assert.match(outputs.get("awards.md")!, /When: 2026-09 · Highlight: featured · Tags: data/)
    assert.doesNotMatch(outputs.get("projects.md")!, /Unlisted content/)
    assert.match(outputs.get("tags/hackathon.md")!, /cell-safe.md/)
    assert.match(outputs.get("tags.md")!, /tags\/hackathon.md/)
    assert.match(outputs.get("projects/cell-safe.md")!, /When: 2026-09/)
    assert.match(outputs.get("projects/cell-safe.md")!, /Built a prototype/)
    assert.match(outputs.get("llms.txt")!, /\/projects\/ → \/projects.md/)
    assert.match(outputs.get("llms.txt")!, /search-index.json/)
    for (const [filename, markdown] of outputs) {
      if (filename.endsWith(".md") || filename === "llms.txt")
        assert.doesNotMatch(markdown, /https:\/\/prajwal\.is-a\.dev/)
      if (filename.endsWith(".md"))
        assert.match(
          markdown,
          /\[Home\]\(\/index.md\).*\[Projects\]\(\/projects.md\).*\[Awards\]\(\/awards.md\).*\[Resume\]/,
        )
      if (filename.endsWith(".md")) assert.ok(markdown.includes(`[Resume](${RESUME_HREF})`))
    }
    assert.equal(outputs.has("resume.md"), false)
    assert.equal(outputs.has("resume/resume.md"), false)
    assert.ok([...outputs.keys()].every((filename) => !/(?:^|\/)\.(?:html\.)?md$/.test(filename)))
    assert.match(outputs.get("llms.txt")!, /\[About Prajwal\]\(\/index.md\)/)
    const index = JSON.parse(outputs.get("search-index.json")!)
    assert.equal(index.version, 1)
    assert.equal(
      index.pages.find((entry: { slug: string }) => entry.slug === "index").markdownUrl,
      "/index.md",
    )
    const matches = index.pages.filter((entry: { content: string }) =>
      entry.content.toLowerCase().includes("built a prototype"),
    )
    assert.equal(matches.length, 1)
    assert.equal(matches[0].markdownUrl, "/projects/cell-safe.md")
    assert.equal(matches[0].when, "2026-09")
    assert.equal(matches[0].date, null)
    const ranged = index.pages.find((entry: { slug: string }) => entry.slug === "projects/range")
    assert.equal(ranged.date, "2025-01")
    assert.equal(ranged.modified, "2025-03")
    assert.match(outputs.get("projects/range.md")!, /Started: 2025-01\n- Ended: 2025-03/)
    assert.equal(matches[0].significance, "spotlight")
    assert.deepEqual(matches[0].tags, ["hackathon"])
    assert.deepEqual(matches[0].aliases, ["/hackathons/old"])
    assert.equal(
      index.pages.filter((entry: { slug: string }) => entry.slug.includes("unlisted")).length,
      0,
    )
    const emitter = createMarkdownEmitter()
    await emitter.emit(ctx, content)
    await emitter.emit(
      ctx,
      content.filter(([, file]) => file.data.slug !== "projects/cell-safe"),
    )
    await assert.rejects(fs.access(path.join(directory, "hackathons/old.md")))
    assert.doesNotMatch(await fs.readFile(path.join(directory, "projects.md"), "utf8"), /cell-safe/)
    assert.doesNotMatch(
      await fs.readFile(path.join(directory, "search-index.json"), "utf8"),
      /cell-safe/,
    )
    const resources = emitter.externalResources!(ctx)
    assert.equal(resources?.additionalHead?.length, 1)
  } finally {
    await fs.rm(directory, { recursive: true, force: true })
  }
})

test("colliding directory and entry routes fail instead of silently overwriting", async () => {
  await assert.rejects(
    markdownOutputs(context("unused"), [page("projects"), page("projects/index")]),
    /collision/,
  )
})

test("home exports the six current spotlight projects with counts and metadata", async () => {
  const projects = Array.from({ length: 7 }, (_, index) =>
    page(`projects/build-${index}`, {
      title: `Build ${index}`,
      description: `Prototype ${index}`,
      significance: "spotlight",
      when: `2026/0${index + 1}`,
      tags: ["hackathon", "Winner"],
      from: "Challenge",
    }),
  )
  const content = [
    page("index"),
    page("projects/index"),
    page("awards/index"),
    ...projects,
    page("projects/ranged", {
      title: "Ranged",
      significance: "spotlight",
      date: new Date("2025-01-01"),
      modified: new Date("2026-08-01"),
    }),
    page("projects/ordinary", { significance: "featured", when: "2026/10" }),
    page("projects/hidden", { significance: "spotlight", when: "2026/12" }, { unlisted: true }),
    page("awards/win", { significance: "spotlight", tags: ["Hackathon"] }),
    page("awards/mention", { tags: ["hackathon/side-challenge"] }),
    page("awards/academic", { tags: ["academic"] }),
  ]
  const outputs = await markdownOutputs(context("unused"), content)
  const home = outputs.get("index.md")!
  assert.match(home, /## Selected projects/)
  assert.match(home, /Projects: 9 · Hackathon builds: 7 · Hackathon awards: 2/)
  assert.deepEqual(
    [...home.matchAll(/^- \[([^\]]+)\]/gm)].map((match) => match[1]),
    ["Ranged", "Build 6", "Build 5", "Build 4", "Build 3", "Build 2"],
  )
  assert.match(home, /\[Build 6\]\(\/projects\/build-6.md\): Prototype 6/)
  assert.match(
    home,
    /When: 2026-07 · Highlight: spotlight · Tags: hackathon, Winner · From: Challenge/,
  )
  assert.match(home, /\[View all projects\]\(\/projects.md\)/)
  assert.match(home, /\[3 awards & distinctions\]\(\/awards.md\)/)
  const search = JSON.parse(outputs.get("search-index.json")!)
  assert.match(
    search.pages.find((entry: { slug: string }) => entry.slug === "index").content,
    /Selected projects.*Prototype 6/,
  )
  const refreshed = await markdownOutputs(
    context("unused"),
    content.filter(([, file]) => file.data.slug !== "projects/build-6"),
  )
  assert.doesNotMatch(refreshed.get("index.md")!, /build-6/)
  assert.match(refreshed.get("index.md")!, /build-1.md/)
  const empty = await markdownOutputs(context("unused"), [page("index")])
  assert.doesNotMatch(empty.get("index.md")!, /## Selected projects/)
})
