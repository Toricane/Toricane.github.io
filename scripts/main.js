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
import { collectFaceImages } from "./utils/siteData.js";

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

function loadSiteData() {
  if (window.__SITE_RUNTIME__) {
    return Promise.resolve(window.__SITE_RUNTIME__);
  }
  return fetch("data.json")
    .then((r) => r.json())
    .then((data) => ({
      faceImages: collectFaceImages(data),
      sectionImages: null,
      projectLinks: null,
      timelineLinks: null,
      _full: data,
    }))
    .catch((err) => {
      console.error(err);
      return null;
    });
}

function timelineWireGroups(runtime, section) {
  return (runtime.timelineLinks || [])
    .filter((entry) => entry.section === section)
    .map((entry) => ({
      when: "",
      items: [{ name: entry.title, link: entry.links }],
    }));
}

function hydrateFromRuntime(runtime) {
  const faceImages =
    runtime.faceImages || (runtime._full ? collectFaceImages(runtime._full) : []);
  initCoverFlow(faceImages, {});

  const full = runtime._full;

  if (!panelsArePrerendered()) {
    if (full) {
      renderProjects(full.projects || []);
      renderTimeline("hackathons", full.hackathons || [], true);
      renderTimeline("awards", full.awards || [], false);
    }
  } else if (full) {
    wireProjects(full.projects || []);
    wireTimeline("hackathons", full.hackathons || [], true);
    wireTimeline("awards", full.awards || [], false);
  } else if (runtime.projectLinks) {
    wireProjects(
      runtime.projectLinks.map((p) => ({
        title: p.title,
        link: p.links,
      })),
    );
    wireTimeline("hackathons", timelineWireGroups(runtime, "hackathons"), true);
    wireTimeline("awards", timelineWireGroups(runtime, "awards"), false);
  }

  initLazyThumbs();
  applyHashFromLocation();

  if (runtime.sectionImages) {
    setTabImages({ sectionImages: runtime.sectionImages });
  } else if (full) {
    setTabImages(full);
  }
}

const dataReady = loadSiteData();

dataReady.then((runtime) => {
  whenDomReady(() => {
    if (!runtime) {
      const fail = (msg) =>
        `<p style="font-size:.8rem;color:#aa6464">${msg}</p>`;
      const projects = document.getElementById("projects");
      if (projects) {
        projects.innerHTML = fail("Failed to load projects.");
      }
      initCoverFlow([], {});
      return;
    }
    hydrateFromRuntime(runtime);
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

  runWhenIdle(async () => {
    const { initWidgets } = await import("./components/widgets.js");
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
