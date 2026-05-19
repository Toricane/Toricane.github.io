import { formatLinkDate } from "../utils/data.js";
import { openExternalOrInternal } from "./navigation.js";

export function openLinksPopup(event, links, title) {
    const existing = document.querySelector(".links-popup");
    const existingBackdrop = document.querySelector(".popup-backdrop");
    if (existing) existing.remove();
    if (existingBackdrop) existingBackdrop.remove();

    const isMobile = window.innerWidth <= 768;

    const popup = document.createElement("div");
    popup.className = isMobile ? "links-popup mobile-drawer" : "links-popup";
    popup.setAttribute("role", "menu");
    popup.setAttribute("aria-label", title || "Open link");

    const list = document.createElement("ul");
    list.className = "links-popup-list";

    // Setup close transition handler
    let backdrop = null;
    if (isMobile) {
        backdrop = document.createElement("div");
        backdrop.className = "popup-backdrop";
        document.body.appendChild(backdrop);

        const handle = document.createElement("div");
        handle.className = "links-popup-handle";
        popup.appendChild(handle);
        popup.insertBefore(handle, popup.firstChild);
    }

    const closePopup = () => {
        document.removeEventListener("keydown", onKey);
        if (isMobile) {
            popup.classList.remove("active");
            if (backdrop) backdrop.classList.remove("active");
            setTimeout(() => {
                popup.remove();
                if (backdrop) backdrop.remove();
            }, 350);
        } else {
            popup.remove();
        }
    };

    const getBadgeInfo = (url) => {
        if (url.startsWith("#")) {
            let sectionLabel = "✦ Section";
            if (url.includes("project")) sectionLabel = "✦ Project";
            else if (url.includes("award")) sectionLabel = "✦ Award";
            else if (url.includes("hackathon")) sectionLabel = "✦ Hackathon";
            return { text: sectionLabel, className: "badge-section" };
        }
        const lowerUrl = url.toLowerCase();
        if (lowerUrl.includes("linkedin.com")) {
            return { text: "LinkedIn ↗", className: "badge-linkedin" };
        }
        if (lowerUrl.includes("github.com")) {
            return { text: "GitHub ↗", className: "badge-github" };
        }
        if (lowerUrl.includes("devpost.com")) {
            return { text: "Devpost ↗", className: "badge-devpost" };
        }
        if (lowerUrl.includes("youtube.com") || lowerUrl.includes("youtu.be")) {
            return { text: "YouTube ↗", className: "badge-youtube" };
        }
        return { text: "Website ↗", className: "badge-website" };
    };

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
                closePopup();
            }
        });

        const labelSpan = document.createElement("span");
        labelSpan.className = "link-label";
        labelSpan.textContent = label;

        const badgeInfo = getBadgeInfo(href);
        const badgeSpan = document.createElement("span");
        badgeSpan.className = `link-badge ${badgeInfo.className}`;
        badgeSpan.textContent = badgeInfo.text;

        a.appendChild(labelSpan);
        if (dateVal) {
            const dateSpan = document.createElement("div");
            dateSpan.className = "link-date";
            dateSpan.textContent = formatLinkDate(dateVal);
            a.appendChild(dateSpan);
        }
        a.appendChild(badgeSpan);

        li.appendChild(a);
        list.appendChild(li);
    });

    popup.appendChild(list);
    document.body.appendChild(popup);

    if (isMobile) {
        // Trigger browser reflow to enable animation
        popup.offsetHeight;
        requestAnimationFrame(() => {
            popup.classList.add("active");
            if (backdrop) backdrop.classList.add("active");
        });

        // Event listeners to close
        backdrop.addEventListener("click", closePopup);
        const handleEl = popup.querySelector(".links-popup-handle");
        if (handleEl) handleEl.addEventListener("click", closePopup);
    } else {
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

        // Click outside listener for desktop
        setTimeout(() => {
            document.addEventListener("click", function onDocClick(e) {
                if (!popup.contains(e.target)) {
                    document.removeEventListener("click", onDocClick);
                    closePopup();
                }
            });
        }, 0);
    }

    const firstLink = popup.querySelector("a");
    if (firstLink) firstLink.focus();

    const onKey = (e) => {
        if (e.key === "Escape") {
            closePopup();
        }
    };
    document.addEventListener("keydown", onKey);
}
