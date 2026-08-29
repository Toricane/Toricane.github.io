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
- Collections: `content/projects/`, `content/hackathons/`, `content/awards/`
- Home coverflow data: `content/coverflow.md` (`photos[]` with `src`, `caption`, optional `link`)
- Inline link icons: drop a file in `content/assets/icons/` (e.g. `langara.webp` → `:langara:`)
- New notes: `content/templates/` (ignored by Quartz; use from Obsidian)
- Static assets: `content/assets/`

Create new collection notes from `content/templates/{award,hackathon,project}.md`. Keep YAML keys in the template order.

### Frontmatter schema

Shared on every entry:

| Field | Meaning |
|-------|---------|
| `title` | Card / timeline / entry heading |
| `description` | Card and timeline blurb |
| `from` | Source / host / affiliation — who issued it or where it lived, not a restatement of the title or the outcome |
| `significance` | Always set: `impactful` (gold), `notable` (silver), `minor` (normal). `minor` is YAML-only — the UI never shows a pill or `data-significance="minor"` |
| `tags` | The only chip list. Awards: topic. Hackathons: placement/format. Projects: stack/topic |
| `cover` | Path under `assets/…` (full tab-panels image). Optional if there is no image |

Awards and hackathons also use:

- `when` — quoted `"YYYY/MM"`. Timeline grouping and sort. **Do not** set `date`.

Projects also use:

- `date` / `modified` — real `YYYY-MM-DD` start and end. The plugin formats the display range. **Do not** set `when` or a handwritten `period`.

Gallery (all collections) sorts by `significance` then recency (`when` for awards/hackathons, `modified ?? date` for projects). Timelines stay chronological (month groups for awards/hackathons; recency for projects).

Optional, unused until filled: `role`, `outcome` (entry facts). Do not invent copy.

**Do not use:** `groupSummary`, `badges`, `tools`, `featured`, `period`, or `date` on awards/hackathons.

`from` conventions:

- Awards: issuing organization (`MacNeill Secondary`, `CEMC, University of Waterloo`)
- Hackathons: event name **without year** (year lives in `when`)
- Projects: affiliation only (`Independent / TKS`, `Google Canada Challenge`)

Month group summaries live on the collection folder note, not on entries. Only months with 2+ items need a key:

```yaml
# content/awards/index.md (same idea on content/hackathons/index.md)
groups:
  "2025/06": Graduation awards and academic achievements
```

Collection listing URLs use a trailing slash (`/awards/`, `/projects/`, `/hackathons/`). Entry URLs do not (`/awards/class-valedictorian`). Use `sectionHref()` in the plugin; do not add a slash to `linkFor()`.

## Image variants

For `assets/tab-panels/` images, keep three sizes with the **same basename**:

| Variant | Path | Size | Used for |
|---------|------|------|----------|
| Full | `assets/tab-panels/{name}.webp` | original | Lightbox / expanded only |
| Small | `assets/tab-panels/small/{name}.webp` | 800px wide | Gallery cards + coverflows |
| Preview | `assets/tab-panels/preview/{name}.webp` | 256px wide | Timeline thumbs |

Content should reference the **full** path in frontmatter/`## Gallery`. The plugin rewrites to `small/` or `preview/` at render time via `imageVariant()`.

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
    link: /hackathons/some-slug   # optional — opens entry modal
```

- With an internal portfolio `link` → entry modal (same as cards)
- With an external `link` → normal navigation
- Without `link` → full-image lightbox

Entry-page `## Gallery` coverflow items always open the lightbox on click.

## Where to change UI

Edit `site-plugins/portfolio/src/`:

- `components/Portfolio.tsx` — SSR layout
- `scripts/portfolio.inline.ts` — client behavior (modal, lightbox, icons, coverflow)
- `styles/portfolio.scss` — styling
- `imageVariant.ts` — asset path rewriting
- `galleryExtractor.ts` — pulls `## Gallery` images into file data

After plugin source changes, rebuild the plugin (`npm run build` in `site-plugins/portfolio`) or reinstall plugins from the repo root so Quartz picks up `dist/`.

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

## Content debt (intentional)

Some project pages and the home bio still contain `[Replace with: …]` prompts. Leave them unless the user provides verified copy.
