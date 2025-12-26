// Data and formatting helpers shared across the site
export function escapeHtml(s = "") {
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

export function slugify(s) {
    if (!s) return "";
    return String(s)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export function normalizeLinks(field) {
    if (!field) return [];
    const toObj = (x) => {
        if (!x) return null;
        if (typeof x === "string") {
            return { label: x.replace(/^https?:\/\//, ""), url: x };
        }
        if (typeof x === "object") {
            if (x.url || x.href) {
                return {
                    label: x.label || x.name || x.url || x.href,
                    url: x.url || x.href,
                    date: x.date || x.when || null,
                };
            }
            return null;
        }
        return null;
    };

    if (Array.isArray(field)) return field.map(toObj).filter(Boolean);
    const single = toObj(field);
    return single ? [single] : [];
}

export function normalizeImages(field, fallbackLabel) {
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
            const label = x.label || x.name || x.caption || fallbackLabel || "";
            if (!path) return null;
            return { label, path };
        }
        return null;
    };
    if (Array.isArray(field)) return field.map(toObj).filter(Boolean);
    const single = toObj(field, 0);
    return single ? [single] : [];
}

export function parseYMD(s) {
    if (!s) return null;
    const parts = s.split(/[-\/]/).map((p) => parseInt(p, 10));
    if (!parts || parts.some((x) => Number.isNaN(x))) return null;
    const [y, m, d] = parts;
    if (parts.length === 1) return new Date(y, 0, 1);
    if (parts.length === 2) return new Date(y, (m || 1) - 1, 1);
    return new Date(y, (m || 1) - 1, d || 1);
}

export function projectEndTimestamp(p) {
    const eRaw = p["end-date"] || p["end_date"] || p.endDate || null;
    if (eRaw) {
        const parsed = parseYMD(eRaw);
        if (parsed) return parsed.getTime();
        if (/present|ongoing/i.test(String(eRaw))) return Infinity;
    }
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
    return Infinity;
}

export function formatProjectDate(sRaw, eRaw) {
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
    const e =
        eRaw && !/(present|ongoing)/i.test(String(eRaw))
            ? parseYMD(eRaw)
            : null;
    if (s && e) {
        const now = new Date();
        const months =
            (now.getFullYear() - e.getFullYear()) * 12 +
            (now.getMonth() - e.getMonth());
        let rel = null;
        if (months < 1) {
            const days = Math.floor((now - e) / (1000 * 60 * 60 * 24));
            rel =
                days <= 1 ? "today" : `${days} day${days === 1 ? "" : "s"} ago`;
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

export function formatLinkDate(s) {
    if (!s) return "";
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

    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 1) return `${formatted} (today)`;
    if (diffDays < 30)
        return `${formatted} (${diffDays} day${diffDays === 1 ? "" : "s"} ago)`;
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12)
        return `${formatted} (${diffMonths} month${
            diffMonths === 1 ? "" : "s"
        } ago)`;
    const diffYears = Math.floor(diffMonths / 12);
    return `${formatted} (${diffYears} year${diffYears === 1 ? "" : "s"} ago)`;
}

export function getPreviewPath(originalPath) {
    if (!originalPath) return "";
    if (originalPath.includes("tab-panels/")) {
        return originalPath.replace("tab-panels/", "tab-panels/preview/");
    }
    return originalPath;
}
