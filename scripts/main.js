import { initCoverFlow, updateCoverFlowColors } from "./components/coverflow.js";
import { initLazyThumbs } from "./components/lazyThumbs.js";
import { initFootnotes } from "./components/footnotes.js";
import { initImageViewerDelegates } from "./components/imageViewer.js";
import {
  applyHashFromLocation,
  initHashNavigation,
  setTabActivator,
} from "./components/navigation.js";
import { renderProjects, wireProjects } from "./components/renderProjects.js";
import { renderTimeline, wireTimeline } from "./components/renderTimeline.js";
import { initScrollableTabs } from "./components/scrollableTabs.js";
import { initScrollButton } from "./components/scrollButton.js";
import { initTabs, setTabImages } from "./components/tabs.js";
import { initTapMode } from "./components/tapMode.js";
import { initThemeToggle, initYear } from "./components/theme.js";
import { setupTilt } from "./components/tilt.js";
import { initVisibilityPause } from "./components/visibilityPause.js";
import { initWidgets } from "./components/widgets.js";
import { normalizeImages } from "./utils/data.js";

const dataReady = fetch("data.json")
  .then((r) => r.json())
  .catch((err) => {
    console.error(err);
    return null;
  });

let coverflowColorsRequested = false;

function requestCoverflowColors() {
  if (coverflowColorsRequested) return;
  coverflowColorsRequested = true;
  fetch("colors.json")
    .then((r) => r.json())
    .then((colors) => {
      updateCoverFlowColors(colors || {});
    })
    .catch(() => {
      // Keep fallback coverflow glow colors when colors.json is unavailable.
    });
}

function scheduleCoverflowColorsFetch() {
  const run = () => requestCoverflowColors();

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(run, { timeout: 8000 });
    return;
  }
  setTimeout(run, 3000);
}

function panelsArePrerendered() {
  return document.getElementById("projects")?.querySelector(".card") != null;
}

function whenDomReady(fn) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn, { once: true });
  } else {
    fn();
  }
}

function runWhenIdle(fn, timeout = 2500) {
  if ("requestIdleCallback" in window) {
    requestIdleCallback(fn, { timeout });
  } else {
    setTimeout(fn, 200);
  }
}

/**
 * Collect every image with `"face": true` from all sections of data.json,
 * plus any standalone entries in the top-level `coverflowImages` array.
 */
function firstLink(field) {
  if (!field) return "";
  if (typeof field === "string") return field;
  if (Array.isArray(field)) {
    for (const entry of field) {
      if (entry && entry.url) return entry.url;
    }
  }
  return "";
}

function formatShortDate(raw) {
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

function collectFaceImages(data) {
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
      if (entry.face) {
        add(entry, {});
      }
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

function hydrateFromData(data) {
  const faceImages = collectFaceImages(data);
  initCoverFlow(faceImages, {});

  if (!panelsArePrerendered()) {
    renderProjects(data.projects || []);
    renderTimeline("hackathons", data.hackathons || [], true);
    renderTimeline("awards", data.awards || [], false);
  } else {
    wireProjects(data.projects || []);
    wireTimeline("hackathons", data.hackathons || [], true);
    wireTimeline("awards", data.awards || [], false);
  }

  initLazyThumbs();
  applyHashFromLocation();
  setTabImages(data);
}

dataReady.then((data) => {
  whenDomReady(() => {
    if (!data) {
      const fail = (msg) =>
        `<p style="font-size:.8rem;color:#aa6464">${msg}</p>`;
      const projects = document.getElementById("projects");
      if (projects) {
        projects.innerHTML = fail("Failed to load projects.");
      }
      initCoverFlow([], {});
      return;
    }
    hydrateFromData(data);
  });
});

document.addEventListener("DOMContentLoaded", () => {
  initYear();
  initThemeToggle();
  initScrollButton();

  const { activate } = initTabs();
  setTabActivator(activate);
  initHashNavigation();

  initFootnotes();
  initImageViewerDelegates();

  runWhenIdle(() => {
    initWidgets();
    initTapMode();
    initVisibilityPause();
    initScrollableTabs();

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (!reduceMotion) {
      const highlightFigureEl = document.querySelector(".tab-highlight-figure");
      setupTilt(highlightFigureEl, { max: 12, scale: 1.02 });
    }
  });

  applyHashFromLocation();
});

window.addEventListener(
  "load",
  () => {
    document.body.classList.add("page-ready");
    scheduleCoverflowColorsFetch();
  },
  { once: true },
);
