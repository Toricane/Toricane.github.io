// Tab switching + auto-advancing highlight carousel
// Replaces the old static highlightMap with a slideshow of all section images

import {
    getHighlightCarouselSources,
    normalizeImages,
} from "../utils/data.js";
import { refreshLazyThumbs } from "./lazyThumbs.js";

let sectionImages = {}; // { projects: [...], hackathons: [...], awards: [...] }
let activeTab = null;
let carouselTimer = null;
let carouselIndex = 0;
let carouselList = [];
let carouselPaused = false;
let isTransitioning = false;
const loadedSlideUrls = new Set();
let highlightCarouselEnabled = false;
let highlightDeferObserver = null;

const CAROUSEL_INTERVAL = 4000; // ms between slides
const FADE_DURATION = 500; // ms for crossfade

function syncTabHighlightA11y() {
  const highlight = document.querySelector(".tab-highlight");
  if (!highlight) return;
  highlight.removeAttribute("aria-hidden");
  highlight.inert = false;
  highlight.setAttribute("role", "region");
  highlight.setAttribute("aria-label", "Featured portfolio images");

  const wrap = highlight.querySelector(".highlight-carousel");
  if (wrap) {
    wrap.setAttribute("role", "group");
    wrap.setAttribute("aria-roledescription", "carousel");
    const counter = wrap.querySelector(".highlight-counter");
    if (counter) counter.setAttribute("aria-live", "polite");
  }
}

// Fallback images used before data loads (keeps the sidebar from being blank)
const fallbackMap = {
  projects: "assets/projects_highlight.webp",
  hackathons: "assets/hackathons_highlight.webp",
  awards: "assets/awards_highlight.webp",
};

/**
 * Gather all images from a section's data items (projects / hackathons / awards).
 * Returns a flat array of { path, label } in order.
 */
function collectSectionImages(id, rawData) {
  const images = [];
  if (!rawData || !Array.isArray(rawData)) return images;

  if (id === "projects") {
    // rawData is an array of project objects
    rawData.forEach((proj) => {
      const imgs = normalizeImages(proj.images, proj.title);
      imgs.forEach((img) => images.push(img));
    });
  } else {
    // hackathons / awards: array of timeline groups with .items[]
    rawData.forEach((group) => {
      const items = group.items || [];
      items.forEach((item) => {
        const imgs = normalizeImages(item.images, item.name);
        imgs.forEach((img) => images.push(img));
      });
    });
  }

  return images;
}

/**
 * Call after data.json is fetched to register section image lists.
 */
export function setTabImages(data) {
  if (data?.sectionImages) {
    sectionImages.projects = data.sectionImages.projects || [];
    sectionImages.hackathons = data.sectionImages.hackathons || [];
    sectionImages.awards = data.sectionImages.awards || [];
  } else {
    sectionImages.projects = collectSectionImages(
      "projects",
      data.projects || [],
    );
    sectionImages.hackathons = collectSectionImages(
      "hackathons",
      data.hackathons || [],
    );
    sectionImages.awards = collectSectionImages("awards", data.awards || []);
  }

  if (activeTab && sectionImages[activeTab]?.length) {
    queueCarouselStart(activeTab);
  }
}

function applySlideSources(imgEl, path) {
  const { src, srcset, sizes } = getHighlightCarouselSources(path);
  imgEl.src = src;
  if (srcset) {
    imgEl.srcset = srcset;
    imgEl.sizes = sizes;
  } else {
    imgEl.removeAttribute("srcset");
    imgEl.removeAttribute("sizes");
  }
}

function getCarouselPreloadSrc(path) {
  return getHighlightCarouselSources(path).src || path;
}

function queueCarouselStart(id) {
  if (highlightCarouselEnabled) {
    startCarousel(id);
  }
}

function enableHighlightCarousel() {
  if (highlightCarouselEnabled) return;
  highlightCarouselEnabled = true;
  if (highlightDeferObserver) {
    highlightDeferObserver.disconnect();
    highlightDeferObserver = null;
  }
  if (activeTab) {
    startCarousel(activeTab);
  }
}

