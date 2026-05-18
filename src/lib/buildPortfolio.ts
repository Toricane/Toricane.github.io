import { getCollection, type CollectionEntry } from 'astro:content';
import type { Portfolio, Project, TimelineGroup } from './schema';
import { portfolioSchema } from './schema';
import { normalizeProjectData, normalizeTimelineData } from './normalizeContent';

function toLegacyDate(value?: string) {
  if (!value) return undefined;
  return value.replace(/-/g, '/');
}

function entryToProject(entry: CollectionEntry<'projects'>): Project {
  const data = normalizeProjectData(entry.data);
  return {
    title: data.title,
    from: data.from,
    'start-date': toLegacyDate(data.startDate),
    'end-date': toLegacyDate(data.endDate),
    date: data.date,
    live: data.live,
    description: entry.body.trim(),
    tags: data.tags,
    images: data.images,
    link: data.links?.length ? data.links : undefined,
    gold: data.gold,
    silver: data.silver,
  };
}

function entryToTimelineItem(entry: CollectionEntry<'hackathons' | 'awards'>) {
  const data = normalizeTimelineData(entry.data);
  return {
    name: data.name,
    from: data.from,
    description: entry.body.trim(),
    badges: data.badges,
    tags: data.tags,
    images: data.images,
    link: data.links?.length ? data.links : undefined,
    gold: data.gold,
    silver: data.silver,
  };
}

function groupTimelineEntries(
  entries: CollectionEntry<'hackathons' | 'awards'>[],
): TimelineGroup[] {
  const groups = new Map<string, TimelineGroup>();

  for (const entry of entries) {
    const when = entry.data.when;
    if (!groups.has(when)) {
      groups.set(when, {
        when,
        summary: entry.data.groupSummary,
        items: [],
      });
    }
    const group = groups.get(when)!;
    if (!group.summary && entry.data.groupSummary) {
      group.summary = entry.data.groupSummary;
    }
    group.items.push(entryToTimelineItem(entry));
  }

  return [...groups.values()];
}

export async function buildPortfolio(): Promise<Portfolio> {
  const [projectEntries, hackathonEntries, awardEntries, coverflowEntries] =
    await Promise.all([
      getCollection('projects'),
      getCollection('hackathons'),
      getCollection('awards'),
      getCollection('coverflow'),
    ]);

  const coverflowImages = coverflowEntries.map((entry) => ({
    label: entry.data.label || entry.data.image,
    path: entry.data.image,
    ...(entry.data.face ? { face: true } : {}),
  }));

  const portfolio: Portfolio = {
    coverflowImages: coverflowImages.length ? coverflowImages : undefined,
    projects: projectEntries.map(entryToProject),
    hackathons: groupTimelineEntries(hackathonEntries),
    awards: groupTimelineEntries(awardEntries),
  };

  return portfolioSchema.parse(portfolio);
}
