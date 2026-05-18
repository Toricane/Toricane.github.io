# AI Agent Context: prajwal.is-a.dev Portfolio

This document provides architectural, stylistic, and operational context for any AI agent assisting with the `Toricane.github.io` repository.

## 1. Project Overview & Architecture
*   **Tech Stack**: Pure HTML5, Vanilla CSS3 (Custom Properties / Variables), and Vanilla JavaScript (ES Modules). **NO** heavy frameworks (like React, Vue, or Tailwind) are used.
*   **Data-Driven Content**: Portfolio content is source-driven and pre-rendered at build time.
    *   Projects/Hackathons/Awards source: `data.json`
    *   Hero intro source: `templates/hero-tagline.md` (compiled to `templates/hero-tagline.html`)
    *   SEO metadata source: `seo.json` (canonical + JSON-LD injected into `index.html` at build)
    *   Generated outputs: `index.html` (minified + pre-rendered), `sitemap.xml`, hashed CSS/JS from `asset-manifest.json`, and optional `scripts/chunk-*.js`
    *   Never hardcode content items directly in generated `index.html`; update source files and rebuild.
*   **Module Structure**:
    *   JS components are in `scripts/components/` (e.g. `coverflow.js`, `tabs.js`, `navigation.js`, `tapMode.js`, `theme.js`).
    *   `scripts/main.js` hydrates from `window.__SITE_RUNTIME__` (production) or falls back to `fetch("data.json")` (dev); coverflow, hash navigation, tabs; widgets via dynamic import.
    *   `scripts/icons.js` — inline Font Awesome 6.5.2 SVGs; `faIcon(viewBox, path)` per icon (never duplicate `viewBox` attrs); `applySvgIcons()` runs each build.
    *   `scripts/utils/siteData.js` — `generateRuntimePayload()` for build-time injection.
    *   `scripts/generate_hero_tagline.js` compiles hero markdown-like syntax into HTML (icons, footnotes, internal vs external links).
    *   `scripts/build.js` runs the full build (hero compile, sitemap, SEO head, JS/CSS bundle, section pre-render, runtime script, SVG icons, HTML minify).
    *   `scripts/seo.js` and `scripts/generate-sitemap.js` support AEO/SEO injection.
    *   `styles.css` is monolithic but structured with CSS variables at the root.

## 1b. Build & Runtime (CRITICAL)

| Input | Build step | Output |
|-------|------------|--------|
| `data.json` | `build.js` | Pre-rendered tab HTML + `window.__SITE_RUNTIME__` in `index.html` |
| `templates/hero-tagline.md` | `generate_hero_tagline.js` | `templates/hero-tagline.html` → injected into hero |
| `seo.json` | `seo.js` | Canonical + JSON-LD in `index.html` |
| `scripts/icons.js` | `applySvgIcons()` | Inline SVGs in connections, theme toggle, scroll button |

*   **CSS delivery**: Inline `style#critical` (hero) plus deferred full stylesheet from `asset-manifest.json` (`media="print"` + `onload` + `<noscript>` fallback). Do **not** ship deferred-only CSS without that noscript fallback.
*   **Asset hashing**: `npm run build-html` writes `asset-manifest.json` and content-hashed `styles.*.min.css` / `scripts/main-*.js`. Inject paths from the manifest; do not hand-edit hashed filenames in `index.html`.
*   **Coverflow LCP**: Build injects a static center card into `#coverflowCards` and `<link rel="preload" as="image">`. Runtime coverflow init is deferred (idle / intersection).
*   **Runtime data**: Production uses inlined `__SITE_RUNTIME__` (includes `coverflowColors`); do not preload or fetch `data.json` or `colors.json` on production builds.
*   **Mobile connections**: `.connections a span:not(.svg-icon)` — never `display: none` on all spans (hides inline SVG icons).
*   **Anime.js**: Loaded only when `?tap=true` (`tapMode.js`).

## 2. Design System & Aesthetics (CRITICAL)
*   **Theme**: Dark/Midnight aesthetic (glassmorphism inspired) with high-contrast, vibrant neon blue/green accents. Light theme exists via `theme.js` / `[data-theme="light"]`.
*   **Animations & Glows**:
    *   The site relies heavily on CSS `box-shadow` for glowing effects (e.g. Coverflow gallery images glow on hover).
    *   `.nav-highlight` — brief opaque blue ring + background tint when deep-linking to a project/award/hackathon entry.
    *   `.linkedin-highlight` — stronger flash on the LinkedIn pill during `?tap=true` mode.
    *   Do **NOT** introduce flat, generic design patterns. Match the existing glassy/neon visual language.