function setupHighlightDefer() {
  const highlight = document.querySelector(".tab-highlight");
  const content = document.getElementById("content");
  if (!highlight) return;

  const tryEnable = () => enableHighlightCarousel();

  highlightDeferObserver = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        tryEnable();
      }
    },
    { rootMargin: "100px" },
  );

  highlightDeferObserver.observe(highlight);
  if (content) highlightDeferObserver.observe(content);
}

/**
 * Build or update the carousel DOM inside .tab-highlight-figure.
 */
function buildCarouselDOM() {
  const figure = document.querySelector(".tab-highlight-figure");
  if (!figure) return null;

  // If already built, return existing
  let wrap = figure.querySelector(".highlight-carousel");
  if (wrap) return wrap;

  // Clear the old static img
  figure.innerHTML = "";

  wrap = document.createElement("div");
  wrap.className = "highlight-carousel";

  // Two img layers for crossfade
  const imgA = document.createElement("img");
  imgA.className = "highlight-slide highlight-slide-active";
  imgA.alt = "";
  imgA.loading = "lazy";
  imgA.decoding = "async";
  imgA.fetchPriority = "low";

  const imgB = document.createElement("img");
  imgB.className = "highlight-slide";
  imgB.alt = "";
  imgB.loading = "lazy";
  imgB.decoding = "async";
  imgB.fetchPriority = "low";

  // Navigation arrows
  const prevBtn = document.createElement("button");
  prevBtn.className = "highlight-nav highlight-prev";
  prevBtn.setAttribute("aria-label", "Previous image");
  prevBtn.innerHTML = "&#8249;";

  const nextBtn = document.createElement("button");
  nextBtn.className = "highlight-nav highlight-next";
  nextBtn.setAttribute("aria-label", "Next image");
  nextBtn.innerHTML = "&#8250;";

  // Dot indicators container
  const dots = document.createElement("div");
  dots.className = "highlight-dots";

  // Counter
  const counter = document.createElement("div");
  counter.className = "highlight-counter";

  wrap.appendChild(imgA);
  wrap.appendChild(imgB);
  wrap.appendChild(prevBtn);
  wrap.appendChild(nextBtn);
  wrap.appendChild(dots);
  wrap.appendChild(counter);

  figure.appendChild(wrap);
  syncTabHighlightA11y();

  // Events
  prevBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    navigateCarousel(-1);
  });
  nextBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    navigateCarousel(1);
  });

  // Pause on hover
  wrap.addEventListener("pointerenter", () => {
    carouselPaused = true;
  });
  wrap.addEventListener("pointerleave", () => {
    carouselPaused = false;
    resetCarouselTimer();
  });

  // Click to open image viewer
  wrap.addEventListener("click", (e) => {
    if (
      e.target.closest(".highlight-nav") ||
      e.target.closest(".highlight-dots")
    )
      return;
    openHighlightInViewer();
  });

  // Swipe support
  let startX = 0;
  let startY = 0;
  const SWIPE_THRESHOLD = 40;

  wrap.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
    startX = e.clientX;
    startY = e.clientY;
  });
  wrap.addEventListener("pointerup", (e) => {
    if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_THRESHOLD) {
      if (dx < 0) navigateCarousel(1);
      else navigateCarousel(-1);
    }
  });

  return wrap;
}

/**
 * Open the current carousel image in the full-screen image viewer.
 */
