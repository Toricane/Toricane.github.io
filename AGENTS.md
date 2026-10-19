# Agent guide — prajwal.is-a.dev (Quartz 5)

This repo is a **Quartz 5** portfolio fork. Site-specific UI lives in the local plugin; content lives in Markdown under `content/`. Prefer editing those over upstream `quartz/` core.

## Stack

| Area | Location |
|------|----------|
| Content | `content/` |
| Portfolio UI | `site-plugins/portfolio/` |
| Site config | `quartz.config.yaml` |
| Image variants | `scripts/generate-image-variants.mjs` |
| Git hook | `.githooks/pre-commit` (install with `npm run hooks`) |
| Quartz core (upstream) | `quartz/` — avoid casual edits |
| Deploy | `.github/workflows/pages.yml` (push to `v5`) |

## Content layout

- Home: `content/index.md`
- Collections: `content/projects/` (including hackathon builds), `content/awards/`
- Home coverflow data: `content/coverflow.md` (`photos[]` with `src`, `caption`, optional `link`)
- Inline link icons: drop a file in `content/assets/icons/` (e.g. `langara.webp` → `:langara:`)
- New notes: `content/templates/` (ignored by Quartz; use from Obsidian)
- Static assets: `content/assets/`

Create new collection notes from `content/templates/{award,hackathon,project}.md`. Keep YAML keys in the template order. Projects include `## Overview` as a longer entry-only intro — leave the `[Replace with: …]` placeholder until the copy is distinct from `description`.

### Frontmatter schema

Shared on every entry:

| Field | Meaning |
|-------|---------|
| `title` | Card / timeline / entry heading |
| `description` | Card, timeline, and entry heading blurb. Injected into the entry — do not repeat it as `## Overview`. |
| `from` | Source / host / affiliation — who issued it or where it lived, not a restatement of the title or the outcome |
| `significance` | Always set: `spotlight` (gold), `featured` (silver), `standard` (normal). `standard` is YAML-only — the UI never shows a pill or `data-significance="standard"` |
| `tags` | The only chip list. Awards: topic. Hackathons: placement/format. Projects: stack/topic |

Card / timeline / entry hero images come from the note’s `## Gallery` (first image). Do **not** set a `cover` frontmatter field.

Awards and month-only hackathon projects also use:

- `when` — quoted `"YYYY/MM"`. Award grouping, project point placement, and sort. **Do not** set `date` alongside it.

Projects with known date ranges use:

- `date` / `modified` — real `YYYY-MM-DD` start and end. The plugin formats the display range. **Do not** set `when` or a handwritten `period`. Omit `modified` for an ongoing project (open-ended lane).
- `pause` / `restart` (optional) — hiatus bounds (`YYYY-MM-DD`). Timeline draws a dashed lane between them; solid work continues on either side. Extra pairs: `pause1`/`restart1`, `pause2`/`restart2`, …
- `node` (optional) — extra open-circle landmark on that month (`YYYY-MM-DD`), within `date`…`modified`. More: `node1`, `node2`, …
- `parent` (optional) — project slug to draw a Git-style branch curve from (e.g. `jarvis-for-the-visually-impaired` or `projects/jarvis-for-the-visually-impaired`). Overlap alone never invents branches.
- `series` (optional) — soft group name; later projects in the same series branch from the previous one when `parent` is omitted.
- `timelineColor` (optional) — quoted six-digit hex (e.g. `"#6ea8ff"`) to pin the lane color for a project without a thumbnail. Normally leave it unset: the first Gallery thumbnail supplies a readable dominant color; projects without one use a 12-color palette chosen to distinguish overlapping ranges. Thumbnail colors take priority over this fallback override. Filtering preserves the assigned colors.

Gallery (all collections) sorts by `significance` then recency (`when` for awards/month-only projects, `modified ?? date` for ranged projects). Award timelines stay month-grouped; the projects timeline is a vertical Git-style lane graph (packed start/end/pause/node months from `date`/`modified`/`pause*`/`restart*`/`node*`, compact gap markers for empty stretches, dashed hiatus segments, optional `parent`/`series` curves — not a linear calendar scale).

Collection pages include client-side **filters**: text search (title / from / description), Highlights chips (Spotlight / Featured), and tag chips (intersection). Filters apply to both Gallery and Timeline views. Gallery also has a **Sort** toggle: Highlights-then-date (default) or date-then-Highlights.

