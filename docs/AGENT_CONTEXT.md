# AI Agent Context: prajwal.is-a.dev Portfolio

Architectural, stylistic, and operational context for AI agents working in `Toricane.github.io`.

## 1. Project Overview & Architecture

*   **Tech stack**: [Astro 6](https://astro.build) static site (`src/`) + monolithic CSS (`src/styles/site.css` via `src/styles/global.css`) + vanilla JS (`src/scripts/`). **No** React/Vue/Tailwind.
*   **Production output**: `dist/` (gitignored). Deployed via `.github/workflows/pages.yml` (Node 22, `npm run build`, GitHub Pages artifact).
*   **Content source of truth**: Markdown + YAML frontmatter in `src/content/` — **not** root `data.json`.
*   **Authoring**: [Obsidian](https://obsidian.md) at repo root; live previews in `src/content/Portfolio.base` + [CONTENT.md](CONTENT.md).

### Content collections (`src/content.config.ts`)

| Collection | Path | Notes |
|------------|------|--------|
| `projects` | `src/content/projects/*.md` | `title`, `startDate`, `endDate`, `tags`, `images`, `links`, `significance` |
| `hackathons` | `src/content/hackathons/*.md` | `name`, `when`, `groupSummary`, `badges`, … |
| `awards` | `src/content/awards/*.md` | `name`, `when`, `groupSummary`, `tags`, … |
| `hero` | `src/content/hero/intro.md` | Custom `[{icon} label](url)` tagline syntax |
| `coverflow` | `src/content/coverflow/*.md` | Optional standalone face images |

*   `src/lib/buildPortfolio.ts` aggregates collections → legacy `Portfolio` shape for `renderProjectsHtml` / `renderTimelineHtml`.
*   `src/lib/normalizeContent.ts` + `scripts/content-normalize.mjs` — image/link lines, `significance` ↔ legacy `impactful`/`notable`, hyphenated tags.
*   Root **`data.json`** is **generated** on sync (`scripts/export-data-json.mjs`); do not edit by hand. Site does **not** fetch it in production.
*   Never hardcode portfolio items in Astro pages.

### Key modules

*   `src/lib/buildPortfolio.ts`, `src/lib/renderProjects.ts`, `src/lib/renderTimeline.ts` — build-time HTML for tabs.
*   `src/scripts/boot.js` — client hydration from inlined `window.__SITE_RUNTIME__`.
*   `src/components/TabsSection.astro`, `Coverflow.astro`, `SeoHead.astro`.
*   Hero widgets: Substack via `src/scripts/components/widgets.js` (`#widgets-newsletter`, rss2json); LinkedIn via `src/components/LinkedInFeed.astro` (build-time Apify, `APIFY_TOKEN`). Substack URL in `config/feeds.json` → `window.__SITE_RUNTIME__.feeds`.
*   `src/scripts/utils/data.js` — `slugify`, `normalizeImages`, `projectEndTimestamp`, date formatting (shared logic with renderers).

## 1b. Commands (CRITICAL)

| Command | Action |
|---------|--------|
| `npm run dev` | `sync-public` → Astro dev (port 4321) |
| `npm run build` | `sync-public` → static `dist/` |
| `npm run preview` | Preview `dist/` |
| `npm run new:project -- "Title"` | Scaffold `src/content/projects/<slug>.md` |
| `npm run reformat:content` | Normalize frontmatter (quote `when`, dates, image/link lines) |
| `npm run export:data` | Regenerate gitignored root `data.json` only |

### Tooling scripts (`scripts/`)

| Script | Purpose |
|--------|---------|
| `sync-public.mjs` | Runs automatically before dev/build — assembles `public/`, syncs `config/*.json` → `src/data/`, exports `data.json` |
| `new-project.mjs` | Scaffold `src/content/projects/<slug>.md` from template |
| `reformat-content-notes.mjs` | Normalize frontmatter (uses `content-normalize.mjs`) |
| `export-data-json.mjs` | Legacy JSON export from Markdown collections |
| `update_colors.py` | Scan content for image paths; update `config/colors.json` (dominant RGB for neon glows) |
| `generate_coverflow_images.py` | Generate `preview/` + `small/` WebP variants for face-tagged images |

**`sync-public.mjs`** copies `assets/`, `connect4/`, and `static/*` → `public/`; syncs `config/colors.json`, `config/seo.json`, and `config/feeds.json` → `src/data/`; runs `export-data-json.mjs`.

**Production runtime**: Portfolio data is inlined in `window.__SITE_RUNTIME__` at build — do not add a production `fetch('data.json')`.

## 1c. Obsidian Base

*   `src/content/Portfolio.base` — card/table views (Projects, Hackathons, Awards); formulas for covers, `whenSort`, `endDateSort`.
*   `src/content/Portfolio.md` — hub with embeds.
*   Updates automatically when notes change; edit `Portfolio.base` only to change views/formulas.
*   **`when` must be quoted** in frontmatter (`"2024/06"`) or Obsidian parses it as a Date and breaks formulas.

## 2. Design System (CRITICAL)

*   **Theme**: Dark glassmorphism; premium Light Mode via `theme.js` / `[data-theme="light"]` using elegant white glass-wash transparent overrides, warm amber-toned gradients for `impactful-highlight` cards, cool slate-toned card borders/texts for `notable-highlight`, active-tab glows, pointer timeline hovers, and animated title typography gradients.
*   **3D Coverflow Gallery**: `src/scripts/components/coverflow.js` uses scroll listeners optimized with `requestAnimationFrame` to apply smooth 3D perspective translations (`perspective(1000px) rotateY(...) scale(...) translateZ(...)`) to cards. Includes an ambient backdrop glow element (`.coverflow-ambient-glow`) which dynamically changes colors (`--card-glow-rgb`) to match the dominant colors of the center-most active card. Respects `prefers-reduced-motion`.
*   **Dynamic Ambient Background**: Handled by `src/scripts/components/ambientBg.js`. Renders 3 particle oscillators on a 4x-downscaled canvas overlaid at `z-index: -2` and blurred heavily using CSS (`filter: blur(80px); opacity: 0.38;`) for fluid performance. Responds to `mousemove` cursor attraction and vertical scroll momentum. Paired with a sparkles toggle button (`#bg-toggle`) that caches active preference to `localStorage` to freeze the loop. In light mode, uses normal blend mode at low opacity (`0.08`) to keep gradient layers clean.
*   **Instant Filtration & Search Engine**: Handled by `src/scripts/components/filter.js`. Offers reactive search, multi-selectable significance filters (`⭐ Impactful` and `✦ Notable`, falling back to `All` when neither is chosen), and tab-scoped tag clouds. Features floating-reveal entry animations via `@keyframes filterReveal` and automatic timeline group accordion auto-expansion when filters are active, and auto-collapsing when cleared. Tab changes are detected reactively via a `MutationObserver` on panel visibility classes.
    *   **Dynamic Expandable Tag Cloud**: Supported by a layout shifting system when tag elements exceed a single row height (> 38px). The "More"/"Less" toggle button (`#tags-toggle-btn`) and the parent `.tags-cloud-container` leverage the `.expanded` class. When collapsed, `.tags-cloud` uses a horizontal row layout with `flex: 1` to share space with the button. When expanded via click, `.tags-cloud-container.expanded` switches to a vertical flex column direction with `width: 100%` and `flex: none` on `.tags-cloud.expanded`. This forces the tag cloud to expand up to `500px` height, occupy 100% horizontal width, and wrap/spill naturally to the right. The toggle button (`#tags-toggle-btn`) is aligned to the bottom-right via `align-self: flex-end`, changing its text to "Less" and rotating the chevron icon.
*   **Colors**: `config/colors.json` from `python scripts/update_colors.py` (reads image paths from content; synced to `src/data/` on build).
*   **Coverflow Config**: `*face` / `!` on image lines in frontmatter → face in coverflow carousel.
*   **Responsive**: Mobile-first; optional tab highlight fallbacks: `assets/*_highlight.webp`.
*   **Platform-Intelligent Links Popup**: Handled by `src/scripts/components/linksPopup.js`. Automatically parses external and internal URLs to display platform badges (GitHub, LinkedIn, Devpost, YouTube, Section markers). On mobile (<= 768px), it morphs into an elegant slide-up bottom drawer (`mobile-drawer`) with a grab handle, dark backdrop overlay, and smooth CSS entry/exit animations. Fully supports ESC key close.

### Adding images (agents)

1. Add WebP to `assets/tab-panels/` (or `assets/icons/` for tagline).
2. Reference in frontmatter (`file.webp`, `file.webp*caption*face`, etc.).
3. If **coverflow face**: run `python scripts/generate_coverflow_images.py` then `python scripts/update_colors.py`.
4. Run `npm run dev` or `npm run build` to sync `assets/` → `public/`.

## 3. Components & Update Rules

*   **Tabs / timeline**: Pre-rendered at build from collections; grouped hackathons/awards by `when`; awards sorted impactful → notable → name within month (`renderTimeline.ts`).
*   **Projects sort**: Newest `endDate` first; ongoing/missing end date → top (`projectEndTimestamp` in `data.js`).
*   **Navigation**: `#projects`, `#hackathons`, `#awards`, `#tab/slug` — `src/scripts/components/navigation.js`; slugs = `slugify(title|name)` = `.md` basename.
*   **Hero**: `src/content/hero/intro.md` only.
*   **Icons**: `src/scripts/icons.js` → rebuild after edits.

## 4. Frontmatter conventions (agents)

*   Dates: `"2024-06-01"` for `startDate` / `endDate` (quoted ISO).
*   Timeline: `when: "2025/03"` (quoted `YYYY/MM`).
*   Highlight: `significance: impactful | notable` (not boolean `impactful:` / `notable:` in new content).
*   Tags/badges: YAML list with hyphens (`Chrome-Ext` → displayed as spaces).
*   Images: `file.webp`, `file.webp*caption*face`, wikilinks `[[file|caption]]`; default folder `assets/tab-panels/`.
*   Links: quoted `[Label](url)` per line; optional date: `[Label | 2024/03/03](url)`. Cross-refs to other entries: `"[[award] Title](#awards/slug)"` / `[[project]…](#projects/…)` / `[[hackathon]…](#hackathons/…)` — **double** `[` before the type prefix (see CONTENT.md). Parsed by `parseMarkdownLinkLine` in `content-normalize.mjs`.
*   Body: plain description below frontmatter (not in YAML).

Templates: `src/content/_templates/{project,hackathon,award}.md`.

## 5. SEO / AEO

| File | Role |
|------|------|
| `config/seo.json` | Canonical URL, meta, JSON-LD source → synced to `src/data/seo.json` |
| `config/feeds.json` | Substack RSS URL for newsletter widget → synced to `src/data/feeds.json` |
| `static/robots.txt` | Copied to `public/`; points to `sitemap-index.xml` |
| `static/llms.txt` | AI-readable summary |
| `dist/sitemap-index.xml` | `@astrojs/sitemap` on build |

## 6. Agent rules

1.  **Content**: Edit `src/content/**/*.md`; prefer `npm run reformat:content` after bulk YAML changes.
2.  **Do not** hand-edit `data.json` or commit `dist/` or `public/`.
3.  **CSS**: Use existing variables in `src/styles/site.css`; avoid new frameworks.
4.  **New face image**: add `*face` in frontmatter → `python scripts/generate_coverflow_images.py` → `python scripts/update_colors.py` → rebuild.
5.  **Connect Four**: `connect4/` — separate static mini-app; keep out of portfolio content paths.
6.  **CI**: `.github/workflows/pages.yml` (deploy), `.github/workflows/lighthouse.yml` (audits) — do not break Node ≥22.12.

Full authoring guide: **[CONTENT.md](CONTENT.md)**.