*   **Responsive**: Mobile-first approach with flexible grids and flexbox.

## 3. Notable Components & Update Rules
*   **Coverflow (`coverflow.js`)**: Pulls images from `data.json` where `"face": true`.
    *   **CRITICAL:** When adding a new `"face": true` image, run `python scripts/update_colors.py` (requires `Pillow`) to update `colors.json` for pre-calculated glow colors.
*   **Tabs & Timeline (`tabs.js`, `renderTimeline.js`)**: Tabbed Projects / Hackathons / Awards. Grouped timeline months collapse into expandable `.timeline-items` blocks.
*   **Navigation (`navigation.js`)**: Hash and internal link routing.
    *   `#content`, `#projects`, `#hackathons`, `#awards` — tab switch + scroll.
    *   `#tab/slug` (e.g. `#awards/class-valedictorian`) — switch tab, expand collapsed group if needed, scroll to `[data-slug]`, apply `.nav-highlight`.
    *   Same-origin absolute URLs with hashes are intercepted on click; hash is re-applied after `data.json` re-render (`applyHashFromLocation` in `main.js`).
    *   Internal `#tab/slug` links in `data.json` must use slugs from `slugify()` in `scripts/utils/data.js` (match rendered `data-slug` after build).
*   **Hero tagline (`templates/hero-tagline.md`)**: `[{icon} label](url)` syntax for icons; `(footnote)` syntax for footnotes. Internal links to `prajwal.is-a.dev` should not open in a new tab.
*   **Tap mode (`tapMode.js`)**: Active when `?tap=true`. LinkedIn pill pulses immediately on load, then every 1s for 15s; other connection pills stagger in.
*   **Image Management**: Full-size images in `assets/tab-panels/`, WebP previews in `assets/tab-panels/preview/`. Coverflow uses full tab-panel paths + responsive srcset (not `preview/`). Optional: `python scripts/generate_coverflow_images.py` for hero WebP variants.
*   **Icons**: Never reintroduce Font Awesome CDN. Edit `scripts/icons.js`; rebuild with `npm run build-html`.
*   **Accessibility**: Section `h2#work-heading` (visually hidden) before tabs; timeline summary uses `button` + `h3.timeline-summary-title` (not interactive inside heading). Inactive tab panels use `hidden` attribute.

## 4. SEO / AEO Files (do not remove without intent)
| File | Notes |
|------|--------|
| `robots.txt` | Allows GPTBot, ClaudeBot, PerplexityBot, Google-Extended; references sitemap |
| `sitemap.xml` | Build output; URLs configured in `seo.json` → `sitemap.urls` |
| `llms.txt` | Static AI-oriented site summary |
| `seo.json` | Canonical URL, descriptions, `sameAs`, sitemap list — injected by `build.js` via `seo.js` |

Edit `seo.json` and run `npm run build-html` instead of patching JSON-LD inside minified `index.html`.

## 5. Development & Editing Rules
1.  **Do Not Transpile**: Write ES6+ Vanilla JS.
    *   Build step **is required** for generated output: `npm run build-html`.
    *   Quick hero-only compile: `npm run build-hero`.
    *   Sitemap only: `npm run build-sitemap`.
    *   Do not hand-edit hashed bundles, `asset-manifest.json`, or SEO blocks in `index.html`.
    *   Local dev: `npm run dev` (watch + rebuild + serve on :8080).
2.  **CSS Edits**: Use existing CSS variables (`--bg`, `--text`, `--accent`, etc.). Test animations for overflow/clipping.
3.  **Local Testing**: Prefer `http://127.0.0.1:5500` or `python -m http.server 8080`. Rebuild after `data.json` or `hero-tagline.md` changes.
4.  **No Extraneous Dependencies**: Avoid new libraries unless necessary. Anime.js is used for tap mode and some motion; prefer CSS transitions elsewhere.
5.  **Connect Four (`connect4/`)**: Separate page with its own canonical URL; listed in `sitemap.xml`. Minimal SEO head only — no shared JSON-LD graph.
