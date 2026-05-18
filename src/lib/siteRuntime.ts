import type { Portfolio } from './schema';
import {
  normalizeImages,
  normalizeLinks,
  slugify,
} from '../scripts/utils/data.js';

export type FaceImage = {
  label: string;
  path: string;
  date: string;
  title: string;
  link: string;
};

export function firstLink(field: unknown) {
  if (!field) return '';
  if (typeof field === 'string') return field;
  if (Array.isArray(field)) {
    for (const entry of field) {
      if (entry && typeof entry === 'object' && 'url' in entry && entry.url) {
        return String(entry.url);
      }
    }
  }
  return '';
}

export function formatShortDate(raw: string) {
  if (!raw) return '';
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const parts = String(raw)
    .split(/[-/]/)
    .map((p) => parseInt(p, 10));
  if (!parts.length || parts.some((x) => Number.isNaN(x))) return '';
  const [y, m] = parts;
  if (m >= 1 && m <= 12) return `${months[m - 1]} ${y}`;
  return String(y);
}

export function collectFaceImages(data: Portfolio) {
  const faceImages: FaceImage[] = [];
  const seen = new Set<string>();

  const add = (
    img: { path: string; label?: string },
    meta: { date?: string; title?: string; link?: string },
  ) => {
    if (!img?.path || seen.has(img.path)) return;
    seen.add(img.path);
    faceImages.push({
      label: img.label || '',
      path: img.path,
      date: meta.date || '',
      title: meta.title || '',
      link: meta.link || '',
    });
  };

  for (const entry of data.coverflowImages || []) {
    if (entry.face) add(entry, {});
  }

  for (const proj of data.projects) {
    const imgs = normalizeImages(proj.images, proj.title);
    const date = formatShortDate(proj['end-date'] || proj['start-date'] || '');
    const link = firstLink(proj.link);
    imgs.forEach((img, i) => {
      const raw = Array.isArray(proj.images) ? proj.images[i] : null;
      if (raw && typeof raw === 'object' && 'face' in raw && raw.face) {
        add(img, { date, title: proj.title || '', link });
      }
    });
  }

  for (const section of ['hackathons', 'awards'] as const) {
    for (const group of data[section]) {
      const groupDate = formatShortDate(group.when || '');
      for (const item of group.items) {
        const imgs = normalizeImages(item.images, item.name);
        const link = firstLink(item.link);
        imgs.forEach((img, i) => {
          const raw = Array.isArray(item.images) ? item.images[i] : null;
          if (raw && typeof raw === 'object' && 'face' in raw && raw.face) {
            add(img, { date: groupDate, title: item.name || '', link });
          }
        });
      }
    }
  }

  return faceImages;
}

function collectSectionImagePaths(
  id: 'projects' | 'hackathons' | 'awards',
  rawData: Portfolio['projects'] | Portfolio['hackathons'],
) {
  const images: { path: string; label: string }[] = [];
  if (!rawData?.length) return images;

  if (id === 'projects') {
    for (const proj of rawData as Portfolio['projects']) {
      normalizeImages(proj.images, proj.title).forEach((img) =>
        images.push({ path: img.path, label: img.label }),
      );
    }
  } else {
    for (const group of rawData as Portfolio['hackathons']) {
      for (const item of group.items) {
        normalizeImages(item.images, item.name).forEach((img) =>
          images.push({ path: img.path, label: img.label }),
        );
      }
    }
  }

  return images;
}

export function generateRuntimePayload(
  data: Portfolio,
  colors: Record<string, string> = {},
) {
  const projectLinks = (data.projects || [])
    .map((p) => ({
      slug: slugify(p.title || ''),
      title: p.title || '',
      links: normalizeLinks(p.link),
    }))
    .filter((p) => p.slug && p.links.length);

  const timelineLinks: {
    section: string;
    slug: string;
    title: string;
    links: ReturnType<typeof normalizeLinks>;
  }[] = [];

  for (const section of ['hackathons', 'awards'] as const) {
    for (const group of data[section] || []) {
      if (group.items.length === 1) {
        const item = group.items[0];
        const slug = slugify(item.name || '');
        const links = normalizeLinks(item.link);
        if (slug && links.length) {
          timelineLinks.push({
            section,
            slug,
            title: item.name || '',
            links,
          });
        }
      }
    }
  }

  return {
    faceImages: collectFaceImages(data),
    coverflowColors: colors,
    sectionImages: {
      projects: collectSectionImagePaths('projects', data.projects),
      hackathons: collectSectionImagePaths('hackathons', data.hackathons),
      awards: collectSectionImagePaths('awards', data.awards),
    },
    projectLinks,
    timelineLinks,
  };
}
