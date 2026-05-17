// Internal navigation helpers wired to the tab system
let activateTab = () => {};

const TAB_IDS = new Set(["projects", "hackathons", "awards"]);

export function setTabActivator(fn) {
    if (typeof fn === "function") activateTab = fn;
}

function scrollToContent() {
    const content = document.getElementById("content");
    if (!content) return;
    content.scrollIntoView({ behavior: "smooth", block: "start" });
}

function afterLayout(fn) {
    requestAnimationFrame(() => {
        requestAnimationFrame(fn);
    });
}

function isHiddenEl(el) {
    if (!el) return false;
    if (el.hidden) return true;
    const computed = window.getComputedStyle(el);
    return computed.display === "none" || computed.visibility === "hidden";
}

/**
 * Expand a collapsed timeline group containing targetEl.
 * Returns true when an expansion was performed.
 */
function expandTimelineAncestor(targetEl) {
    const timelineContainer = targetEl?.closest?.(".timeline-items");
    if (!timelineContainer || !isHiddenEl(timelineContainer)) {
        return false;
    }

    const expandId = timelineContainer.id;
    if (!expandId) return false;

    timelineContainer.style.display = "block";

    const panel = timelineContainer.closest(".tab-panel");
    const summaryEl =
        panel?.querySelector(
            `.timeline-summary[data-target="${CSS.escape(expandId)}"]`
        ) || document.querySelector(
            `.timeline-summary[data-target="${CSS.escape(expandId)}"]`
        );

    if (summaryEl) {
        const toggleBtn = summaryEl.querySelector(".timeline-toggle");
        if (toggleBtn) {
            toggleBtn.setAttribute("aria-expanded", "true");
            const toggleIcon = toggleBtn.querySelector(".icon, svg");
            if (toggleIcon) toggleIcon.style.transform = "rotate(180deg)";
        }
    }

    return true;
}

function scrollToTarget(el) {
    if (!el) return;
    const isScrollable = (node) => {
        if (!node || node === document) return false;
        const style = window.getComputedStyle(node);
        const overflowY = style.overflowY;
        return (
            node.scrollHeight > node.clientHeight &&
            (overflowY === "auto" || overflowY === "scroll")
        );
    };

    let ancestor = el.parentElement;
    while (
        ancestor &&
        ancestor !== document.body &&
        !isScrollable(ancestor)
    ) {
        ancestor = ancestor.parentElement;
    }

    if (!ancestor || ancestor === document.body) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
        const ancRect = ancestor.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const offsetTop = elRect.top - ancRect.top + ancestor.scrollTop;
        const targetScroll = Math.max(
            0,
            Math.floor(
                offsetTop - ancestor.clientHeight / 2 + elRect.height / 2
            )
        );
        ancestor.scrollTo({ top: targetScroll, behavior: "smooth" });
    }

    if (!el.hasAttribute("tabindex")) {
        el.setAttribute("tabindex", "-1");
    }
    try {
        el.focus({ preventScroll: true });
    } catch (_) {}
}

/**
 * Parse a hash or href into a normalized hash string (e.g. "#hackathons").
 */
export function extractHashFromHref(href) {
    if (!href || typeof href !== "string") return null;
    if (href.startsWith("#")) return href;
    try {
        const url = new URL(href, window.location.href);
        const sameOrigin =
            url.origin === window.location.origin ||
            url.hostname === "prajwal.is-a.dev" ||
            url.hostname === "www.prajwal.is-a.dev";
        const samePage =
            url.pathname === "/" ||
            url.pathname === "" ||
            url.pathname.endsWith("/index.html");
        if (sameOrigin && samePage && url.hash) return url.hash;
    } catch (_) {}
    return null;
}

/**
 * Handle #content, #projects|#hackathons|#awards, and #tab/slug deep links.
 */
export function navigateToHash(rawHash) {
    const hash = String(rawHash || "").replace(/^#/, "");
    if (!hash) return false;

    if (hash === "content") {
        scrollToContent();
        return true;
    }

    const parts = hash.split("/");
    if (parts.length === 2 && TAB_IDS.has(parts[0])) {
        return navigateToInternal(`${parts[0]}:${parts[1]}`);
    }

    if (TAB_IDS.has(hash)) {
        const tabBtn = Array.from(document.querySelectorAll(".tab")).find(
            (t) => t.dataset.tab === hash
        );
        if (!tabBtn) return false;
        activateTab(hash);
        setTimeout(scrollToContent, 40);
        return true;
    }

    return false;
}

export function navigateToInternal(target) {
    if (!target) return false;
    const parts = String(target).split(":");
    if (parts.length !== 2) return false;
    const tab = parts[0];
    const slug = parts[1];
    const tabBtn = Array.from(document.querySelectorAll(".tab")).find(
        (t) => t.dataset.tab === tab
    );
    if (!tabBtn) return false;

    activateTab(tab);

    const revealAndScroll = () => {
        const panel = document.getElementById(tab);
        if (!panel) return;

        const targetEl = panel.querySelector(
            `[data-slug="${CSS.escape(slug)}"]`
        );
        if (!targetEl) return;

        const didExpand = expandTimelineAncestor(targetEl);

        const finish = () => {
            scrollToContent();
            scrollToTarget(targetEl);
            setTimeout(() => scrollToTarget(targetEl), 150);
            const highlightDelay = didExpand ? 500 : 320;
            setTimeout(() => {
                scrollToTarget(targetEl);
                flashHighlight(targetEl);
            }, highlightDelay);
        };

        if (didExpand) {
            afterLayout(() => afterLayout(finish));
        } else {
            afterLayout(finish);
        }
    };

    setTimeout(revealAndScroll, 60);
    return true;
}

export function openExternalOrInternal(href, event) {
    if (!href) return;

    const hash = extractHashFromHref(href);
    if (hash && navigateToHash(hash)) {
        event?.preventDefault?.();
        try {
            history.pushState(null, "", hash);
        } catch (_) {}
        return;
    }

    if (typeof href === "string") {
        if (href.startsWith("internal:")) {
            const parts = href.split(":");
            const tab = parts[1];
            const slug = parts.slice(2).join(":");
            if (tab && slug) {
                navigateToInternal(`${tab}:${slug}`);
                event?.preventDefault?.();
                return;
            }
        }
    }
    try {
        window.open(href, "_blank", "noopener");
    } catch (_) {
        window.location.href = href;
    }
}

export function initHashNavigation() {
    document.addEventListener("click", (e) => {
        const anchor = e.target.closest("a[href]");
        if (!anchor) return;
        const hash = extractHashFromHref(anchor.getAttribute("href"));
        if (!hash || !navigateToHash(hash)) return;
        e.preventDefault();
        try {
            history.pushState(null, "", hash);
        } catch (_) {}
    });

    window.addEventListener("hashchange", () => {
        if (location.hash) navigateToHash(location.hash);
    });
}

export function applyHashFromLocation() {
    if (location.hash) navigateToHash(location.hash);
}

function flashHighlight(el) {
    if (!el || !el.classList) return;
    const cls = "nav-highlight";
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 1900);
}
