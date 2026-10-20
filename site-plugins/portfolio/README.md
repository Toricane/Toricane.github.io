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
Image areas share a 96–144px height cap on desktop and mobile.
Entries without Gallery images remain text-only; do not invent image placeholders
or use unrelated assets. Spotlight labels are omitted within this selection.

The homepage graph uses the same project inputs, colors, branches, hiatuses, and
nodes as the full project timeline, including dated projects outside the selected
six. It omits cards, monthly labels, and card connectors. Its vertical layout is
compressed to the available height; its nodes do not correspond to selected-card
rows. End labels show Present and the earliest recorded project month.

Below 1440px, the graph is a 52px rail beside the cards with a 12px gap. At 1440px
and wider, it moves into the outer left margin and widens to 96px for more lane
spacing; the cards then align directly beneath the heading. The margin position
keeps at least 24px of clearance from the window edge. The section reserves 144px
of outer margin on each side when needed so the expanded graph clears the cards,
including on desktop windows narrowed by vertical tabs. Cards use three columns on
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

The header's sun/moon switch toggles Light and Dark directly and saves the choice
in the browser's `theme` key. Before a choice is saved, the site follows
`prefers-color-scheme`; without a reported light preference, dark is the default.
Device changes are reflected while following the system, and changes in other
tabs are reflected immediately. Blocked storage still permits switching for the
current visit. The control supports keyboard activation and exposes Dark mode as
an accessible switch.

`src/themeTransition.ts` reveals the new theme in a 650ms circle expanding from
the switch, using the View Transition API. Reduced motion uses a 120ms fade;
browsers without the API switch immediately. Quick clicks coalesce to the latest
choice, with no overlapping theme transitions. Snapshot styles are scoped to
theme reveals so they do not affect navigation transitions.

`src/scripts/theme.inline.ts` initializes the theme in the head before paint and
sets Quartz's `saved-theme` attribute. Its controller survives SPA navigation;
the header controls are rebound with the rest of the portfolio UI. Theme changes
emit Quartz-compatible `themechange` events and suppress color transitions during
the swap. The small critical background style in `quartz/components/Head.tsx`
uses the configured theme backgrounds to prevent a mismatched first paint.

Gallery cards use compact spacing between date, title, affiliation, and description
in both themes (1px above titles; 3px below titles and above paragraphs). The
image fade remains 68% of the media height.

The light palette uses warm ivory, navy ink, and a warm orange accent. Metallic
highlights, timeline labels, modal surfaces, and syntax highlighting have light
variants. Coverflow containers and caption fades share the same opaque surface
color in both themes, with theme-appropriate caption text; the image lightbox
retains light text against its dark backdrop.
Light-mode highlights use warm gold and neutral silver borders/surfaces, dark ink
titles, and filled Spotlight/Featured labels. Do not darken decorative metallic
colors into brown or blue just to use them as title text; keep text contrast and
decorative accents separate.
Light-mode orange fills use `#d28746`, a slightly darker shade of dark mode's
`#d58a4b`; hover returns to `#d58a4b`. Text has no outlines.
Coverflow photo tiles share the caption/container surface and have no drop shadow:
the horizontal scroller clips large shadows into a gray strip below the fade.
Orange fills (`--portfolio-copper`) and their dark foreground
(`--portfolio-on-accent`) are separate from the darker orange text token
(`--portfolio-copper-soft`). Hover fills use `--portfolio-copper-hover`. Quartz's
light `secondary` colour matches the readable text token, not the bright fill.
Contrast checks cover text on surfaces and foregrounds on both accent fills.

The projects timeline, its card dots, and the homepage graph share
image-derived colours recalculated at build time by `src/thumbnailColor.ts`.
Extraction weights vivid pixels above dim backgrounds and requires a hue to cover
at least 1% of the sample, so small UI accents count without isolated artifacts
choosing the colour. No separate colour refresh script or cache reset is needed.
Missing image sizes can be filled with `npm run images` before building.
These surfaces share
`--pt-display-color`. Light mode caps lane lightness at 0.64 in OKLCH and boosts
chroma by 35% while preserving the project's hue; older browsers use a lightly
darkened sRGB fallback.
Do not mix lane colours toward navy: that makes unrelated projects look alike.
Solid segments remain opaque in light mode, and hiatus/branch paths retain enough
opacity to remain visible. Dark mode keeps the original thumbnail/palette colours.
Light timeline cards composite highlight gradients over an opaque panel so the
page grid does not show through. Home preview dates keep their muted text colour; metallic label
styling applies only when a separate significance label is actually rendered.
Keep the core palette in `quartz.config.yaml` aligned with the portfolio tokens
in `src/styles/portfolio.scss`. Run `node --import tsx --test
site-plugins/portfolio/src/theme.test.ts site-plugins/portfolio/src/themeTransition.test.ts`
from the root for preference, storage, pre-paint controller, text contrast, and
radial reveal/fallback regression checks.

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

## Image loading and collection performance

Quartz's `ComponentResources` emitter consolidates component CSS into one hashed
stylesheet and consecutive plugin resource styles into shared hashed files. The
current site loads three stylesheets (base, components, code helpers), preserving
their cascade order and cacheability. Keep resource style bundles in `static/` so
relative asset URLs retain their base. Startup scripts up to 4 KiB, including the
portfolio theme initializer, are embedded in the head to avoid a blocking network
request while applying the theme before paint. Larger startup scripts retain the
external file fallback. These delivery changes live in Quartz's resource emitter
and `pageResources`, since the portfolio component does not own the document head.

Projects, Awards, and tag galleries eagerly load only the lead image of the first
four cards (fewer when those cards have no images). Other card images, including
collage side tiles and the homepage's project previews, are lazy-loaded. Card
images offer the existing 256px `preview/` and 800px `small/` variants through
`srcset`, with responsive `sizes` for the collection and home layouts. Lazy images
use `sizes="auto"` where supported, with breakpoint-based fallbacks.

Collection gallery links use `content-visibility: auto` with a reserved 240px
intrinsic height, matching their card slot, so offscreen descendants can skip
layout and painting without collapsing the gallery. Keep this reservation aligned
with card sizing changes. Card tags use opaque surfaces without `backdrop-filter`:
one blur per tag creates more than 100 unnecessary effects on the projects page
and can make scrolling expensive even after image loading is optimized.

Entry heroes use `small/` images. The Gallery transformer also emits `small/`
sources directly into the initial HTML, with lazy loading and asynchronous
decoding, so originals do not start downloading before browser enhancement.
Original Gallery paths remain in file metadata and Markdown exports; lightbox
clicks resolve to full images. Relative tab-panel paths (`../assets/...` included)
are supported. Images outside Gallery and assets outside `tab-panels/` keep their
authored paths. Generate missing variants with `npm run images`; builds do not
generate them.

Project timeline rebuilding is deferred while Gallery is visible. Opening
Timeline applies the latest filters and responsive layout. Parsed inputs and the
original layout are cached per board, and unchanged matching projects/layouts
reuse the rendered graph. Text searches wait 100ms after typing; tag and highlight
changes apply immediately. Hover/focus updates affect only the old and new active
projects, with the element index refreshed after graph rebuilding. Navigation
cleanup removes listeners and pending search timers.

## Verification

From this directory, run `npm run typecheck` and `npm run build`. From the repository root:

```sh
npx tsx --test site-plugins/portfolio/src/markdown.test.ts
node --import tsx --test site-plugins/portfolio/src/galleryExtractor.test.ts
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