**Keep `projects/` and `awards/` as separate collections.** Hackathon builds live in `projects/` with the `hackathon` tag. Use `content/templates/hackathon.md` for month-only builds: `when` preserves the known month and renders a completed point in the project timeline. Use the normal project date range schema only when real start/end dates are known. Related builds can use `parent` / `series` or shared tags. Keep old hackathon entry URLs as `aliases` on migrated notes.

Optional, unused until filled: `role`, `outcome` (entry facts). Do not invent copy.

**Do not use:** `cover`, `groupSummary`, `badges`, `tools`, `featured`, or `period` on collection entries. Do not use `date` on awards or month-only hackathon projects.

`from` conventions:

- Awards: issuing organization (`MacNeill Secondary`, `CEMC, University of Waterloo`)
- Hackathon projects: event name **without year** (year lives in `when` or project dates)
- Projects: affiliation only (`Independent / TKS`, `Google Canada Challenge`)

Month group summaries live on the collection folder note, not on entries. Only award months with 2+ items need a key:

```yaml
# content/awards/index.md
groups:
  "2025/06": Graduation awards and academic achievements
```

Collection listing URLs use a trailing slash (`/awards/`, `/projects/`). Entry URLs do not (`/awards/class-valedictorian`). Use `sectionHref()` in the plugin; do not add a slash to `linkFor()`.

## Home page

The intro fills the first viewport; the next section shows up to six spotlight
projects, selected automatically by recency. Do not hardcode project slugs.
Cards use their first Gallery image and remain text-only when it is missing.
The graph reuses all dated project timeline data, not just the selected cards.
Mobile keeps a narrow rail beside the cards; wide desktops move it into the left
margin. Keep the introduction's section links equally sized for any item count;
do not reserve a column for a future section.

The **Hackathon awards** stat counts award entries tagged `Hackathon`, including
placements, side challenges, and honourable mentions. Project `Winner` tags alone
are not a complete count. Avoid counting a project and its award twice.

`PortfolioNewsletter` is explicitly registered in `quartz.ts` and emits
`/newsletter.xml` from Substack at build time. Keep this fetch on the build side,
with its last-good cache and verified
`site-plugins/portfolio/src/newsletterFallback.ts` snapshot; do not restore the
browser's dependency on an external RSS proxy. Browser storage is
optional and a failed refresh must leave a populated, dated post visible.
New posts are picked up on the next site build. See the
[plugin README](site-plugins/portfolio/README.md) for responsive dimensions, cache
behavior, and newsletter tests.

## Image variants

For `assets/tab-panels/` images, keep three sizes with the **same basename**:

| Variant | Path | Size | Used for |
|---------|------|------|----------|
| Full | `assets/tab-panels/{name}.webp` | original | Lightbox / expanded only |
| Small | `assets/tab-panels/small/{name}.webp` | 800px wide | Gallery cards + coverflows |
| Preview | `assets/tab-panels/preview/{name}.webp` | 256px wide | Timeline thumbs |

Content should reference the **full** path in `## Gallery` and in any in-body images. The plugin rewrites to `small/` or `preview/` at render time via `imageVariant()`.

Images **outside** `## Gallery` stay where they are written and are not added to cards, timeline thumbs, or the Gallery coverflow. A single `![caption](/assets/tab-panels/foo.webp)` shows as-is with the caption; consecutive image-only blocks become the same coverflow as Gallery.

`npm run images` (`scripts/generate-image-variants.mjs`) creates **missing** `small/` and `preview/` WebPs only. Existing files are not overwritten unless you pass `--force`. This is **not** part of `npx quartz build` or GitHub Actions.

The pre-commit hook (`.githooks/pre-commit`) runs `npm run images` and stages `small/` + `preview/`. Install it with `npm run hooks` (copies into `.git/hooks/`; does not change git config). Do not hand-resize `small/` or `preview/`.

Other folders (`coverflow/`, `icons/`, highlight webps) are used as-is — no variant rewrite.

### Inline link icons

Put image files in `content/assets/icons/`. The basename becomes the shortcode key:

| File | Shortcode |
|------|-----------|
| `langara.webp` | `:langara:` |
| `handy-andy.png` | `:handy-andy:` |

Supported extensions: `.webp`, `.png`, `.jpg`/`.jpeg`, `.svg`, `.gif`. Keys must be lowercase letters, digits, and hyphens. If the same key exists with multiple extensions, prefer webp → png → svg → jpg → gif.

