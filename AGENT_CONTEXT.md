# AI Agent Context: prajwal.is-a.dev Portfolio

This document provides architectural, stylistic, and operational context for any AI agent assisting with the `Toricane.github.io` repository.

## 1. Project Overview & Architecture
*   **Tech Stack**: Pure HTML5, Vanilla CSS3 (Custom Properties / Variables), and Vanilla JavaScript (ES Modules). **NO** heavy frameworks (like React, Vue, or Tailwind) are used.
*   **Data-Driven Content**: Portfolio content (Projects, Hackathons, Awards) is dynamically injected from `data.json`. Never hardcode content items in the HTML; always update `data.json`.
*   **Module Structure**:
    *   JS components are located in `scripts/components/` (e.g., `coverflow.js`, `tabs.js`, `theme.js`).
    *   `scripts/main.js` acts as the primary orchestrator, orchestrating the fetching of `data.json` and initializing components.
    *   `styles.css` handles styling monolithically but is highly structured with CSS variables at the root.

## 2. Design System & Aesthetics (CRITICAL)
*   **Theme**: Dark/Midnight aesthetic (Glassmorphism inspired) with high-contrast, vibrant neon blue/green accents.
*   **Animations & Glows**:
    *   The site relies heavily on CSS `box-shadow` for glowing effects (e.g., the Coverflow gallery images glow heavily on hover).
    *   Micro-interactions, smooth scrolling, and perspective transformations (like `transform: perspective() rotateY()`) are key to the UI's futuristic, premium feel.
    *   Do **NOT** introduce flat, generic design patterns. Always ensure new elements match the rich, dynamic visual language (glassy backgrounds via `backdrop-filter`, neon borders).
*   **Responsive**: Mobile-first approach with flexible grids and flexbox.

## 3. Notable Components Update Rules
*   **Coverflow (`coverflow.js`)**: Pulls images dynamically from `data.json` where `"face": true`. Recent updates implemented pre-calculated colored borders and "faded" glows on hover to improve performance. 
    *   **CRITICAL:** When you add a new image to `data.json` with `"face": true`, you MUST run `python scripts/update_colors.py` (requires `Pillow`, install via `pip install -r requirements.txt`) to extract the dominant color and update `colors.json`. This `colors.json` prevents heavy client-side canvas processing on page load.
*   **Tabs & Timeline**: The middle section uses a tabbed switcher (Projects/Hackathons/Awards) connected to a vertical timeline. Highlight images are updated depending on the active tab and scroll position.
*   **Image Management**: 
    *   Uses high-res images in `assets/tab-panels/` and WebP thumbnails in `assets/tab-panels/preview/` for optimization.
    *   Always maintain this thumbnail/full-size dual setup when adding new images.

## 4. Development & Editing Rules
1.  **Do Not Transpile**: Write ES6+ Vanilla JS. No build step required natively.
2.  **CSS Edits**: Use existing CSS variables (e.g., `--bg-color`, `--text-color`, `--accent-color`). When adding new complex animations, test thoroughly to ensure no overflow/clipping.
3.  **Local Testing**: The live server should be running at `http://127.0.0.1:5500`. Use it if needed. If that does not work and you need it, you may start it manually. Use `python -m http.server 8000` or similar to run locally. Ensure changes to `data.json` are reflected correctly without caching issues.
4.  **No Extraneous Dependencies**: Avoid adding external libraries unless absolutely necessary. Rely on native browser APIs where possible (Anime.js is included but native CSS transitions are preferred for simple effects).
