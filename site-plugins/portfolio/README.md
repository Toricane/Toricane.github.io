# Portfolio plugin

Site-specific Quartz components, transformers, RSS, and agent-readable Markdown.

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
