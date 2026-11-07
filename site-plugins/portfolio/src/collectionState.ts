export type CollectionState = {
  view: "gallery" | "timeline"
  sort: "significance" | "date"
  query: string
  highlights: boolean
  tags: string[]
}

export function readCollectionState(params: URLSearchParams): CollectionState {
  return {
    view: params.get("view") === "timeline" ? "timeline" : "gallery",
    sort: params.get("sort") === "date" ? "date" : "significance",
    query: params.get("q") ?? "",
    highlights: params.get("highlights") === "1",
    tags: [...new Set(params.getAll("tag").filter(Boolean))],
  }
}

/** Preserve unrelated parameters and anchors; omit defaults for clean shared links. */
export function collectionUrl(href: string, state: CollectionState): string {
  const url = new URL(href)
  for (const key of ["view", "sort", "q", "highlights", "tag"]) url.searchParams.delete(key)
  if (state.view === "timeline") url.searchParams.set("view", "timeline")
  if (state.sort === "date") url.searchParams.set("sort", "date")
  if (state.query.trim()) url.searchParams.set("q", state.query)
  if (state.highlights) url.searchParams.set("highlights", "1")
  for (const tag of [...new Set(state.tags)]) url.searchParams.append("tag", tag)
  return `${url.pathname}${url.search}${url.hash}`
}

export function adjacentEntry<T extends { href: string }>(
  entries: T[],
  href: string,
  step: number,
): T | undefined {
  const index = entries.findIndex((entry) => entry.href === href)
  return index < 0 ? undefined : entries[index + step]
}
