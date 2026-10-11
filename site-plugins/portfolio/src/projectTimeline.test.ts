import assert from "node:assert/strict"
import test from "node:test"
import { buildProjectTimeline, type ProjectTimelineModel } from "./projectTimeline"

function monthY(model: ProjectTimelineModel, key: string): number {
  const row = model.months.findIndex((month) => month.key === key)
  assert.ok(row >= 0)
  return model.geometry.rowOffsets[row] + model.geometry.rowHeights[row] / 2
}

test("branches attach to the completed parent even when its lane is reused", () => {
  const model = buildProjectTimeline([
    { slug: "parent", title: "Parent", start: "2025-04-01", end: "2025-06-01" },
    { slug: "unrelated", title: "Unrelated", start: "2025-07-01", end: "2025-08-01" },
    { slug: "child", title: "Child", start: "2025-10-01", end: "2025-10-01", parent: "parent" },
  ])!
  assert.equal(model.tracks[0].lane, model.tracks[1].lane)
  assert.equal(model.tracks[0].lane, model.tracks[2].lane)
  assert.equal(model.branches.length, 1)
  const x = model.nodes.find((node) => node.slug === "parent")!.x
  assert.ok(model.branches[0].path.startsWith(`M ${x} ${monthY(model, "2025/06")} C `))
  assert.ok(model.branches[0].path.endsWith(`${x} ${monthY(model, "2025/10")}`))
  assert.ok(model.branches[0].path.includes(`C ${x + model.geometry.laneWidth / 2} `))
})

test("overlapping branches attach to the parent's active work at the child's start", () => {
  const model = buildProjectTimeline([
    { slug: "parent", title: "Parent", start: "2025-04-01", end: "2025-10-01" },
    { slug: "child", title: "Child", start: "2025-06-01", end: "2025-08-01", parent: "parent" },
  ])!
  const x = model.nodes.find((node) => node.slug === "parent")!.x
  assert.ok(model.branches[0].path.startsWith(`M ${x} ${monthY(model, "2025/06")} C `))
})

test("branches during a parent hiatus attach to the last active boundary", () => {
  const model = buildProjectTimeline([
    {
      slug: "parent",
      title: "Parent",
      start: "2025-01-01",
      end: "2025-12-01",
      pauses: [{ pause: "2025-03-01", restart: "2025-09-01" }],
    },
    { slug: "child", title: "Child", start: "2025-06-01", end: "2025-06-01", parent: "parent" },
  ])!
  const x = model.nodes.find((node) => node.slug === "parent")!.x
  assert.ok(model.branches[0].path.startsWith(`M ${x} ${monthY(model, "2025/03")} C `))
})

test("a parent starting after its child does not create a backwards relationship", () => {
  const model = buildProjectTimeline([
    { slug: "parent", title: "Parent", start: "2025-09-01", end: "2025-10-01" },
    { slug: "child", title: "Child", start: "2025-06-01", end: "2025-06-01", parent: "parent" },
  ])!
  assert.equal(model.branches.length, 0)
})
