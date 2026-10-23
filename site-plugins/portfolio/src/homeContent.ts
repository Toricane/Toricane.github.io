/** Small, build-only projections of the Markdown already used by entry pages. */
export type HomeNode = {
  type?: string
  tagName?: string
  value?: string
  properties?: Record<string, unknown>
  children?: HomeNode[]
}

export type HomeProjectStory = { contribution?: string; result?: string }

export function homeText(node: HomeNode): string {
  return node.value ?? node.children?.map(homeText).join("") ?? ""
}

export function homeProjectStory(tree: HomeNode): HomeProjectStory {
  const story: HomeProjectStory = {}
  let section = ""
  for (const node of tree.children ?? []) {
    if (/^h[1-6]$/.test(node.tagName ?? "")) {
      section = homeText(node).trim().toLowerCase()
    } else if (node.tagName === "p") {
      const text = homeText(node).replace(/\s+/g, " ").trim()
      if (!text || /\[Replace with:/i.test(text)) continue
      if (section === "role and constraints" && !story.contribution) story.contribution = text
      if (section === "result" && !story.result) {
        // The headline outcome is enough here; qualifications and supporting
        // detail remain in the entry. Do not mistake decimal points for stops.
        story.result = text.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? text
      }
    }
  }
  return story
}

/** Preserve source order while giving each h2 chapter its own static surface. */
export function homeChapters(tree: HomeNode) {
  const intro: HomeNode[] = []
  const chapters: { heading: HomeNode; nodes: HomeNode[] }[] = []
  for (const node of tree.children ?? []) {
    if (node.tagName === "h2") chapters.push({ heading: node, nodes: [] })
    else if (chapters.length) chapters[chapters.length - 1].nodes.push(node)
    else intro.push(node)
  }
  return { intro, chapters }
}
