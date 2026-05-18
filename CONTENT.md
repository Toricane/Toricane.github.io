# Content authoring (Obsidian)

Portfolio content lives in **`src/content/`** as Markdown notes with YAML frontmatter. Open the repo (or this folder) in [Obsidian](https://obsidian.md) to edit.

**Source of truth:** `src/content/**/*.md`  
**Generated mirror:** root [`data.json`](data.json) is re-exported on every `npm run dev` / `npm run build` (not used by the live site).

## Frontmatter cheat sheet

| Field | Obsidian format | On site |
|-------|-----------------|--------|
| `tags` | YAML list, hyphens instead of spaces: `- Chrome-Ext` | Shown as `Chrome Ext` |
| `badges` | Same as tags (hackathons/awards) | Hyphens → spaces |
| `significance` | `gold`, `silver`, or omit | Gold/silver highlight |
| `images` | Short lines (see below) | `*face` adds to coverflow; bare filenames assume `assets/tab-panels/` |
| `links` | One markdown link per line: `[Label](url)` — with date: `[Label \| 2024/03/03](url)` (pipe **inside** the brackets) | Link popup on timeline groups |

### Example (projects)

```yaml
---
title: CalendAI
from: buildspace / Community Meetup Demo
startDate: "2024-06-01"
endDate: "2024-07-01"
significance: gold
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

## Hero tagline

Edit `src/content/hero/intro.md`. It uses a **custom** mini-syntax (not standard Obsidian), which is fine for one short block:

- Icons: `[{icon-key} link text](url)`
- Footnotes: `(footnote text)`
- Internal links to `prajwal.is-a.dev` stay in the same tab

## Obsidian Base (site tabs in Obsidian)

Open the **repo root** as your vault (so paths like `src/content/projects/` resolve).

| File | Purpose |
|------|---------|
| [`src/content/Portfolio.base`](src/content/Portfolio.base) | Database views: **Projects** (cards), **Hackathons** / **Awards** (lists grouped by `when`) |
| [`src/content/Portfolio.md`](src/content/Portfolio.md) | Hub page with embedded views |

**Views (mirror the website):**

- **Projects** — cards sorted by `endDateSort` (same rules as the site: newest end date first; ongoing / missing end date float to top)
- **Hackathons** / **Awards** — cards with cover + extra thumbnails, grouped by month; awards sorted gold → silver → name inside each month
- **Hackathons (grouped)** — same cards, grouped by `groupSummary` when the site shows one collapsed timeline row
- **Projects (edit)** / **Hackathons (edit)** / **Awards (edit)** — tables with all frontmatter for quick updates

Requires Obsidian **1.9+** (cards). Description stays in each note’s body; the base shows titles, dates, tags, and thumbnails.

**Tip:** Keep `when` quoted (`"2024/06"`) so Obsidian does not parse it as a date (breaks formulas). Run `npm run reformat:content` after bulk edits.

## Layout

| Folder | What to add |
|--------|-------------|
| `src/content/hero/intro.md` | Hero tagline |
| `src/content/projects/` | One `.md` file per project |
| `src/content/hackathons/` | One `.md` file per hackathon entry |
| `src/content/awards/` | One `.md` file per award entry |
| `src/content/coverflow/` | Optional standalone coverflow face images |
| `assets/` | Image files referenced in frontmatter |

## Add a project

1. Duplicate `src/content/_templates/project.md` or run:
   ```bash
   npm run new:project -- "My Project Title"
   ```
2. Fill frontmatter and write the description in the note body.
3. Add images under `assets/tab-panels/`.
4. For coverflow: add `*face` (or `!` after the filename), then `python scripts/update_colors.py`.

## Images (easy formats)

Pick one style per line in the `images` list:

| You type | Meaning |
|----------|---------|
| `photo.webp` | Image in `assets/tab-panels/photo.webp` |
| `photo.webp!` | Same + coverflow face |
| `photo.webp*face` | Same as `!` |
| `photo.webp*Demo at meetup` | Image + caption |
| `photo.webp*Demo at meetup*face` | Caption + coverflow |
| `[[photo.webp\|Demo]]` | Obsidian wikilink (autocomplete if vault is the repo) |
| `assets/other/path.webp` | Full path when not in `tab-panels/` |

**Obsidian tip:** With the repo open as your vault, type `[[` in an image line and pick the file from `assets/tab-panels/`. You can shorten to just the filename in most cases.

**Dates:** Use quoted ISO strings (`"2024-06-01"`) for `startDate` / `endDate`. Unquoted `2024-06-01` can break the build; Obsidian’s date picker may write long `GMT` strings — `npm run reformat:content` normalizes them.

**Link dates in Obsidian:** Put the date **inside** the brackets: `[Label | 2024/08/06](url)`. Do not put the pipe after the closing `)`: `[Label](url) | 2024/08/06` will not hyperlink in Properties.
5. Preview: `npm run dev` → http://localhost:4321

## Hackathons & awards

Use `when: 2025/03`. Same `images` / `links` / `significance` / `tags` rules as projects. Optional `groupSummary` when multiple entries share a month.

## Internal links

- `#projects/jarvis-for-the-visually-impaired`
- `#awards/class-valedictorian`

Slugs match the `.md` filename (without `.md`).

## Regenerate `data.json` only

```bash
npm run export:data
```
