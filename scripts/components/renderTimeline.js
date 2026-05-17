import { iconHtml } from "../icons.js";
import {
    escapeHtml,
    getPreviewPath,
    normalizeImages,
    normalizeLinks,
    slugify,
} from "../utils/data.js";
import { refreshLazyThumbs } from "./lazyThumbs.js";
import { openLinksPopup } from "./linksPopup.js";
import { openExternalOrInternal } from "./navigation.js";

function attachTimelineClickable(el, links, title) {
    if (!links.length) return;
    el.style.cursor = "pointer";
    el.tabIndex = 0;
    el.addEventListener("click", (e) => {
        if (
            e.target?.closest?.(
                "button.card-thumb, button.timeline-thumb"
            )
        )
            return;
        e.stopPropagation();
        if (links.length === 1) {
            openExternalOrInternal(links[0].url, e);
        } else {
            openLinksPopup(e, links, title);
        }
    });
    el.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            el.click();
        }
    });
}

function attachTimelineSummary(summaryEl) {
    const expandId = summaryEl.getAttribute("data-target");
    if (!expandId) return;
    summaryEl.addEventListener("click", (e) => {
        e.stopPropagation();
        const target = document.getElementById(expandId);
        if (!target) return;
        const toggleBtn = summaryEl.querySelector(".timeline-toggle");
        const isExpanded = target.style.display !== "none";
        target.style.display = isExpanded ? "none" : "block";
        if (toggleBtn) {
            toggleBtn.setAttribute("aria-expanded", String(!isExpanded));
            const icon = toggleBtn.querySelector(".icon, svg");
            if (icon) {
                icon.style.transform = isExpanded
                    ? "rotate(0deg)"
                    : "rotate(180deg)";
            }
        }
        if (!isExpanded) {
            refreshLazyThumbs(target);
        }
    });
}

function wireTimelineDataLinkItems(root) {
    root.querySelectorAll(".timeline-item[data-links]").forEach((el) => {
        try {
            const links = JSON.parse(el.getAttribute("data-links"));
            if (!Array.isArray(links) || !links.length) return;
            if (el.dataset.wired === "1") return;
            el.dataset.wired = "1";
            attachTimelineClickable(
                el,
                links,
                el.querySelector(".timeline-item-title")?.textContent || ""
            );
        } catch (_) {
            /* ignore malformed data */
        }
    });
}

function wireTimelineSummary(summaryEl) {
    if (summaryEl.dataset.wired === "1") return;
    summaryEl.dataset.wired = "1";
    attachTimelineSummary(summaryEl);
}

function sortTimelineGroups(items) {
    return [...items].sort((a, b) => {
        const [yearA, monthA] = a.when.split("/").map(Number);
        const [yearB, monthB] = b.when.split("/").map(Number);
        if (yearA !== yearB) return yearB - yearA;
        return monthB - monthA;
    });
}

function itemsForTimelineGroup(id, group) {
    return id === "awards" && Array.isArray(group.items)
        ? [...group.items].sort((a, b) => {
              const rank = (it) => (it?.gold ? 0 : it?.silver ? 1 : 2);
              const ra = rank(a);
              const rb = rank(b);
              if (ra !== rb) return ra - rb;
              const na = (a?.name || "").toLowerCase();
              const nb = (b?.name || "").toLowerCase();
              return na.localeCompare(nb);
          })
        : group.items || [];
}

/** Attach click/expand handlers to build-time prerendered timeline markup. */
export function wireTimeline(id, items, showBadges) {
    const root = document.getElementById(id);
    if (!root || !items.length) return;

    root.querySelectorAll(".timeline-summary").forEach(wireTimelineSummary);
    wireTimelineDataLinkItems(root);

    sortTimelineGroups(items).forEach((group) => {
        const groupItems = itemsForTimelineGroup(id, group);
        if (groupItems.length !== 1) return;
        const item = groupItems[0];
        const singleSlug = slugify(item.name || "");
        if (!singleSlug) return;
        const li = root.querySelector(
            `li[data-slug="${CSS.escape(singleSlug)}"]`
        );
        if (!li || li.dataset.wired === "1") return;
        li.dataset.wired = "1";
        attachTimelineClickable(li, normalizeLinks(item.link), item.name || "");
    });
}

