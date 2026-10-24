import assert from "node:assert/strict"
import test from "node:test"
import type { Element, Root } from "hast"
import { promoteProjectLinks } from "./entryContent"

function element(tagName: string, text: string, id?: string): Element {
  return { type: "element", tagName, properties: { id }, children: [{ type: "text", value: text }] }
}

test("project HTML promotes the complete Links section while preserving other content and source order", () => {
  const source: Root = {
    type: "root",
    children: [
      element("p", "Intro before the sections"),
      element("h2", "Overview", "overview"),
      element("p", "Context"),
      element("h2", "Process", "process"),
      element("p", "Work"),
      element("h2", "Links", "links"),
      element("ul", "Website and GitHub"),
      element("h3", "Related resources", "related-resources"),
      element("p", "Further reading"),
      element("h2", "Gallery", "gallery"),
      element("p", "Photos"),
    ],
  }
  const rendered = structuredClone(source)
  promoteProjectLinks(rendered)
  assert.deepEqual(rendered.children, [
    source.children[0],
    ...source.children.slice(5, 9),
    ...source.children.slice(1, 5),
    ...source.children.slice(9),
  ])
  assert.equal((source.children[1] as Element).properties.id, "overview")
  const once = structuredClone(rendered)
  promoteProjectLinks(rendered)
  assert.deepEqual(rendered, once)
})

test("projects without Overview still expose Links first; missing or already leading Links stay intact", () => {
  const tree: Root = {
    type: "root",
    children: [
      element("h2", "Process", "process"),
      element("h2", "Links", "links"),
      element("ul", "Demo"),
    ],
  }
  promoteProjectLinks(tree)
  assert.equal((tree.children[0] as Element).properties.id, "links")
  for (const children of [[], [element("h2", "Overview", "overview")], tree.children]) {
    const unchanged: Root = { type: "root", children: structuredClone(children) }
    promoteProjectLinks(unchanged)
    assert.deepEqual(unchanged.children, children)
  }
})
