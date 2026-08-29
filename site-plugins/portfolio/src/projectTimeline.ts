/** Layout math for the vertical Git-style projects timeline. */

export type PauseRestart = {
  pause: string | Date
  restart: string | Date
}

export type ProjectTimelineInput = {
  slug: string
  title: string
  start: string | Date
  end?: string | Date
  /** Hiatus pairs (`pause`/`restart`, `pause1`/`restart1`, …). */
  pauses?: PauseRestart[]
  /** Extra open-circle landmarks (`node`, `node1`, `node2`, …). */
  nodes?: Array<string | Date>
  parent?: string
  series?: string
}

export type ProjectTimelineMonth = {
  /** Event month (start/end/pause) or compact marker for a collapsed empty stretch. */
  kind: "month" | "gap"
  key: string
  label: string
  year: number
  month: number
  /** Absolute month index: year * 12 + (month - 1). Gaps reuse the newer neighbor. */
  absolute: number
}

export type ProjectTimelineTrack = {
  slug: string
  title: string
  lane: number
  colorIndex: number
  /** Inclusive absolute month of overall start. */
  startAbsolute: number
  /** Inclusive absolute month of overall end (tip when ongoing). */
  endAbsolute: number
  ongoing: boolean
  /** Row index in newest-first months[] (overall end / top). */
  topRow: number
  /** Row index in newest-first months[] (overall start / bottom; card row). */
  bottomRow: number
  /** Parent lane to draw a branch curve from, if curated. */
  branchFromLane?: number
  branchFromSlug?: string
}

export type ProjectTimelineGeometry = {
  /** Base height for a single-card event month row. */
  rowHeight: number
  /** Per-row heights (event months expand for multi-start; gaps stay compact). */
  rowHeights: number[]
  /** Y offset of the top of each row. */
  rowOffsets: number[]
  laneWidth: number
  padX: number
  nodeRadius: number
  svgWidth: number
  svgHeight: number
}

export type ProjectTimelineSegment = {
  slug: string
  lane: number
  colorIndex: number
  x: number
  y1: number
  y2: number
  /** Active work (solid), hiatus (dashed), or open tip (solid + ongoing node). */
  style: "solid" | "pause" | "ongoing"
}

export type ProjectTimelineNode = {
  slug: string
  lane: number
  colorIndex: number
  x: number
  y: number
  kind: "start" | "end" | "ongoing"
}

export type ProjectTimelineBranch = {
  slug: string
  colorIndex: number
  path: string
}

export type ProjectTimelineModel = {
  months: ProjectTimelineMonth[]
  laneCount: number
  tracks: ProjectTimelineTrack[]
  geometry: ProjectTimelineGeometry
  segments: ProjectTimelineSegment[]
  nodes: ProjectTimelineNode[]
  branches: ProjectTimelineBranch[]
}

/** ~2× the prior compact row so TimelineRow-level cards fit. */
const DEFAULT_ROW_HEIGHT = 72
/** Compact spacer for collapsed empty calendar stretches. */
const DEFAULT_GAP_ROW_HEIGHT = 20
/** Narrow lanes so the graph column stays roughly half the prior width. */
const DEFAULT_LANE_WIDTH = 14
const DEFAULT_PAD_X = 8
const DEFAULT_NODE_RADIUS = 3.5

type SpanKind = "active" | "pause"

type AbsoluteSpan = {
  startAbsolute: number
  endAbsolute: number
  kind: SpanKind
}

type NormalizedProject = {
  slug: string
  title: string
  startAbsolute: number
  endAbsolute: number
  ongoing: boolean
  spans: AbsoluteSpan[]
  /** Extra open-circle months within the project range. */
  milestoneAbsolutes: number[]
  parent?: string
  series?: string
}

function parseDate(value: string | Date | undefined): Date | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function absoluteMonth(date: Date): number {
  return date.getUTCFullYear() * 12 + date.getUTCMonth()
}

