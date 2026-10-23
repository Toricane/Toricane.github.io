import assert from "node:assert/strict"
import { test } from "node:test"
import { homeChapters, homeProjectStory, type HomeNode } from "./homeContent"

const node = (tagName: string, value: string): HomeNode => ({
  tagName,
  children: [{ type: "text", value }],
})

test("project stories use published role/result paragraphs without leaking prompts or unrelated sections", () => {
  assert.deepEqual(
    homeProjectStory({
      children: [
        node("h2", "Overview"),
        node("p", "Intro"),
        node("h2", "Role and constraints"),
        node("p", "[Replace with: role]"),
        node("p", "Built the pipeline."),
        node("h2", "Process"),
        node("p", "Implementation details."),
        node("h2", "Result"),
        node("p", "Won a team prize."),
        node("h2", "Reflection"),
        node("p", "A different paragraph."),
      ],
    }),
    { contribution: "Built the pipeline.", result: "Won a team prize." },
  )
  assert.deepEqual(
    homeProjectStory({
      children: [node("h2", "Role and constraints"), node("p", "[Replace with: role]")],
    }),
    {},
  )
})

test("home chapters preserve the complete source reading order and h3 subsections", () => {
  const intro = node("p", "Hello")
  const heading = node("h2", "People")
  const subheading = node("h3", "Teaching")
  const text = node("p", "Chess")
  assert.deepEqual(homeChapters({ children: [intro, heading, subheading, text] }), {
    intro: [intro],
    chapters: [{ heading, nodes: [subheading, text] }],
  })
})

test("home outcomes keep the headline sentence and preserve decimal measurements", () => {
  assert.deepEqual(
    homeProjectStory({
      children: [
        node("h2", "Result"),
        node("p", "Measured 1.4× gain. The full entry explains the conditions."),
      ],
    }),
    { result: "Measured 1.4× gain." },
  )
})
