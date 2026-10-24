import assert from "node:assert/strict"
import { test } from "node:test"
import { homeChapters, homeProjectStory, homeStoryProjectSlugs, type HomeNode } from "./homeContent"

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

test("full home stories are identified by project actions, not incidental mentions or archives", () => {
  const link = (href: string): HomeNode => ({ tagName: "a", properties: { href } })
  assert.deepEqual(
    [
      ...homeStoryProjectSlugs([
        { tagName: "p", children: [link("/projects/story")] },
        { tagName: "p", children: [link("/projects/story#process")] },
        {
          tagName: "p",
          children: [{ type: "text", value: "I also built " }, link("/projects/mention")],
        },
        { tagName: "p", children: [link("/projects/")] },
        { tagName: "p", children: [link("/awards/example")] },
        { tagName: "p", children: [link("https://other.example/projects/external")] },
      ]),
    ],
    ["projects/story"],
  )
  assert.deepEqual(
    [
      ...homeStoryProjectSlugs([
        { type: "paragraph", children: [{ type: "link", url: "/projects/story.md#process" }] },
        { type: "paragraph", children: [{ type: "link", url: "/projects/another.html/" }] },
      ]),
    ],
    ["projects/story", "projects/another"],
  )
})
