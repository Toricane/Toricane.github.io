type MarkdownNode = {
  type: string
  depth?: number
  value?: string
  url?: string
  children?: MarkdownNode[]
}

function textOf(node: MarkdownNode): string {
  return node.value ?? node.children?.map(textOf).join("") ?? ""
}

function hasContent(node: MarkdownNode): boolean {
  if (node.type === "heading" || node.type === "definition" || node.type === "yaml") return false
  if (node.type === "html" && /^\s*<!--[\s\S]*-->\s*$/.test(node.value ?? "")) return false
  if (node.children) return node.children.some(hasContent)
  return ["image", "imageReference", "thematicBreak"].includes(node.type) || Boolean(node.value?.trim())
}

/** Remove authoring prompts before HTML, search text, and descriptions are generated. */
export function hideContentDebt(tree: MarkdownNode): void {
  if (!tree.children) return
  tree.children = tree.children.filter((node) => {
    if (
      node.type === "paragraph" &&
      node.children?.every((child) => child.type === "text") &&
      /^\s*\[Replace with:[\s\S]*\]\s*$/i.test(textOf(node))
    ) {
      return false
    }
    if (node.type === "link" && node.url === "https://example.com" && textOf(node) === "Label") {
      return false
    }
    hideContentDebt(node)
    if (["paragraph", "blockquote", "list", "listItem"].includes(node.type)) {
      return hasContent(node)
    }
    return true
  })

  // Work backwards so empty subsections disappear before checking their parent section.
  for (let index = tree.children.length - 1; index >= 0; index--) {
    const heading = tree.children[index]
    if (heading.type !== "heading") continue
    let end = index + 1
    while (end < tree.children.length) {
      const next = tree.children[end]
      if (next.type === "heading" && (next.depth ?? 0) <= (heading.depth ?? 0)) break
      end++
    }
    if (!tree.children.slice(index + 1, end).some(hasContent)) {
      tree.children.splice(index, 1)
    }
  }
}
