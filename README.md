# Portfolio Site – prajwal.is-a.dev

Modern, accessible personal portfolio website for Prajwal Prashanth, featuring a dynamic showcase of projects, hackathons, and awards. Built as a static site with progressive enhancement.

## 🚀 Live Site

Visit: **[prajwal.is-a.dev](https://prajwal.is-a.dev)**

## ✨ Features

### 🎨 Design & Layout

-   **Split Hero Section**: Engaging introduction with animated image carousel
-   **Tabbed Content System**: Interactive Projects / Hackathons / Awards sections
-   **Coverflow Gallery**: Smooth infinite-scroll image showcase
-   **Dynamic Highlight Images**: Tab-synchronized visual previews
-   **Responsive Design**: Mobile-first approach with adaptive layouts

### 🎯 User Experience

-   **Accessibility First**: ARIA labels, skip links, keyboard navigation
-   **Progressive Enhancement**: Works without JavaScript, enhanced with it
-   **Smooth Animations**: Subtle transitions and scroll behaviors
-   **Social Integration**: Newsletter widgets and social media links
-   **PWA Ready**: Web app manifest and service worker support

### 🔧 Technical Excellence

-   **Framework-Free**: Pure HTML, CSS, and vanilla JavaScript
-   **Performance Optimized**: Preloaded fonts, lazy loading, efficient rendering
-   **SEO Enhanced**: Open Graph, Twitter Cards, JSON-LD structured data
-   **Content Management**: JSON-driven content system for easy updates

### 🎭 Interactive Elements

-   **Footnote System**: Hover/tap expandable footnotes in the introduction
-   **Connection Pills**: Animated social media links with labels
-   **Scroll Interactions**: Smart scroll-to-content and button hiding
-   **Animation Mode**: Special `?tap=true` query parameter for enhanced animations
-   **Dynamic Year**: Auto-updating copyright year

## 📁 Project Structure

```
├── index.html              # Main portfolio page
├── styles.css              # Complete styling (1600+ lines)
├── scripts.js              # Interactive functionality (950+ lines)
├── data.json               # Content data (projects, hackathons, awards)
├── site.webmanifest        # PWA configuration
├── CNAME                   # Custom domain configuration
├── assets/                 # Images and media
│   ├── northernlights.jpg     # Hero portrait image
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

# Start local development server
python -m http.server 8080
```

Navigate to `http://localhost:8080`

### Special Features

-   **Animation Mode**: Add `?tap=true` to see enhanced connection pill animations
-   **Content Updates**: Simply edit `data.json` and refresh – no build step required
-   **Image Assets**: Replace files in `/assets/` to update highlight images
-   **Image Optimization**: Tab panel images use preview thumbnails (400px max width, WebP) for fast loading, with full-size originals shown in the viewer on click

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

-   **Lazy Loading**: Images load only when needed
-   **Font Optimization**: Preloaded Google Fonts with `font-display: swap`
-   **Efficient Scripts**: Anime.js loaded on-demand
-   **Minimal Dependencies**: Only essential external resources
-   **Mobile Optimized**: Touch-friendly interactions and viewport handling

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

1. **Hero Introduction**: Edit directly in `index.html`
2. **Social Links**: Update in the `.connections` section
3. **Portfolio Content**: Manage via `data.json`
4. **Footnotes**: Inline expandable explanations

---

Built with ❤️ by [Prajwal Prashanth](https://prajwal.is-a.dev) • Licensed under MIT

### Tab Highlight Images

The Projects / Hackathons / Awards tabs support an optional visual highlight card on the right (or below on mobile). To enable, add any (or all) of these files under `assets/`:

```
assets/
	projects_highlight.jpg
	hackathons_highlight.jpg
	awards_highlight.jpg
```

Filenames are hard‑coded – adjust in `scripts.js` (`highlightMap`) if you prefer different names or formats (PNG / WebP also fine). Missing images are ignored gracefully.

**Recommended size**: For optimal quality across all screen sizes, use 1440px width (2x the maximum display width of 500px) with aspect ratio preserved.

### Tab Panel Images

Images displayed in the Projects, Hackathons, and Awards sections support an optimized preview system for better performance:

-   **Full-size images**: Store original high-resolution images in `assets/tab-panels/`
-   **Preview images**: Create smaller WebP versions (400px max width, preserving aspect ratio) in `assets/tab-panels/preview/`
-   **Automatic switching**: Thumbnails load preview images for fast display; clicking opens the full-size image in a viewer
-   **Fallback**: If preview doesn't exist, falls back to the original image

This system reduces initial page load time while maintaining image quality in the viewer.

## Roadmap Ideas

-   Replace placeholder widget text with real Substack & LinkedIn content (requires proxy / API integration)
-   Add light / dark theme toggle (currently dark only)
-   Add print / PDF resume link
-   Lighthouse performance & a11y audit automation (GitHub Action)

## License

All custom code MIT. Personal content © Prajwal Prashanth.

Design inspired by [kevinjosethomas.com](https://www.kevinjosethomas.com/) ([GitHub](https://github.com/kevinjosethomas/kevinjosethomas)).
