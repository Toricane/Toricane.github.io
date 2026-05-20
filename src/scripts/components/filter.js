/**
 * Search, Dynamic Tag Cloud, and Significance Filtration Engine.
 * Provides instant filtering of projects, hackathons, and awards with
 * hardware-accelerated fluid float-in animations, dynamic scoped tag generation,
 * significance highlights selectors, and accordion auto-expanding logic.
 */

import { refreshLazyThumbs } from "./lazyThumbs.js";

// Global filter state
const state = {
  searchQuery: "",
  activeSignificance: new Set(),
  activeTags: new Set(),
};

/**
 * Escapes HTML characters for safety.
 */
function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Extract tag strings from card or timeline element.
 */
function extractTagsFromElement(el) {
  if (!el) return [];
  
  // If it's a project card
  if (el.classList.contains("card")) {
    return Array.from(el.querySelectorAll(".tags span")).map((s) =>
      s.textContent.trim()
    );
  }

  // If it's a timeline group element or item
  const tags = [];
  el.querySelectorAll(".tags span").forEach((span) => {
    const hasTagClass = Array.from(span.classList).some((cls) =>
      cls.startsWith("tag-")
    );
    // Plain spans inside tags or spans with tag-* class are tags
    if (hasTagClass || !span.className) {
      tags.push(span.textContent.trim());
    }
  });
  return tags;
}

/**
 * Checks if an element matches the active significance filter.
 */
function checkSignificance(el, activeSig) {
  if (!el) return false;
  if (activeSig.size === 0) return true;
  
  let matches = false;
  if (activeSig.has("impactful") && el.classList.contains("impactful-highlight")) {
    matches = true;
  }
  if (activeSig.has("notable") && el.classList.contains("notable-highlight")) {
    matches = true;
  }
  return matches;
}

/**
 * Update the visibility of the "More" expander button based on whether tag pills wrap.
 */
function updateTagsToggleVisibility() {
  const tagsCloud = document.getElementById("filter-tags-cloud");
  const toggleBtn = document.getElementById("tags-toggle-btn");
  if (!tagsCloud || !toggleBtn) return;

  const container = tagsCloud.closest(".tags-cloud-container") || tagsCloud.parentElement;

  const isExpanded = tagsCloud.classList.contains("expanded");
  if (isExpanded) {
    tagsCloud.classList.remove("expanded");
    if (container) container.classList.remove("expanded");
  }

  // ScrollHeight represents content height. If it exceeds 38px, it wraps onto multiple rows.
  // 38px is exactly the single row max-height boundary.
  const isScrollable = tagsCloud.scrollHeight > 38;

  if (isExpanded) {
    tagsCloud.classList.add("expanded");
    if (container) container.classList.add("expanded");
  }

  if (isScrollable) {
    toggleBtn.classList.remove("hidden");
  } else {
    toggleBtn.classList.add("hidden");
    tagsCloud.classList.remove("expanded");
    toggleBtn.classList.remove("expanded");
    if (container) container.classList.remove("expanded");
    const btnText = toggleBtn.querySelector(".btn-text");
    if (btnText) btnText.textContent = "More";
  }
}

/**
 * Generates the tag cloud based on the active tab's items.
 */
function generateTagCloud() {
  const activePanel = document.querySelector(".tab-panel.active");
  const tagsCloudContainer = document.getElementById("filter-tags-cloud");
  if (!activePanel || !tagsCloudContainer) return;

  // 1. Gather all tags from currently displayed elements in this tab
  const tagCounts = {};
  const items = activePanel.querySelectorAll(
    ".card, .timeline-item, ol.timeline > li:not(.timeline-group)"
  );
  
  items.forEach((item) => {
    const tags = extractTagsFromElement(item);
    tags.forEach((t) => {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    });
  });

  // 2. Sort tags by frequency desc, then alphabetically
  const sortedTags = Object.keys(tagCounts).sort((a, b) => {
    const countDiff = tagCounts[b] - tagCounts[a];
    if (countDiff !== 0) return countDiff;
    return a.localeCompare(b);
  });

  // 3. Clear container and render
  tagsCloudContainer.innerHTML = "";

  if (sortedTags.length === 0) {
    updateTagsToggleVisibility();
    return;
  }

  sortedTags.forEach((tag) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tag-pill";
    if (state.activeTags.has(tag)) {
      btn.classList.add("active");
    }
    btn.innerHTML = `${escapeHtml(tag)} <span class="tag-count">${tagCounts[tag]}</span>`;
    
    btn.addEventListener("click", () => {
      if (state.activeTags.has(tag)) {
        state.activeTags.delete(tag);
        btn.classList.remove("active");
      } else {
        state.activeTags.add(tag);
        btn.classList.add("active");
      }
      applyFilters();
    });
    
    tagsCloudContainer.appendChild(btn);
  });

  // Check if tags wrap onto multiple lines and toggle the visibility of the "More" button
  updateTagsToggleVisibility();
}

