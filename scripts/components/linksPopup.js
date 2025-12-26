import { formatLinkDate } from "../utils/data.js";
import { openExternalOrInternal } from "./navigation.js";

export function openLinksPopup(event, links, title) {
    const existing = document.querySelector(".links-popup");
    if (existing) existing.remove();

    const popup = document.createElement("div");
    popup.className = "links-popup";
    popup.setAttribute("role", "menu");
    popup.setAttribute("aria-label", title || "Open link");

    const list = document.createElement("ul");
    list.className = "links-popup-list";

    links.forEach((l) => {
        const href = typeof l === "string" ? l : l.url;
        const label =
            typeof l === "string"
                ? l.replace(/^https?:\/\//, "")
                : l.label || l.url.replace(/^https?:\/\//, "");
        const dateVal = typeof l === "object" && l.date ? l.date : null;
        const li = document.createElement("li");
        li.className = "links-popup-item";
        const a = document.createElement("a");
        a.href = href;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.setAttribute("role", "menuitem");
        a.addEventListener("click", (ev) => {
            ev.preventDefault();
            try {
                openExternalOrInternal(href, ev);
            } finally {
                popup.remove();
            }
        });

        const labelSpan = document.createElement("span");
        labelSpan.className = "link-label";
        labelSpan.textContent = label;

        const urlSpan = document.createElement("small");
        urlSpan.className = "link-url";
        try {
            const u = new URL(href);
            urlSpan.textContent =
                u.hostname +
                (u.pathname && u.pathname !== "/" ? u.pathname : "");
        } catch (_) {
            urlSpan.textContent = href.replace(/^https?:\/\//, "");
        }

        a.appendChild(labelSpan);
        if (dateVal) {
            const dateSpan = document.createElement("div");
            dateSpan.className = "link-date";
            dateSpan.textContent = formatLinkDate(dateVal);
            a.appendChild(dateSpan);
        }
        a.appendChild(urlSpan);

        li.appendChild(a);
        list.appendChild(li);
    });

    popup.appendChild(list);
    document.body.appendChild(popup);

    const rect = (event.target &&
        event.target.getBoundingClientRect &&
        event.target.getBoundingClientRect()) || {
        left: event.clientX,
        top: event.clientY,
        width: 0,
        height: 0,
    };
    const left = rect.left + rect.width / 2;
    const top = rect.top + rect.height + 8;

    const popupRect = popup.getBoundingClientRect();
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    const x = clamp(
        left - popupRect.width / 2,
        8,
        window.innerWidth - popupRect.width - 8
    );
    const y = clamp(top, 8, window.innerHeight - popupRect.height - 8);

    popup.style.left = x + "px";
    popup.style.top = y + "px";

    const firstLink = popup.querySelector("a");
    if (firstLink) firstLink.focus();

    const close = () => popup.remove();
    setTimeout(() => {
        document.addEventListener("click", function onDocClick(e) {
            if (!popup.contains(e.target)) {
                document.removeEventListener("click", onDocClick);
                close();
            }
        });
    }, 0);

    const onKey = (e) => {
        if (e.key === "Escape") {
            close();
            document.removeEventListener("keydown", onKey);
        }
    };
    document.addEventListener("keydown", onKey);
}
