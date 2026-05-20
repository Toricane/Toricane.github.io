import type { TimelineGroup } from './schema';
import { iconHtml } from './icons';
import {
  escapeHtml,
  getPreviewPath,
  normalizeImages,
  normalizeLinks,
  slugify,
} from '../scripts/utils/data.js';

const MONTH_NAMES: Record<string, string> = {
  '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
};

function sortTimelineGroups(items: TimelineGroup[]) {
  return [...items].sort((a, b) => {
    const [yearA, monthA] = a.when.split('/').map(Number);
    const [yearB, monthB] = b.when.split('/').map(Number);
    if (yearA !== yearB) return yearB - yearA;
    return monthB - monthA;
  });
}

function itemsForGroup(id: string, group: TimelineGroup) {
  if (id === 'awards') {
    return [...group.items].sort((a, b) => {
      const rank = (it: (typeof group.items)[0]) =>
        it?.impactful ? 0 : it?.notable ? 1 : 2;
      const ra = rank(a);
      const rb = rank(b);
      if (ra !== rb) return ra - rb;
      return (a?.name || '').toLowerCase().localeCompare((b?.name || '').toLowerCase());
    });
  }
  return group.items;
}

export function renderTimelineHtml(
  id: 'hackathons' | 'awards',
  items: TimelineGroup[],
  showBadges: boolean,
) {
  if (!items.length) return '<p>—</p>';

  const sorted = sortTimelineGroups(items);
  const entries = sorted
    .map((group) => {
      const [year, month] = group.when.split('/');
      const timeDisplay = `${MONTH_NAMES[month] || month} ${year}`;
      const itemsForGroupList = itemsForGroup(id, group);

      if (itemsForGroupList.length === 1) {
        const item = itemsForGroupList[0];
        const singleSlug = slugify(item.name || '');
        const slugAttr = singleSlug ? ` data-slug="${escapeHtml(singleSlug)}"` : '';

        const badgeItems = (showBadges && item.badges ? item.badges : []).map(
          (b) =>
            `<span class="badge ${b.toLowerCase().replace(/[^a-z]/g, '')}">${escapeHtml(b)}</span>`,
        );
        const fromLine = item.from
          ? `<div class="from-line">${escapeHtml(item.from)}</div>`
          : '';
        const images = normalizeImages(item.images, item.name);
        const imagesBlock = images.length
          ? `<div class="timeline-images">${images
              .map(
                (img, i) =>
                  `<button class="timeline-thumb thumb-pending" data-src="/${escapeHtml(img.path)}" data-preview="/${escapeHtml(getPreviewPath(img.path))}" data-label="${escapeHtml(img.label || `Image ${i + 1}`)}" aria-label="Open image ${escapeHtml(img.label || `Image ${i + 1}`)}"></button>`,
              )
              .join('')}</div>`
          : '';
        const tagItems = (item.tags || []).map(
          (t) =>
            `<span class="badge tag-${t.toLowerCase().replace(/[^a-z0-9]/g, '')}">${escapeHtml(t)}</span>`,
        );
        const allBadges = [...badgeItems, ...tagItems];
        const badgesBlock = allBadges.length
          ? `<div class="tags award-tags">${allBadges.join('')}</div>`
          : '';
        const highlightClass = item.impactful
          ? ' impactful-highlight'
          : item.notable
            ? ' notable-highlight'
            : '';

        return `<li${slugAttr}><div class="time">${escapeHtml(timeDisplay)}</div><div class="entry${highlightClass}"><h3>${escapeHtml(item.name)}</h3>${fromLine}<p>${escapeHtml(item.description || '')}</p>${imagesBlock}${badgesBlock}</div></li>`;
      }

      const summaryText = group.summary || `${group.items.length} items`;
      const expandId = `expand-${id}-${group.when.replace('/', '-')}`;
      const itemCount = itemsForGroupList.length;
      let countText: string;
      if (id === 'awards') {
        countText = itemCount === 1 ? '1 award' : `${itemCount} awards`;
      } else if (id === 'hackathons') {
        countText = itemCount === 1 ? '1 hackathon' : `${itemCount} hackathons`;
      } else {
        countText = itemCount === 1 ? '1 item' : `${itemCount} items`;
      }

      const hasImpactful = itemsForGroupList.some((item) => item?.impactful);
      const hasNotable = itemsForGroupList.some((item) => item?.notable);
      const categoryClass = hasImpactful
        ? ' category-impactful'
        : hasNotable
          ? ' category-notable'
          : '';

      const innerItems = itemsForGroupList
        .map((item) => {
          const badgeItems = (showBadges && item.badges ? item.badges : []).map(
            (b) =>
              `<span class="badge ${b.toLowerCase().replace(/[^a-z]/g, '')}">${escapeHtml(b)}</span>`,
          );
          const fromLine = item.from
            ? `<div class="from-line">${escapeHtml(item.from)}</div>`
            : '';
          const tagItems = (item.tags || []).map(
            (t) =>
              `<span class="badge tag-${t.toLowerCase().replace(/[^a-z0-9]/g, '')}">${escapeHtml(t)}</span>`,
          );
          const allBadges = [...badgeItems, ...tagItems];
          const badgesBlock = allBadges.length
            ? `<div class="tags award-tags">${allBadges.join('')}</div>`
            : '';
          const images = normalizeImages(item.images, item.name);
          const imagesBlock = images.length
            ? `<div class="timeline-images">${images
                .map(
                  (img, i) =>
                    `<button class="timeline-thumb thumb-pending" data-src="/${escapeHtml(img.path)}" data-preview="/${escapeHtml(getPreviewPath(img.path))}" data-label="${escapeHtml(img.label || `Image ${i + 1}`)}" aria-label="Open image ${escapeHtml(img.label || `Image ${i + 1}`)}"></button>`,
                )
                .join('')}</div>`
            : '';
          const itemHighlight = item.impactful
            ? ' impactful-highlight'
            : item.notable
              ? ' notable-highlight'
              : '';
          const itemLinks = normalizeLinks(item.link);
          const dataAttr = itemLinks.length
            ? ` data-links='${JSON.stringify(itemLinks).replace(/'/g, '&#39;')}'`
            : '';
          const itemSlug = slugify(item.name || '');
          const slugAttrItem = itemSlug ? ` data-slug="${itemSlug}"` : '';
          return `<div class="timeline-item${itemHighlight}"${dataAttr}${slugAttrItem}><h3 class="timeline-item-title">${escapeHtml(item.name)}</h3>${fromLine}<p>${escapeHtml(item.description || '')}</p>${imagesBlock}${badgesBlock}</div>`;
        })
        .join('');

      return `<li class="timeline-group${categoryClass}"><div class="time">${escapeHtml(timeDisplay)}</div><div class="entry"><div class="timeline-summary" data-target="${expandId}"><button type="button" class="timeline-toggle" aria-expanded="false" aria-controls="${expandId}" aria-label="Expand ${escapeHtml(summaryText)}"><span class="svg-icon">${iconHtml('chevronDown')}</span></button><h3 class="timeline-summary-title">${escapeHtml(summaryText)}</h3></div><div class="from-line">${escapeHtml(countText)}</div><div class="timeline-items" id="${expandId}" style="display: none;">${innerItems}</div></div></li>`;
    })
    .join('');

  return `<ol class="timeline">${entries}</ol>`;
}
