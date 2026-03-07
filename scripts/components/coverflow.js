// Dynamic coverflow carousel with continuous loop scroll snap animation
// Renders face-tagged images from data.json in random order.
// Utilises native CSS horizontal scrolling (`scroll-snap-type`) for touch/keyboard
// and an invisible wrap-around adjustment to create an infinite loop experience.

let coverflowImages = [];
let cardsEl = null;
let containerEl = null;

let isPaused = false;
let isHovered = false;
let isInteracting = false;
let scrollTimeoutId = null;
let autoScrollIntervalId = null;
let metricsTimeoutId = null;

function requestBaseMetrics() {
  if (metricsTimeoutId) clearTimeout(metricsTimeoutId);
  metricsTimeoutId = setTimeout(() => {
    calcBaseMetrics();
  }, 50);
}

// How often auto-scroll jumps to the next page
const AUTO_SCROLL_MS = 2500;
// Internal duplicated sets: we render multiple full sets of the original array
// so that there's always a set before and after the one we're currently viewing.
const NUM_SETS = 5; 

// We define our core "page" metrics
let baseSetWidth = 0; 
let baseSetImageCount = 0;
let totalCards = 0;

let loadedSet = new Set();

/**
 * Extracts a dominant, saturated color from an image using a hidden canvas.
 */
function getDominantRGB(imgEl) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 64;
  canvas.height = 64;
  
  try {
    ctx.drawImage(imgEl, 0, 0, 64, 64);
    const data = ctx.getImageData(0, 0, 64, 64).data;
    
    let rSum = 0, gSum = 0, bSum = 0, weightSum = 0;
    
    for (let i = 0; i < data.length; i += 16) {
      const r = data[i];
      const g = data[i+1];
      const b = data[i+2];
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      // Weight more saturated and brighter pixels higher
      let weight = (max - min) + (max * 0.5); 
      // Add a base weight so even dark images get an average
      weight = (weight * weight) + 10; 
      
      rSum += r * weight;
      gSum += g * weight;
      bSum += b * weight;
      weightSum += weight;
    }
    
    if (weightSum > 0) {
      return `${Math.floor(rSum / weightSum)}, ${Math.floor(gSum / weightSum)}, ${Math.floor(bSum / weightSum)}`;
    }
  } catch(e) {
    // Ignore CORS or broken images
  }
  return '77, 181, 255'; // Fallback to accent
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getGap() {
  const w = window.innerWidth;
  if (w <= 600) return 12;
  if (w <= 768) return 15;
  if (w <= 1050) return 18;
  return 20;
}

/**
 * Centering padding on the scroll container so the first and last cards
 * of the total strip are naturally centered.
 */
function applyCenteringPadding() {
  if (!cardsEl || !containerEl) return;
  const half = Math.floor(containerEl.clientWidth / 2);
  cardsEl.style.paddingLeft = half + "px";
  cardsEl.style.paddingRight = half + "px";
}

/**
 * Calculates how wide a single set of base images is.
 */
function calcBaseMetrics() {
  if (!cardsEl || baseSetImageCount === 0) return;
  const cards = Array.from(cardsEl.querySelectorAll(".coverflow-card"));
  if (cards.length < baseSetImageCount) return;

  // Measure the width of exactly `baseSetImageCount` cards starting from an index (e.g. index 0)
  const firstCard = cards[0];
  const lastCardInBase = cards[baseSetImageCount - 1];
  
  if (firstCard && lastCardInBase) {
    const startLeft = firstCard.offsetLeft;
    const endRight = lastCardInBase.offsetLeft + lastCardInBase.offsetWidth;
    const gap = getGap();
    // width includes the gap after the last card to the next set
    baseSetWidth = (endRight - startLeft) + gap; 
  }
}

/**
 * Checks if the scroll position is too close to the absolute ends of our duplicate strip,
 * and if so, seamlessly jumps the scroll back into the middle duplicate sets.
 * This is executed silently without breaking momentum, though CSS smooth scroll should
 * be temporarily disabled or naturally instant if setting scrollLeft directly.
 */
