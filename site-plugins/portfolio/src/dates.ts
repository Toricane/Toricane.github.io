/** Portfolio date helpers for frontmatter `when` / `date` / `modified`. */

export type PortfolioFrontmatter = {
  when?: string
  date?: string | Date
  modified?: string | Date
}

const WHEN_RE = /^(\d{4})\/(\d{2})$/

export function formatMonthYear(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date)
}

/** Last calendar day of a `YYYY/MM` month, as a UTC Date (for scrapers / `dates`). */
export function lastDayOfWhenMonth(when: string): Date | undefined {
  const match = when.match(WHEN_RE)
  if (!match) return undefined
  const year = Number(match[1])
  const month = Number(match[2])
  if (!year || month < 1 || month > 12) return undefined
  // Day 0 of next month = last day of this month (UTC).
  return new Date(Date.UTC(year, month, 0, 12, 0, 0))
}

function coerceDate(value: string | Date): Date | undefined {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value
  }
  const isoDay = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value
  const date = new Date(isoDay)
  return Number.isNaN(date.getTime()) ? undefined : date
}

/** Visible label: month/year for awards & hackathons; start – end for projects. */
export function displayPeriod(data: PortfolioFrontmatter): string {
  if (data.when) {
    const match = data.when.match(WHEN_RE)
    if (match) return formatMonthYear(`${match[1]}-${match[2]}-01T00:00:00Z`)
  }
  if (!data.date) return ""
  const start = formatMonthYear(data.date)
  if (!start) return ""
  if (!data.modified) return start
  const end = formatMonthYear(data.modified)
  if (!end || end === start) return start
  return `${start} – ${end}`
}

type DateBucket = {
  created: Date
  modified: Date
  published: Date
}

/**
 * Overwrite Quartz `file.data.dates` so scrapers / RSS / sitemap use portfolio time,
 * not git/filesystem (build day). Awards/hackathons → last day of `when` month.
 */
export function applyPortfolioDates(data: {
  frontmatter?: Record<string, unknown>
  dates?: Partial<DateBucket>
  defaultDateType?: string
}): void {
  const fm = (data.frontmatter ?? {}) as PortfolioFrontmatter
  if (fm.when) {
    const last = lastDayOfWhenMonth(fm.when)
    if (!last) return
    data.dates = { created: last, modified: last, published: last }
    data.defaultDateType ??= "modified"
    return
  }

  if (!fm.date) return
  const created = coerceDate(fm.date)
  if (!created) return
  const modified = fm.modified ? coerceDate(fm.modified) ?? created : created
  data.dates = {
    created,
    modified,
    published: data.dates?.published ?? created,
  }
  data.defaultDateType ??= "modified"
}