function monthParts(absolute: number): { year: number; month: number } {
  const year = Math.floor(absolute / 12)
  const month = (absolute % 12) + 1
  return { year, month }
}

function monthKey(absolute: number): string {
  const { year, month } = monthParts(absolute)
  return `${year}/${String(month).padStart(2, "0")}`
}

function monthLabel(absolute: number): string {
  const { year, month } = monthParts(absolute)
  const date = new Date(Date.UTC(year, month - 1, 1))
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date)
}

function intervalsOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart <= bEnd && bStart <= aEnd
}

/** Build active/pause spans from overall bounds + pause/restart pairs. */
function buildSpans(
  startAbsolute: number,
  endAbsolute: number,
  pauses: { pause: number; restart: number }[],
): AbsoluteSpan[] {
  const pairs = [...pauses]
    .filter((pair) => pair.pause >= startAbsolute && pair.restart <= endAbsolute && pair.pause < pair.restart)
    .sort((a, b) => a.pause - b.pause || a.restart - b.restart)

  const spans: AbsoluteSpan[] = []
  let cursor = startAbsolute

  for (const pair of pairs) {
    const pauseAt = Math.max(cursor, pair.pause)
    const restartAt = Math.max(pauseAt, pair.restart)
    if (restartAt > endAbsolute) break

    spans.push({ startAbsolute: cursor, endAbsolute: pauseAt, kind: "active" })
    spans.push({ startAbsolute: pauseAt, endAbsolute: restartAt, kind: "pause" })
    cursor = restartAt
  }

  spans.push({ startAbsolute: cursor, endAbsolute: endAbsolute, kind: "active" })
  return spans
}

function normalizePausePairs(pauses: PauseRestart[] | undefined): { pause: number; restart: number }[] {
  if (!pauses?.length) return []
  const pairs: { pause: number; restart: number }[] = []
  for (const entry of pauses) {
    const pauseDate = parseDate(entry.pause)
    const restartDate = parseDate(entry.restart)
    if (!pauseDate || !restartDate) continue
    const pause = absoluteMonth(pauseDate)
    const restart = absoluteMonth(restartDate)
    if (restart < pause) continue
    pairs.push({ pause, restart })
  }
  return pairs
}

function normalizeMilestones(
  nodes: Array<string | Date> | undefined,
  startAbsolute: number,
  endAbsolute: number,
): number[] {
  if (!nodes?.length) return []
  const seen = new Set<number>()
  const milestones: number[] = []
  for (const value of nodes) {
    const date = parseDate(value)
    if (!date) continue
    const absolute = absoluteMonth(date)
    if (absolute < startAbsolute || absolute > endAbsolute) continue
    if (seen.has(absolute)) continue
    seen.add(absolute)
    milestones.push(absolute)
  }
  return milestones.sort((a, b) => a - b)
}

function normalizeProjects(inputs: ProjectTimelineInput[]): NormalizedProject[] {
  const normalized: NormalizedProject[] = []

  for (const input of inputs) {
    const startDate = parseDate(input.start)
    if (!startDate) continue
    const startAbsolute = absoluteMonth(startDate)
    const endDate = parseDate(input.end)
    const ongoing = !endDate
    const endAbsolute = endDate ? absoluteMonth(endDate) : startAbsolute
    const parent = typeof input.parent === "string" ? input.parent.trim() : ""
    const series = typeof input.series === "string" ? input.series.trim() : ""
    const tip = Math.max(startAbsolute, endAbsolute)
    const spans = buildSpans(startAbsolute, tip, normalizePausePairs(input.pauses))

    normalized.push({
      slug: input.slug,
      title: input.title,
      startAbsolute,
      endAbsolute: tip,
      ongoing,
      spans,
      milestoneAbsolutes: normalizeMilestones(input.nodes, startAbsolute, tip),
      parent: parent || undefined,
      series: series || undefined,
    })
  }

  return normalized
}

