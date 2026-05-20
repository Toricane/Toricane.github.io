import {
  formatBadges,
  formatTags,
  parseImages,
  parseLinks,
  significanceToMedals,
} from '../../scripts/content-normalize.mjs';

type MedalLegacy = { significance?: string; impactful?: boolean; notable?: boolean };

export function normalizeProjectData<
  T extends MedalLegacy & {
    tags?: string[];
    images?: unknown[];
    links?: unknown[];
  },
>(data: T) {
  const medals = significanceToMedals(data.significance, data);
  return {
    ...data,
    tags: formatTags(data.tags),
    images: parseImages(data.images),
    links: parseLinks(data.links),
    ...medals,
  };
}

export function normalizeTimelineData<
  T extends MedalLegacy & {
    tags?: string[];
    badges?: string[];
    images?: unknown[];
    links?: unknown[];
  },
>(data: T) {
  const medals = significanceToMedals(data.significance, data);
  return {
    ...data,
    tags: formatTags(data.tags),
    badges: formatBadges(data.badges),
    images: parseImages(data.images),
    links: parseLinks(data.links),
    ...medals,
  };
}
