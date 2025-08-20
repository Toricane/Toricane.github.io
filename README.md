# Portfolio Site – prajwal.is-a.dev

Static, fast, framework‑free personal site built with:

-   HTML for content (minimal above‑the‑fold markup)
-   Modern CSS (custom properties, responsive grid, no preprocessor)
-   Tiny vanilla JS for tabs, data loading, and microanimations (anime.js on demand)

## Features

-   Split hero (intro + connections pill + portrait + live side widgets)
-   Accessible tabbed section (Projects / Hackathons / Awards)
-   Content populated from `data.json` (easy edits without touching HTML)
-   Optional side widgets (placeholder newsletter + LinkedIn post)
-   Microanimation mode via query flag `?tap=true` (lights up connections pill)
-   Open Graph + Twitter meta, JSON‑LD Person schema, skip link
-   Mobile friendly (collapses layout, hides pill labels on very small widths)

## Editing Content

Projects / hackathons / awards are in `data.json`:

```
{
	"projects": [{"title":"…","description":"…","tags":["..."]}],
	"hackathons": [{"year":"2025","name":"…","description":"…","badges":["Winner"]}],
	"awards": [{"year":"2024","name":"…","description":"…"}]
}
```

Add / remove items and push – no other build step required.

## Development

Open the folder and use any static server (or just open `index.html`).

On Windows PowerShell you can run a quick local server:

```powershell
python -m http.server 8080
```

Navigate to http://localhost:8080

Trigger tap animation mode:

```
http://localhost:8080/?tap=true
```

### Tab Highlight Images

The Projects / Hackathons / Awards tabs support an optional visual highlight card on the right (or below on mobile). To enable, add any (or all) of these files under `assets/`:

```
assets/
	projects_highlight.jpg
	hackathons_highlight.jpg
	awards_highlight.jpg
```

Filenames are hard‑coded – adjust in `scripts.js` (`highlightMap`) if you prefer different names or formats (PNG / WebP also fine). Missing images are ignored gracefully.

## Roadmap Ideas

-   Replace placeholder widget text with real Substack & LinkedIn content (requires proxy / API integration)
-   Add light / dark theme toggle (currently dark only)
-   Add print / PDF resume link
-   Lighthouse performance & a11y audit automation (GitHub Action)

## License

All custom code MIT. Personal content © Prajwal Prashanth.