/** Later projects in a series inherit the previous project as parent when unset. */
function applySeriesParents(projects: NormalizedProject[]): void {
  const bySeries = new Map<string, NormalizedProject[]>()
  for (const project of projects) {
    if (!project.series) continue
    const list = bySeries.get(project.series) ?? []
    list.push(project)
    bySeries.set(project.series, list)
  }

  for (const list of bySeries.values()) {
    list.sort((a, b) => a.startAbsolute - b.startAbsolute || a.slug.localeCompare(b.slug))
    for (let i = 1; i < list.length; i++) {
      if (!list[i].parent) list[i].parent = list[i - 1].slug
    }
  }
}

function assignLanes(projects: NormalizedProject[]): Map<string, number> {
  const ordered = [...projects].sort(
    (a, b) =>
      a.startAbsolute - b.startAbsolute ||
      a.endAbsolute - b.endAbsolute ||
      a.slug.localeCompare(b.slug),
  )
  const laneOf = new Map<string, number>()
  const laneEnds: number[] = []

  for (const project of ordered) {
    let lane = 0
    while (lane < laneEnds.length && laneEnds[lane] >= project.startAbsolute) {
      lane++
    }
    if (lane === laneEnds.length) laneEnds.push(project.endAbsolute)
    else laneEnds[lane] = project.endAbsolute
    laneOf.set(project.slug, lane)
  }

  return laneOf
}

function eventMonth(absolute: number): ProjectTimelineMonth {
  const { year, month } = monthParts(absolute)
  return {
    kind: "month",
    key: monthKey(absolute),
    label: monthLabel(absolute),
    year,
    month,
    absolute,
  }
}

function gapMonth(newerAbsolute: number, olderAbsolute: number): ProjectTimelineMonth {
  return {
    kind: "gap",
    key: `gap-${newerAbsolute}-${olderAbsolute}`,
    label: "···",
    year: 0,
    month: 0,
    absolute: newerAbsolute,
  }
}

/** True when some project span (active or pause) covers both packed months. */
function projectSpansBoth(
  projects: NormalizedProject[],
  newerAbsolute: number,
  olderAbsolute: number,
): boolean {
  return projects.some((project) =>
    project.spans.some(
      (span) => span.endAbsolute >= newerAbsolute && span.startAbsolute <= olderAbsolute,
    ),
  )
}

/**
 * Pack start/end/pause months only (newest first). Insert compact gap rows between
 * neighbors when the calendar hole is not spanned by any project.
 */
function buildPackedMonths(projects: NormalizedProject[]): ProjectTimelineMonth[] {
  const needed = new Set<number>()
  for (const project of projects) {
    for (const span of project.spans) {
      needed.add(span.startAbsolute)
      needed.add(span.endAbsolute)
    }
    for (const absolute of project.milestoneAbsolutes) needed.add(absolute)
  }

  const sorted = [...needed].sort((a, b) => b - a)
  const months: ProjectTimelineMonth[] = []

  for (let i = 0; i < sorted.length; i++) {
    months.push(eventMonth(sorted[i]))
    if (i >= sorted.length - 1) continue
    const newer = sorted[i]
    const older = sorted[i + 1]
    if (newer - older > 1 && !projectSpansBoth(projects, newer, older)) {
      months.push(gapMonth(newer, older))
    }
  }

  return months
}

function laneX(lane: number, geometry: ProjectTimelineGeometry): number {
  return geometry.padX + lane * geometry.laneWidth + geometry.laneWidth / 2
}

function rowY(row: number, geometry: ProjectTimelineGeometry): number {
  const height = geometry.rowHeights[row] ?? geometry.rowHeight
  const offset = geometry.rowOffsets[row] ?? row * geometry.rowHeight
  return offset + height / 2
}

