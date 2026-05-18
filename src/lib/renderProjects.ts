import type { Project } from './schema';
import {
  escapeHtml,
  formatProjectDate,
  getPreviewPath,
  normalizeImages,
  projectEndTimestamp,
  slugify,
} from '../scripts/utils/data.js';

function sortProjects(list: Project[]) {
  return [...list].sort((a, b) => {
    const ta = projectEndTimestamp(a);
    const tb = projectEndTimestamp(b);
    if (ta === tb) return 0;
    if (ta === Infinity) return -1;
    if (tb === Infinity) return 1;
    return tb - ta;
  });
}

export function renderProjectsHtml(list: Project[]) {
  if (!list.length) return '<p>No projects yet.</p>';

  const cards = sortProjects(list)
    .map((p) => {
      let cardClass = 'card';
      if (p.gold) cardClass += ' gold-highlight';
      else if (p.silver) cardClass += ' silver-highlight';

      const projSlug = slugify(p.title || '');
      const slugAttr = projSlug ? ` data-slug="${escapeHtml(projSlug)}"` : '';

      const fromLine = p.from ? `<p class="from-line">${escapeHtml(p.from)}</p>` : '';
      const s = p['start-date'] || null;
      const e = p['end-date'] || null;
      const dateLine =
        s || e
          ? `<p class="from-line project-date">${escapeHtml(formatProjectDate(s, e))}</p>`
          : p.date
            ? `<p class="from-line project-date">${escapeHtml(p.date)}</p>`
            : '';

      const images = normalizeImages(p.images, p.title);
      const thumbHtml = images.length
        ? `<div class="card-images">${images
            .map(
              (img, i) =>
                `<button class="card-thumb thumb-pending" data-src="/${escapeHtml(img.path)}" data-preview="/${escapeHtml(getPreviewPath(img.path))}" data-label="${escapeHtml(img.label || `Image ${i + 1}`)}" aria-label="Open image ${escapeHtml(img.label || `Image ${i + 1}`)}"></button>`,
            )
            .join('')}</div>`
        : '';

      const tags = (p.tags || [])
        .map((t) => `<span>${escapeHtml(t)}</span>`)
        .join('');

      return `<li class="${cardClass}"${slugAttr}><h3>${escapeHtml(p.title)}${
        p.live ? ' <span class="dot live"></span>' : ''
      }</h3>${fromLine}${dateLine}<p>${escapeHtml(p.description)}</p>${thumbHtml}<div class="tags">${tags}</div></li>`;
    })
    .join('');

  return `<ul class="cards">${cards}</ul>`;
}
