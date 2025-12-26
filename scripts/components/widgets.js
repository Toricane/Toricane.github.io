import { escapeHtml } from "../utils/data.js";

export function initWidgets() {
    const widgetRoot = document.getElementById("widgets");
    if (!widgetRoot) return;
    const newsletter = mkWidget("Latest Newsletter Update");
    widgetRoot.append(newsletter.el);
    fetchSubstack("https://prajwalprashanth.substack.com/feed", newsletter);
}

function mkWidget(title) {
    const el = document.createElement("article");
    el.className = "widget";
    el.innerHTML = `<h4>${title}</h4><p class="loading">Loading…</p>`;
    return {
        el,
        set(html) {
            const p = el.querySelector(".loading");
            if (p) p.outerHTML = html;
        },
    };
}

function fetchSubstack(feedUrl, widget) {
    try {
        const cached = JSON.parse(
            localStorage.getItem("newsletterCache") || "null"
        );
        if (cached && Date.now() - cached.time < 1000 * 60 * 60 * 6) {
            widget.set(cached.html);
            setTimeout(() => {
                const widgetEl = document.querySelector(
                    ".widget-link[data-url]"
                );
                if (widgetEl) setupWidgetInteraction(widgetEl);
            }, 10);
            return;
        }
    } catch (_) {}

    const proxy =
        "https://api.rss2json.com/v1/api.json?rss_url=" +
        encodeURIComponent(feedUrl);
    fetch(proxy)
        .then((r) => r.json())
        .then((j) => {
            const first = j.items && j.items[0];
            if (!first) throw 0;

            let imageHtml = "";
            let bodyText = "";

            if (first.content) {
                const imgMatch = first.content.match(
                    /<img[^>]+src="([^"]+)"[^>]*>/i
                );
                if (imgMatch && imgMatch[1]) {
                    imageHtml = `<div class="widget-image"><img src="${imgMatch[1]}" alt="Post image" loading="lazy"></div>`;
                }
                bodyText = first.content
                    .replace(/<img[^>]*>/gi, "")
                    .replace(/<[^>]+>/g, " ")
                    .replace(/\s+/g, " ")
                    .trim();
            }

            const sourceText =
                bodyText &&
                bodyText.length >
                    first.description.replace(/<[^>]+>/g, " ").trim().length
                    ? bodyText
                    : first.description.replace(/<[^>]+>/g, " ").trim();

            let fullContent = sourceText;
            if (sourceText.length > 250) {
                const afterMin = sourceText.slice(250, 400);
                const punctMatch = afterMin.match(/[.!?;:]/);
                if (punctMatch) {
                    const cutPoint = 250 + punctMatch.index + 1;
                    fullContent = sourceText.slice(0, cutPoint).trim();
                    if (sourceText.length > cutPoint) fullContent += " ...";
                } else {
                    fullContent = sourceText.slice(0, 400).trim();
                    if (sourceText.length > 400) fullContent += " ...";
                }
            }

            const feedDescription = first.description
                ? String(first.description)
                      .replace(/<[^>]+>/g, " ")
                      .trim()
                : "";
            const descriptionHtml = feedDescription
                ? `<p class="widget-description">${escapeHtml(
                      feedDescription
                  )}</p>`
                : "";

            const html = `
                <div class="widget-link" data-url="${first.link}">
                    <div class="widget-layout">
                        <div class="widget-content">
                            <h3 class="widget-title">${escapeHtml(
                                first.title
                            )}</h3>
                            ${descriptionHtml}
                            <div class="widget-excerpt-container">
                                <p class="widget-excerpt">${escapeHtml(
                                    fullContent
                                )}</p>
                            </div>
                        </div>
                        ${imageHtml}
                    </div>
                </div>`;
            widget.set(html);

            setTimeout(() => {
                const widgetEl = document.querySelector(
                    ".widget-link[data-url]"
                );
                if (widgetEl) setupWidgetInteraction(widgetEl);
            }, 10);

            try {
                localStorage.setItem(
                    "newsletterCache",
                    JSON.stringify({ time: Date.now(), html })
                );
            } catch (_) {}
        })
        .catch(() => widget.set("<p>Could not load newsletter.</p>"));
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
