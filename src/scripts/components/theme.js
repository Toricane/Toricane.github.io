import { iconHtml } from "../icons.js";

export function initYear() {
    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
}

function setThemeIcon(themeIcon, theme) {
    if (!themeIcon) return;
    themeIcon.innerHTML = iconHtml(theme === "light" ? "sun" : "moon");
}

export function initThemeToggle() {
    const themeToggle = document.getElementById("theme-toggle");
    const themeIcon = themeToggle?.querySelector(".svg-icon, i");
    const savedTheme = localStorage.getItem("theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);
    setThemeIcon(themeIcon, savedTheme);

    if (!themeToggle) return;
    themeToggle.addEventListener("click", () => {
        const currentTheme =
            document.documentElement.getAttribute("data-theme") || "dark";
        const newTheme = currentTheme === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", newTheme);
        localStorage.setItem("theme", newTheme);
        setThemeIcon(themeIcon, newTheme);
    });
}