/**
 * Apply filters globally to the active tab's DOM structure.
 */
export function applyFilters() {
  const activePanel = document.querySelector(".tab-panel.active");
  if (!activePanel) return;

  const isTimeline = activePanel.id === "hackathons" || activePanel.id === "awards";
  const searchStr = state.searchQuery.toLowerCase().trim();
  const activeTags = state.activeTags;
  const activeSig = state.activeSignificance;

  if (!isTimeline) {
    // Projects Grid Filtration
    const cards = activePanel.querySelectorAll(".card");
    cards.forEach((card) => {
      const tags = extractTagsFromElement(card);
      const h3 = card.querySelector("h3")?.textContent || "";
      const p = card.querySelector("p")?.textContent || "";
      const textToMatch = [h3, p, tags.join(" ")].join(" ").toLowerCase();

      const matchesSearch = searchStr === "" || textToMatch.includes(searchStr);
      const matchesSignificance = checkSignificance(card, activeSig);
      const matchesTags = activeTags.size === 0 || tags.some((t) => activeTags.has(t));

      if (matchesSearch && matchesSignificance && matchesTags) {
        card.classList.remove("item-hidden");
      } else {
        card.classList.add("item-hidden");
      }
    });
  } else {
    // Timeline Filtration (Hackathons or Awards)
    // 1. Single timeline items (groups of size 1, represented as direct li children)
    const singleItems = activePanel.querySelectorAll(
      "ol.timeline > li:not(.timeline-group)"
    );
    
    singleItems.forEach((li) => {
      const entry = li.querySelector(".entry");
      const tags = extractTagsFromElement(li);
      const h3 = entry?.querySelector("h3")?.textContent || "";
      const p = entry?.querySelector("p")?.textContent || "";
      const fromLine = entry?.querySelector(".from-line")?.textContent || "";
      const textToMatch = [h3, p, fromLine, tags.join(" ")].join(" ").toLowerCase();

      const matchesSearch = searchStr === "" || textToMatch.includes(searchStr);
      const matchesSignificance = checkSignificance(entry, activeSig);
      const matchesTags = activeTags.size === 0 || tags.some((t) => activeTags.has(t));

      if (matchesSearch && matchesSignificance && matchesTags) {
        li.classList.remove("item-hidden");
      } else {
        li.classList.add("item-hidden");
      }
    });

    // 2. Multi-item timeline groups
    const groupItems = activePanel.querySelectorAll(
      "ol.timeline > li.timeline-group"
    );

    groupItems.forEach((groupLi) => {
      const innerItems = groupLi.querySelectorAll(".timeline-item");
      let visibleCount = 0;

      innerItems.forEach((item) => {
        const tags = extractTagsFromElement(item);
        const h3 = item.querySelector("h3")?.textContent || "";
        const p = item.querySelector("p")?.textContent || "";
        const fromLine = item.querySelector(".from-line")?.textContent || "";
        const textToMatch = [h3, p, fromLine, tags.join(" ")].join(" ").toLowerCase();

        const matchesSearch = searchStr === "" || textToMatch.includes(searchStr);
        const matchesSignificance = checkSignificance(item, activeSig);
        const matchesTags = activeTags.size === 0 || tags.some((t) => activeTags.has(t));

        if (matchesSearch && matchesSignificance && matchesTags) {
          item.classList.remove("item-hidden");
          visibleCount++;
        } else {
          item.classList.add("item-hidden");
        }
      });

      const timelineItemsContainer = groupLi.querySelector(".timeline-items");
      const toggleBtn = groupLi.querySelector(".timeline-toggle");

      if (visibleCount > 0) {
        groupLi.classList.remove("item-hidden");
        
        // Auto-expand group accordion if search / filters are active
        const isFilterActive = searchStr !== "" || activeTags.size > 0 || activeSig.size > 0;
        
        if (isFilterActive) {
          if (timelineItemsContainer) {
            timelineItemsContainer.style.display = "block";
            refreshLazyThumbs(timelineItemsContainer);
          }
          if (toggleBtn) {
            toggleBtn.setAttribute("aria-expanded", "true");
            const icon = toggleBtn.querySelector(".icon, svg");
            if (icon) icon.style.transform = "rotate(180deg)";
          }
        } else {
          // Collapse back to clean initial state if filters are cleared
          if (timelineItemsContainer) {
            timelineItemsContainer.style.display = "none";
          }
          if (toggleBtn) {
            toggleBtn.setAttribute("aria-expanded", "false");
            const icon = toggleBtn.querySelector(".icon, svg");
            if (icon) icon.style.transform = "rotate(0deg)";
          }
        }
      } else {
        // Hide the entire group if no inner item matches
        groupLi.classList.add("item-hidden");
      }
    });
  }
}

