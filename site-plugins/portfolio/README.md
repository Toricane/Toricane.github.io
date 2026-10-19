# Portfolio plugin

Site-specific Quartz components, transformers, RSS, and agent-readable Markdown.

## Home page

`Home` and `HomeProjects` in `src/components/Portfolio.tsx` render the homepage.
The introduction fills at least the first viewport and grows naturally when its
content needs more room. The selected-projects section follows it; its compact
content is vertically centered within a desktop viewport rather than stretching
the cards to fill the screen. Mobile content scrolls naturally.

Selected projects come from published project entries with
`significance: spotlight`, sorted by recency and capped at six. There is no
hardcoded selection list. Cards use the first `## Gallery` image, with `small/`
variants for tab-panel assets, a full-width image area, description, date, and up to two tags.
Entries without Gallery images remain text-only; do not invent image placeholders
or use unrelated assets. Spotlight labels are omitted within this selection.

The homepage graph uses the same project inputs, colors, branches, hiatuses, and
nodes as the full project timeline, including dated projects outside the selected
six. It omits cards, monthly labels, and card connectors. Its vertical layout is
compressed to the available height; its nodes do not correspond to selected-card
rows. End labels show Present and the earliest recorded project month.

Below 1600px, the graph is a 52px rail beside the cards with a 12px gap. At 1600px
and wider, it moves into the outer left margin and widens to 96px for more lane
spacing; the cards then align directly beneath the heading. The margin position
keeps at least 24px of clearance from the window edge. Cards use three columns on
desktop, two from 721–1100px, and one on mobile. These styles live in
`src/styles/portfolio.scss`; preserve the mobile rail when adjusting desktop.

Home statistics are derived from content: total projects, projects tagged
`hackathon`, and award records tagged `Hackathon` (case-insensitive). The latter
is labeled **Hackathon awards**, including placements, side challenges, and
honourable mentions; counting only project `Winner` tags misses these records.
Do not count both a project and its corresponding award as two achievements.
The section's footer link exposes the total award count. `/projects/?view=timeline` opens
the full collection directly in timeline view.

The introduction's section-link row uses automatic equal-width grid columns.
Projects and Awards currently split the row evenly. A future section should
receive the same share automatically; do not reserve an empty third column or
add an Experience collection until it is actually implemented.

## Appearance

The header's Appearance control offers Light, Dark, and System. An explicit
choice is saved in the browser's `theme` key. System removes that override and
follows `prefers-color-scheme`; without a reported light preference, dark is the
default. Device changes and changes in other tabs are reflected immediately.
Blocked storage still permits switching for the current visit.

`src/scripts/theme.inline.ts` initializes the theme in the head before paint and
sets Quartz's `saved-theme` attribute. Its controller survives SPA navigation;
the header controls are rebound with the rest of the portfolio UI. Theme changes
emit Quartz-compatible `themechange` events and suppress color transitions during
the swap. The small critical background style in `quartz/components/Head.tsx`
uses the configured theme backgrounds to prevent a mismatched first paint.

The light palette uses warm ivory, navy ink, and deeper copper. Metallic
highlights, timeline labels, modal surfaces, and syntax highlighting have light
variants. Coverflow captions fade into the light surface with navy text in light
mode; the image lightbox retains light text against its dark backdrop.
Keep the core palette in `quartz.config.yaml` aligned with the portfolio tokens
in `src/styles/portfolio.scss`. Run `node --import tsx --test
site-plugins/portfolio/src/theme.test.ts` from the root for preference, storage,
pre-paint controller, and text contrast regression checks.

## Markdown endpoints

`PortfolioMarkdown` emits UTF-8 static files alongside every published content,
folder, and tag page. Root `/` maps to `/index.md`; a trailing slash is removed before
appending `.md` (`/projects/` → `/projects.md`). Entry paths append `.md` directly.
Named `index.md` and `.html.md` forms are also available. Bare `.md` filenames (at root or inside folders) are not generated.
Legacy aliases contain the destination's Markdown rather than an HTML redirect.
The generated error page has `/404.md`; unknown paths still return an HTTP 404.

