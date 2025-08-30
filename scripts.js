// New portfolio script
document.addEventListener("DOMContentLoaded", () => {
    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // Theme toggle
    const themeToggle = document.getElementById("theme-toggle");
    const themeIcon = themeToggle?.querySelector("i");

    // Get saved theme or default to dark
    const savedTheme = localStorage.getItem("theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);

    // Update icon based on current theme
    function updateThemeIcon(theme) {
        if (themeIcon) {
            themeIcon.className =
                theme === "light" ? "fas fa-sun" : "fas fa-moon";
        }
    }
    updateThemeIcon(savedTheme);

    // Toggle theme
    if (themeToggle) {
        themeToggle.addEventListener("click", () => {
            const currentTheme =
                document.documentElement.getAttribute("data-theme") || "dark";
            const newTheme = currentTheme === "dark" ? "light" : "dark";

            document.documentElement.setAttribute("data-theme", newTheme);
            localStorage.setItem("theme", newTheme);
            updateThemeIcon(newTheme);
        });
    }

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
        projects: "assets/projects_highlight.webp",
        hackathons: "assets/hackathons_highlight.webp",
        awards: "assets/awards_highlight.webp",
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

                // Reduce animation frequency for mobile performance
                const isMobile = window.innerWidth <= 768;
                const sparkleDelay = isMobile ? 3000 : 1800;
                const pillGlowDelay = isMobile ? 5000 : 3000;
                const linkedinDelay = isMobile ? 3000 : 1500;

                // Use requestIdleCallback for better performance if available
                const scheduleAnimation = (callback) => {
                    if (window.requestIdleCallback) {
                        requestIdleCallback(callback);
                    } else {
                        setTimeout(callback, 16);
                    }
                };

                // Reduced frequency sparkle loop for all links
                const sparkleInterval = setInterval(() => {
                    scheduleAnimation(() => {
                        if (document.visibilityState === "visible") {
                            window.anime({
                                targets:
                                    links[
                                        Math.floor(Math.random() * links.length)
                                    ],
                                translateY: [0, -2, 0],
                                duration: 600,
                            });
                        }
                    });
                }, sparkleDelay);

                // Reduced frequency pill glow pulse animation
                const pillGlowInterval = setInterval(() => {
                    scheduleAnimation(() => {
                        if (document.visibilityState === "visible") {
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
                        }
                    });
                }, pillGlowDelay);

                // Special LinkedIn button animation with reduced frequency
                const linkedinInterval = setInterval(() => {
                    scheduleAnimation(() => {
                        if (
                            linkedinLink &&
                            document.visibilityState === "visible"
                        ) {
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
                    });
                }, linkedinDelay);

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
        // Sort projects by end-date (newest first). Support "end-date" in several formats and "Present"/ongoing.
        const sorted = [...list].sort((a, b) => {
            const ta = projectEndTimestamp(a);
            const tb = projectEndTimestamp(b);
            // Put ongoing (Infinity) first
            if (ta === tb) return 0;
            if (ta === Infinity) return -1;
            if (tb === Infinity) return 1;
            return tb - ta;
        });

        const ul = document.createElement("ul");
        ul.className = "cards";
        sorted.forEach((p) => {
            const li = document.createElement("li");
            // Allow project-level gold/silver highlighting like awards/hackathons
            let cardClass = "card";
            if (p.gold) cardClass += " gold-highlight";
            else if (p.silver) cardClass += " silver-highlight";
            li.className = cardClass;
            // Add a stable slug so internal links can target this project
            const projSlug = slugify(p.title || "");
            if (projSlug) li.setAttribute("data-slug", projSlug);
            // Normalize links: allow p.link to be a string, object, or an array; produce {label,url}
            const links = normalizeLinks(p.link);

            if (links.length) {
                li.style.cursor = "pointer";
                // Click opens single link directly, or shows chooser for multiple
                // If the click originated from an image thumbnail, ignore here so
                // the image viewer can handle it instead of opening the links popup.
                li.addEventListener("click", (e) => {
                    // If a thumbnail button was the origin, do nothing here
                    if (
                        e.target &&
                        e.target.closest &&
                        e.target.closest(
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
                li.tabIndex = 0;
                li.addEventListener("keydown", (ev) => {
                    if (ev.key === "Enter" || ev.key === " ") {
                        ev.preventDefault();
                        li.click();
                    }
                });
            }
            const fromLine = p.from ? `<p class="from-line">${p.from}</p>` : "";
            const dateLine = (function () {
                // Prefer start-date / end-date if available
                const s =
                    p["start-date"] || p["start_date"] || p.startDate || null;
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
            // Render image thumbnails if provided (array of {label,path} or strings)
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
    function renderTimeline(id, items, showBadges) {
        const root = document.getElementById(id);
        if (!root) return;
        if (!items.length) {
            root.innerHTML = "<p>—</p>";
            return;
        }

        // Sort items by date (newest first)
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
            // For awards, order items by gold -> silver -> none, then alphabetically by name
            const items =
                id === "awards" && Array.isArray(group.items)
                    ? [...group.items].sort((a, b) => {
                          const rank = (it) =>
                              it && it.gold ? 0 : it && it.silver ? 1 : 2;
                          const ra = rank(a);
                          const rb = rank(b);
                          if (ra !== rb) return ra - rb;
                          const na = (a && a.name ? a.name : "").toLowerCase();
                          const nb = (b && b.name ? b.name : "").toLowerCase();
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

            if (items.length === 1) {
                // Single item - render directly (use sorted items for awards)
                const item = items[0];
                const li = document.createElement("li");
                // add data-slug for internal linking
                const singleSlug = slugify(item.name || "");
                if (singleSlug) li.setAttribute("data-slug", singleSlug);
                // Support item.link as string or array
                const itemLinks = normalizeLinks(item.link);
                if (itemLinks.length) {
                    li.style.cursor = "pointer";
                    li.addEventListener("click", (e) => {
                        // Ignore clicks originating from image thumbnails so the
                        // image viewer can handle them instead of opening the links popup.
                        if (
                            e.target &&
                            e.target.closest &&
                            e.target.closest(
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
                    li.tabIndex = 0;
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
                // Render images for this timeline item (show small thumbnails)
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
                // Multiple items - render with toggle
                const li = document.createElement("li");
                li.className = "timeline-group";

                const summaryText =
                    group.summary || `${group.items.length} items`;
                const expandId = `expand-${id}-${group.when.replace("/", "-")}`;
                const itemCount = items.length;

                // Use appropriate terminology based on the section
                let countText;
                if (id === "awards") {
                    countText =
                        itemCount === 1 ? "1 award" : `${itemCount} awards`;
                } else if (id === "hackathons") {
                    countText =
                        itemCount === 1
                            ? "1 hackathon"
                            : `${itemCount} hackathons`;
                } else {
                    countText =
                        itemCount === 1 ? "1 item" : `${itemCount} items`;
                }

                // Determine category-level highlighting based on highest award type
                const hasGold = items.some((item) => item && item.gold);
                const hasSilver = items.some((item) => item && item.silver);
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
                            ${items
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

                                    // Inline images for collapsed timeline items
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
                                    // Store links as data attribute (stringified) for safe attachment
                                    const itemLinks = normalizeLinks(item.link);
                                    const dataAttr = itemLinks.length
                                        ? ` data-links='${JSON.stringify(
                                              itemLinks
                                          ).replace(/'/g, "&#39;")}'`
                                        : "";
                                    // add data-slug for internal linking
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

                // After building innerHTML, attach click handlers for any timeline-item that has data-links
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
                                if (!Array.isArray(links) || !links.length)
                                    return;
                                el.style.cursor = "pointer";
                                el.tabIndex = 0;
                                el.addEventListener("click", (e) => {
                                    // If click came from a thumbnail button, let the
                                    // image viewer handle it instead of opening links.
                                    if (
                                        e.target &&
                                        e.target.closest &&
                                        e.target.closest(
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
                                            el.querySelector("h5")
                                                ?.textContent || ""
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
                                // ignore malformed data
                            }
                        });
                    }
                }, 0);

                // Add toggle functionality to the summary (entire h4)
                const summaryEl = li.querySelector(".timeline-summary");
                summaryEl.addEventListener("click", (e) => {
                    e.stopPropagation();
                    const target = document.getElementById(expandId);
                    const toggleBtn =
                        summaryEl.querySelector(".timeline-toggle i");
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

    // 3D tilt microanimations for highlight images
    const highlightFigure = document.querySelector(".tab-highlight-figure");

    function setupTilt(target, opts = {}) {
        if (!target) return;

        // Disable tilt on mobile for better performance
        const isMobile = window.innerWidth <= 768 || "ontouchstart" in window;
        if (isMobile) return;

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

        // Throttle the animation loop for better performance
        let lastFrameTime = 0;
        const targetFPS = 30; // Lower FPS for better mobile performance
        const frameInterval = 1000 / targetFPS;

        function loop(currentTime) {
            if (currentTime - lastFrameTime >= frameInterval) {
                // Smooth towards target
                state.rx = lerp(state.rx, targetState.rx, 0.16);
                state.ry = lerp(state.ry, targetState.ry, 0.16);
                state.tz = lerp(state.tz, targetState.tz, 0.18);
                state.scale = lerp(state.scale, targetState.scale, 0.18);
                apply();
                lastFrameTime = currentTime;
            }

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

        // Throttle mouse move events for better performance
        let lastMoveTime = 0;
        const moveThrottle = 16; // ~60fps

        function handleMove(e) {
            const currentTime = Date.now();
            if (currentTime - lastMoveTime < moveThrottle) return;
            lastMoveTime = currentTime;

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

    // Setup Cover Flow interaction - Infinite carousel version
    function setupCoverFlow() {
        const coverflowContainer = document.querySelector(".coverflow-cards");
        const coverflowWrapper = document.querySelector(".coverflow-container");
        const coverflowGroups = document.querySelectorAll(".coverflow-group");
        if (!coverflowContainer || !coverflowWrapper || !coverflowGroups.length)
            return;

        // Add click/tap handler to pause/resume animation
        let isPaused = false;

        const toggleAnimation = () => {
            isPaused = !isPaused;
            const playState = isPaused ? "paused" : "running";
            coverflowGroups.forEach((group) => {
                group.style.animationPlayState = playState;
            });
        };

        // Click on container to toggle animation
        coverflowWrapper.addEventListener("click", (e) => {
            // Only toggle if clicking on the container itself, not on cards
            if (
                e.target === coverflowWrapper ||
                e.target === coverflowContainer ||
                e.target.classList.contains("coverflow-group")
            ) {
                toggleAnimation();
            }
        });

        // Individual card interactions
        const cards = coverflowContainer.querySelectorAll(".coverflow-card");

        cards.forEach((card) => {
            // Touch devices: tap to pause/resume
            card.addEventListener(
                "touchstart",
                (e) => {
                    e.preventDefault();
                    toggleAnimation();
                },
                { passive: false }
            );

            // Keyboard accessibility
            card.setAttribute("tabindex", "0");
            card.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleAnimation();
                }
            });
        });

        // Make container focusable for keyboard navigation
        coverflowContainer.setAttribute("tabindex", "0");
        coverflowContainer.setAttribute("role", "region");
        coverflowContainer.setAttribute("aria-label", "Image carousel");

        // Global keyboard controls
        coverflowContainer.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                // Resume animation on escape
                isPaused = false;
                coverflowGroups.forEach((group) => {
                    group.style.animationPlayState = "running";
                });
            }
        });
    } // Respect reduced motion preferences
    const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    if (!reduceMotion) {
        // Setup 3D tilt for the highlight area. Prefer the figure wrapper (more stable),
        // fall back to the image if needed.
        const highlightFigureEl = document.querySelector(
            ".tab-highlight-figure"
        );
        const highlightImgEl = document.getElementById("tabHighlightImage");
        const tiltTarget = highlightFigureEl || highlightImgEl;
        setupTilt(tiltTarget, { max: 12, scale: 1.02 });
    }

    // Initialize Cover Flow functionality
    setupCoverFlow();

    // Setup footnotes
    setupFootnotes();

    // Image viewer: delegate thumbnail clicks to open a basic fullscreen viewer
    // Viewer state
    let _viewerList = [];
    let _viewerIndex = 0;
    let _viewerKeyHandler = null;

    function openImageViewer(list, startIndex = 0) {
        // list: array of {path,label}
        if (!list || !list.length) return;
        _viewerList = list;
        _viewerIndex = Math.max(0, Math.min(startIndex || 0, list.length - 1));

        // Reuse existing viewer if present
        let viewer = document.getElementById("_img_viewer");
        if (!viewer) {
            viewer = document.createElement("div");
            viewer.id = "_img_viewer";
            viewer.className = "_img_viewer";
            viewer.innerHTML = `
                <button class="viewer-nav viewer-prev" aria-label="Previous image">‹</button>
                <div class="viewer-inner">
                    <div class="viewer-media">
                        <div class="viewer-spinner" aria-hidden="true"></div>
                        <img id="_img_viewer_img" src="" alt="" />
                    </div>
                    <div id="_img_viewer_caption" class="viewer-caption"></div>
                    <div id="_img_viewer_pos" class="viewer-pos" aria-hidden="true"></div>
                </div>
                <button class="viewer-nav viewer-next" aria-label="Next image">›</button>
            `;
            document.body.appendChild(viewer);

            // Close when clicking outside the inner area
            viewer.addEventListener("click", (e) => {
                if (e.target === viewer) closeViewer();
            });

            // Prev/Next buttons
            viewer
                .querySelector(".viewer-prev")
                .addEventListener("click", (e) => {
                    e.stopPropagation();
                    showImageAt(_viewerIndex - 1);
                });
            viewer
                .querySelector(".viewer-next")
                .addEventListener("click", (e) => {
                    e.stopPropagation();
                    showImageAt(_viewerIndex + 1);
                });

            // Touch / pointer swipe support
            let pointerDown = false;
            let startX = 0;
            let startY = 0;
            let moved = false;
            const swipeThreshold = 40; // px

            const onPointerDown = (ev) => {
                // Only handle touch or pen to avoid interfering with mouse drag
                if (
                    ev.pointerType &&
                    ev.pointerType !== "touch" &&
                    ev.pointerType !== "pen"
                )
                    return;
                pointerDown = true;
                startX = ev.clientX;
                startY = ev.clientY;
                moved = false;
                // capture to receive move/up
                ev.target.setPointerCapture &&
                    ev.target.setPointerCapture(ev.pointerId);
            };
            const onPointerMove = (ev) => {
                if (!pointerDown) return;
                const dx = ev.clientX - startX;
                const dy = ev.clientY - startY;
                if (Math.abs(dx) > 6) moved = true;
            };
            const onPointerUp = (ev) => {
                if (!pointerDown) return;
                pointerDown = false;
                const dx = ev.clientX - startX;
                const dy = ev.clientY - startY;
                // horizontal swipe
                if (
                    Math.abs(dx) > Math.abs(dy) &&
                    Math.abs(dx) > swipeThreshold
                ) {
                    if (dx < 0) showImageAt(_viewerIndex + 1);
                    else showImageAt(_viewerIndex - 1);
                }
            };

            viewer.addEventListener("pointerdown", onPointerDown);
            viewer.addEventListener("pointermove", onPointerMove);
            viewer.addEventListener("pointerup", onPointerUp);
            viewer.addEventListener("pointercancel", onPointerUp);
        }

        // show initial
        showImageAt(_viewerIndex);

        // keyboard handler
        if (!_viewerKeyHandler) {
            _viewerKeyHandler = (e) => {
                if (!document.getElementById("_img_viewer")) return;
                if (e.key === "Escape") closeViewer();
                if (e.key === "ArrowLeft") showImageAt(_viewerIndex - 1);
                if (e.key === "ArrowRight") showImageAt(_viewerIndex + 1);
            };
            document.addEventListener("keydown", _viewerKeyHandler);
        }
    }

    function closeViewer() {
        const viewer = document.getElementById("_img_viewer");
        if (viewer) viewer.remove();
        _viewerList = [];
        _viewerIndex = 0;
        if (_viewerKeyHandler) {
            document.removeEventListener("keydown", _viewerKeyHandler);
            _viewerKeyHandler = null;
        }
    }

    function showImageAt(idx) {
        if (!_viewerList || !_viewerList.length) return;
        // wrap-around
        if (idx < 0) idx = _viewerList.length - 1;
        if (idx >= _viewerList.length) idx = 0;
        _viewerIndex = idx;
        const imgObj = _viewerList[_viewerIndex];
        const imgEl = document.getElementById("_img_viewer_img");
        const cap = document.getElementById("_img_viewer_caption");
        const pos = document.getElementById("_img_viewer_pos");
        const spinner = document.querySelector(".viewer-spinner");

        // Update position indicator
        if (pos)
            pos.textContent = `${_viewerIndex + 1} / ${_viewerList.length}`;

        if (imgEl) {
            // show spinner
            spinner && (spinner.style.display = "block");
            imgEl.style.opacity = 0;
            // Preload image then swap when loaded to avoid flicker
            const temp = new Image();
            temp.onload = () => {
                imgEl.src = imgObj.path;
                imgEl.alt = imgObj.label || "";
                // fade in
                requestAnimationFrame(() => {
                    imgEl.style.transition = "opacity .22s ease";
                    imgEl.style.opacity = 1;
                    spinner && (spinner.style.display = "none");
                });
            };
            temp.onerror = () => {
                // hide spinner on error
                spinner && (spinner.style.display = "none");
                imgEl.style.opacity = 1;
            };
            temp.src = imgObj.path;

            // Preload neighbors (next and previous)
            const prevIdx =
                (_viewerIndex - 1 + _viewerList.length) % _viewerList.length;
            const nextIdx = (_viewerIndex + 1) % _viewerList.length;
            [prevIdx, nextIdx].forEach((i) => {
                const n = new Image();
                n.src = _viewerList[i].path;
            });
        }
        if (cap) cap.textContent = imgObj.label || "";
    }

    // Normalize images input: accept array of strings or objects {label,path}
    function normalizeImages(field, fallbackLabel) {
        if (!field) return [];
        const toObj = (x, i) => {
            if (!x) return null;
            if (typeof x === "string") {
                return {
                    label: `${fallbackLabel || ""} ${i + 1}`.trim(),
                    path: x,
                };
            }
            if (typeof x === "object") {
                const path = x.path || x.src || x.url || x.href || null;
                const label =
                    x.label || x.name || x.caption || fallbackLabel || "";
                if (!path) return null;
                return { label: label, path: path };
            }
            return null;
        };
        if (Array.isArray(field)) return field.map(toObj).filter(Boolean);
        const single = toObj(field, 0);
        return single ? [single] : [];
    }

    // Delegate clicks for thumbnails (now with label support)
    document.body.addEventListener("click", (e) => {
        const btn =
            e.target.closest &&
            e.target.closest("button.card-thumb, button.timeline-thumb");
        if (!btn) return;

        // Collect sibling thumbnails within the same gallery (card-images or timeline-images)
        const gallery = btn.closest(".card-images, .timeline-images");
        let list = [];
        let startIndex = 0;
        if (gallery) {
            const thumbs = Array.from(
                gallery.querySelectorAll(
                    "button.card-thumb, button.timeline-thumb"
                )
            );
            list = thumbs
                .map((t) => ({
                    path: t.getAttribute("data-src"),
                    label: t.getAttribute("data-label") || "",
                }))
                .filter((x) => x.path);
            startIndex = thumbs.indexOf(btn);
            if (startIndex < 0) startIndex = 0;
        } else {
            // Single button without gallery: open only that image
            list = [
                {
                    path: btn.getAttribute("data-src"),
                    label: btn.getAttribute("data-label") || "",
                },
            ];
            startIndex = 0;
        }

        if (list.length) openImageViewer(list, startIndex);
    });

    // Pause intensive operations when page is not visible (mobile performance)
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
            // Pause any running animations when page is hidden
            document.querySelectorAll("*").forEach((el) => {
                if (el.style.animationPlayState !== "paused") {
                    el.style.animationPlayState = "paused";
                }
            });
        } else {
            // Resume animations when page becomes visible
            document.querySelectorAll("*").forEach((el) => {
                if (el.style.animationPlayState === "paused") {
                    el.style.animationPlayState = "running";
                }
            });
        }
    });

    // Initialize horizontal scroll controls for tab bar (Option A)
    function initScrollableTabs() {
        const wrap = document.querySelector(".tab-scroll-wrap");
        if (!wrap) return;
        const bar = wrap.querySelector(".tab-bar");
        if (!bar) return;

        // Compute overflow and toggle classes on the wrapper so CSS fades can appear
        function updateButtons() {
            const canScrollLeft = bar.scrollLeft > 2;
            const canScrollRight =
                bar.scrollWidth - bar.clientWidth - bar.scrollLeft > 2;
            wrap.classList.toggle("can-scroll-left", canScrollLeft);
            wrap.classList.toggle("can-scroll-right", canScrollRight);
        }

        // Show/hide fades when user scrolls the bar
        bar.addEventListener(
            "scroll",
            () => {
                if (window.requestAnimationFrame) {
                    window.requestAnimationFrame(updateButtons);
                } else {
                    setTimeout(updateButtons, 50);
                }
            },
            { passive: true }
        );

        // Pointer drag to scroll for desktop
        let isDown = false;
        let startX = 0;
        let scrollLeftStart = 0;
        let hasMoved = false;
        const dragThreshold = 6; // px before we treat movement as a drag

        bar.addEventListener("pointerdown", (e) => {
            // If the pointerdown started on a tab button, don't start a drag so
            // the button's click handler can run. This preserves tab switching.
            if (e.target && e.target.closest && e.target.closest(".tab"))
                return;

            isDown = true;
            bar.setPointerCapture && bar.setPointerCapture(e.pointerId);
            startX = e.clientX;
            scrollLeftStart = bar.scrollLeft;
            bar.classList.add("dragging");
        });
        bar.addEventListener("pointermove", (e) => {
            if (!isDown) return;
            const dx = startX - e.clientX;
            if (!hasMoved && Math.abs(dx) < dragThreshold) return;
            hasMoved = true;
            bar.scrollLeft = scrollLeftStart + dx;
        });
        const stopPointer = (e) => {
            if (!isDown) return;
            isDown = false;
            try {
                bar.releasePointerCapture &&
                    bar.releasePointerCapture(e.pointerId);
            } catch (_) {}
            bar.classList.remove("dragging");
            // small delay to ensure click events on tabs still fire if this wasn't a drag
            setTimeout(() => updateButtons(), 10);
            hasMoved = false;
        };
        bar.addEventListener("pointerup", stopPointer);
        bar.addEventListener("pointercancel", stopPointer);
        bar.addEventListener("pointerleave", stopPointer);

        // Recompute on resize and when fonts/images load
        window.addEventListener("resize", updateButtons);
        window.addEventListener("load", updateButtons);

        // Also observe the bar for child changes (if tabs are added dynamically)
        if ("MutationObserver" in window) {
            const mo = new MutationObserver(() => updateButtons());
            mo.observe(bar, { childList: true, subtree: false });
        }

        // Initial state
        updateButtons();
    }

    initScrollableTabs();

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
                // Set up interactivity for cached content
                setTimeout(() => {
                    const widgetEl = document.querySelector(
                        ".widget-link[data-url]"
                    );
                    if (widgetEl) {
                        setupWidgetInteraction(widgetEl);
                    }
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

    function setupFootnotes() {
        const footnotes = document.querySelectorAll(".footnote");

        const closeAllFootnotes = (exceptThisOne = null) => {
            footnotes.forEach((f) => {
                if (f !== exceptThisOne) {
                    f.classList.remove("active", "flipped");
                }
            });
        };

        footnotes.forEach((footnote) => {
            const sup = footnote.querySelector("sup");
            if (!sup) return;

            sup.addEventListener("click", (e) => {
                e.stopPropagation();

                const wasActive = footnote.classList.contains("active");

                closeAllFootnotes(footnote);

                footnote.classList.toggle("active", !wasActive);

                if (!wasActive) {
                    const content = footnote.querySelector(".footnote-content");
                    if (content) {
                        // Use a timeout to allow the element to render before getting its position
                        setTimeout(() => {
                            const rect = content.getBoundingClientRect();

                            // Vertical check
                            if (rect.top < 0) {
                                footnote.classList.add("flipped");
                            }

                            // Horizontal check
                            const viewportWidth = window.innerWidth;
                            if (rect.right > viewportWidth) {
                                const overflow = rect.right - viewportWidth;
                                content.style.transform = `translateX(calc(-50% - ${
                                    overflow + 10
                                }px))`;
                            } else if (rect.left < 0) {
                                const overflow = -rect.left;
                                content.style.transform = `translateX(calc(-50% + ${
                                    overflow + 10
                                }px))`;
                            }
                        }, 0);
                    }
                } else {
                    // Reset transform when closing
                    const content = footnote.querySelector(".footnote-content");
                    if (content) {
                        content.style.transform = "";
                    }
                }
            });
        });

        document.addEventListener("click", () => closeAllFootnotes());
        window.addEventListener("scroll", () => closeAllFootnotes(), {
            passive: true,
        });
    }

    // Links popup chooser: creates a floating menu near click target with multiple links
    function openLinksPopup(event, links, title) {
        // Remove existing popup
        const existing = document.querySelector(".links-popup");
        if (existing) existing.remove();

        const popup = document.createElement("div");
        popup.className = "links-popup";
        popup.setAttribute("role", "menu");
        popup.setAttribute("aria-label", title || "Open link");

        const list = document.createElement("ul");
        list.className = "links-popup-list";

        // links can be strings or objects { label, url }
        links.forEach((l, i) => {
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
            // Intercept click so internal links route within the page and close popup
            a.addEventListener("click", (ev) => {
                ev.preventDefault();
                try {
                    openExternalOrInternal(href, ev);
                } finally {
                    // Close popup immediately after activation
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

        // Positioning near the event (click or keyboard)
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

        // Basic clamp to viewport
        const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
        const popupRect = popup.getBoundingClientRect();
        const x = clamp(
            left - popupRect.width / 2,
            8,
            window.innerWidth - popupRect.width - 8
        );
        const y = clamp(top, 8, window.innerHeight - popupRect.height - 8);

        popup.style.left = x + "px";
        popup.style.top = y + "px";

        // Focus first link for keyboard accessibility
        const firstLink = popup.querySelector("a");
        if (firstLink) firstLink.focus();

        // Close handlers
        const close = () => popup.remove();
        setTimeout(() => {
            document.addEventListener("click", function onDocClick(e) {
                if (!popup.contains(e.target)) {
                    document.removeEventListener("click", onDocClick);
                    close();
                }
            });
        }, 0);

        // Escape key closes
        const onKey = (e) => {
            if (e.key === "Escape") {
                close();
                document.removeEventListener("keydown", onKey);
            }
        };
        document.addEventListener("keydown", onKey);
    }

    // Normalize link inputs into array of {label, url}
    function normalizeLinks(field) {
        if (!field) return [];
        const toObj = (x) => {
            if (!x) return null;
            if (typeof x === "string") {
                return { label: x.replace(/^https?:\/\//, ""), url: x };
            }
            if (typeof x === "object") {
                // Accept {label, url, date} or {href, label, date}
                if (x.url || x.href) {
                    return {
                        label: x.label || x.name || x.url || x.href,
                        url: x.url || x.href,
                        date: x.date || x.when || null,
                    };
                }
                // Fallback: try to stringify
                return null;
            }
            return null;
        };

        if (Array.isArray(field)) {
            return field.map(toObj).filter(Boolean);
        }
        const single = toObj(field);
        return single ? [single] : [];
    }

    // -------------------- Internal navigation helpers --------------------
    // Create a URL-friendly slug from a title
    function slugify(s) {
        if (!s) return "";
        return String(s)
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }

    // Navigate to an internal target like "projects:slug" or "awards:slug"
    function navigateToInternal(target) {
        if (!target) return false;
        // Accept formats: "projects:slug", "awards:slug", "hackathons:slug"
        const parts = String(target).split(":");
        if (parts.length !== 2) return false;
        const tab = parts[0];
        const slug = parts[1];
        // Activate tab
        const tabBtn = Array.from(document.querySelectorAll(".tab")).find(
            (t) => t.dataset.tab === tab
        );
        if (!tabBtn) return false;
        activate(tab);
        // Find target element with data-slug and scroll into view
        // Defer to allow tab panels to become active and render
        setTimeout(() => {
            const panel = document.getElementById(tab);
            if (!panel) return;
            const targetEl = panel.querySelector(`[data-slug="${slug}"]`);
            if (!targetEl) return;

            // If this target is inside a collapsed timeline group, expand it first
            const timelineContainer = targetEl.closest(".timeline-items");
            if (
                timelineContainer &&
                timelineContainer.style.display === "none"
            ) {
                const expandId = timelineContainer.id;
                const summaryEl = panel.querySelector(
                    `.timeline-summary[data-target="${expandId}"]`
                );
                // Expand: mirror the toggle behavior used when a user clicks the summary
                const targetBlock = document.getElementById(expandId);
                if (targetBlock) targetBlock.style.display = "block";
                if (summaryEl) {
                    summaryEl.setAttribute("aria-expanded", "true");
                    const toggleIcon =
                        summaryEl.querySelector(".timeline-toggle i");
                    if (toggleIcon)
                        toggleIcon.style.transform = "rotate(180deg)";
                }
            }

            // Scroll to target after any expansion.
            // Use a robust approach: scroll the nearest scrollable ancestor to center the target,
            // and retry a couple times in case layout continues to change (e.g., target at end).
            const scrollToTarget = (el) => {
                if (!el) return;
                // Find nearest scrollable ancestor
                const isScrollable = (node) => {
                    if (!node || node === document) return false;
                    const style = window.getComputedStyle(node);
                    const overflowY = style.overflowY;
                    const canScroll =
                        node.scrollHeight > node.clientHeight &&
                        (overflowY === "auto" || overflowY === "scroll");
                    return canScroll;
                };

                let ancestor = el.parentElement;
                while (
                    ancestor &&
                    ancestor !== document.body &&
                    !isScrollable(ancestor)
                ) {
                    ancestor = ancestor.parentElement;
                }
                // If none found, use window
                if (!ancestor || ancestor === document.body) {
                    // use window scrollIntoView which scrolls the viewport
                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                } else {
                    // compute target top within ancestor and center it
                    const ancRect = ancestor.getBoundingClientRect();
                    const elRect = el.getBoundingClientRect();
                    const offsetTop =
                        elRect.top - ancRect.top + ancestor.scrollTop;
                    const targetScroll = Math.max(
                        0,
                        Math.floor(
                            offsetTop -
                                ancestor.clientHeight / 2 +
                                elRect.height / 2
                        )
                    );
                    ancestor.scrollTo({
                        top: targetScroll,
                        behavior: "smooth",
                    });
                }
                try {
                    el.focus && el.focus();
                } catch (_) {}
            };

            // Try immediately, then retry after short delays to handle async layout shifts
            scrollToTarget(targetEl);
            setTimeout(() => scrollToTarget(targetEl), 120);
            setTimeout(() => scrollToTarget(targetEl), 360);
        }, 40);
        return true;
    }

    // Opens an external URL or routes internal links that use the special scheme:
    // internal:projects:slug  or internal:awards:slug
    function openExternalOrInternal(href, event) {
        if (!href) return;
        // internal links may be specified as "internal:tab:slug" or "#tab/slug"
        if (typeof href === "string") {
            if (href.startsWith("internal:")) {
                const parts = href.split(":"), // [internal, tab, slug]
                    tab = parts[1],
                    slug = parts.slice(2).join(":");
                if (tab && slug) {
                    navigateToInternal(tab + ":" + slug);
                    event && event.preventDefault && event.preventDefault();
                    return;
                }
            }
            // Support hash-style: #tab/slug
            if (href.startsWith("#")) {
                const clean = href.slice(1);
                const parts = clean.split("/");
                if (parts.length === 2) {
                    navigateToInternal(parts[0] + ":" + parts[1]);
                    event && event.preventDefault && event.preventDefault();
                    return;
                }
            }
        }
        // Fallback: open in new tab
        try {
            window.open(href, "_blank", "noopener");
        } catch (_) {
            window.location.href = href;
        }
    }

    // Format a link date string "yyyy/mm/dd" into "Mon dd, yyyy (x months ago)"
    function formatLinkDate(s) {
        if (!s) return "";
        // Accept yyyy/mm/dd or yyyy-mm-dd
        const parts = s.split(/[-\/]/).map((p) => parseInt(p, 10));
        if (!parts || parts.length < 3 || parts.some(isNaN)) return s;
        const [y, m, d] = parts;
        const date = new Date(y, m - 1, d);
        if (isNaN(date.getTime())) return s;

        const monthNames = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
        ];
        const formatted = `${
            monthNames[date.getMonth()]
        } ${date.getDate()}, ${date.getFullYear()}`;

        // Relative time
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays < 1) return `${formatted} (today)`;
        if (diffDays < 30)
            return `${formatted} (${diffDays} day${
                diffDays === 1 ? "" : "s"
            } ago)`;
        const diffMonths = Math.floor(diffDays / 30);
        if (diffMonths < 12)
            return `${formatted} (${diffMonths} month${
                diffMonths === 1 ? "" : "s"
            } ago)`;
        const diffYears = Math.floor(diffMonths / 12);
        return `${formatted} (${diffYears} year${
            diffYears === 1 ? "" : "s"
        } ago)`;
    }

    // Helpers for project start/end date handling
    function parseYMD(s) {
        if (!s) return null;
        // Accept yyyy/mm/dd or yyyy-mm-dd or yyyy/mm or yyyy-mm or yyyy
        const parts = s.split(/[-\/]/).map((p) => parseInt(p, 10));
        if (!parts || parts.some((x) => Number.isNaN(x))) return null;
        const [y, m, d] = parts;
        if (parts.length === 1) return new Date(y, 0, 1);
        if (parts.length === 2) return new Date(y, (m || 1) - 1, 1);
        return new Date(y, (m || 1) - 1, d || 1);
    }

    function projectEndTimestamp(p) {
        // Look for end-date (preferred), fall back to parsing p.date for range like "Jun 2024 – Dec 2024"
        const eRaw = p["end-date"] || p["end_date"] || p.endDate || null;
        if (eRaw) {
            const parsed = parseYMD(eRaw);
            if (parsed) return parsed.getTime();
            if (/present|ongoing/i.test(String(eRaw))) return Infinity;
        }
        // Try to parse a simple p.date string like `Jan 2024 – Dec 2024` or `Dec 2023 – Aug 2024`
        if (p.date && typeof p.date === "string") {
            const parts = p.date.split("–").map((s) => s.trim());
            if (parts.length === 2) {
                const end = parts[1];
                const parsed = parseYMD(
                    end.replace(/\s+/g, " ").replace(/ /g, "/")
                );
                if (parsed) return parsed.getTime();
                if (/present|ongoing/i.test(end)) return Infinity;
            }
        }
        // If no explicit end date is found, treat the project as ongoing
        // (so it sorts first). This covers cases where end-date was omitted
        // but the project should still appear at the top of the list.
        return Infinity;
    }

    function formatProjectDate(sRaw, eRaw) {
        const monthNames = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
        ];
        const fmt = (d) => `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
        const s = sRaw ? parseYMD(sRaw) : null;
        const e = eRaw
            ? /(present|ongoing)/i.test(String(eRaw))
                ? null
                : parseYMD(eRaw)
            : null;
        if (s && e) {
            // compute relative time from end date
            const now = new Date();
            const months =
                (now.getFullYear() - e.getFullYear()) * 12 +
                (now.getMonth() - e.getMonth());
            let rel = null;
            if (months < 1) {
                const days = Math.floor((now - e) / (1000 * 60 * 60 * 24));
                rel =
                    days <= 1
                        ? "today"
                        : `${days} day${days === 1 ? "" : "s"} ago`;
            } else if (months < 12) {
                rel = `${months} month${months === 1 ? "" : "s"} ago`;
            } else {
                const years = Math.floor(months / 12);
                rel = `${years} year${years === 1 ? "" : "s"} ago`;
            }
            return `${fmt(s)} – ${fmt(e)} (${rel})`;
        }
        if (s && !e) return `${fmt(s)} – Present`;
        if (!s && e) return `– ${fmt(e)}`;
        return "";
    }

    // Helper function to get preview image path
    function getPreviewPath(originalPath) {
        if (originalPath.includes("tab-panels/")) {
            return originalPath.replace("tab-panels/", "tab-panels/preview/");
        }
        return originalPath;
    }
});