/** Event months expand for multi-start; gap rows stay compact. */
function buildRowMetrics(
  months: ProjectTimelineMonth[],
  tracks: ProjectTimelineTrack[],
  baseHeight: number,
  gapHeight = DEFAULT_GAP_ROW_HEIGHT,
  stackGap = 4,
): { rowHeights: number[]; rowOffsets: number[]; svgHeight: number } {
  const starts = new Array(months.length).fill(0)
  for (const track of tracks) {
    if (track.bottomRow >= 0 && track.bottomRow < months.length) starts[track.bottomRow]++
  }

  const rowHeights = months.map((month, index) => {
    if (month.kind === "gap") return gapHeight
    const count = starts[index]
    if (count <= 1) return baseHeight
    return count * baseHeight + (count - 1) * stackGap
  })

  const rowOffsets: number[] = []
  let y = 0
  for (const height of rowHeights) {
    rowOffsets.push(y)
    y += height
  }

  return { rowHeights, rowOffsets, svgHeight: y }
}

function branchPath(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): string {
  const midY = (fromY + toY) / 2
  return `M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`
}

export function buildProjectTimeline(
  inputs: ProjectTimelineInput[],
  options?: {
    rowHeight?: number
    laneWidth?: number
    padX?: number
    nodeRadius?: number
    /** Absolute month treated as "now" for ongoing rays (UTC). Defaults to current UTC month. */
    nowAbsolute?: number
  },
): ProjectTimelineModel | null {
  const projects = normalizeProjects(inputs)
  if (!projects.length) return null

  applySeriesParents(projects)

  const now = options?.nowAbsolute ?? absoluteMonth(new Date())

  for (const project of projects) {
    if (project.ongoing) {
      const tip = Math.max(project.endAbsolute, now)
      project.endAbsolute = tip
      project.spans = buildSpans(
        project.startAbsolute,
        tip,
        project.spans
          .filter((span) => span.kind === "pause")
          .map((span) => ({ pause: span.startAbsolute, restart: span.endAbsolute })),
      )
      project.milestoneAbsolutes = project.milestoneAbsolutes.filter(
        (absolute) => absolute >= project.startAbsolute && absolute <= tip,
      )
    }
  }

  const months = buildPackedMonths(projects)
  if (!months.length) return null

  const rowIndex = new Map<number, number>()
  months.forEach((month, index) => {
    if (month.kind === "month") rowIndex.set(month.absolute, index)
  })

  const laneOf = assignLanes(projects)
  const laneCount = Math.max(0, ...[...laneOf.values()]) + 1
  const bySlug = new Map(projects.map((project) => [project.slug, project]))

  const baseRowHeight = options?.rowHeight ?? DEFAULT_ROW_HEIGHT
  const geometry: ProjectTimelineGeometry = {
    rowHeight: baseRowHeight,
    rowHeights: [],
    rowOffsets: [],
    laneWidth: options?.laneWidth ?? DEFAULT_LANE_WIDTH,
    padX: options?.padX ?? DEFAULT_PAD_X,
    nodeRadius: options?.nodeRadius ?? DEFAULT_NODE_RADIUS,
    svgWidth: 0,
    svgHeight: 0,
  }
  geometry.svgWidth =
    geometry.padX * 2 + Math.max(1, laneCount) * geometry.laneWidth

  const tracks: ProjectTimelineTrack[] = projects.map((project, index) => {
    const lane = laneOf.get(project.slug) ?? 0
    const topRow = rowIndex.get(project.endAbsolute) ?? 0
    const bottomRow = rowIndex.get(project.startAbsolute) ?? topRow
    const parent = project.parent ? bySlug.get(project.parent) : undefined
    const branchFromLane =
      parent && laneOf.has(parent.slug) ? laneOf.get(parent.slug) : undefined

    return {
      slug: project.slug,
      title: project.title,
      lane,
      colorIndex: index % 8,
      startAbsolute: project.startAbsolute,
      endAbsolute: project.endAbsolute,
      ongoing: project.ongoing,
      topRow,
      bottomRow,
      branchFromLane,
      branchFromSlug: parent?.slug,
    }
  })

  // Stable color by start order so lane pack reorder doesn't reshuffle hues.
  const colorOrder = [...tracks].sort(
    (a, b) =>
      a.startAbsolute - b.startAbsolute || a.slug.localeCompare(b.slug),
  )
  colorOrder.forEach((track, index) => {
    track.colorIndex = index % 8
  })

  const metrics = buildRowMetrics(months, tracks, baseRowHeight)
  geometry.rowHeights = metrics.rowHeights
  geometry.rowOffsets = metrics.rowOffsets
  geometry.svgHeight = metrics.svgHeight

  const trackBySlug = new Map(tracks.map((track) => [track.slug, track]))
  const segments: ProjectTimelineSegment[] = []
  const nodes: ProjectTimelineNode[] = []
  const branches: ProjectTimelineBranch[] = []

  for (const project of projects) {
    const track = trackBySlug.get(project.slug)
    if (!track) continue
    const x = laneX(track.lane, geometry)
    const activeSpans = project.spans.filter((span) => span.kind === "active")
    const lastActive = activeSpans[activeSpans.length - 1]

    for (const span of project.spans) {
      const topRow = rowIndex.get(span.endAbsolute)
      const bottomRow = rowIndex.get(span.startAbsolute)
      if (topRow === undefined || bottomRow === undefined) continue
      if (span.startAbsolute === span.endAbsolute) continue

      const isOngoingTip =
        project.ongoing && span.kind === "active" && span === lastActive
      segments.push({
        slug: track.slug,
        lane: track.lane,
        colorIndex: track.colorIndex,
        x,
        y1: rowY(topRow, geometry),
        y2: rowY(bottomRow, geometry),
        style: span.kind === "pause" ? "pause" : isOngoingTip ? "ongoing" : "solid",
      })
    }

    // One node per month: start, pause/restart boundaries, milestones, overall tip.
    const nodeAt = new Map<number, ProjectTimelineNode["kind"]>()
    nodeAt.set(project.startAbsolute, "start")
    for (const span of project.spans) {
      if (span.kind !== "pause") continue
      // Point session at the same month as project start keeps the start node.
      if (span.startAbsolute !== project.startAbsolute) {
        nodeAt.set(span.startAbsolute, "end")
      }
      nodeAt.set(span.endAbsolute, "start")
    }
    nodeAt.set(project.endAbsolute, project.ongoing ? "ongoing" : "end")
    // Curated open circles — only fill months that don't already have a node.
    for (const absolute of project.milestoneAbsolutes) {
      if (!nodeAt.has(absolute)) nodeAt.set(absolute, "start")
    }

    for (const [absolute, kind] of nodeAt) {
      const row = rowIndex.get(absolute)
      if (row === undefined) continue
      nodes.push({
        slug: track.slug,
        lane: track.lane,
        colorIndex: track.colorIndex,
        x,
        y: rowY(row, geometry),
        kind,
      })
    }

    if (track.branchFromLane !== undefined && track.branchFromLane !== track.lane) {
      const fromX = laneX(track.branchFromLane, geometry)
      const y2 = rowY(track.bottomRow, geometry)
      branches.push({
        slug: track.slug,
        colorIndex: track.colorIndex,
        path: branchPath(fromX, y2, x, y2),
      })
    }
  }

  return {
    months,
    laneCount,
    tracks,
    geometry,
    segments,
    nodes,
    branches,
  }
}

/** Exported for tests / debugging. */
export const __testing = {
  absoluteMonth,
  intervalsOverlap,
  assignLanes,
  applySeriesParents,
  normalizeProjects,
  buildPackedMonths,
  buildSpans,
  projectSpansBoth,
}
