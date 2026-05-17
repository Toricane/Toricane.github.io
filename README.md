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
-   **SEO / AEO Enhanced**: Open Graph, Twitter Cards, canonical URLs, JSON-LD `@graph`, `robots.txt`, `sitemap.xml`, and `llms.txt`
-   **Content Management**: JSON-driven content system for easy updates

### 🎭 Interactive Elements

-   **Dynamic Neon Glows**: Coverflow images dynamically project a colorful neon border and shadow based on the image's intrinsic colors
-   **Footnote System**: Hover/tap expandable footnotes in the introduction
-   **Connection Pills**: Animated social media links with labels
-   **Scroll Interactions**: Smart scroll-to-content and button hiding
-   **Animation Mode**: `?tap=true` — connection pills animate in; LinkedIn pulses immediately, then once per second
-   **Dynamic Year**: Auto-updating copyright year

## 📁 Project Structure

```
├── index.html              # Main portfolio page (build output: pre-rendered + minified)
├── package.json            # Build scripts and dependencies
├── seo.json                # Site URL, descriptions, sitemap entries (injected at build)
├── robots.txt              # Crawler rules + sitemap pointer
├── sitemap.xml             # Generated URL list (build output)
├── llms.txt                # AI-readable site summary
├── styles.css              # Complete monolithic styling
├── styles.min.css          # Generated minified stylesheet (build output)
├── AGENT_CONTEXT.md        # Architectural rules and context for AI agents
├── scripts/
│   ├── main.js             # Entry point for client logic
│   ├── main.min.js         # Generated bundled/minified JS (build output)
│   ├── build.js            # Full build: hero, SEO head, sitemap, pre-render, minify
│   ├── icons.js            # Inline FA 6.5.2 SVGs + build-time icon injection
│   ├── seo.js              # Canonical + JSON-LD injection helpers
│   ├── generate-sitemap.js # Writes sitemap.xml from seo.json + data.json dates
│   ├── generate_hero_tagline.js # Compiles hero-tagline.md into HTML
│   ├── generate_coverflow_images.py # Responsive WebP variants for coverflow LCP
│   ├── utils/siteData.js   # Runtime payload generator for production
│   └── components/         # Feature modules (tabs, coverflow, navigation, tapMode, …)
├── templates/
│   ├── hero-tagline.md     # Author-friendly hero intro source
│   └── hero-tagline.html   # Generated hero intro HTML
├── data.json               # Content data (projects, hackathons, awards)
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

All portfolio content is managed through `data.json` with the following structure:

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

# Install JS dependencies for build pipeline
npm install

# Start local development server
python -m http.server 8080
```

Navigate to `http://localhost:8080`

### Special Features

-   **Animation Mode**: Add `?tap=true` for connection pill entrance animations and a pulsing LinkedIn highlight (immediate, then every 1s for 15s)
-   **Content Updates**: Edit content sources and rebuild static output.
    -   Primary content source: `data.json`
    -   Hero intro source: `templates/hero-tagline.md`
    -   Build command: `npm run build-html`
    -   *Coverflow Exception*: If you added a new image with `"face": true` (which appears in the Coverflow), run `python scripts/update_colors.py` to pre-calculate its glow color into `colors.json`.
-   **Image Assets**: Replace files in `/assets/` to update highlight images
-   **Image Optimization**: Tab panel thumbnails use `assets/tab-panels/preview/` (400px WebP); coverflow uses full `tab-panels/` images with responsive `srcset`
-   **Rebuild after asset/CSS/JS changes**: `npm run build-html` regenerates `index.html`, `styles.min.css`, and `scripts/main.min.js`
-   **Coverflow hero variants** (optional): `python scripts/generate_coverflow_images.py` when face images change
-   **Content Updates & Pre-rendering**:
       1. Edit `data.json` and/or `templates/hero-tagline.md`
    2. Run `npm run build-html` to regenerate `templates/hero-tagline.html`, `sitemap.xml`, bundle/minify client assets (`scripts/main.min.js`, `styles.min.css`), inject SEO head tags, and pre-render all content into `index.html`
    3. Commit source changes and updated generated files (`index.html`, `sitemap.xml`, `styles.min.css`, `scripts/main.min.js`, optionally `templates/hero-tagline.html`)
       4. Push to GitHub – Pages auto-deploys
       - **Why pre-render?** Ensures crawlers, AI agents, and users with JavaScript disabled can see all content. Improves performance by embedding content at build time.
    - **How it works**: The build script compiles `templates/hero-tagline.md` to HTML, generates `sitemap.xml`, bundles/minifies JS and CSS with esbuild, uses jsdom to pre-render tab panels, injects hero + SEO head metadata from `seo.json`, and minifies `index.html`.
    - **SEO-only tweak**: Edit [`seo.json`](seo.json) and rebuild; do not hand-edit JSON-LD in generated `index.html`.

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
3. Edit `data.json` with your content
4. Replace images in `/assets/` with your own
5. Enable GitHub Pages in repository settings

## 📊 Performance Features

-   **Blocking bundles**: `styles.min.css` and deferred `scripts/main.min.js` (esbuild)
-   **Inlined runtime**: `window.__SITE_RUNTIME__` at build (~12KB) — no production `data.json` fetch
-   **System UI typography**: No Google Fonts or Font Awesome CDN
-   **Inline SVG icons**: [scripts/icons.js](scripts/icons.js) — FA 6.5.2 paths, injected at build
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

1. **Hero Introduction**: Edit `templates/hero-tagline.md` (compiled into `templates/hero-tagline.html` during build)
2. **Social Links**: Update hrefs/labels in the `.connections` section (icons are inline SVGs from [scripts/icons.js](scripts/icons.js))
3. **Portfolio Content**: Manage via `data.json`
4. **Footnotes**: Inline expandable explanations

### Tagline Icons

Tagline icons (inline emoji-sized icons)

-   Path: `assets/icons/`
-   Purpose: Small square, transparent WEBP icons inserted immediately before certain links in the tagline (they behave like inline emoji and are sized via CSS to `1em`).
-   Filenames referenced by `templates/hero-tagline.md` / generated `index.html` (default):
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

Fallback filenames are defined in `scripts/components/tabs.js` (`fallbackMap`). The highlight area also auto-cycles images from `data.json`. Missing fallbacks are ignored gracefully.

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
| [`robots.txt`](robots.txt) | Allows major crawlers; points to the sitemap |
| [`sitemap.xml`](sitemap.xml) | Lists `/` and `/connect4/` with `lastmod` (regenerated on build) |
| [`llms.txt`](llms.txt) | Short site summary and key URLs for AI systems |
| [`seo.json`](seo.json) | Canonical URL, meta copy, JSON-LD Person/WebSite/WebPage/ProfilePage |

`npm run build-html` injects the canonical link and JSON-LD `@graph` into `index.html` from `seo.json`. Submit `https://prajwal.is-a.dev/sitemap.xml` in Google Search Console after deploy.

### Internal links & deep URLs

- **Hero tagline** ([`templates/hero-tagline.md`](templates/hero-tagline.md)): Use absolute same-origin links (`https://prajwal.is-a.dev/...`) for in-copy internal navigation; the build omits `target="_blank"` on those.
- **Cross-references in `data.json`**: Use `#tab/slug` URLs (e.g. `#awards/ingenious-regional-grant-cad-1k`). Slugs must match `slugify()` on the item title (lowercase, non-alphanumeric → hyphens). Verify with the rendered `data-slug` attribute after build.
- **Supported hash patterns** (handled by [`scripts/components/navigation.js`](scripts/components/navigation.js)):
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

