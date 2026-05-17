import { normalizeImages, normalizeLinks, slugify } from "./data.js";

export function firstLink(field) {
  if (!field) return "";
  if (typeof field === "string") return field;
  if (Array.isArray(field)) {
    for (const entry of field) {
      if (entry && entry.url) return entry.url;
    }
  }
  return "";
}

export function formatShortDate(raw) {
  if (!raw) return "";
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const parts = String(raw)
    .split(/[-\/]/)
    .map((p) => parseInt(p, 10));
  if (!parts.length || parts.some(isNaN)) return "";
  const [y, m] = parts;
  if (m >= 1 && m <= 12) return `${months[m - 1]} ${y}`;
  return String(y);
}

export function collectFaceImages(data) {
  const faceImages = [];
  const seen = new Set();

  const add = (img, meta) => {
    if (!img || !img.path) return;
    if (seen.has(img.path)) return;
    seen.add(img.path);
    faceImages.push({
      label: img.label || "",
      path: img.path,
      date: meta.date || "",
      title: meta.title || "",
      link: meta.link || "",
    });
  };

  if (Array.isArray(data.coverflowImages)) {
    data.coverflowImages.forEach((entry) => {
      if (entry.face) add(entry, {});
    });
  }

  if (Array.isArray(data.projects)) {
    data.projects.forEach((proj) => {
      const imgs = normalizeImages(proj.images, proj.title);
      const date = formatShortDate(
        proj["end-date"] || proj["start-date"] || "",
      );
      const link = firstLink(proj.link);
      imgs.forEach((img, i) => {
        const raw = Array.isArray(proj.images) ? proj.images[i] : null;
        if (raw && raw.face) {
          add(img, { date, title: proj.title || "", link });
        }
      });
    });
  }

  if (Array.isArray(data.hackathons)) {
    data.hackathons.forEach((group) => {
      const groupDate = formatShortDate(group.when || "");
      (group.items || []).forEach((item) => {
        const imgs = normalizeImages(item.images, item.name);
        const link = firstLink(item.link);
        imgs.forEach((img, i) => {
          const raw = Array.isArray(item.images) ? item.images[i] : null;
          if (raw && raw.face) {
            add(img, { date: groupDate, title: item.name || "", link });
          }
        });
      });
    });
  }

  if (Array.isArray(data.awards)) {
    data.awards.forEach((group) => {
      const groupDate = formatShortDate(group.when || "");
      (group.items || []).forEach((item) => {
        const imgs = normalizeImages(item.images, item.name);
        const link =
          typeof item.link === "string" && item.link ? item.link : "";
        imgs.forEach((img, i) => {
          const raw = Array.isArray(item.images) ? item.images[i] : null;
          if (raw && raw.face) {
            add(img, { date: groupDate, title: item.name || "", link });
          }
        });
      });
    });
  }

  return faceImages;
}

function collectSectionImagePaths(id, rawData) {
  const images = [];
  if (!rawData || !Array.isArray(rawData)) return images;

  if (id === "projects") {
    rawData.forEach((proj) => {
      normalizeImages(proj.images, proj.title).forEach((img) =>
        images.push({ path: img.path, label: img.label }),
      );
    });
  } else {
    rawData.forEach((group) => {
      (group.items || []).forEach((item) => {
        normalizeImages(item.images, item.name).forEach((img) =>
          images.push({ path: img.path, label: img.label }),
        );
      });
    });
  }

  return images;
}

/** Slim runtime payload embedded in index.html at build time. */
export function generateRuntimePayload(data) {
  const projectLinks = (data.projects || [])
    .map((p) => ({
      slug: slugify(p.title || ""),
      title: p.title || "",
      links: normalizeLinks(p.link),
    }))
    .filter((p) => p.slug && p.links.length);

  const timelineLinks = [];
  for (const section of ["hackathons", "awards"]) {
    for (const group of data[section] || []) {
      const items = group.items || [];
      if (items.length === 1) {
        const item = items[0];
        const slug = slugify(item.name || "");
        const links = normalizeLinks(item.link);
        if (slug && links.length) {
          timelineLinks.push({
            section,
            slug,
            title: item.name || "",
            links,
          });
        }
      }
    }
  }

  return {
    faceImages: collectFaceImages(data),
    sectionImages: {
      projects: collectSectionImagePaths("projects", data.projects || []),
      hackathons: collectSectionImagePaths(
        "hackathons",
        data.hackathons || [],
      ),
      awards: collectSectionImagePaths("awards", data.awards || []),
    },
    projectLinks,
    timelineLinks,
  };
}
