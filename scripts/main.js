import { initCoverFlow, updateCoverFlowColors } from "./components/coverflow.js";
import { initLazyThumbs } from "./components/lazyThumbs.js";
import { initFootnotes } from "./components/footnotes.js";
import { initImageViewerDelegates } from "./components/imageViewer.js";
import {
  applyHashFromLocation,
  initHashNavigation,
  setTabActivator,
} from "./components/navigation.js";
import { renderProjects } from "./components/renderProjects.js";
import { renderTimeline } from "./components/renderTimeline.js";
import { initScrollableTabs } from "./components/scrollableTabs.js";
import { initScrollButton } from "./components/scrollButton.js";
import { initTabs, setTabImages } from "./components/tabs.js";
import { initTapMode } from "./components/tapMode.js";
import { initThemeToggle, initYear } from "./components/theme.js";
import { setupTilt } from "./components/tilt.js";
import { initVisibilityPause } from "./components/visibilityPause.js";
import { initWidgets } from "./components/widgets.js";
import { normalizeImages } from "./utils/data.js";

/**
 * Collect every image with `"face": true` from all sections of data.json,
 * plus any standalone entries in the top-level `coverflowImages` array.
 */
/**
 * Extract the first usable URL from an item's link field.
 * link can be a string, an array of {url} objects, or falsy.
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

/**
 * Format a date string like "2025/06" or "2024/01/01" into "Jun 2025" etc.
 */
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

  // Top-level standalone coverflow images (no parent item)
  if (Array.isArray(data.coverflowImages)) {
    data.coverflowImages.forEach((entry) => {
      if (entry.face) {
        add(entry, {});
      }
    });
  }

  // Projects
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

  // Hackathons
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

  // Awards
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

function scheduleCoverflowColorsFetch() {
  const run = () => {
    fetch("colors.json", { cache: "no-store" })
      .then((r) => r.json())
      .then((colors) => {
        updateCoverFlowColors(colors || {});
      })
      .catch(() => {
        // Keep fallback coverflow glow colors when colors.json is unavailable.
      });
  };

  const deferredRun = () => {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(() => run(), { timeout: 2500 });
      return;
    }
    setTimeout(run, 1200);
  };

  if (document.readyState === "complete") {
    deferredRun();
    return;
  }
  window.addEventListener("load", deferredRun, { once: true });
}

document.addEventListener("DOMContentLoaded", () => {
  initYear();
  initThemeToggle();
  initScrollButton();

  const { activate } = initTabs();
  setTabActivator(activate);
  initHashNavigation();
  applyHashFromLocation();

  initWidgets();
  initTapMode();

  Promise.all([
    fetch("data.json", { cache: "no-store" }).then((r) => r.json()),
  ])
    .then(([data]) => {
      renderProjects(data.projects || []);
      renderTimeline("hackathons", data.hackathons || [], true);
      renderTimeline("awards", data.awards || [], false);
      initLazyThumbs();

      applyHashFromLocation();

      // Feed section images to the tab highlight carousel
      setTabImages(data);

      // Defer coverflow until idle so thumbs and text win on slow networks.
      const runCoverFlow = () => {
        const faceImages = collectFaceImages(data);
        initCoverFlow(faceImages, {});
        scheduleCoverflowColorsFetch();
      };
      if ("requestIdleCallback" in window) {
        requestIdleCallback(runCoverFlow, { timeout: 1500 });
      } else {
        setTimeout(runCoverFlow, 100);
      }
    })
    .catch((err) => {
      console.error(err);
      const fail = (msg) =>
        `<p style="font-size:.8rem;color:#aa6464">${msg}</p>`;
      const projects = document.getElementById("projects");
      if (projects) {
        projects.innerHTML = fail("Failed to load projects.");
      }
      // Still initialise coverflow with empty array so the container is clean
      initCoverFlow([], {});
    });

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  if (!reduceMotion) {
    const highlightFigureEl = document.querySelector(".tab-highlight-figure");
    const tiltTarget = highlightFigureEl;
    setupTilt(tiltTarget, { max: 12, scale: 1.02 });
  }

  initFootnotes();
  initImageViewerDelegates();
  initVisibilityPause();
  initScrollableTabs();
});