/**
 * Resets search query, significance button toggles, and selected tags.
 */
function resetAllFilters() {
  state.searchQuery = "";
  state.activeSignificance.clear();
  state.activeTags.clear();

  // Reset inputs
  const searchInput = document.getElementById("portfolio-search");
  if (searchInput) {
    searchInput.value = "";
    // Reset placeholder text dynamically based on the active tab
    const activePanel = document.querySelector(".tab-panel.active");
    if (activePanel) {
      searchInput.placeholder = `Search ${activePanel.id}...`;
    }
  }

  const clearBtn = document.getElementById("search-clear");
  if (clearBtn) clearBtn.style.display = "none";

  // Reset significance segmented buttons active class
  document.querySelectorAll(".sig-btn").forEach((btn) => {
    const isAll = btn.dataset.sig === "all";
    btn.classList.toggle("active", isAll);
    btn.setAttribute("aria-pressed", String(isAll));
  });

  generateTagCloud();
  applyFilters();
}

/**
 * Subscribes to tab switches Reactively via a MutationObserver on tab-panel.
 */
function initTabSwitchObserver() {
  const tabPanels = document.querySelectorAll(".tab-panel");
  if (!tabPanels.length) return;

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (
        mutation.type === "attributes" &&
        (mutation.attributeName === "class" || mutation.attributeName === "hidden")
      ) {
        const target = mutation.target;
        if (target.classList.contains("active") && !target.hasAttribute("hidden")) {
          // React to tab switch
          resetAllFilters();
        }
      }
    }
  });

  tabPanels.forEach((panel) => {
    observer.observe(panel, { attributes: true });
  });
}

/**
 * Initialize all interactive listeners for the search and filtration bar.
 */
export function initFilterBar() {
  const searchInput = document.getElementById("portfolio-search");
  const clearBtn = document.getElementById("search-clear");
  const sigButtons = document.querySelectorAll(".sig-btn");

  if (!searchInput) return;

  // Search keystroke listener
  searchInput.addEventListener("input", (e) => {
    state.searchQuery = e.target.value;
    if (clearBtn) {
      clearBtn.style.display = state.searchQuery ? "flex" : "none";
    }
    applyFilters();
  });

  // Clear search listener
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      searchInput.value = "";
      state.searchQuery = "";
      clearBtn.style.display = "none";
      searchInput.focus();
      applyFilters();
    });
  }

  // Significance button group listener
  sigButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const sig = btn.dataset.sig;
      if (sig === "all") {
        state.activeSignificance.clear();
      } else {
        if (state.activeSignificance.has(sig)) {
          state.activeSignificance.delete(sig);
        } else {
          state.activeSignificance.add(sig);
        }
      }

      // Update active states dynamically
      sigButtons.forEach((b) => {
        const bSig = b.dataset.sig;
        let isActive = false;
        if (bSig === "all") {
          isActive = state.activeSignificance.size === 0;
        } else {
          isActive = state.activeSignificance.has(bSig);
        }
        b.classList.toggle("active", isActive);
        b.setAttribute("aria-pressed", String(isActive));
      });

      applyFilters();
    });
  });

  // Tags Expand/Collapse Toggle Button Listener
  const tagsToggleBtn = document.getElementById("tags-toggle-btn");
  const tagsCloud = document.getElementById("filter-tags-cloud");
  if (tagsToggleBtn && tagsCloud) {
    tagsToggleBtn.addEventListener("click", () => {
      const isExpanded = tagsCloud.classList.contains("expanded");
      const container = tagsCloud.closest(".tags-cloud-container") || tagsCloud.parentElement;

      if (isExpanded) {
        tagsCloud.classList.remove("expanded");
        tagsToggleBtn.classList.remove("expanded");
        if (container) container.classList.remove("expanded");
        const btnText = tagsToggleBtn.querySelector(".btn-text");
        if (btnText) btnText.textContent = "More";
      } else {
        tagsCloud.classList.add("expanded");
        tagsToggleBtn.classList.add("expanded");
        if (container) container.classList.add("expanded");
        const btnText = tagsToggleBtn.querySelector(".btn-text");
        if (btnText) btnText.textContent = "Less";
      }
    });

    // Recalculate wrapping on window resize
    let resizeTimeout;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(updateTagsToggleVisibility, 80);
    }, { passive: true });
  }

  // Initialize MutationObserver to react to tab changes
  initTabSwitchObserver();

  // Run initial tag cloud and filter pass
  resetAllFilters();
}