function checkInfiniteWrap() {
  if (!cardsEl || baseSetWidth <= 0 || isInteracting) return;
  
  const currentScroll = cardsEl.scrollLeft;
  // If we scroll into the first set, jump forward by baseSetWidth
  // If we scroll into the very last set, jump backwards by baseSetWidth
  
  const minScroll = baseSetWidth; 
  const maxScroll = cardsEl.scrollWidth - baseSetWidth - cardsEl.clientWidth;

  if (currentScroll < minScroll) {
    // Jump forward by one or more sets
    cardsEl.style.scrollBehavior = 'auto'; // Disable smooth snap for the invisible jump
    cardsEl.scrollLeft += baseSetWidth;
    // After jump, re-enable
    requestAnimationFrame(() => {
        cardsEl.style.scrollBehavior = 'smooth';
    });
  } else if (currentScroll > maxScroll) {
    // Jump backward
    cardsEl.style.scrollBehavior = 'auto';
    cardsEl.scrollLeft -= baseSetWidth;
    requestAnimationFrame(() => {
        cardsEl.style.scrollBehavior = 'smooth';
    });
  }
}

function loadVisibleImages() {
  if (!cardsEl || !containerEl) return;
  const cw = containerEl.clientWidth;
  
  // Lookahead: current scroll window + 2 viewports
  const loadStart = cardsEl.scrollLeft - cw;
  const loadEnd = cardsEl.scrollLeft + cw * 2;

  const cards = cardsEl.querySelectorAll(".coverflow-card");

  cards.forEach((card, i) => {
    if (loadedSet.has(i)) return;
    // scroll offset is calculated vs bounding parent, but left is static
    // Just use left relative offset vs scroll property
    // We adjust for the centering padding on the parent.
    const paddingLeft = parseInt(window.getComputedStyle(cardsEl).paddingLeft) || 0;
    // card.offsetLeft is relative to the offsetParent (cardsEl), includes padding
    const cardLeft = card.offsetLeft - paddingLeft;
    const cardRight = cardLeft + card.offsetWidth;

    if (cardRight >= loadStart && cardLeft <= loadEnd) {
      const img = card.querySelector("img[data-src]");
      if (img) {
        img.src = img.dataset.src;
        img.removeAttribute("data-src");
        loadedSet.add(i);
      }
    }
  });
}

