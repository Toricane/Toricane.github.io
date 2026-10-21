import { projectDateBounds, type PortfolioFrontmatter } from "./dates"

type HomeProject = { frontmatter?: Record<string, unknown> }

/** Shared by the homepage cards and its Markdown export. */
export function selectHomeProjects<T extends HomeProject>(projects: T[]): T[] {
  function recency(project: T): number {
    const { start, end } = projectDateBounds((project.frontmatter as PortfolioFrontmatter) ?? {})
    const value = end ?? start
    if (!value) return 0
    const date = value instanceof Date ? value : new Date(value)
    return Number.isNaN(date.getTime()) ? 0 : date.getTime()
  }
  return projects
    .filter((project) => project.frontmatter?.significance === "spotlight")
    .sort(
      (a, b) =>
        recency(b) - recency(a) ||
        String(a.frontmatter?.title ?? "").localeCompare(
          String(b.frontmatter?.title ?? ""),
          undefined,
          { sensitivity: "base" },
        ),
    )
    .slice(0, 6)
}
