/** Layout math for the vertical Git-style projects timeline. */

export type ProjectTimelineInput = {
  slug: string
  title: string
  start: string | Date
  end?: string | Date
  parent?: string
  series?: string
}

export type ProjectTimelineMonth = {
  key: string
  label: string
  year: number
  month: number
  /** Absolute month index: year * 12 + (month - 1). */
  absolute: number
}

export type ProjectTimelineTrack = {
  slug: string
  title: string
  lane: number
  colorIndex: number
  /** Inclusive absolute month of start. */
  startAbsolute: number
  /** Inclusive absolute month of end (same as start when ongoing and open-ended). */
  endAbsolute: number
  ongoing: boolean
  /** Row index in newest-first months[] (end / top of segment). */
  topRow: number
  /** Row index in newest-first months[] (start / bottom of segment). */
  bottomRow: number
  /** Parent lane to draw a branch curve from, if curated. */
  branchFromLane?: number
  branchFromSlug?: string
}

export type ProjectTimelineGeometry = {
  /** Base height for a single-card / empty month row. */
  rowHeight: number
  /** Per-month row heights (expanded when multiple projects start that month). */
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
  ongoing: boolean
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
/** Narrow lanes so the graph column stays roughly half the prior width. */
const DEFAULT_LANE_WIDTH = 14
const DEFAULT_PAD_X = 8
const DEFAULT_NODE_RADIUS = 3.5

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

type NormalizedProject = {
  slug: string
  title: string
  startAbsolute: number
  endAbsolute: number
  ongoing: boolean
  parent?: string
  series?: string
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

    normalized.push({
      slug: input.slug,
      title: input.title,
      startAbsolute,
      endAbsolute: Math.max(startAbsolute, endAbsolute),
      ongoing,
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

function buildMonths(minAbsolute: number, maxAbsolute: number): ProjectTimelineMonth[] {
  const months: ProjectTimelineMonth[] = []
  for (let absolute = maxAbsolute; absolute >= minAbsolute; absolute--) {
    const { year, month } = monthParts(absolute)
    months.push({
      key: monthKey(absolute),
      label: monthLabel(absolute),
      year,
      month,
      absolute,
    })
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

/** Expand rows that host multiple project start cards so they don't overlap. */
function buildRowMetrics(
  monthCount: number,
  tracks: ProjectTimelineTrack[],
  baseHeight: number,
  stackGap = 4,
): { rowHeights: number[]; rowOffsets: number[]; svgHeight: number } {
  const starts = new Array(monthCount).fill(0)
  for (const track of tracks) {
    if (track.bottomRow >= 0 && track.bottomRow < monthCount) starts[track.bottomRow]++
  }

  const rowHeights = starts.map((count) => {
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

  const now =
    options?.nowAbsolute ?? absoluteMonth(new Date())
  let minAbsolute = Infinity
  let maxAbsolute = -Infinity

  for (const project of projects) {
    minAbsolute = Math.min(minAbsolute, project.startAbsolute)
    const tip = project.ongoing ? Math.max(project.endAbsolute, now) : project.endAbsolute
    maxAbsolute = Math.max(maxAbsolute, tip)
    if (project.ongoing) project.endAbsolute = tip
  }

  if (!Number.isFinite(minAbsolute) || !Number.isFinite(maxAbsolute)) return null

  const months = buildMonths(minAbsolute, maxAbsolute)
  const rowIndex = new Map<number, number>()
  months.forEach((month, index) => rowIndex.set(month.absolute, index))

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

  const metrics = buildRowMetrics(months.length, tracks, baseRowHeight)
  geometry.rowHeights = metrics.rowHeights
  geometry.rowOffsets = metrics.rowOffsets
  geometry.svgHeight = metrics.svgHeight

  const segments: ProjectTimelineSegment[] = []
  const nodes: ProjectTimelineNode[] = []
  const branches: ProjectTimelineBranch[] = []

  for (const track of tracks) {
    const x = laneX(track.lane, geometry)
    const y1 = rowY(track.topRow, geometry)
    const y2 = rowY(track.bottomRow, geometry)
    segments.push({
      slug: track.slug,
      lane: track.lane,
      colorIndex: track.colorIndex,
      x,
      y1,
      y2,
      ongoing: track.ongoing,
    })

    nodes.push({
      slug: track.slug,
      lane: track.lane,
      colorIndex: track.colorIndex,
      x,
      y: y2,
      kind: "start",
    })

    nodes.push({
      slug: track.slug,
      lane: track.lane,
      colorIndex: track.colorIndex,
      x,
      y: y1,
      kind: track.ongoing ? "ongoing" : "end",
    })

    if (track.branchFromLane !== undefined && track.branchFromLane !== track.lane) {
      const fromX = laneX(track.branchFromLane, geometry)
      // Branch leaves the parent lane at the child's start month.
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
}
