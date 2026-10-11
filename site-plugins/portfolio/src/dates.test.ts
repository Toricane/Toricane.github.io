import assert from "node:assert/strict"
import test from "node:test"
import { displayPeriod, projectDateBounds } from "./dates"
import { buildProjectTimeline } from "./projectTimeline"

test("month-only hackathon projects render as completed timeline points", () => {
  const data = { when: "2024/09" }
  const bounds = projectDateBounds(data)
  const model = buildProjectTimeline([
    { slug: "projects/hackathon", title: "Hackathon", start: bounds.start!, end: bounds.end },
  ])
  assert.ok(model)
  const track = model.tracks[0]
  assert.equal(track.ongoing, false)
  assert.equal(track.startAbsolute, track.endAbsolute)
  assert.equal(model.months[track.bottomRow].key, "2024/09")
  assert.equal(displayPeriod(data), "Sep 2024")
})

test("project ranges and ongoing projects retain their bounds", () => {
  assert.deepEqual(projectDateBounds({ date: "2024-01-15", modified: "2025-02-02" }), {
    start: "2024-01-15",
    end: "2025-02-02",
  })
  assert.deepEqual(projectDateBounds({ date: "2024-01-15" }), {
    start: "2024-01-15",
    end: undefined,
  })
})

test("invalid month values fall back to project dates", () => {
  assert.deepEqual(projectDateBounds({ when: "2024/13", date: "2024-01-15" }), {
    start: "2024-01-15",
    end: undefined,
  })
})
