import assert from "node:assert/strict"
import { test } from "node:test"
import { adjacentEntry, collectionUrl, readCollectionState } from "./collectionState"

test("shared collection links round trip filters, tags, sort and view without losing other URL state", () => {
  const state = {
    view: "timeline" as const,
    sort: "date" as const,
    query: "AI & hardware",
    highlights: true,
    tags: ["ai", "c++", "ai"],
  }
  const href = collectionUrl("https://example.com/projects/?campaign=hello#archive", state)
  const url = new URL(href, "https://example.com")
  assert.equal(url.searchParams.get("campaign"), "hello")
  assert.equal(url.hash, "#archive")
  assert.deepEqual(readCollectionState(url.searchParams), { ...state, tags: ["ai", "c++"] })
  assert.equal(
    collectionUrl(url.href, readCollectionState(new URLSearchParams())),
    "/projects/?campaign=hello#archive",
  )
})

test("invalid view/sort values fall back to defaults and empty tags are ignored", () => {
  assert.deepEqual(
    readCollectionState(new URLSearchParams("view=broken&sort=wrong&tag=&highlights=no")),
    {
      view: "gallery",
      sort: "significance",
      query: "",
      highlights: false,
      tags: [],
    },
  )
})

test("modal neighbors follow the supplied visible order and stop at both boundaries", () => {
  const entries = [{ href: "/projects/c" }, { href: "/projects/a" }]
  assert.equal(adjacentEntry(entries, "/projects/c", 1), entries[1])
  assert.equal(adjacentEntry(entries, "/projects/a", -1), entries[0])
  assert.equal(adjacentEntry(entries, "/projects/c", -1), undefined)
  assert.equal(adjacentEntry(entries, "/projects/a", 1), undefined)
  assert.equal(adjacentEntry(entries, "/projects/filtered-out", 1), undefined)
})