function renderCards(images) {
  if (!cardsEl) return;
  cardsEl.innerHTML = "";
  loadedSet = new Set();

  let baseList = [...images];
  const minCards = 12;
  // Ensure the base list is large enough so repeated sets look nice
  // and so baseSetWidth is wider than the viewport container typically
  while (baseList.length < minCards && images.length > 0) {
    baseList = baseList.concat(shuffle(images));
  }
  
  baseSetImageCount = baseList.length;

  // Create NUM_SETS exact duplicates of our baseList
  let renderList = [];
  for (let i = 0; i < NUM_SETS; i++) {
    renderList = renderList.concat(baseList);
  }

  totalCards = renderList.length;

  const placeholderSvg =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='3'%3E%3Crect fill='%230c151b' width='4' height='3'/%3E%3C/svg%3E";

  renderList.forEach((img, i) => {
    const card = document.createElement("div");
    card.className = "coverflow-card";

    const imgEl = document.createElement("img");
    imgEl.className = "coverflow-main";
    imgEl.alt = img.label || "Photo";
    imgEl.loading = "lazy";
    imgEl.crossOrigin = "Anonymous";

    // Eagerly load the 'middle' set initially instead of the first
    // We will start our scroll positioned at the middle set.
    const middleStartIndex = Math.floor(NUM_SETS / 2) * baseSetImageCount;
    // Eager load everything in the middle set
    if (i >= middleStartIndex && i < middleStartIndex + baseSetImageCount) {
      imgEl.src = img.path;
      loadedSet.add(i);
    } else {
      imgEl.dataset.src = img.path;
      imgEl.src = placeholderSvg;
    }

    imgEl.addEventListener("load", () => {
      if (imgEl.naturalHeight > imgEl.naturalWidth) {
        card.classList.add("portrait");
      } else {
        card.classList.remove("portrait");
      }
      
      const dominantRgb = getDominantRGB(imgEl);
      card.style.setProperty('--card-glow-rgb', dominantRgb);

      requestBaseMetrics();
    });

    card.appendChild(imgEl);

    // Overlay with date and/or title
    const hasDate = img.date && img.date.trim();
    const hasTitle = img.title && img.title.trim();
    if (hasDate || hasTitle) {
      const overlay = document.createElement("div");
      overlay.className = "coverflow-overlay";

      if (hasTitle) {
        const titleEl = document.createElement("span");
        titleEl.className = "coverflow-overlay-title";
        if (img.link && img.link.trim()) {
          const linkUrl = img.link.trim();
          const isHash = linkUrl.startsWith("#");
          const a = document.createElement("a");
          a.href = linkUrl;
          a.textContent = img.title.trim();
          if (!isHash) {
            a.target = "_blank";
            a.rel = "noopener noreferrer";
          }
          a.addEventListener("click", (e) => e.stopPropagation());
          titleEl.appendChild(a);
        } else {
          titleEl.textContent = img.title.trim();
        }
        overlay.appendChild(titleEl);
      }

      if (hasDate) {
        const dateEl = document.createElement("span");
        dateEl.className = "coverflow-overlay-date";
        dateEl.textContent = img.date.trim();
        overlay.appendChild(dateEl);
      }

      card.appendChild(overlay);
    }

    cardsEl.appendChild(card);
  });

  cardsEl.style.gap = getGap() + "px";
  applyCenteringPadding();
  calcBaseMetrics();
}

/**
 * Snaps to the middle duplicated set, centering perfectly on its first card.
 */
function setInitialScrollPosition() {
  if (!cardsEl || baseSetImageCount === 0 || baseSetWidth === 0) return;
  const cards = Array.from(cardsEl.querySelectorAll(".coverflow-card"));
  const middleStartIndex = Math.floor(NUM_SETS / 2) * baseSetImageCount;
  const targetCard = cards[middleStartIndex];
  
  if (targetCard) {
    cardsEl.style.scrollBehavior = 'auto'; // instant scroll for init
    
    // We want to center 'targetCard' in the container.
    // Native scroll-snap will keep it aligned if we just scroll the card into view.
    // However, calculating exactly:
    const paddingLeft = parseInt(window.getComputedStyle(cardsEl).paddingLeft) || 0;
    const cw = containerEl.clientWidth;
    // The exact scroll left to center this targetCard:
    const cardCenterPos = targetCard.offsetLeft - paddingLeft + (targetCard.offsetWidth / 2);
    cardsEl.scrollLeft = cardCenterPos - (cw / 2);

    requestAnimationFrame(() => {
        cardsEl.style.scrollBehavior = 'smooth';
    });
  }
}

function handleAutoScroll() {
  if (isPaused || isHovered || isInteracting) return;
  
  // Find currently snapped card or roughly next target.
  // With scroll snap active, we just need to scroll roughly by the width of the container.
  // Native snap will catch the nearest card perfectly.
  const cw = containerEl.clientWidth;
  
  // Only scroll by roughly half the container to ensure smooth page advancement
  cardsEl.scrollBy({
    left: cw * 0.8, 
    behavior: 'smooth'
  });
}

function startAnimation() {
  if (autoScrollIntervalId) return;
  autoScrollIntervalId = setInterval(handleAutoScroll, AUTO_SCROLL_MS);
}

function stopAnimation() {
  if (autoScrollIntervalId) {
    clearInterval(autoScrollIntervalId);
    autoScrollIntervalId = null;
  }
}

function handleResize() {
  cardsEl.style.gap = getGap() + "px";
  applyCenteringPadding();
  calcBaseMetrics();
  loadVisibleImages();
}

