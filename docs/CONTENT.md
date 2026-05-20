# Content authoring (Obsidian)

Portfolio content lives in **`src/content/`** as Markdown notes with YAML frontmatter. Open the **repo root** in [Obsidian](https://obsidian.md) to edit and use the Base views.

**Source of truth:** `src/content/**/*.md` (not `data.json`)  
**Generated mirror:** root `data.json` (gitignored) is re-exported on every `npm run dev` / `npm run build` (not used by the live site).

## Frontmatter cheat sheet

| Field | Obsidian format | On site |
|-------|-----------------|--------|
| `title` | Project name (projects only) | Card / list title |
| `name` | Entry name (hackathons / awards) | Timeline title |
| `from` | Plain text | Subtitle line |
| `startDate` / `endDate` | Quoted ISO: `"2024-06-01"` | Project date range |
| `when` | Quoted `YYYY/MM`: `"2025/03"` | Timeline month grouping |
| `groupSummary` | Optional string | Collapsed label when multiple entries share a month |
| `significance` | `impactful`, `notable`, or omit | Impactful/notable highlight |
| `tags` | YAML list, hyphens for spaces: `- Chrome-Ext` | Shown as `Chrome Ext` |
| `badges` | Same as tags (hackathons) | Badge pills on timeline |
| `images` | Short lines (see below) | Thumbnails; `*face` adds coverflow |
| `links` | Quoted markdown links; cross-refs use `[[award] Title](#awards/slug)` | Link popup; internal hash navigation |

### Example (project)

```yaml
---
title: CalendAI
from: buildspace / Community Meetup Demo
startDate: "2024-06-01"
endDate: "2024-07-01"
significance: impactful
tags:
  - Chrome-Ext
  - AI
  - Productivity
images:
  - calendai_demo.webp*CalendAI presentation*face
  - rahul_behal.webp*Met Rahul Behal*face
  - buildspace_idea.webp
links:
  - "[Demo Tweet](https://x.com/...)"
  - "[GitHub](https://github.com/Toricane/calendai)"
---
```

Short description goes in the **note body** (below the frontmatter).

### Example (hackathon / award)

```yaml
---
when: "2024/09"
groupSummary: "Two hackathons with AI-focused projects"
name: "Hack the North 2024 – DaVinci Solve"
from: "Hack the North 2024"
significance: notable
badges:
  - In-Person
images:
  - hackthenorth_hackathon.webp*Team photo*face
links:
  - "[Devpost](https://devpost.com/software/example)"
---
```

## Obsidian Base (live views)

The Base reads your notes automatically — **no need to edit `Portfolio.base` when adding or changing content.**

| File | Purpose |
|------|---------|
| [`src/content/Portfolio.base`](src/content/Portfolio.base) | Card/table views for Projects, Hackathons, Awards |
| [`src/content/Portfolio.md`](src/content/Portfolio.md) | Hub with embedded views |

**Requires Obsidian 1.9+** (card layout). Open the vault at the **repo root** so image paths like `assets/tab-panels/` resolve.

### Views

| View | What it shows |
|------|----------------|
| **Projects** | Card grid; cover + extra thumbnails; sorted by **end date** (newest first; ongoing / missing end date at top — same as the site) |
| **Hackathons** / **Awards** | Cards grouped by month (`whenSort`, newest first); cover images; awards sorted impactful → notable → name within each month |
| **Hackathons (grouped)** | Same cards, grouped by `groupSummary` when the site shows one collapsed timeline row (e.g. Sep 2024) |
| **Projects (edit)** / **Hackathons (edit)** / **Awards (edit)** | Tables with full frontmatter for bulk edits |

**Base vs site:** The site can collapse multiple same-month entries into one accordion row (`groupSummary`). The Base still shows **one card per note**, grouped under the same month (or use **Hackathons (grouped)** for a closer match). Descriptions always live in the note body, not on the cards.

### Important conventions

- **`when` must be quoted** — `when: "2024/06"`. Unquoted values are parsed as dates and break Base formulas (`split` errors).
- **`startDate` / `endDate`** — quoted ISO strings. Run `npm run reformat:content` after bulk edits or Obsidian’s date picker writing long `GMT` strings.
- **Link dates** — put the date inside the brackets: `[Label \| 2024/08/06](url)`, not after the closing `)`.

## Layout

| Folder | What to add |
|--------|-------------|
| `src/content/hero/intro.md` | Hero tagline |
| `src/content/projects/` | One `.md` file per project |
| `src/content/hackathons/` | One `.md` file per hackathon entry |
| `src/content/awards/` | One `.md` file per award entry |
| `src/content/coverflow/` | Optional standalone coverflow face images |
| `src/content/_templates/` | Starter templates (`project`, `hackathon`, `award`) |
| `assets/tab-panels/` | Images referenced in frontmatter (synced to `public/` on build) |

## Add content

### New project

1. Duplicate `src/content/_templates/project.md` or run:
   ```bash
   npm run new:project -- "My Project Title"
   ```
2. Fill frontmatter; write the description in the note body.
3. Add images under `assets/tab-panels/`.
4. For coverflow faces: add `*face` (or `!` after the filename), then:
   ```bash
   python scripts/generate_coverflow_images.py
   python scripts/update_colors.py
   ```
   (`update_colors.py` writes `config/colors.json`; synced to `src/data/` on build.)
5. Preview: `npm run dev` → http://localhost:4321 (syncs `assets/` → `public/` first)

### New hackathon or award

1. Duplicate `src/content/_templates/hackathon.md` or `award.md`.
2. Set **`when: "YYYY/MM"`** (quoted) and optional `groupSummary` if it shares a month with related entries.
3. Same `images` / `links` / `significance` rules as projects.

### Normalize frontmatter

```bash
npm run reformat:content
```

Quotes `when`, dates, and normalizes image/link lines for Obsidian and the build.

## Scripts

| Command / script | Purpose |
|------------------|---------|
| `npm run dev` | Sync assets → `public/`, then Astro dev server |
| `npm run build` | Sync + production build → `dist/` |
| `npm run new:project -- "Title"` | Scaffold a project note |
| `npm run reformat:content` | Normalize frontmatter across `src/content/` |
| `npm run export:data` | Regenerate gitignored root `data.json` |
| `python scripts/generate_coverflow_images.py` | Create `preview/` + `small/` WebP for face-tagged images |
| `python scripts/update_colors.py` | Update `config/colors.json` (coverflow neon colors) |

Python scripts need `pip install -r requirements.txt` (Pillow). `sync-public.mjs` runs automatically before dev/build.

## Images

### Workflow (new tab-panel image)

1. Save the full-size WebP in `assets/tab-panels/`.
2. Add a line to the note's `images:` frontmatter (see syntax table below).
3. **Coverflow face** (`*face` or `!`): run `generate_coverflow_images.py` and `update_colors.py` (see Scripts).
4. **Other images**: optionally add a manual preview under `assets/tab-panels/preview/`.
5. Run `npm run dev` or `npm run build` to copy assets into `public/`.

### Syntax (frontmatter)

| You type | Meaning |
|----------|---------|
| `photo.webp` | `assets/tab-panels/photo.webp` |
| `photo.webp!` or `photo.webp*face` | Same + coverflow face |
| `photo.webp*Caption` | Image + caption |
| `photo.webp*Caption*face` | Caption + coverflow |
| `[[photo.webp\|Demo]]` | Wikilink (repo vault → autocomplete) |
| `assets/other/path.webp` | Full path when not in `tab-panels/` |

## Hero tagline

Edit `src/content/hero/intro.md`. Custom mini-syntax (not standard Obsidian):

- Icons: `[{icon-key} link text](url)`
- Footnotes: `(footnote text)`
- Internal links to `prajwal.is-a.dev` stay in the same tab

## Internal links (cross-references)

Link to another portfolio entry in the **`links`** list (link popup on project cards / timeline). Slugs match the `.md` filename (without `.md`).

### Cross-ref syntax (required double `[`)

The visible label on the site is **`[award] Title`**, **`[project] Title`**, or **`[hackathon] Title`**. In frontmatter you must write an extra leading `[` so YAML/markdown parsing works — the stored line looks like `[[award] …](#awards/…)`, not `[award] …](#awards/…)`.

```yaml
links:
  - "[[award] Ingenious+ Regional Award CAD$1K](#awards/ingenious-regional-grant-cad-1k)"
  - "[[project] JARVIS for the Visually Impaired](#projects/jarvis-for-the-visually-impaired)"
```

| Prefix in label | Hash URL |
|-----------------|----------|
| `[award]` | `#awards/<slug>` |
| `[project]` | `#projects/<slug>` |
| `[hackathon]` | `#hackathons/<slug>` |

External links stay a single bracket pair (always quote the line if the URL contains `:`):

```yaml
  - "[Demo Tweet](https://x.com/...)"
```

Clicking a cross-ref switches tab, expands grouped timeline months if needed, and highlights the target entry. `npm run reformat:content` preserves this format.

> [!TIP]
> **Automated Platform Badges**: The site automatically parses all entry links. Internal section links (hashes like `#projects/...` or `#awards/...`) will be rendered with `✦ Project`, `✦ Hackathon`, or `✦ Award` badges. External links are dynamically badged with platform tags (e.g. `GitHub ↗`, `LinkedIn ↗`, `Devpost ↗`, `YouTube ↗`, or `Website ↗`). Content authors do not need any special markup; this happens completely automatically based on the URL or domain.

## Regenerate `data.json` only

```bash
npm run export:data
```
