/**
 * SEO head helpers: canonical URL and JSON-LD @graph injection.
 */

export function buildJsonLdGraph(seo, dateModified) {
  const siteUrl = seo.siteUrl.replace(/\/$/, "");
  const personId = `${siteUrl}/#person`;
  const websiteId = `${siteUrl}/#website`;
  const webpageId = `${siteUrl}/#webpage`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": personId,
        name: seo.person.name,
        url: siteUrl,
        image: seo.person.image,
        jobTitle: seo.person.jobTitle,
        description: seo.person.description,
        sameAs: seo.person.sameAs,
        dateModified,
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        url: siteUrl,
        name: seo.siteName,
        description: seo.description,
        publisher: { "@id": personId },
        dateModified,
      },
      {
        "@type": "WebPage",
        "@id": webpageId,
        url: siteUrl,
        name: seo.title,
        description: seo.description,
        isPartOf: { "@id": websiteId },
        about: { "@id": personId },
        dateModified,
      },
      {
        "@type": "ProfilePage",
        "@id": `${siteUrl}/#profilepage`,
        url: siteUrl,
        name: seo.title,
        description: seo.description,
        mainEntity: { "@id": personId },
        isPartOf: { "@id": websiteId },
        dateModified,
      },
    ],
  };
}

export function applySeoToDocument(document, seo, dateModified) {
  const siteUrl = seo.siteUrl.replace(/\/$/, "") + "/";
  const head = document.head;
  if (!head) throw new Error("Missing document head");

  let canonical = head.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    head.appendChild(canonical);
  }
  canonical.setAttribute("href", siteUrl);

  const jsonLd = buildJsonLdGraph(seo, dateModified);
  let ldScript = head.querySelector('script[type="application/ld+json"]');
  if (!ldScript) {
    ldScript = document.createElement("script");
    ldScript.setAttribute("type", "application/ld+json");
    const firstScript = head.querySelector("script");
    if (firstScript) {
      head.insertBefore(ldScript, firstScript);
    } else {
      head.appendChild(ldScript);
    }
  }
  ldScript.textContent = JSON.stringify(jsonLd, null, 4);

  const tabHighlight = document.getElementById("tabHighlightImage");
  if (tabHighlight && !tabHighlight.getAttribute("alt")?.trim()) {
    tabHighlight.setAttribute("alt", "Portfolio highlight");
  }
}