In Markdown, place the shortcode immediately before a link (or alone for plain text):

```markdown
:langara: [Langara College](https://langara.ca)
built hardware like :handy-andy: Handy Andy
```

The shortcode is replaced with the icon. When it sits right before a link, the icon merges into that link’s clickable label. Unknown `:tokens:` are left alone.

## Coverflow clicks

In `content/coverflow.md`:

```yaml
photos:
  - src: assets/coverflow/example.webp
    caption: Example
    link: /projects/some-slug   # optional — opens entry modal
```

- With an internal portfolio `link` → entry modal (same as cards)
- With an external `link` → normal navigation
- Without `link` → full-image lightbox

Entry-page `## Gallery` coverflow items always open the lightbox on click.

## Where to change UI

Edit `site-plugins/portfolio/src/`:

- `components/Portfolio.tsx` — SSR layout
- `projectTimeline.ts` — projects Git-style timeline layout math (lanes, branches)
- `scripts/portfolio.inline.ts` — client behavior (modal, lightbox, icons, coverflow)
- `styles/portfolio.scss` — styling
- `imageVariant.ts` — asset path rewriting
- `galleryExtractor.ts` — pulls `## Gallery` images into file data

After plugin source changes, rebuild the plugin (`npm run build` in `site-plugins/portfolio`) or reinstall plugins from the repo root so Quartz picks up `dist/`.

## Agent-readable output

`site-plugins/portfolio/src/markdown.tsx` exports `PortfolioMarkdown`, which
generates Markdown endpoints, `/llms.txt`, and `/search-index.json` from published
content (including generated folder/tag pages). Examples: `/` → `/index.md`,
`/projects/` → `/projects.md`, `/projects/cell-safe` → `/projects/cell-safe.md`.
Named index, `.html.md`, and legacy alias forms are also supported; bare `.md` filenames are not generated.

Same-site Markdown links are root-relative. Collection listings expose dates,
highlight level, tags, and affiliation. Exported dates use `YYYY-MM`; this does
not change the source frontmatter date schemas above. The search index has one
record per listed canonical page, with aliases in the record and no duplicate
alias results. Agents search its text/metadata locally and fetch `markdownUrl`.

`llms.txt` is deliberately brief: a description of Prajwal and the website,
Markdown/search instructions, and five links (About, Projects, Awards, Resume, Search
index). Full entry and tag listings live in their own Markdown files and the
search index. The generated files are not manually maintained under `content/`.

Every Markdown page includes Home, Projects, Awards, and Resume menu links.
Resume links to `/resume/resume.md`, served by the separate resume project. The
portfolio build does not fetch or generate resume content. Output checks allow
this separately managed endpoint; it is not emitted as a static snapshot.

After rebuilding the plugin and Quartz, run
`node scripts/check-markdown-output.mjs public`. The Pages workflow runs this
check before upload. Export tests are in `src/markdown.test.ts`; see
[the plugin README](site-plugins/portfolio/README.md) for the schema and commands.

## Dev commands

Requires Node.js 22+.

```sh
npm install
npx quartz plugin install --from-config
npm run hooks
npx quartz build --serve
```

Other scripts: `npm run images` · `npm run images -- --force` · `npm run check` · production build: `npx quartz build`

**Do not** run `npx quartz build --serve` unless the user asks — they often keep a serve process running themselves.

## Git / deploy

- Deploy branch: `v5` via GitHub Actions → GitHub Pages
- Custom domain: `content/CNAME` → `prajwal.is-a.dev`
- Upstream Quartz: remote `upstream` → `jackyzha0/quartz` (`v5` branch)
- Pre-commit: `npm run hooks` copies [`.githooks/pre-commit`](.githooks/pre-commit) into `.git/hooks/` (does not change git config)
- Do **not** create commits or push unless the user explicitly asks
- Commit style: follow recent history with a lowercase Conventional Commit prefix (`feat:`, `fix:`, `refactor:`, `chore:`, or `docs:`) and an imperative, descriptive subject explaining the concrete change. Combine closely related changes in one subject; omit a trailing period.

## Content debt (intentional)

Some project pages and the home bio still contain `[Replace with: …]` prompts. Leave them unless the user provides verified copy. The portfolio transformer hides these prompts, template example links, and empty section headings from the published output; real content makes the section visible automatically.