function openHighlightInViewer() {
  if (!carouselList.length) return;

  // Build a hidden gallery of buttons OUTSIDE the carousel wrapper so the
  // synthetic .click() never bubbles through the wrap click handler (which
  // would call openHighlightInViewer again → infinite recursion).
  let gallery = document.getElementById("_highlight_gallery_hidden");
  if (!gallery) {
    gallery = document.createElement("div");
    gallery.id = "_highlight_gallery_hidden";
    gallery.className = "highlight-gallery-hidden card-images";
    gallery.style.display = "none";
    gallery.setAttribute("aria-hidden", "true");
    gallery.inert = true;
    document.body.appendChild(gallery);
  }

  // Rebuild buttons to match current list
  gallery.innerHTML = "";
  carouselList.forEach((img) => {
    const btn = document.createElement("button");
    btn.className = "card-thumb";
    btn.setAttribute("data-src", img.path);
    btn.setAttribute("data-label", img.label || "");
    gallery.appendChild(btn);
  });

  // Click the current index button
  const buttons = gallery.querySelectorAll("button");
  if (buttons[carouselIndex]) {
    buttons[carouselIndex].click();
  }
}

/**
 * Update dot indicators.
 */
function updateDots() {
  const dotsContainer = document.querySelector(".highlight-dots");
  if (!dotsContainer) return;

  // Only show dots if there are a reasonable number (otherwise it's too many)
  const maxDots = 20;
  if (carouselList.length > maxDots || carouselList.length <= 1) {
    dotsContainer.style.display = "none";
    return;
  }

  dotsContainer.style.display = "";
  dotsContainer.innerHTML = "";
  carouselList.forEach((_, i) => {
    const dot = document.createElement("button");
    dot.className = "highlight-dot" + (i === carouselIndex ? " active" : "");
    dot.setAttribute("aria-label", `Go to image ${i + 1}`);
    dot.addEventListener("click", (e) => {
      e.stopPropagation();
      goToSlide(i);
    });
    dotsContainer.appendChild(dot);
  });
}

/**
 * Update the counter text.
 */
function updateCounter() {
  const counter = document.querySelector(".highlight-counter");
  if (!counter) return;
  if (carouselList.length <= 1) {
    counter.textContent = "";
    return;
  }
  counter.textContent = `${carouselIndex + 1} / ${carouselList.length}`;
}

/**
 * Crossfade to a specific slide index.
 */
function goToSlide(index) {
  if (isTransitioning || !carouselList.length) return;
  if (index < 0) index = carouselList.length - 1;
  if (index >= carouselList.length) index = 0;
  if (index === carouselIndex) return;

  isTransitioning = true;
  const wrap = document.querySelector(".highlight-carousel");
  if (!wrap) {
    isTransitioning = false;
    return;
  }

  const slides = wrap.querySelectorAll(".highlight-slide");
  if (slides.length < 2) {
    isTransitioning = false;
    return;
  }

  const activeSlide =
    wrap.querySelector(".highlight-slide-active") || slides[0];
  const inactiveSlide = activeSlide === slides[0] ? slides[1] : slides[0];

  const imgData = carouselList[index];
  const preloadSrc = getCarouselPreloadSrc(imgData.path);

  const finishTransition = () => {
    applySlideSources(inactiveSlide, imgData.path);
    inactiveSlide.alt = imgData.label || "";
    inactiveSlide.classList.add("ready");

    // Trigger crossfade
    requestAnimationFrame(() => {
      inactiveSlide.classList.add("highlight-slide-active");
      activeSlide.classList.remove("highlight-slide-active");

      carouselIndex = index;
      updateDots();
      updateCounter();

      // Preload neighbors
      preloadNeighbors();

      setTimeout(() => {
        isTransitioning = false;
      }, FADE_DURATION);
    });
  };

  if (loadedSlideUrls.has(imgData.path)) {
    finishTransition();
  } else {
    const preloader = new Image();
    preloader.onload = () => {
      loadedSlideUrls.add(imgData.path);
      finishTransition();
    };
    preloader.onerror = () => {
      isTransitioning = false;
      // Skip to next
      carouselIndex = index;
      updateDots();
      updateCounter();
    };
    preloader.src = preloadSrc;
  }

  resetCarouselTimer();
}

/**
 * Navigate forward/backward by delta.
 */
function navigateCarousel(delta) {
  goToSlide(carouselIndex + delta);
}

