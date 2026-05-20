import type { seo as SeoType } from './portfolio';
import { portfolio } from './portfolio';

function slugify(s: string) {
  if (!s) return '';
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildJsonLdGraph(seo: typeof SeoType, dateModified: string) {
  const siteUrl = seo.siteUrl.replace(/\/$/, '');
  const personId = `${siteUrl}/#person`;
  const websiteId = `${siteUrl}/#website`;
  const webpageId = `${siteUrl}/#webpage`;
  const profilepageId = `${siteUrl}/#profilepage`;

  const allTags = new Set<string>();
  const allAwards: string[] = [];

  portfolio.projects.forEach((p) => {
    if (p.tags) p.tags.forEach((t) => allTags.add(t));
  });
  portfolio.hackathons.forEach((g) => {
    g.items.forEach((item) => {
      if (item.tags) item.tags.forEach((t) => allTags.add(t));
      if (item.badges) item.badges.forEach((b) => allTags.add(b));
    });
  });
  portfolio.awards.forEach((g) => {
    g.items.forEach((item) => {
      if (item.tags) item.tags.forEach((t) => allTags.add(t));
      allAwards.push(item.name);
    });
  });

  const knowsAbout = Array.from(allTags);

  const graph: any[] = [
    {
      '@type': 'Person',
      '@id': personId,
      name: seo.person.name,
      url: siteUrl,
      image: seo.person.image,
      jobTitle: seo.person.jobTitle,
      description: seo.person.description,
      sameAs: seo.person.sameAs,
      knowsAbout,
      award: allAwards,
      dateModified,
    },
    {
      '@type': 'WebSite',
      '@id': websiteId,
      url: siteUrl,
      name: seo.siteName,
      description: seo.description,
      publisher: { '@id': personId },
      dateModified,
    },
    {
      '@type': 'WebPage',
      '@id': webpageId,
      url: siteUrl,
      name: seo.title,
      description: seo.description,
      isPartOf: { '@id': websiteId },
      about: { '@id': personId },
      dateModified,
    },
    {
      '@type': 'ProfilePage',
      '@id': profilepageId,
      url: siteUrl,
      name: seo.title,
      description: seo.description,
      mainEntity: { '@id': personId },
      isPartOf: { '@id': websiteId },
      dateModified,
    },
  ];

  portfolio.projects.forEach((p) => {
    const slug = slugify(p.title);
    const projectId = `${siteUrl}/#project-${slug}`;

    let appUrl = siteUrl;
    if (p.live && p.link) {
      if (Array.isArray(p.link)) {
        const found = p.link.find((l) => typeof l === 'object' && l.url);
        if (found && typeof found === 'object') appUrl = found.url || siteUrl;
      } else if (typeof p.link === 'object' && p.link.url) {
        appUrl = p.link.url;
      } else if (typeof p.link === 'string') {
        appUrl = p.link;
      }
    }

    graph.push({
      '@type': 'SoftwareApplication',
      '@id': projectId,
      name: p.title,
      description: p.description,
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Windows, macOS, Linux, Web',
      url: appUrl,
      author: { '@id': personId },
      featureList: p.tags || [],
    });
  });

  portfolio.hackathons.forEach((g) => {
    const [year, month] = g.when.split('/');
    const dateStr = `${year}-${month}-01`;
    g.items.forEach((item) => {
      const slug = slugify(item.name);
      const hackId = `${siteUrl}/#hackathon-${slug}`;

      graph.push({
        '@type': 'Event',
        '@id': hackId,
        name: item.name,
        description: item.description || '',
        startDate: dateStr,
        performer: { '@id': personId },
        sponsor: item.from ? { '@type': 'Organization', name: item.from } : undefined,
        location: {
          '@type': 'VirtualLocation',
          url: siteUrl,
        },
      });
    });
  });

  portfolio.awards.forEach((g) => {
    g.items.forEach((item) => {
      const slug = slugify(item.name);
      const awardId = `${siteUrl}/#award-${slug}`;

      graph.push({
        '@type': 'CreativeWork',
        '@id': awardId,
        name: item.name,
        description: item.description || '',
        author: { '@id': personId },
        sponsor: item.from ? { '@type': 'Organization', name: item.from } : undefined,
      });
    });
  });

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}
