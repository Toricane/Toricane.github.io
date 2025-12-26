// Internal navigation helpers wired to the tab system
let activateTab = () => {};

export function setTabActivator(fn) {
    if (typeof fn === "function") activateTab = fn;
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
    setTimeout(() => {
        const panel = document.getElementById(tab);
        if (!panel) return;
        const targetEl = panel.querySelector(`[data-slug="${slug}"]`);
        if (!targetEl) return;

        const timelineContainer = targetEl.closest(".timeline-items");
        if (timelineContainer && timelineContainer.style.display === "none") {
            const expandId = timelineContainer.id;
            const summaryEl = panel.querySelector(
                `.timeline-summary[data-target="${expandId}"]`
            );
            const targetBlock = document.getElementById(expandId);
            if (targetBlock) targetBlock.style.display = "block";
            if (summaryEl) {
                summaryEl.setAttribute("aria-expanded", "true");
                const toggleIcon =
                    summaryEl.querySelector(".timeline-toggle i");
                if (toggleIcon) toggleIcon.style.transform = "rotate(180deg)";
            }
        }

        const scrollToTarget = (el) => {
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
                        offsetTop -
                            ancestor.clientHeight / 2 +
                            elRect.height / 2
                    )
                );
                ancestor.scrollTo({ top: targetScroll, behavior: "smooth" });
            }
            try {
                el.focus && el.focus();
            } catch (_) {}
        };

        scrollToTarget(targetEl);
        setTimeout(() => scrollToTarget(targetEl), 120);
        setTimeout(() => {
            scrollToTarget(targetEl);
            flashHighlight(targetEl);
        }, 360);
    }, 40);
    return true;
}

export function openExternalOrInternal(href, event) {
    if (!href) return;
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
        if (href.startsWith("#")) {
            const clean = href.slice(1);
            const parts = clean.split("/");
            if (parts.length === 2) {
                navigateToInternal(`${parts[0]}:${parts[1]}`);
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

function flashHighlight(el) {
    if (!el || !el.classList) return;
    const cls = "nav-highlight";
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 1900);
}
