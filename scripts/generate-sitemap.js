#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const DATE_KEY_RE = /(start-date|end-date|when|date)/i;

function collectDates(value, dates = []) {
  if (value == null) return dates;
  if (typeof value === "string" && DATE_KEY_RE.test(value) === false) {
    const normalized = value.replace(/\//g, "-");
    const parsed = Date.parse(normalized);
    if (!Number.isNaN(parsed)) dates.push(parsed);
    return dates;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectDates(item, dates));
    return dates;
  }
  if (typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      if (DATE_KEY_RE.test(key) && typeof nested === "string") {
        const normalized = nested.replace(/\//g, "-");
        const parsed = Date.parse(normalized);
        if (!Number.isNaN(parsed)) dates.push(parsed);
      } else {
        collectDates(nested, dates);
      }
    }
  }
  return dates;
}

function toLastmodDate(...timestamps) {
  const valid = timestamps.filter((t) => Number.isFinite(t));
  const maxTs = valid.length ? Math.max(...valid) : Date.now();
  return new Date(maxTs).toISOString().slice(0, 10);
}

export function generateSitemap({
  root = rootDir,
  seoPath = path.join(root, "seo.json"),
  dataPath = path.join(root, "data.json"),
  outputPath = path.join(root, "sitemap.xml"),
  buildDate = new Date(),
} = {}) {
  const seo = JSON.parse(fs.readFileSync(seoPath, "utf-8"));
  const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  const siteUrl = seo.siteUrl.replace(/\/$/, "");
  const contentDates = collectDates(data);
  const lastmod = toLastmodDate(buildDate.getTime(), ...contentDates);

  const urls = (seo.sitemap?.urls || [{ loc: "/", priority: "1.0" }])
    .map((entry) => {
      const locPath = entry.loc.startsWith("/") ? entry.loc : `/${entry.loc}`;
      const loc = `${siteUrl}${locPath}`;
      const lines = [
        "  <url>",
        `    <loc>${loc}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
      ];
      if (entry.changefreq) lines.push(`    <changefreq>${entry.changefreq}</changefreq>`);
      if (entry.priority) lines.push(`    <priority>${entry.priority}</priority>`);
      lines.push("  </url>");
      return lines.join("\n");
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

  fs.writeFileSync(outputPath, xml, "utf-8");
  return { outputPath, lastmod, urlCount: seo.sitemap?.urls?.length || 1 };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = generateSitemap();
  console.log(
    `Generated ${path.relative(rootDir, result.outputPath)} (${result.urlCount} URLs, lastmod ${result.lastmod}).`
  );
}
