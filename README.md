# Portfolio Site – prajwal.is-a.dev

Modern, accessible personal portfolio website for Prajwal Prashanth, featuring a dynamic showcase of projects, hackathons, and awards. Built as a static site with progressive enhancement.

## 🚀 Live Site

Visit: **[prajwal.is-a.dev](https://prajwal.is-a.dev)**

## ✨ Features

### 🎨 Design & Layout

-   **Split Hero Section**: Engaging introduction with animated image carousel
-   **Tabbed Content System**: Interactive Projects / Hackathons / Awards sections
-   **Coverflow Gallery**: Smooth infinite-scroll image showcase with dynamic color-extracted glow effects
-   **Dynamic Highlight Images**: Tab-synchronized visual previews
-   **Responsive Design**: Mobile-first approach with adaptive layouts

### 🎯 User Experience

-   **Accessibility First**: ARIA labels, skip links, keyboard navigation
-   **Progressive Enhancement**: Works without JavaScript, enhanced with it
-   **Smooth Animations**: Subtle transitions and scroll behaviors
-   **Social Integration**: Newsletter widgets and social media links
-   **Deep Linking**: Hash URLs switch tabs, expand grouped timeline entries, scroll to items, and flash a highlight
-   **PWA Ready**: Web app manifest for install shortcuts

### 🔧 Technical Excellence

-   **Framework-Free**: Pure HTML, CSS, and vanilla JavaScript
-   **Performance Optimized**: Blocking minified CSS/JS, inlined runtime payload, lazy images, `content-visibility` on inactive panels
-   **SEO / AEO Enhanced**: Open Graph, Twitter Cards, canonical URLs, JSON-LD `@graph`, `robots.txt`, Astro sitemap (`sitemap-index.xml`), and `llms.txt`
-   **Content Management**: Markdown notes in `src/content/` (Obsidian-friendly); see [CONTENT.md](CONTENT.md)

### 🎭 Interactive Elements

-   **Dynamic Neon Glows**: Coverflow images dynamically project a colorful neon border and shadow based on the image's intrinsic colors
-   **Footnote System**: Hover/tap expandable footnotes in the introduction
-   **Connection Pills**: Animated social media links with labels
-   **Scroll Interactions**: Smart scroll-to-content and button hiding
-   **Animation Mode**: `?tap=true` — connection pills animate in; LinkedIn pulses immediately, then once per second
-   **Dynamic Year**: Auto-updating copyright year

## 📁 Project Structure

```
├── src/                    # Astro site (pages, components, client scripts)
├── dist/                   # Production build output (gitignored; deployed to GitHub Pages)
├── package.json            # Build scripts and dependencies
├── seo.json                # Site URL, descriptions, JSON-LD source
├── robots.txt              # Crawler rules + sitemap pointer (copied to public/ on build)
├── llms.txt                # AI-readable site summary
├── styles.css              # Complete monolithic styling (imported by Astro)
├── AGENT_CONTEXT.md        # Architectural rules and context for AI agents
├── scripts/
│   ├── sync-public.mjs     # Copies assets → public/; exports data.json from content
│   ├── export-data-json.mjs # Writes root data.json from src/content/
│   ├── generate_coverflow_images.py # Responsive WebP variants for coverflow LCP
│   └── update_colors.py    # Regenerates colors.json from face images
├── src/content/            # Portfolio Markdown (projects, hackathons, awards, hero)
├── CONTENT.md              # How to edit content in Obsidian
├── data.json               # Generated from src/content/ on build (mirror for tooling; site does not read it)
├── site.webmanifest        # PWA configuration
├── CNAME                   # Custom domain configuration
├── assets/                 # Images and media
│   ├── northernlights.webp    # Hero portrait (coverflow face image)
│   ├── northernlights-{480,640,960}.webp  # Responsive coverflow variants (optional)
│   ├── projects_highlight.jpg # Projects tab highlight
│   ├── hackathons_highlight.jpg # Hackathons tab highlight
│   ├── awards_highlight.jpg   # Awards tab highlight
│   └── tab-panels/            # Full-size images for projects/hackathons/awards
│       ├── [image files].jpg  # Original high-resolution images
│       └── preview/           # Optimized preview images (400px max width, WebP)
│           └── [image files].webp # Smaller versions for fast loading thumbnails
├── connect4/               # Connect Four game sub-project
│   ├── index.html
│   ├── connect4_script.js
│   └── connect4_styles.css
└── [favicon files]         # Complete favicon set for all devices
```

## 📝 Content Management

Portfolio content is managed through Markdown files in `src/content/`. Each project, hackathon, and award is its own note with YAML frontmatter. See [CONTENT.md](CONTENT.md). Root `data.json` is auto-generated from those notes on build. Structure for reference:

### Projects

```json
{
    "projects": [
        {
            "title": "Project Name",
            "live": false,
            "from": "Organization/Context",
            "date": "Jan 2024 – Dec 2024",
            "description": "Detailed project description...",
            "tags": ["AI", "Edge", "C++"],
            "link": "https://project-url.com"
        }
    ]
}
```

### Hackathons

```json
{
    "hackathons": [
        {
            "when": "2025/03",
            "items": [
                {
                    "name": "Event Name – Project (Placement)",
                    "from": "Hackathon Name",
                    "description": "Project description...",
                    "badges": ["Winner", "In-Person"],
                    "link": "https://devpost-url.com",
                    "gold": true // Optional: adds special styling
                }
            ]
        }
    ]
}
```

### Awards

```json
{
    "awards": [
        {
            "when": "2025/06",
            "summary": "Optional grouping description",
            "items": [
                {
                    "name": "Award Name",
                    "from": "Issuing Organization",
                    "description": "Award details...",
                    "tags": ["Academic", "Leadership"],
                    "link": "https://award-link.com",
                    "gold": true // Adds special golden styling
                }
            ]
        }
    ]
}
```

## 🛠 Development

### Quick Start

```powershell
# Clone the repository
git clone https://github.com/Toricane/Toricane.github.io.git
cd Toricane.github.io

# Setup Python Virtual Environment (for image color extraction)
python -m venv .venv
# On Windows: .venv\Scripts\activate
# On Mac/Linux: source .venv/bin/activate
pip install -r requirements.txt

# Install dependencies
npm install

# Astro dev server
npm run dev
```

Navigate to `http://localhost:4321` (Astro). Production build: `npm run build` → output in `dist/`. Preview: `npm run preview`.

### Special Features

-   **Animation Mode**: Add `?tap=true` for connection pill entrance animations and a pulsing LinkedIn highlight (immediate, then every 1s for 15s)
-   **Content Updates**: Edit content sources and rebuild static output.
    -   Primary content: `src/content/` (see [CONTENT.md](CONTENT.md))
    -   Hero intro: `src/content/hero/intro.md`
    -   Build command: `npm run build`
    -   *Coverflow Exception*: If you added a new image with `"face": true` (which appears in the Coverflow), run `python scripts/update_colors.py` to pre-calculate its glow color into `colors.json`.
-   **Image Assets**: Replace files in `/assets/` to update highlight images
-   **Image Optimization**: Tab panel thumbnails use `assets/tab-panels/preview/` (400px WebP); coverflow uses full `tab-panels/` images with responsive `srcset`
-   **Rebuild after asset/CSS/JS changes**: `npm run build` (syncs `public/`, compiles Astro → `dist/`)
-   **Coverflow hero variants** (optional): `python scripts/generate_coverflow_images.py` when face images change
-   **Content updates**:
       1. Edit notes under `src/content/` and/or `src/content/hero/intro.md`
       2. Run `npm run build` (or push to `main` — GitHub Actions runs the same build)
       3. Commit source changes only (`dist/` is not committed)
-   **SEO-only tweak**: Edit [`seo.json`](seo.json) and rebuild.

### Browser Support

-   Modern browsers with ES6+ support
-   Graceful degradation for older browsers
-   Mobile browsers with touch support

## 🎮 Bonus: Connect Four Game

Includes a complete Connect Four game with AI opponent:

-   Adjustable AI difficulty (1-10 levels)
-   Minimax algorithm with alpha-beta pruning
-   Clean, responsive game interface
-   Located at `/connect4/`

## 🚀 Deployment

This site is configured for GitHub Pages deployment:

-   **Custom Domain**: `prajwal.is-a.dev` (configured via CNAME)
-   **Branch**: Deploys from `main` branch
-   **Static Hosting**: No server-side processing required

### Deploy to GitHub Pages

1. Fork/clone this repository
2. Update `CNAME` with your domain (or remove for github.io subdomain)
3. Add content under `src/content/` (see [CONTENT.md](CONTENT.md))
4. Replace images in `/assets/` with your own
5. Enable GitHub Pages in repository settings

## 📊 Performance Features

-   **Astro static build**: Minified CSS/JS in `dist/_astro/`
-   **Inlined runtime**: `window.__SITE_RUNTIME__` at build (~12KB) — no production `data.json` fetch
-   **System UI typography**: No Google Fonts or Font Awesome CDN
-   **Inline SVG icons**: [src/scripts/icons.js](src/scripts/icons.js) — FA 6.5.2 paths
-   **Lazy loading**: Tab thumbs, coverflow off-screen cards, highlight carousel deferred until visible
-   **Conditional anime.js**: Loaded only when `?tap=true`
-   **Dynamic widgets**: Newsletter module imported after idle / intersection
-   **Coverflow LCP**: Preload set in JS for the actual center card after shuffle (not a static head preload)

## 🎨 Customization

### Colors & Theming

Main theme colors defined in CSS custom properties:

-   Background: `#060809` (Dark)
-   Text: `#d8e3ec` (Light)
-   Accents: Various blue/green gradients

### Layout Modifications

-   Hero section layout in `.hero-inner`
-   Tab system in `.tabs` and `.tab-layout`
-   Responsive breakpoints throughout CSS

### Content Areas

1. **Hero Introduction**: Edit [src/content/hero/intro.md](src/content/hero/intro.md)
2. **Social Links**: Update [src/data/connections.ts](src/data/connections.ts)
3. **Portfolio Content**: Add/edit Markdown under [src/content/](src/content/) — see [CONTENT.md](CONTENT.md)
4. **Footnotes**: Inline expandable explanations

### Tagline Icons

Tagline icons (inline emoji-sized icons)

-   Path: `assets/icons/`
-   Purpose: Small square, transparent WEBP icons inserted immediately before certain links in the tagline (they behave like inline emoji and are sized via CSS to `1em`).
-   Filenames referenced by `src/content/hero/intro.md` (default):
    -   `langara.webp`
    -   `ubc.webp`
    -   `jarvis.webp`
    -   `vancouver-ai.webp`
    -   `hackthenorth.webp`
    -   `nwhacks.webp`
-   Recommended source size: export square transparent WEBP files at 128×128 px for a good balance of quality and file size.
-   High-DPI / srcset (optional): provide a `@2x` version (256×256 px) and use `srcset` so browsers pick the best pixel density. Example markup used in `index.html` can be:

    ```html
    <img
        class="tag-icon"
        src="assets/icons/langara.webp"
        srcset="assets/icons/langara.webp 1x, assets/icons/langara@2x.webp 2x"
        alt=""
    />
    ```

-   Notes:
    -   The CSS forces the icon to render at `1em` (roughly 16px on most browsers). Supplying a 128px source makes the icon crisp on Retina / high-DPR displays.
    -   Tagline icons use `alt=""` (decorative) because the surrounding link text is the accessible name. Generated by [scripts/generate_hero_tagline.js](scripts/generate_hero_tagline.js).
    -   **Mobile connections**: CSS hides label spans only (`.connections a span:not(.svg-icon)`), not `.svg-icon` wrappers.
    -   If you prefer vector graphics, replace WEBP with SVG and update the `src` attributes accordingly.

### Tab Highlight Images

The Projects / Hackathons / Awards tabs support an optional visual highlight card on the right (or below on mobile). To enable, add any (or all) of these files under `assets/`:

```
assets/
	projects_highlight.jpg
	hackathons_highlight.jpg
	awards_highlight.jpg
```

Fallback filenames are defined in `src/scripts/components/tabs.js` (`fallbackMap`). The highlight area also auto-cycles images from content. Missing fallbacks are ignored gracefully.

**Recommended size**: For optimal quality across all screen sizes, use 1440px width (2x the maximum display width of 500px) with aspect ratio preserved.

### Tab Panel Images

Images displayed in the Projects, Hackathons, and Awards sections support an optimized preview system for better performance:

-   **Full-size images**: Store original high-resolution images in `assets/tab-panels/`
-   **Preview images**: Create smaller WebP versions (400px max width, preserving aspect ratio) in `assets/tab-panels/preview/`
-   **Automatic switching**: Thumbnails load preview images for fast display; clicking opens the full-size image in a viewer
-   **Fallback**: If preview doesn't exist, falls back to the original image

This system reduces initial page load time while maintaining image quality in the viewer.

The **coverflow carousel** loads full-resolution `assets/tab-panels/` images (with responsive `srcset` for hero variants), not the `preview/` thumbnails.

## 🔍 SEO, AEO & Discoverability

Static files at the site root help crawlers and AI systems find and understand the site:

| File | Purpose |
|------|---------|
| [`robots.txt`](robots.txt) | Allows major crawlers; points to `sitemap-index.xml` |
| `dist/sitemap-index.xml` | Sitemap index (generated by `@astrojs/sitemap` on build) |
| [`llms.txt`](llms.txt) | Short site summary and key URLs for AI systems |
| [`seo.json`](seo.json) | Canonical URL, meta copy, JSON-LD Person/WebSite/WebPage/ProfilePage |

`npm run build` emits SEO head tags and the sitemap under `dist/`. Submit `https://prajwal.is-a.dev/sitemap-index.xml` in Google Search Console after deploy.

### Internal links & deep URLs

- **Hero tagline** ([`src/content/hero/intro.md`](src/content/hero/intro.md)): Use absolute same-origin links (`https://prajwal.is-a.dev/...`) for in-copy internal navigation; the build omits `target="_blank"` on those.
- **Cross-references in content frontmatter / hero**: Use `#tab/slug` URLs (e.g. `#awards/ingenious-regional-grant-cad-1k`). Slugs must match `slugify()` on the item title (lowercase, non-alphanumeric → hyphens). Verify with the rendered `data-slug` attribute after build.
- **Supported hash patterns** (handled by [`src/scripts/components/navigation.js`](src/scripts/components/navigation.js)):
    - `#content` — scroll to the work section
    - `#projects`, `#hackathons`, `#awards` — switch tab and scroll
    - `#projects/jarvis-for-the-visually-impaired` — switch tab, expand grouped entries if needed, scroll, and apply `.nav-highlight`

## Roadmap Ideas

-   Replace placeholder widget text with real Substack & LinkedIn content (requires proxy / API integration)
-   Automate Lighthouse / a11y audits in CI (GitHub Action)
-   Add print / PDF resume link

## License

All custom code MIT. Personal content © Prajwal Prashanth.

Design inspired by [kevinjosethomas.com](https://www.kevinjosethomas.com/) ([GitHub](https://github.com/kevinjosethomas/kevinjosethomas)).

---

Built with ❤️ by [Prajwal Prashanth](https://prajwal.is-a.dev) • Licensed under MIT

