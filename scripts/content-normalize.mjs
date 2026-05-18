/**
 * Normalize Obsidian-friendly frontmatter for build + data.json export.
 */

/** Obsidian tags use hyphens; display with spaces on site. */
export function formatTag(tag) {
  return String(tag).replace(/-/g, ' ').trim();
}

export function formatTags(tags) {
  if (!tags?.length) return undefined;
  return tags.map(formatTag);
}

export function formatBadges(badges) {
  return formatTags(badges);
}

const MD_LINK_RE = /^\[([^\]]*)\]\(([^)]+)\)(?:\s*\|\s*(.+))?$/;
const TAB_PANELS_PREFIX = 'assets/tab-panels/';

/** Expand bare filenames to tab-panel assets. */
export function resolveImagePath(rawPath) {
  const path = String(rawPath).trim().replace(/^\.\//, '');
  if (!path) return '';
  if (path.includes('/')) return path;
  return `${TAB_PANELS_PREFIX}${path}`;
}

function parseImageLine(line) {
  let text = String(line).trim();
  if (!text) return null;

  // Obsidian wikilink: [[file.webp]] or [[file.webp|caption]] or [[file.webp|caption|face]]
  const wiki = text.match(/^\[\[([^[\]]+)\]\]$/);
  if (wiki) {
    text = wiki[1];
  }

  // Shorthand: file.webp*caption*face  (also file.webp*face, file.webp!)
  if (text.includes('*')) {
    const parts = text.split('*').map((p) => p.trim());
    const path = resolveImagePath(parts[0]);
    if (!path) return null;
    const face = parts[parts.length - 1]?.toLowerCase() === 'face';
    const labelParts = face ? parts.slice(1, -1) : parts.slice(1);
    const label = labelParts.length ? labelParts.join('*') : undefined;
    return { path, label, ...(face ? { face: true } : {}) };
  }

  if (text.endsWith('!')) {
    const path = resolveImagePath(text.slice(0, -1).trim());
    if (!path) return null;
    return { path, face: true };
  }

  // Legacy: path | label | face
  const parts = text.split('|').map((p) => p.trim());
  const path = resolveImagePath(parts[0]);
  if (!path) return null;
  const label = parts[1] || undefined;
  const face = parts.slice(2).some((p) => p.toLowerCase() === 'face');
  return { path, label, ...(face ? { face: true } : {}) };
}

export function parseImageEntry(entry) {
  if (typeof entry === 'object' && entry !== null && entry.path) {
    return {
      label: entry.label,
      path: entry.path,
      face: entry.face ? true : undefined,
    };
  }
  return parseImageLine(entry);
}

export function parseImages(images) {
  if (!images?.length) return undefined;
  return images.map(parseImageEntry).filter(Boolean);
}

export function parseLinkEntry(entry) {
  if (typeof entry === 'object' && entry !== null && (entry.url || entry.href)) {
    return {
      label: entry.label,
      url: entry.url || entry.href,
      date: entry.date || entry.when,
    };
  }
  const line = String(entry).trim();
  const md = line.match(MD_LINK_RE);
  if (md) {
    let label = md[1];
    let date = md[3]?.trim();
    const embedded = label.match(/\s+(?:\||·)\s+(\d{4}[-/]\d{1,2}(?:[-/]\d{1,2})?)\s*$/);
    if (embedded) {
      date = embedded[1];
      label = label.slice(0, embedded.index).trim();
    }
    return {
      label,
      url: md[2],
      ...(date ? { date } : {}),
    };
  }
  const parts = line.split('|').map((p) => p.trim());
  if (parts.length >= 2) {
    return {
      label: parts[0],
      url: parts[1],
      ...(parts[2] ? { date: parts[2] } : {}),
    };
  }
  return null;
}

export function parseLinks(links) {
  if (!links?.length) return undefined;
  const parsed = links.map(parseLinkEntry).filter(Boolean);
  return parsed.length ? parsed : undefined;
}

export function significanceToMedals(significance, legacy = {}) {
  const value = (significance || '').toLowerCase();
  if (value === 'gold' || legacy.gold) return { gold: true };
  if (value === 'silver' || legacy.silver) return { silver: true };
  return {};
}

export function tagToObsidian(tag) {
  return String(tag).trim().replace(/\s+/g, '-');
}

/** Compact line for Obsidian Properties (filename + * shorthand). */
export function formatImageLine(img) {
  let file = img.path;
  if (file.startsWith(TAB_PANELS_PREFIX)) {
    file = file.slice(TAB_PANELS_PREFIX.length);
  }
  if (!img.label && !img.face) return file;
  if (!img.label && img.face) return `${file}*face`;
  if (img.label && !img.face) return `${file}*${img.label}`;
  return `${file}*${img.label}*face`;
}

export function formatLinkLine(link) {
  const label = link.label || link.url;
  // Date inside the brackets keeps Obsidian Properties links clickable (`[label](url) | date` outside does not).
  const displayLabel = link.date ? `${label} | ${link.date}` : label;
  return `[${displayLabel}](${link.url})`;
}
