import { initCoverFlow } from "./components/coverflow.js";
import { initFootnotes } from "./components/footnotes.js";
import { initImageViewerDelegates } from "./components/imageViewer.js";
import { setTabActivator } from "./components/navigation.js";
import { renderProjects } from "./components/renderProjects.js";
import { renderTimeline } from "./components/renderTimeline.js";
import { initScrollableTabs } from "./components/scrollableTabs.js";
import { initScrollButton } from "./components/scrollButton.js";
import { initTabs } from "./components/tabs.js";
import { initTapMode } from "./components/tapMode.js";
import { initThemeToggle, initYear } from "./components/theme.js";
import { setupTilt } from "./components/tilt.js";
import { initVisibilityPause } from "./components/visibilityPause.js";
import { initWidgets } from "./components/widgets.js";

document.addEventListener("DOMContentLoaded", () => {
    initYear();
    initThemeToggle();
    initScrollButton();

    const { activate } = initTabs();
    setTabActivator(activate);

    initWidgets();
    initTapMode();

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
            const projects = document.getElementById("projects");
            if (projects) {
                projects.innerHTML = fail("Failed to load projects.");
            }
        });

    const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;
    if (!reduceMotion) {
        const highlightFigureEl = document.querySelector(
            ".tab-highlight-figure"
        );
        const highlightImgEl = document.getElementById("tabHighlightImage");
        const tiltTarget = highlightFigureEl || highlightImgEl;
        setupTilt(tiltTarget, { max: 12, scale: 1.02 });
    }

    initCoverFlow();
    initFootnotes();
    initImageViewerDelegates();
    initVisibilityPause();
    initScrollableTabs();
});
