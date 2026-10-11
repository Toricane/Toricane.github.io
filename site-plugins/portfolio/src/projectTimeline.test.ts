import assert from "node:assert/strict"
import test from "node:test"
import { buildProjectTimeline, type ProjectTimelineModel } from "./projectTimeline"

test("filtering a card stack repacks rows and removes unrelated event months", () => {
  const projects = [
    { slug: "keep", title: "Keep", start: "2025-01-01", end: "2025-03-01", nodes: ["2025-02-01"] },
    { slug: "hide", title: "Hide", start: "2025-01-01", end: "2025-06-01" },
  ]
  const all = buildProjectTimeline(projects)!
  const filtered = buildProjectTimeline(projects.filter((project) => project.slug === "keep"))!
  assert.ok(filtered.geometry.svgHeight < all.geometry.svgHeight)
  assert.deepEqual(
    filtered.months.map((month) => month.key),
    ["2025/03", "2025/02", "2025/01"],
  )
  assert.deepEqual(filtered.geometry.rowHeights, [36, 36, 72])
  for (const node of filtered.nodes) {
    assert.ok(filtered.months.some((month) => node.y === monthY(filtered, month.key)))
  }
  assert.equal(buildProjectTimeline([]), null)
  // Clearing the filter restores the original geometry.
  assert.deepEqual(buildProjectTimeline(projects), all)
})

function monthY(model: ProjectTimelineModel, key: string): number {
  const row = model.months.findIndex((month) => month.key === key)
  assert.ok(row >= 0)
  return model.geometry.rowOffsets[row] + model.geometry.rowHeights[row] / 2
}

test("shared-month cards have separate connections and repack after filtering", () => {
  const inputs = [
    { slug: "a", title: "A", start: "2024-09-01", end: "2024-11-01" },
    { slug: "b", title: "B", start: "2024-09-01", end: "2024-09-01" },
  ]
  const model = buildProjectTimeline(inputs)!
  const row = model.months.findIndex((month) => month.key === "2024/09")
  const connections = model.connectors
  assert.equal(connections.length, 2)
  for (const connection of connections) {
    const node = model.nodes.find((node) => node.slug === connection.slug)!
    // Distinct leaders begin at tightly clustered dots and fan out to the cards.
    assert.ok(connection.path.startsWith(`M ${node.x} ${node.y} H `))
    assert.ok(Math.abs(node.y - monthY(model, "2024/09")) <= 3)
    assert.equal(connection.color, node.color)
  }
  const targets = connections.map((connection) => Number(connection.path.match(/ V ([\d.]+)/)![1]))
  const offset = model.geometry.rowOffsets[row]
  assert.ok(targets[0] > offset && targets[0] < monthY(model, "2024/09"))
  assert.ok(
    targets[1] > monthY(model, "2024/09") && targets[1] < offset + model.geometry.rowHeights[row],
  )
  const filtered = buildProjectTimeline(inputs.slice(1))!
  assert.equal(filtered.connectors.length, 1)
  assert.ok(filtered.connectors[0].path.includes(` ${monthY(filtered, "2024/09")} H `))
  const start = model.nodes.find((node) => node.slug === "a" && node.kind === "start")!
  assert.equal(model.segments.find((segment) => segment.slug === "a")!.y2, start.y)
})

test("large same-month stacks keep dots compact and leaders do not share stretches", () => {
  const model = buildProjectTimeline(
    Array.from({ length: 5 }, (_, index) => ({
      slug: `project-${index}`,
      title: `Project ${index}`,
      start: "2024-09-01",
      end: "2024-09-01",
    })),
  )!
  const ys = model.nodes.map((node) => node.y)
  assert.equal(new Set(ys).size, 5)
  assert.equal(Math.max(...ys) - Math.min(...ys), 16)
  const center = monthY(model, "2024/09")
  assert.ok(ys.every((y) => Math.abs(y - center) <= 8))
  const leaders = model.connectors.map((connector) => {
    const parts = connector.path.match(/^M ([\d.]+) ([\d.]+) H ([\d.]+) V ([\d.]+) H ([\d.]+)$/)!
    assert.ok(parts)
    const [, x, y, elbow, targetY, end] = parts.map(Number)
    return {
      horizontal: [
        [x, elbow, y],
        [elbow, end, targetY],
      ],
      vertical: [Math.min(y, targetY), Math.max(y, targetY), elbow],
    }
  })
  for (let i = 0; i < leaders.length; i++) {
    for (let j = i + 1; j < leaders.length; j++) {
      for (const a of leaders[i].horizontal) {
        for (const b of leaders[j].horizontal) {
          assert.ok(a[2] !== b[2] || Math.min(a[1], b[1]) <= Math.max(a[0], b[0]))
        }
      }
      const a = leaders[i].vertical,
        b = leaders[j].vertical
      assert.ok(a[2] !== b[2] || Math.min(a[1], b[1]) <= Math.max(a[0], b[0]))
    }
  }
})

test("shared starts keep parent curves and hiatus boundaries attached to their own dots", () => {
  const model = buildProjectTimeline([
    {
      slug: "parent",
      title: "Parent",
      start: "2024-09-01",
      end: "2025-02-01",
      pauses: [{ pause: "2024-11-01", restart: "2025-01-01" }],
    },
    { slug: "child", title: "Child", start: "2024-09-01", end: "2024-12-01", parent: "parent" },
    { slug: "point", title: "Point", start: "2024-09-01", end: "2024-09-01" },
  ])!
  const parentStart = model.nodes.find((node) => node.slug === "parent" && node.kind === "start")!
  const childStart = model.nodes.find((node) => node.slug === "child" && node.kind === "start")!
  const branch = model.branches.find((branch) => branch.slug === "child")!
  assert.ok(branch.path.startsWith(`M ${parentStart.x} ${parentStart.y} C `))
  assert.ok(branch.path.endsWith(`${childStart.x} ${childStart.y}`))
  assert.notEqual(parentStart.y, childStart.y)
  for (const segment of model.segments) {
    for (const y of [segment.y1, segment.y2]) {
      assert.ok(
        model.nodes.some(
          (node) => node.slug === segment.slug && node.x === segment.x && node.y === y,
        ),
      )
    }
  }
})

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
