import {
    escapeHtml,
    getPreviewPath,
    normalizeImages,
    normalizeLinks,
    slugify,
} from "../utils/data.js";
import { openLinksPopup } from "./linksPopup.js";
import { openExternalOrInternal } from "./navigation.js";

export function renderTimeline(id, items, showBadges) {
    const root = document.getElementById(id);
    if (!root) return;
    if (!items.length) {
        root.innerHTML = "<p>—</p>";
        return;
    }

    const sortedItems = [...items].sort((a, b) => {
        const [yearA, monthA] = a.when.split("/").map(Number);
        const [yearB, monthB] = b.when.split("/").map(Number);
        if (yearA !== yearB) return yearB - yearA;
        return monthB - monthA;
    });

    const ol = document.createElement("ol");
    ol.className = "timeline";

    sortedItems.forEach((group) => {
        const [year, month] = group.when.split("/");
        const itemsForGroup =
            id === "awards" && Array.isArray(group.items)
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

            const itemLinks = normalizeLinks(item.link);
            if (itemLinks.length) {
                li.style.cursor = "pointer";
                li.tabIndex = 0;
                li.addEventListener("click", (e) => {
                    if (
                        e.target?.closest?.(
                            "button.card-thumb, button.timeline-thumb"
                        )
                    )
                        return;
                    e.stopPropagation();
                    if (itemLinks.length === 1) {
                        openExternalOrInternal(itemLinks[0].url, e);
                    } else {
                        openLinksPopup(e, itemLinks, item.name || "");
                    }
                });
                li.addEventListener("keydown", (ev) => {
                    if (ev.key === "Enter" || ev.key === " ") {
                        ev.preventDefault();
                        li.click();
                    }
                });
            }

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
                              `<button class="timeline-thumb" data-src="${escapeHtml(
                                  img.path
                              )}" data-label="${escapeHtml(
                                  img.label || `Image ${i + 1}`
                              )}" aria-label="Open image ${escapeHtml(
                                  img.label || `Image ${i + 1}`
                              )}" style="background-image:url('${escapeHtml(
                                  getPreviewPath(img.path)
                              )}')"></button>`
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
            li.innerHTML = `<div class="time">${timeDisplay}</div><div class="entry${highlightClass}"><h4>${item.name}</h4>${fromLine}<p>${item.description}</p>${imagesBlock}${badgesBlock}</div>`;
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
                        <h4 class="timeline-summary" data-target="${expandId}" aria-expanded="false">
                            <button class="timeline-toggle">
                                <i class="fas fa-chevron-down"></i>
                            </button>
                            <span>${summaryText}</span>
                        </h4>
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
                                                      `<button class="timeline-thumb" data-src="${escapeHtml(
                                                          img.path
                                                      )}" data-label="${escapeHtml(
                                                          img.label ||
                                                              `Image ${i + 1}`
                                                      )}" aria-label="Open image ${escapeHtml(
                                                          img.label ||
                                                              `Image ${i + 1}`
                                                      )}" style="background-image:url('${escapeHtml(
                                                          getPreviewPath(
                                                              img.path
                                                          )
                                                      )}')"></button>`
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
                                        <h5>${item.name}</h5>
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

            setTimeout(() => {
                const container = li.querySelector("#" + expandId);
                if (container) {
                    const itemsEls = container.querySelectorAll(
                        ".timeline-item[data-links]"
                    );
                    itemsEls.forEach((el) => {
                        try {
                            const links = JSON.parse(
                                el.getAttribute("data-links")
                            );
                            if (!Array.isArray(links) || !links.length) return;
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
                                    openLinksPopup(
                                        e,
                                        links,
                                        el.querySelector("h5")?.textContent ||
                                            ""
                                    );
                                }
                            });
                            el.addEventListener("keydown", (ev) => {
                                if (ev.key === "Enter" || ev.key === " ") {
                                    ev.preventDefault();
                                    el.click();
                                }
                            });
                        } catch (e) {
                            /* ignore malformed data */
                        }
                    });
                }
            }, 0);

            const summaryEl = li.querySelector(".timeline-summary");
            summaryEl.addEventListener("click", (e) => {
                e.stopPropagation();
                const target = document.getElementById(expandId);
                const toggleBtn = summaryEl.querySelector(".timeline-toggle i");
                const isExpanded = target.style.display !== "none";
                target.style.display = isExpanded ? "none" : "block";
                summaryEl.setAttribute("aria-expanded", !isExpanded);
                toggleBtn.style.transform = isExpanded
                    ? "rotate(0deg)"
                    : "rotate(180deg)";
            });

            ol.appendChild(li);
        }
    });

    root.innerHTML = "";
    root.appendChild(ol);
}
