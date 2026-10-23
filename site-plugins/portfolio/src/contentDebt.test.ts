import assert from "node:assert/strict"
import test from "node:test"
import { unified } from "unified"
import remarkParse from "remark-parse"
import { hideContentDebt } from "./contentDebt"

function clean(markdown: string) {
  const tree = unified().use(remarkParse).parse(markdown)
  hideContentDebt(tree)
  return tree
}

test("placeholder sections disappear while real content and images stay", () => {
  const tree = clean(`## Overview
> [Replace with: an intro.]
## Process
Actual process.
> [Replace with: more detail.]
## Reflection
> [Replace with: lessons.]
## Gallery
![Real image](/assets/car.webp)
## Links
- [Label](https://example.com)
- [GitHub](https://github.com/Toricane/car)`)
  const output = JSON.stringify(tree)
  assert.ok(!output.includes("Replace with"))
  assert.ok(!output.includes('"value":"Overview"'))
  assert.ok(!output.includes('"value":"Reflection"'))
  assert.ok(!output.includes("https://example.com"))
  assert.ok(output.includes("Actual process."))
  assert.ok(output.includes("/assets/car.webp"))
  assert.ok(output.includes("https://github.com/Toricane/car"))
})

test("nested placeholder headings and comment-only sections disappear", () => {
  const tree = clean(`## Draft
### Detail
> [Replace with: detail.]
<!-- author note -->
## Links
- [Label](https://example.com)
## Result
Verified result.`)
  const headings = tree.children.filter((node) => node.type === "heading")
  assert.equal(headings.length, 1)
  assert.equal(headings[0].children[0].type, "text")
  assert.equal((headings[0].children[0] as { value: string }).value, "Result")
})

test("code examples and ordinary mentions of placeholders remain content", () => {
  const tree = clean(
    "## Notes\nUse `[Replace with: …]` in the template.\n\n```text\n[Replace with: example]\n```",
  )
  assert.equal(tree.children.length, 3)
})
