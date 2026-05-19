import { escapeHtml } from "../utils/data.js";

const CACHE_TTL_MS = 1000 * 60 * 60 * 6;
const RSS2JSON = "https://api.rss2json.com/v1/api.json?rss_url=";

export function initWidgets() {
    const newsletterRoot = document.getElementById("widgets-newsletter");
    if (!newsletterRoot || newsletterRoot.dataset.initialized === "1") return;
    newsletterRoot.dataset.initialized = "1";
    newsletterRoot.replaceChildren();

    const feeds = window.__SITE_RUNTIME__?.feeds;
    const substackUrl = feeds?.substack || "";

    const newsletter = mkWidget("Latest Newsletter Update");
    newsletterRoot.append(newsletter.el);

    const loadNewsletter = () => {
        if (substackUrl) {
            fetchFeed(substackUrl, newsletter, "newsletterCache", {
                error: "Could not load newsletter.",
            });
        } else {
            newsletter.set("<p>Could not load newsletter.</p>");
        }
    };

    const hero = document.getElementById("hero");
    if ("IntersectionObserver" in window && hero) {
        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (!entry || !entry.isIntersecting) return;
                observer.disconnect();
                loadNewsletter();
            },
            { root: null, rootMargin: "180px 0px" }
        );
        observer.observe(hero);
        return;
    }

    loadNewsletter();
}

function mkWidget(title) {
    const el = document.createElement("article");
    el.className = "widget";
    el.innerHTML = `<h2>${title}</h2><p class="loading">Loading…</p>`;
    return {
        el,
        set(html) {
            const p = el.querySelector(".loading");
            if (p) p.outerHTML = html;
        },
    };
}

function pickImageUrl(item) {
    if (item.thumbnail) return item.thumbnail;
    if (item.enclosure?.link) return item.enclosure.link;

    if (item.content) {
        const imgMatch = item.content.match(/<img[^>]+src="([^"]+)"[^>]*>/i);
        if (imgMatch?.[1]) return imgMatch[1];
    }

    return "";
}

function stripHtml(text) {
    return String(text || "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function truncateExcerpt(sourceText) {
    if (sourceText.length <= 250) return sourceText;

    const afterMin = sourceText.slice(250, 400);
    const punctMatch = afterMin.match(/[.!?;:]/);
    if (punctMatch) {
        const cutPoint = 250 + punctMatch.index + 1;
        const trimmed = sourceText.slice(0, cutPoint).trim();
        return sourceText.length > cutPoint ? `${trimmed} ...` : trimmed;
    }

    const trimmed = sourceText.slice(0, 400).trim();
    return sourceText.length > 400 ? `${trimmed} ...` : trimmed;
}

function renderFeedItem(item) {
    const imageUrl = pickImageUrl(item);
    const imageHtml = imageUrl
        ? `<div class="widget-image"><img src="${escapeHtml(imageUrl)}" alt="Post image" loading="lazy"></div>`
        : "";

    let bodyText = "";
    if (item.content) {
        bodyText = stripHtml(
            String(item.content).replace(/<img[^>]*>/gi, "")
        );
    }

    const descriptionText = stripHtml(item.description);
    const sourceText =
        bodyText && bodyText.length > descriptionText.length
            ? bodyText
            : descriptionText;
    const fullContent = truncateExcerpt(sourceText);

    const descriptionHtml = descriptionText
        ? `<p class="widget-description">${escapeHtml(descriptionText)}</p>`
        : "";

    return `
        <div class="widget-link" data-url="${escapeHtml(item.link)}">
            <div class="widget-layout">
                <div class="widget-content">
                    <h3 class="widget-title">${escapeHtml(item.title)}</h3>
                    ${descriptionHtml}
                    <div class="widget-excerpt-container">
                        <p class="widget-excerpt">${escapeHtml(fullContent)}</p>
                    </div>
                </div>
                ${imageHtml}
            </div>
        </div>`;
}

function wireWidgetInteraction(widget) {
    const widgetEl = widget.el.querySelector(".widget-link[data-url]");
    if (widgetEl) setupWidgetInteraction(widgetEl);
}

function fetchFeed(feedUrl, widget, cacheKey, { error }) {
    try {
        const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
        if (cached && Date.now() - cached.time < CACHE_TTL_MS) {
            widget.set(cached.html);
            setTimeout(() => wireWidgetInteraction(widget), 10);
            return;
        }
    } catch (_) {}

    fetch(RSS2JSON + encodeURIComponent(feedUrl))
        .then((r) => r.json())
        .then((j) => {
            const first = j.items && j.items[0];
            if (!first?.link) throw new Error("no items");

            const html = renderFeedItem(first);
            widget.set(html);
            setTimeout(() => wireWidgetInteraction(widget), 10);

            try {
                localStorage.setItem(
                    cacheKey,
                    JSON.stringify({ time: Date.now(), html })
                );
            } catch (_) {}
        })
        .catch(() => widget.set(`<p>${error}</p>`));
}

function setupWidgetInteraction(widgetEl) {
    const url = widgetEl.getAttribute("data-url");
    const widget = widgetEl.closest(".widget");
    let hasRingActive = false;
    const isMobile =
        window.matchMedia("(max-width: 768px)").matches ||
        "ontouchstart" in window;

    const showBlueRing = () => {
        if (hasRingActive) return;
        hasRingActive = true;
        widget.classList.add("widget-ring-active");
    };

    const hideBlueRing = () => {
        if (!hasRingActive) return;
        hasRingActive = false;
        widget.classList.remove("widget-ring-active");
    };

    const openLink = () => window.open(url, "_blank", "noopener");

    if (isMobile) {
        widgetEl.addEventListener("click", (e) => {
            e.preventDefault();
            openLink();
        });
    } else {
        widgetEl.addEventListener("mouseenter", showBlueRing);
        widgetEl.addEventListener("mouseleave", hideBlueRing);
        widgetEl.addEventListener("click", (e) => {
            e.preventDefault();
            openLink();
        });
    }
}
