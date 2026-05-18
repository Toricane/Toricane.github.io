# AI Agent Context: prajwal.is-a.dev Portfolio

This document provides architectural, stylistic, and operational context for any AI agent assisting with the `Toricane.github.io` repository.

## 1. Project Overview & Architecture
*   **Tech Stack**: [Astro](https://astro.build) static site (`src/`) with vanilla CSS (`styles.css`) and vanilla JS client islands (`src/scripts/`). **NO** React/Vue/Tailwind.
*   **Production output**: `dist/` (deploy via `.github/workflows/pages.yml`).
*   **Data-Driven Content**: Portfolio content is validated and pre-rendered at Astro build time.
    *   Authoring source: root `data.json` (synced to `src/data/portfolio.json` on `npm run build` / `npm run dev`)
    *   Hero intro: `templates/hero-tagline.md` (compiled in `src/pages/index.astro` via `compileHeroTagline`)
    *   SEO: `seo.json` → `src/components/SeoHead.astro` + `@astrojs/sitemap`
    *   Optional per-file YAML: `npm run migrate-content` → `src/content/**` (future collections; not wired yet)
    *   Never hardcode portfolio items in Astro pages; update `data.json` and rebuild.
*   **Module Structure**:
    *   JS components are in `src/scripts/components/` (e.g. `coverflow.js`, `tabs.js`, `navigation.js`, `tapMode.js`, `theme.js`).
    *   `src/scripts/boot.js` hydrates from `window.__SITE_RUNTIME__` (production) or falls back to `fetch("data.json")` (dev); coverflow, hash navigation, tabs; widgets via dynamic import.
    *   `src/scripts/icons.js` — inline Font Awesome 6.5.2 SVGs; `faIcon(viewBox, path)` per icon (never duplicate `viewBox` attrs).
    *   `src/lib/siteRuntime.ts` — runtime payload for build-time injection.
    *   `styles.css` is monolithic but structured with CSS variables at the root.

## 1b. Astro build & dev (CRITICAL)

| Command | Action |
|---------|--------|
| `npm run dev` | `sync-public` + Astro dev server (HMR) |
| `npm run build` | `sync-public` + static `dist/` |
| `npm run preview` | Preview production `dist/` |

*   **Static assets**: `node scripts/sync-public.mjs` copies `assets/`, `connect4/`, favicons, `CNAME`, `robots.txt`, `llms.txt` → `public/`.
*   **Client JS**: `src/scripts/boot.js` hydrates tabs, coverflow, hash nav, widgets (deferred import).
*   **Sitemap**: `@astrojs/sitemap` writes `dist/sitemap-index.xml` and `dist/sitemap-0.xml`. Root `robots.txt` points crawlers at `https://prajwal.is-a.dev/sitemap-index.xml`.
*   **Coverflow LCP**: Astro build injects a static center card into `#coverflowCards` and image preload. Runtime coverflow init is deferred (idle / intersection).
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
    *   Same-origin absolute URLs with hashes are intercepted on click; hash is re-applied after `data.json` re-render (`applyHashFromLocation` in `boot.js`).
    *   Internal `#tab/slug` links in `data.json` must use slugs from `slugify()` in `src/scripts/utils/data.js` (match rendered `data-slug` after build).
*   **Hero tagline (`templates/hero-tagline.md`)**: `[{icon} label](url)` syntax for icons; `(footnote)` syntax for footnotes. Internal links to `prajwal.is-a.dev` should not open in a new tab.
*   **Tap mode (`tapMode.js`)**: Active when `?tap=true`. LinkedIn pill pulses immediately on load, then every 1s for 15s; other connection pills stagger in.
*   **Image Management**: Full-size images in `assets/tab-panels/`, WebP previews in `assets/tab-panels/preview/`. Coverflow uses full tab-panel paths + responsive srcset (not `preview/`). Optional: `python scripts/generate_coverflow_images.py` for hero WebP variants.
*   **Icons**: Never reintroduce Font Awesome CDN. Edit `src/scripts/icons.js`; run `npm run build`.
*   **Accessibility**: Section `h2#work-heading` (visually hidden) before tabs; timeline summary uses `button` + `h3.timeline-summary-title` (not interactive inside heading). Inactive tab panels use `hidden` attribute.

## 4. SEO / AEO Files (do not remove without intent)
| File | Notes |
|------|--------|
| `robots.txt` | Allows GPTBot, ClaudeBot, PerplexityBot, Google-Extended; references `sitemap-index.xml` |
| `dist/sitemap-index.xml` | Sitemap index (generated by Astro on build) |
| `llms.txt` | Static AI-oriented site summary |
| `seo.json` | Canonical URL, descriptions, `sameAs` — used by `SeoHead.astro` |

Edit `seo.json` and run `npm run build` instead of patching JSON-LD in built HTML.

## 5. Development & Editing Rules
1.  **Do Not Transpile**: Write ES6+ Vanilla JS for client islands; Astro handles the site build.
    *   Build step **is required** after content/CSS/JS changes: `npm run build`.
    *   Local dev: `npm run dev` (Astro HMR).
2.  **CSS Edits**: Use existing CSS variables (`--bg`, `--text`, `--accent`, etc.). Test animations for overflow/clipping.
3.  **Local Testing**: `npm run dev` or `npm run preview` after `npm run build`.
4.  **No Extraneous Dependencies**: Avoid new libraries unless necessary. Anime.js is used for tap mode and some motion; prefer CSS transitions elsewhere.
5.  **Connect Four (`connect4/`)**: Separate page with its own canonical URL; included in Astro sitemap. Minimal SEO head only — no shared JSON-LD graph.