export function renderTimeline(id, items, showBadges) {
    const root = document.getElementById(id);
    if (!root) return;
    if (!items.length) {
        root.innerHTML = "<p>—</p>";
        return;
    }

    const sortedItems = sortTimelineGroups(items);

    const ol = document.createElement("ol");
    ol.className = "timeline";

    sortedItems.forEach((group) => {
        const [year, month] = group.when.split("/");
        const itemsForGroup = itemsForTimelineGroup(id, group);

        const monthNames = {
            "01": "Jan",
            "02": "Feb",
            "03": "Mar",
            "04": "Apr",
            "05": "May",
            "06": "Jun",
            "07": "Jul",
            "08": "Aug",
            "09": "Sep",
            10: "Oct",
            11: "Nov",
            12: "Dec",
        };
        const timeDisplay = `${monthNames[month]} ${year}`;

        if (itemsForGroup.length === 1) {
            const item = itemsForGroup[0];
            const li = document.createElement("li");
            const singleSlug = slugify(item.name || "");
            if (singleSlug) li.setAttribute("data-slug", singleSlug);

            attachTimelineClickable(
                li,
                normalizeLinks(item.link),
                item.name || ""
            );

            const badgeItems = (
                showBadges && item.badges ? item.badges : []
            ).map(
                (b) =>
                    `<span class="badge ${b
                        .toLowerCase()
                        .replace(/[^a-z]/g, "")}">${b}</span>`
            );
            const fromLine = item.from
                ? `<div class="from-line">${item.from}</div>`
                : "";
            const images = normalizeImages(item.images, item.name);
            const imagesBlock = images.length
                ? `<div class="timeline-images">${images
                      .map(
                          (img, i) =>
                              `<button class="timeline-thumb thumb-pending" data-src="${escapeHtml(
                                  img.path
                              )}" data-preview="${escapeHtml(
                                  getPreviewPath(img.path)
                              )}" data-label="${escapeHtml(
                                  img.label || `Image ${i + 1}`
                              )}" aria-label="Open image ${escapeHtml(
                                  img.label || `Image ${i + 1}`
                              )}"></button>`
                      )
                      .join("")}</div>`
                : "";
            const tagItems = (item.tags || []).map(
                (t) =>
                    `<span class="badge tag-${t
                        .toLowerCase()
                        .replace(/[^a-z0-9]/g, "")}">${t}</span>`
            );
            const allBadges = [...badgeItems, ...tagItems];
            const badgesBlock = allBadges.length
                ? `<div class="tags award-tags">${allBadges.join("")}</div>`
                : "";
            const highlightClass = item.gold
                ? " gold-highlight"
                : item.silver
                ? " silver-highlight"
                : "";
            li.innerHTML = `<div class="time">${timeDisplay}</div><div class="entry${highlightClass}"><h3>${item.name}</h3>${fromLine}<p>${item.description}</p>${imagesBlock}${badgesBlock}</div>`;
            ol.appendChild(li);
        } else {
            const li = document.createElement("li");
            li.className = "timeline-group";

            const summaryText = group.summary || `${group.items.length} items`;
            const expandId = `expand-${id}-${group.when.replace("/", "-")}`;
            const itemCount = itemsForGroup.length;

            let countText;
            if (id === "awards") {
                countText = itemCount === 1 ? "1 award" : `${itemCount} awards`;
            } else if (id === "hackathons") {
                countText =
                    itemCount === 1 ? "1 hackathon" : `${itemCount} hackathons`;
            } else {
                countText = itemCount === 1 ? "1 item" : `${itemCount} items`;
            }

            const hasGold = itemsForGroup.some((item) => item && item.gold);
            const hasSilver = itemsForGroup.some((item) => item && item.silver);
            const categoryClass = hasGold
                ? " category-gold"
                : hasSilver
                ? " category-silver"
                : "";
            li.className = `timeline-group${categoryClass}`;

            li.innerHTML = `
                    <div class="time">${timeDisplay}</div>
                    <div class="entry">
                        <div class="timeline-summary" data-target="${expandId}">
                            <button type="button" class="timeline-toggle" aria-expanded="false" aria-controls="${expandId}" aria-label="Expand ${escapeHtml(summaryText)}">
                                <span class="svg-icon">${iconHtml("chevronDown")}</span>
                            </button>
                            <h3 class="timeline-summary-title">${summaryText}</h3>
                        </div>
                        <div class="from-line">${countText}</div>
                        <div class="timeline-items" id="${expandId}" style="display: none;">
                            ${itemsForGroup
                                .map((item) => {
                                    const badgeItems = (
                                        showBadges && item.badges
                                            ? item.badges
                                            : []
                                    ).map(
                                        (b) =>
                                            `<span class="badge ${b
                                                .toLowerCase()
                                                .replace(
                                                    /[^a-z]/g,
                                                    ""
                                                )}">${b}</span>`
                                    );
                                    const fromLine = item.from
                                        ? `<div class="from-line">${item.from}</div>`
                                        : "";
                                    const tagItems = (item.tags || []).map(
                                        (t) =>
                                            `<span class="badge tag-${t
                                                .toLowerCase()
                                                .replace(
                                                    /[^a-z0-9]/g,
                                                    ""
                                                )}">${t}</span>`
                                    );
                                    const allBadges = [
                                        ...badgeItems,
                                        ...tagItems,
                                    ];
                                    const badgesBlock = allBadges.length
                                        ? `<div class="tags award-tags">${allBadges.join(
                                              ""
                                          )}</div>`
                                        : "";

                                    const images = normalizeImages(
                                        item.images,
                                        item.name
                                    );
                                    const imagesBlock = images.length
                                        ? `<div class="timeline-images">${images
                                              .map(
                                                  (img, i) =>
                                                      `<button class="timeline-thumb thumb-pending" data-src="${escapeHtml(
                                                          img.path
                                                      )}" data-preview="${escapeHtml(
                                                          getPreviewPath(
                                                              img.path
                                                          )
                                                      )}" data-label="${escapeHtml(
                                                          img.label ||
                                                              `Image ${i + 1}`
                                                      )}" aria-label="Open image ${escapeHtml(
                                                          img.label ||
                                                              `Image ${i + 1}`
                                                      )}"></button>`
                                              )
                                              .join("")}</div>`
                                        : "";

                                    const itemHighlight = item.gold
                                        ? " gold-highlight"
                                        : item.silver
                                        ? " silver-highlight"
                                        : "";
                                    const itemLinks = normalizeLinks(item.link);
                                    const dataAttr = itemLinks.length
                                        ? ` data-links='${JSON.stringify(
                                              itemLinks
                                          ).replace(/'/g, "&#39;")}'`
                                        : "";
                                    const itemSlug = slugify(item.name || "");
                                    const slugAttr = itemSlug
                                        ? ` data-slug="${itemSlug}"`
                                        : "";
                                    return `
                                    <div class="timeline-item${itemHighlight}" ${dataAttr}${slugAttr}>
                                        <h3 class="timeline-item-title">${item.name}</h3>
                                        ${fromLine}
                                        <p>${item.description}</p>
                                        ${imagesBlock}
                                        ${badgesBlock}
                                    </div>
                                `;
                                })
                                .join("")}
                        </div>
                    </div>
                `;

            const summaryEl = li.querySelector(".timeline-summary");
            attachTimelineSummary(summaryEl);
            const container = li.querySelector("#" + expandId);
            if (container) {
                wireTimelineDataLinkItems(container);
            }

            ol.appendChild(li);
        }
    });

    root.innerHTML = "";
    root.appendChild(ol);
}