The export includes readable frontmatter facts and authored Markdown, with
authoring comments, placeholders, empty headings, and decorative shortcodes
removed. Code blocks and GFM tables are preserved. Internal page links use
root-relative canonical Markdown URLs; images use root-relative original asset URLs.
External URLs are preserved. Collection and tag listings include known dates,
highlight level (including standard), tags, and affiliation; coverflow metadata becomes images.
Drafts and ignored notes follow Quartz's normal publishing filters.

`/llms.txt` stays concise: a brief description of Prajwal and the portfolio,
Markdown URL and local search instructions, and five links (About, Projects,
Awards, Resume, Search index). It does not duplicate individual entry or tag listings.
Normal HTML pages have
`alternate` Markdown and `describedby` llms.txt discovery links in their heads.
Assets, feeds, and client-side filter states are not separate Markdown pages.

Every generated Markdown page, including aliases and `/404.md`, ends with a
menu linking Home, Projects, Awards, and Resume. The resume link points to
`/resume/resume.md`, served by the separate resume project. This build never fetches
or generates resume content. The output check permits that separately managed
endpoint without requiring a local file.

## Agent search

`/search-index.json` is a versioned static index with one record per listed
canonical page (aliases are included in that record, not duplicated as results).
Each record contains `slug`, `url`, `markdownUrl`, `title`, `description`, `from`,
`tags`, `significance`, `when`, `date`, `modified`, `aliases`, and `content`.
Content is plain text extracted from the cleaned Markdown. Unknown or inapplicable
dates and highlight levels are null. `significance` is `spotlight`, `featured`,
or `standard` where applicable. All exported dates use `YYYY-MM`, matching
the website's month precision; source day dates remain unchanged. Month-only entries use `when`; ranges use
`date` and `modified`, with null `modified` for ongoing projects.

The JSON shape is `{ "version": 1, "pages": [...] }`. `url` and `markdownUrl`
are root-relative; resolve them against the website's origin. Agents fetch the
index, match query terms locally against text and metadata (prefer title,
description, and tag matches), and follow `markdownUrl` paths for details. Query
parameters do not trigger a server-side search. `llms.txt` documents
this workflow. No server-side query endpoint is needed. Incremental builds
refresh the index alongside listings and remove deleted entries.

Output collisions fail instead of silently replacing another page. Incremental
builds regenerate listings and remove obsolete Markdown files owned by the emitter.

## Verification

From this directory, run `npm run typecheck` and `npm run build`. From the repository root:

```sh
npx tsx --test site-plugins/portfolio/src/markdown.test.ts
node quartz/bootstrap-cli.mjs build -o .quartz-cache/markdown-check
node scripts/check-markdown-output.mjs .quartz-cache/markdown-check
```

The output check verifies page/alias coverage, HTML discovery links, internal
Markdown links, named home endpoint and absence of bare `.md` filenames, authoring cleanup, and search-index
version, uniqueness, and result paths. The Pages workflow runs it after building.
No additional server,
deployment service, or source Markdown copies in `content/` are needed.

## Home newsletter

`PortfolioNewsletter` fetches the public Substack RSS feed during the build and
emits `/newsletter.xml` on the site's own origin. Browser requests no longer depend
on rss2json or cross-origin RSS access. `quartz.ts` registers this additional
emitter explicitly because the package loader selects only one emitter from the
plugin's multiple exports. The emitter uses a 10-second deadline and
retains a last-good feed in `.quartz-cache/newsletter.xml`; a fresh offline build
uses the verified post in `src/newsletterFallback.ts`. Update that snapshot from
the public feed when updating the offline baseline.

The homepage renders the verified post immediately, then refreshes it from the
local feed. Browser caching is optional: denied or full localStorage cannot stop
rendering. Concurrent navigation/render events share a request, and a failed
request leaves the dated post visible and can be retried on the next visit.
New Substack posts are picked up by the next site build; browser results cache for
six hours. Run `npx tsx --test site-plugins/portfolio/src/newsletter.test.ts` from
the repository root to exercise fresh, cached, malformed, and offline responses.
