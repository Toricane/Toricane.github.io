import {
    escapeHtml,
    formatProjectDate,
    getPreviewPath,
    normalizeImages,
    normalizeLinks,
    projectEndTimestamp,
    slugify,
} from "../utils/data.js";
import { openLinksPopup } from "./linksPopup.js";
import { openExternalOrInternal } from "./navigation.js";

export function renderProjects(list) {
    const root = document.getElementById("projects");
    if (!root) return;
    if (!list.length) {
        root.innerHTML = "<p>No projects yet.</p>";
        return;
    }

    const sorted = [...list].sort((a, b) => {
        const ta = projectEndTimestamp(a);
        const tb = projectEndTimestamp(b);
        if (ta === tb) return 0;
        if (ta === Infinity) return -1;
        if (tb === Infinity) return 1;
        return tb - ta;
    });

    const ul = document.createElement("ul");
    ul.className = "cards";

    sorted.forEach((p) => {
        const li = document.createElement("li");
        let cardClass = "card";
        if (p.gold) cardClass += " gold-highlight";
        else if (p.silver) cardClass += " silver-highlight";
        li.className = cardClass;

        const projSlug = slugify(p.title || "");
        if (projSlug) li.setAttribute("data-slug", projSlug);

        const links = normalizeLinks(p.link);
        if (links.length) {
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
                if (links.length === 1) {
                    openExternalOrInternal(links[0].url, e);
                } else {
                    openLinksPopup(e, links, p.title || "");
                }
            });
            li.addEventListener("keydown", (ev) => {
                if (ev.key === "Enter" || ev.key === " ") {
                    ev.preventDefault();
                    li.click();
                }
            });
        }

        const fromLine = p.from ? `<p class="from-line">${p.from}</p>` : "";
        const dateLine = (() => {
            const s = p["start-date"] || p["start_date"] || p.startDate || null;
            const e = p["end-date"] || p["end_date"] || p.endDate || null;
            if (s || e) {
                return `<p class="from-line project-date">${formatProjectDate(
                    s,
                    e
                )}</p>`;
            }
            return p.date
                ? `<p class="from-line project-date">${p.date}</p>`
                : "";
        })();

        const images = normalizeImages(p.images, p.title);
        const thumbHtml = images.length
            ? `<div class="card-images">${images
                  .map(
                      (img, i) =>
                          `<button class="card-thumb" data-src="${escapeHtml(
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

        li.innerHTML = `<h3>${p.title}${
            p.live ? ' <span class="dot live"></span>' : ""
        }</h3>${fromLine}${dateLine}<p>${
            p.description
        }</p>${thumbHtml}<div class="tags">${(p.tags || [])
            .map((t) => `<span>${t}</span>`)
            .join("")}</div>`;
        ul.appendChild(li);
    });

    root.innerHTML = "";
    root.appendChild(ul);
}
