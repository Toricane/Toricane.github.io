const highlightMap = {
    projects: "assets/projects_highlight.webp",
    hackathons: "assets/hackathons_highlight.webp",
    awards: "assets/awards_highlight.webp",
};

export function initTabs() {
    const tabs = Array.from(document.querySelectorAll(".tab"));
    const panels = Array.from(document.querySelectorAll(".tab-panel"));
    const highlightImg = document.getElementById("tabHighlightImage");

    Object.values(highlightMap).forEach((src) => {
        const img = new Image();
        img.src = src;
    });

    const activate = (id) => {
        tabs.forEach((t) => {
            const active = t.dataset.tab === id;
            t.classList.toggle("active", active);
            t.setAttribute("aria-selected", active);
        });
        panels.forEach((p) => p.classList.toggle("active", p.id === id));

        if (highlightImg && highlightMap[id]) {
            const newSrc = highlightMap[id];
            if (highlightImg.getAttribute("src") !== newSrc) {
                highlightImg.classList.remove("ready");
                const btn = tabs.find((t) => t.dataset.tab === id);
                if (btn) {
                    const alt = btn.getAttribute("data-image-alt") || "";
                    highlightImg.setAttribute("alt", alt);
                }
                const temp = new Image();
                temp.onload = () => {
                    highlightImg.src = newSrc;
                    requestAnimationFrame(() =>
                        highlightImg.classList.add("ready")
                    );
                };
                temp.onerror = () => highlightImg.removeAttribute("src");
                temp.src = newSrc;
            }
        }
    };

    tabs.forEach((t) =>
        t.addEventListener("click", () => activate(t.dataset.tab))
    );
    activate("projects");

    return { activate };
}
