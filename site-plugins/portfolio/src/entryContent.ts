import type { Root, RootContent } from "hast"

function isSection(node: RootContent): boolean {
  return node.type === "element" && /^h[12]$/.test(node.tagName)
}

/** Promote project actions in the per-page HTML tree, leaving source/exports alone. */
export function promoteProjectLinks(tree: Root): void {
  const nodes = tree.children
  const start = nodes.findIndex(
    (node) => node.type === "element" && node.tagName === "h2" && node.properties.id === "links",
  )
  const firstSection = nodes.findIndex(isSection)
  if (start < 0 || firstSection < 0 || start <= firstSection) return

  let end = start + 1
  while (end < nodes.length && !isSection(nodes[end])) end++
  const links = nodes.splice(start, end - start)
  nodes.splice(firstSection, 0, ...links)
}
