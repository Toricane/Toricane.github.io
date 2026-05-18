import type { seo as SeoType } from './portfolio';

export function buildJsonLdGraph(seo: typeof SeoType, dateModified: string) {
  const siteUrl = seo.siteUrl.replace(/\/$/, '');
  const personId = `${siteUrl}/#person`;
  const websiteId = `${siteUrl}/#website`;
  const webpageId = `${siteUrl}/#webpage`;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        '@id': personId,
        name: seo.person.name,
        url: siteUrl,
        image: seo.person.image,
        jobTitle: seo.person.jobTitle,
        description: seo.person.description,
        sameAs: seo.person.sameAs,
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
        '@id': `${siteUrl}/#profilepage`,
        url: siteUrl,
        name: seo.title,
        description: seo.description,
        mainEntity: { '@id': personId },
        isPartOf: { '@id': websiteId },
        dateModified,
      },
    ],
  };
}
