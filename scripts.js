// New portfolio script
document.addEventListener("DOMContentLoaded", () => {
    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // Scroll button
    const scrollBtn = document.getElementById("scrollMore");
    if (scrollBtn) {
        scrollBtn.addEventListener("click", () => {
            const content = document.getElementById("content");
            if (content) content.scrollIntoView({ behavior: "smooth" });
        });

        // Hide scroll button when user starts scrolling
        let scrollTimeout;
        const hideScrollButton = () => {
            scrollBtn.classList.add("hidden");
        };

        const handleScroll = () => {
            if (window.scrollY > 50) {
                // Hide after scrolling 50px
                hideScrollButton();
                // Remove event listener after hiding to improve performance
                window.removeEventListener("scroll", handleScroll);
            }
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
    }

    // Tabs logic
    const tabs = Array.from(document.querySelectorAll(".tab"));
    const panels = Array.from(document.querySelectorAll(".tab-panel"));
    const highlightImg = document.getElementById("tabHighlightImage");
    const highlightMap = {
        projects: "assets/projects_highlight.jpg",
        hackathons: "assets/hackathons_highlight.jpg",
        awards: "assets/awards_highlight.jpg",
    };
    // Preload images (they can 404 silently if not yet added – user can supply assets later)
    Object.values(highlightMap).forEach((src) => {
        const img = new Image();
        img.src = src;
    });
    function activate(id) {
        tabs.forEach((t) => {
            const active = t.dataset.tab === id;
            t.classList.toggle("active", active);
            t.setAttribute("aria-selected", active);
        });
        panels.forEach((p) => p.classList.toggle("active", p.id === id));
        // Update highlight image
        if (highlightImg && highlightMap[id]) {
            const newSrc = highlightMap[id];
            if (highlightImg.getAttribute("src") !== newSrc) {
                highlightImg.classList.remove("ready");
                // Set alt from button data attr
                const btn = tabs.find((t) => t.dataset.tab === id);
                if (btn) {
                    const alt = btn.getAttribute("data-image-alt") || "";
                    highlightImg.setAttribute("alt", alt);
                }
                // Swap after ensuring load
                const temp = new Image();
                temp.onload = () => {
                    highlightImg.src = newSrc;
                    requestAnimationFrame(() => {
                        highlightImg.classList.add("ready");
                    });
                };
                temp.onerror = () => {
                    // Fallback: hide image container if missing
                    highlightImg.removeAttribute("src");
                };
                temp.src = newSrc;
            }
        }
    }
    tabs.forEach((t) =>
        t.addEventListener("click", () => activate(t.dataset.tab))
    );
    // Initialize default highlight
    activate("projects");

    // Widgets (newsletter only) under connections
    const widgetRoot = document.getElementById("widgets");
    if (widgetRoot) {
        const newsletter = mkWidget("Latest Newsletter Update");
        widgetRoot.append(newsletter.el);
        fetchSubstack("https://prajwalprashanth.substack.com/feed", newsletter);
    }

    // Tap mode: ?tap=true triggers connection pill animation for 30 seconds
    const params = new URLSearchParams(location.search);
    if (params.get("tap") === "true") {
        const conn = document.getElementById("connections");
        if (conn) {
            conn.classList.add("glow");

            // Find LinkedIn button specifically
            const linkedinLink = conn.querySelector('a[href*="linkedin.com"]');

            // Subtle sequential icon pop
            const links = conn.querySelectorAll("a");
            links.forEach((a, i) => {
                a.style.opacity = 0;
                a.style.transform = "translateY(4px) scale(.95)";
            });

            const doAnime = () => {
                if (!window.anime) {
                    return setTimeout(doAnime, 60);
                } // wait for library

                // Initial entrance animation
                window.anime
                    .timeline({ easing: "easeOutQuad" })
                    .add({
                        targets: links,
                        opacity: [0, 1],
                        translateY: [4, 0],
                        scale: [0.95, 1],
                        delay: window.anime.stagger(70),
                    })
                    .add(
                        {
                            targets: conn,
                            boxShadow: [
                                "0 0 0 0 rgba(77,181,255,.4)",
                                "0 0 0 18px rgba(77,181,255,0)",
                            ],
                            duration: 1400,
                        },
                        150
                    );

                // Continuous sparkle loop for all links
                const sparkleInterval = setInterval(() => {
                    window.anime({
                        targets:
                            links[Math.floor(Math.random() * links.length)],
                        translateY: [0, -2, 0],
                        duration: 600,
                    });
                }, 1800);

                // Continuous pill glow pulse animation
                const pillGlowInterval = setInterval(() => {
                    window.anime({
                        targets: conn,
                        boxShadow: [
                            "0 0 0 1px #2b4b5f, 0 0 0 3px #2b4b5f55, 0 0 24px -4px #4db5ff44",
                            "0 0 0 1px #4db5ff, 0 0 0 6px #4db5ff33, 0 0 32px -2px #4db5ff66",
                            "0 0 0 1px #2b4b5f, 0 0 0 3px #2b4b5f55, 0 0 24px -4px #4db5ff44",
                        ],
                        duration: 2000,
                        easing: "easeInOutQuad",
                    });
                }, 3000);

                // Special LinkedIn button animation every 1.5 seconds
                const linkedinInterval = setInterval(() => {
                    if (linkedinLink) {
                        linkedinLink.classList.add("linkedin-highlight");
                        window.anime({
                            targets: linkedinLink,
                            scale: [1, 1.05, 1],
                            boxShadow: [
                                "0 0 0 0 rgba(77,181,255,.6)",
                                "0 0 0 8px rgba(77,181,255,0)",
                            ],
                            duration: 1000,
                            easing: "easeOutQuad",
                            complete: () => {
                                linkedinLink.classList.remove(
                                    "linkedin-highlight"
                                );
                            },
                        });
                    }
                }, 1500);

                // Stop all animations after 15 seconds
                setTimeout(() => {
                    clearInterval(sparkleInterval);
                    clearInterval(pillGlowInterval);
                    clearInterval(linkedinInterval);
                    conn.classList.remove("glow");
                    if (linkedinLink) {
                        linkedinLink.classList.remove("linkedin-highlight");
                    }
                }, 15000);
            };
            doAnime();
        }
    }

    // Load structured data for tabs (static JSON keeps HTML lean)
    fetch("data.json", { cache: "no-store" })
        .then((r) => r.json())
        .then((data) => {
            renderProjects(data.projects || []);
            renderTimeline("hackathons", data.hackathons || [], true);
            renderTimeline("awards", data.awards || [], false);
        })
        .catch(() => {
            const fail = (msg) =>
                `<p style="font-size:.8rem;color:#aa6464">${msg}</p>`;
            document.getElementById("projects").innerHTML = fail(
                "Failed to load projects."
            );
        });

    function renderProjects(list) {
        const root = document.getElementById("projects");
        if (!root) return;
        if (!list.length) {
            root.innerHTML = "<p>No projects yet.</p>";
            return;
        }
        const ul = document.createElement("ul");
        ul.className = "cards";
        list.forEach((p) => {
            const li = document.createElement("li");
            li.className = "card";
            if (p.link) {
                li.style.cursor = "pointer";
                li.addEventListener("click", () => {
                    window.open(p.link, "_blank", "noopener");
                });
            }
            const fromLine = p.from ? `<p class="from-line">${p.from}</p>` : "";
            const dateLine = p.date
                ? `<p class="from-line project-date">${p.date}</p>`
                : "";
            li.innerHTML = `<h3>${p.title}${
                p.live ? ' <span class="dot live"></span>' : ""
            }</h3>${fromLine}${dateLine}<p>${
                p.description
            }</p><div class="tags">${(p.tags || [])
                .map((t) => `<span>${t}</span>`)
                .join("")}</div>`;
            ul.appendChild(li);
        });
        root.innerHTML = "";
        root.appendChild(ul);
    }
    function renderTimeline(id, items, showBadges) {
        const root = document.getElementById(id);
        if (!root) return;
        if (!items.length) {
            root.innerHTML = "<p>—</p>";
            return;
        }
        const ol = document.createElement("ol");
        ol.className = "timeline";
        items.forEach((i) => {
            const li = document.createElement("li");
            if (i.link) {
                li.style.cursor = "pointer";
                li.addEventListener("click", () => {
                    window.open(i.link, "_blank", "noopener");
                });
            }
            const badgeItems = (showBadges && i.badges ? i.badges : []).map(
                (b) =>
                    `<span class="badge ${b
                        .toLowerCase()
                        .replace(/[^a-z]/g, "")}">${b}</span>`
            );
            const fromLine = i.from
                ? `<div class="from-line">${i.from}</div>`
                : "";
            const tagItems = (i.tags || []).map(
                (t) =>
                    `<span class="badge tag-${t
                        .toLowerCase()
                        .replace(/[^a-z0-9]/g, "")}">${t}</span>`
            );
            const timeDisplay = i.month ? `${i.month} ${i.year}` : i.year;
            const allBadges = [...badgeItems, ...tagItems];
            const badgesBlock = allBadges.length
                ? `<div class="tags award-tags">${allBadges.join("")}</div>`
                : "";
            li.innerHTML = `<div class="time">${timeDisplay}</div><div class="entry"><h4>${i.name}</h4>${fromLine}<p>${i.description}</p>${badgesBlock}</div>`;
            ol.appendChild(li);
        });
        root.innerHTML = "";
        root.appendChild(ol);
    }

    // 3D tilt microanimations for large imagery (portrait + highlight)
    const portrait = document.querySelector(".portrait");
    const highlightFigure = document.querySelector(".tab-highlight-figure");

    function setupTilt(target, opts = {}) {
        if (!target) return;
        const cfg = Object.assign(
            { max: 14, glare: false, scale: 1.015 },
            opts
        );
        // Wrap target so we can apply perspective without impacting layout
        if (!target.parentElement.classList.contains("tilt-origin")) {
            const wrapper = document.createElement("div");
            wrapper.className = "tilt-origin";
            target.parentElement.insertBefore(wrapper, target);
            wrapper.appendChild(target);
            target.classList.add("tilt-inner");
        }
        const wrapperEl = target.parentElement;
        let hovering = false;
        let rafId = null;
        const state = { rx: 0, ry: 0, tz: 0, scale: 1 };
        const targetState = { rx: 0, ry: 0, tz: 0, scale: 1 };
        const lerp = (a, b, t) => a + (b - a) * t;
        const apply = () => {
            const { rx, ry, tz, scale } = state;
            target.style.transform = `translateZ(${tz}px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${scale})`;
        };
        function loop() {
            // Smooth towards target
            state.rx = lerp(state.rx, targetState.rx, 0.16);
            state.ry = lerp(state.ry, targetState.ry, 0.16);
            state.tz = lerp(state.tz, targetState.tz, 0.18);
            state.scale = lerp(state.scale, targetState.scale, 0.18);
            apply();
            // Continue while moving or not at rest
            if (
                hovering ||
                Math.abs(state.rx) > 0.05 ||
                Math.abs(state.ry) > 0.05 ||
                Math.abs(state.tz) > 0.2 ||
                Math.abs(state.scale - 1) > 0.001
            ) {
                rafId = requestAnimationFrame(loop);
            } else {
                rafId = null;
            }
        }
        function ensureLoop() {
            if (rafId == null) rafId = requestAnimationFrame(loop);
        }
        function handleMove(e) {
            if (!hovering) return;
            const rect = wrapperEl.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width; // 0..1
            const y = (e.clientY - rect.top) / rect.height; // 0..1
            targetState.ry = lerp(-cfg.max, cfg.max, x);
            targetState.rx = lerp(cfg.max, -cfg.max, y);
            targetState.tz = 18;
            targetState.scale = cfg.scale;
            ensureLoop();
        }
        function enter() {
            hovering = true;
            targetState.scale = cfg.scale;
            targetState.tz = 12;
            ensureLoop();
        }
        function leave() {
            hovering = false;
            targetState.rx = 0;
            targetState.ry = 0;
            targetState.tz = 0;
            targetState.scale = 1;
            ensureLoop();
        }
        wrapperEl.addEventListener("pointerenter", enter);
        wrapperEl.addEventListener("pointermove", handleMove);
        wrapperEl.addEventListener("pointerleave", leave);
        // Touch: gentle press effect
        wrapperEl.addEventListener("touchstart", (e) => {
            enter(e);
        });
        wrapperEl.addEventListener("touchend", leave);
    }

    // Respect reduced motion preferences
    const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;
    if (!reduceMotion) {
        setupTilt(portrait, { max: 16, scale: 1.03 });
        // Use the inner IMG inside highlight figure
        const highlightImgEl = document.getElementById("tabHighlightImage");
        setupTilt(highlightImgEl, { max: 12, scale: 1.02 });
    }
});

// Helper functions hoisted outside to ensure availability
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
    // Use localStorage cache to avoid frequent proxy calls (6h TTL)
    try {
        const cached = JSON.parse(
            localStorage.getItem("newsletterCache") || "null"
        );
        if (cached && Date.now() - cached.time < 1000 * 60 * 60 * 6) {
            widget.set(cached.html);
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

            // Extract image from content if available
            let imageHtml = "";
            let bodyText = "";

            if (first.content) {
                const imgMatch = first.content.match(
                    /<img[^>]+src="([^"]+)"[^>]*>/i
                );
                if (imgMatch && imgMatch[1]) {
                    imageHtml = `<div class="widget-image"><img src="${imgMatch[1]}" alt="Post image" loading="lazy"></div>`;
                }

                // Extract text content for a longer excerpt
                bodyText = first.content
                    .replace(/<img[^>]*>/gi, "") // Remove images
                    .replace(/<[^>]+>/g, " ") // Remove HTML tags
                    .replace(/\s+/g, " ") // Normalize whitespace
                    .trim();
            }

            // Use content if available and longer, otherwise use description
            const sourceText =
                bodyText &&
                bodyText.length >
                    first.description.replace(/<[^>]+>/g, " ").trim().length
                    ? bodyText
                    : first.description.replace(/<[^>]+>/g, " ").trim();

            // Show content up to first punctuation after 250 chars, max 400 chars
            let fullContent = sourceText;
            if (sourceText.length > 250) {
                // Find first punctuation mark after 250 characters
                const afterMin = sourceText.slice(250, 400);
                const punctMatch = afterMin.match(/[.!?;:]/);

                if (punctMatch) {
                    // Cut at first punctuation + 1 character after 250
                    const cutPoint = 250 + punctMatch.index + 1;
                    fullContent = sourceText.slice(0, cutPoint).trim();
                    // Add ellipsis if there's more content after the cut
                    if (sourceText.length > cutPoint) {
                        fullContent += " ...";
                    }
                } else {
                    // No punctuation found, cut at 400 chars max
                    fullContent = sourceText.slice(0, 400).trim();
                    if (sourceText.length > 400) {
                        fullContent += " ...";
                    }
                }
            }
            const html = `
                <div class="widget-link" data-url="${first.link}">
                    <div class="widget-layout">
                        <div class="widget-content">
                            <h3 class="widget-title">${escapeHtml(
                                first.title
                            )}</h3>
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

            // Add interactive behavior after widget is rendered
            setTimeout(() => {
                const widgetEl = document.querySelector(
                    ".widget-link[data-url]"
                );
                if (widgetEl) {
                    setupWidgetInteraction(widgetEl);
                }
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
function escapeHtml(s) {
    return s.replace(
        /[&<>"']/g,
        (c) =>
            ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
            }[c])
    );
}

function setupWidgetInteraction(widgetEl) {
    const url = widgetEl.getAttribute("data-url");
    const widget = widgetEl.closest(".widget");

    let hasRingActive = false;
    let tapTimeout = null;

    // Check if device is mobile
    const isMobile =
        window.matchMedia("(max-width: 768px)").matches ||
        "ontouchstart" in window;

    function showBlueRing() {
        if (hasRingActive) return;
        hasRingActive = true;
        widget.classList.add("widget-ring-active");
    }

    function hideBlueRing() {
        if (!hasRingActive) return;
        hasRingActive = false;
        widget.classList.remove("widget-ring-active");
    }

    function openLink() {
        window.open(url, "_blank", "noopener");
    }

    if (isMobile) {
        // Mobile behavior: tap opens link directly
        widgetEl.addEventListener("click", (e) => {
            e.preventDefault();
            openLink();
        });
    } else {
        // Desktop behavior: hover shows ring, click opens link
        widgetEl.addEventListener("mouseenter", () => {
            showBlueRing();
        });

        widgetEl.addEventListener("mouseleave", () => {
            hideBlueRing();
        });

        widgetEl.addEventListener("click", (e) => {
            e.preventDefault();
            openLink();
        });
    }
}