export function initCoverFlow(images) {
  containerEl = document.querySelector(".coverflow-container");
  cardsEl = document.getElementById("coverflowCards");
  if (!containerEl || !cardsEl) return;

  if (!images || !images.length) {
    cardsEl.innerHTML = "";
    return;
  }

  coverflowImages = shuffle(images);
  renderCards(coverflowImages);

  // We must calculate baseMetrics right away based on rendered layouts
  // But images might not be loaded. calcBaseMetrics triggers on image load too.
  
  // Set initial scroll position gracefully
  // setTimeout gives the browser a frame to layout the DOM
  setTimeout(() => {
      calcBaseMetrics();
      setInitialScrollPosition();
      loadVisibleImages();
      startAnimation();
  }, 50);

  // Click on a card image opens the image viewer at that index
  let hiddenGallery = document.createElement("div");
  hiddenGallery.className = "card-images";
  hiddenGallery.style.display = "none";
  document.body.appendChild(hiddenGallery);

  containerEl.addEventListener("click", (e) => {
    const card = e.target.closest(".coverflow-card");
    if (card) {
      const allCards = Array.from(cardsEl.querySelectorAll(".coverflow-card"));
      const cardIndex = allCards.indexOf(card);
      // Determine the *original* image index by taking modulo of baseSetImageCount
      const imgIndex = cardIndex % baseSetImageCount;

      hiddenGallery.innerHTML = "";
      // Reconstruct gallery for baseList
      const baseImagesToRender = renderListToGallery(coverflowImages);
      
      baseImagesToRender.forEach((img) => {
        const btn = document.createElement("button");
        btn.className = "card-thumb";
        btn.setAttribute("data-src", img.path);
        btn.setAttribute("data-label", img.label || "");
        hiddenGallery.appendChild(btn);
      });

      const buttons = hiddenGallery.querySelectorAll("button");
      if (buttons[imgIndex]) {
        buttons[imgIndex].click();
      }
      return;
    }
  });
  
  // Helper for gallery mapping
  function renderListToGallery(baseImages) {
    let list = [...baseImages];
    const minCards = 12;
    while (list.length < minCards && baseImages.length > 0) {
        list = list.concat(baseImages);
    }
    return list;
  }

  // Hover to pause
  containerEl.addEventListener("pointerenter", () => {
    isHovered = true;
  });
  containerEl.addEventListener("pointerleave", () => {
    isHovered = false;
  });

  // Track manual interaction
  cardsEl.addEventListener("touchstart", () => isInteracting = true, {passive: true});
  cardsEl.addEventListener("mousedown", () => isInteracting = true, {passive: true});
  cardsEl.addEventListener("keydown", () => isInteracting = true, {passive: true});

  window.addEventListener("touchend", () => {
      setTimeout(() => isInteracting = false, 1000);
  });
  window.addEventListener("mouseup", () => {
      setTimeout(() => isInteracting = false, 1000);
  });
  window.addEventListener("keyup", () => {
      setTimeout(() => isInteracting = false, 1000);
  });
  
  // Native scroll handler for lazy loading and invisible wrapping
  cardsEl.addEventListener("scroll", () => {
      // Debounce the wrap check slightly so it waits for scroll snap settling
      if (scrollTimeoutId) clearTimeout(scrollTimeoutId);
      scrollTimeoutId = setTimeout(() => {
          checkInfiniteWrap();
          loadVisibleImages();
      }, 150);
  });

  // Keyboard navigation
  cardsEl.setAttribute("tabindex", "0");
  cardsEl.setAttribute("role", "region");
  cardsEl.setAttribute("aria-label", "Image carousel");
  cardsEl.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      isPaused = false;
    } else if (e.key === "Enter" || e.key === " ") {
      // Prevent page from scrolling down on spacebar
      if (e.target === cardsEl) {
        e.preventDefault();
      }
      isPaused = !isPaused;
    }
  });

  // Visibility change
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      stopAnimation();
    } else {
      startAnimation();
    }
  });

  // Resize
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(handleResize, 150);
  });

  // Respect reduced motion
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  if (reduceMotion) {
    stopAnimation();
    return;
  }
}