/**
 * Preload the previous and next images for smooth transitions.
 */
function preloadNeighbors() {
  if (carouselList.length <= 1) return;
  const prev = (carouselIndex - 1 + carouselList.length) % carouselList.length;
  const next = (carouselIndex + 1) % carouselList.length;
  [prev, next].forEach((i) => {
    const neighbor = carouselList[i];
    const path = neighbor.path;
    if (!path || loadedSlideUrls.has(path)) return;
    const img = new Image();
    img.onload = () => loadedSlideUrls.add(path);
    img.src = getCarouselPreloadSrc(path);
  });
}

/**
 * Reset the auto-advance timer.
 */
function resetCarouselTimer() {
  clearInterval(carouselTimer);
  carouselTimer = setInterval(() => {
    if (!carouselPaused && !isTransitioning && carouselList.length > 1) {
      navigateCarousel(1);
    }
  }, CAROUSEL_INTERVAL);
}

/**
 * Start the carousel for a given tab id.
 */
function startCarousel(id) {
  const images = sectionImages[id] || [];
  carouselList = images;
  carouselIndex = 0;
  isTransitioning = false;
  loadedSlideUrls.clear();

  const wrap = buildCarouselDOM();
  if (!wrap) return;

  if (!images.length) {
    // Fallback to static image
    const slides = wrap.querySelectorAll(".highlight-slide");
    const src = fallbackMap[id] || "";
    if (slides[0]) {
      slides[0].src = src;
      slides[0].removeAttribute("srcset");
      slides[0].removeAttribute("sizes");
      slides[0].alt = id + " highlight";
      slides[0].classList.add("highlight-slide-active");
    }
    if (slides[1]) {
      slides[1].src = "";
      slides[1].removeAttribute("srcset");
      slides[1].removeAttribute("sizes");
      slides[1].classList.remove("highlight-slide-active");
    }
    updateDots();
    updateCounter();
    clearInterval(carouselTimer);
    return;
  }

  const slides = wrap.querySelectorAll(".highlight-slide");
  const firstImg = images[0];

  const preloader = new Image();
  preloader.onload = () => {
    loadedSlideUrls.add(firstImg.path);
    if (slides[0]) {
      applySlideSources(slides[0], firstImg.path);
      slides[0].alt = firstImg.label || "";
      slides[0].classList.add("highlight-slide-active", "ready");
    }
    if (slides[1]) {
      slides[1].src = "";
      slides[1].removeAttribute("srcset");
      slides[1].removeAttribute("sizes");
      slides[1].classList.remove("highlight-slide-active", "ready");
    }
    preloadNeighbors();
  };
  preloader.src = getCarouselPreloadSrc(firstImg.path);

  updateDots();
  updateCounter();
  resetCarouselTimer();
}

/**
 * Initialize the tab switching system.
 */
export function initTabs() {
  const tabs = Array.from(document.querySelectorAll(".tab"));
  const panels = Array.from(document.querySelectorAll(".tab-panel"));

  syncTabHighlightA11y();
  buildCarouselDOM();
  setupHighlightDefer();

  const activate = (id) => {
    activeTab = id;

    tabs.forEach((t) => {
      const isActive = t.dataset.tab === id;
      t.classList.toggle("active", isActive);
      t.setAttribute("aria-selected", isActive);
    });
    panels.forEach((p) => {
      const isActive = p.id === id;
      p.classList.toggle("active", isActive);
      p.toggleAttribute("hidden", !isActive);
    });

    const panel = document.getElementById(id);
    if (panel) refreshLazyThumbs(panel);
    queueCarouselStart(id);
  };

  tabs.forEach((t) =>
    t.addEventListener("click", () => activate(t.dataset.tab)),
  );
  activate("projects");

  // Pause carousel when page is hidden
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      clearInterval(carouselTimer);
    } else if (activeTab) {
      resetCarouselTimer();
    }
  });

  return { activate };
}
