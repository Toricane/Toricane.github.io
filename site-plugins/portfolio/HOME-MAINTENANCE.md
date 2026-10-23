# Maintaining the home page

This is the content-maintenance runbook for contributors and AI agents. Read it
when adding, changing, renaming, or removing projects, awards, images, or biography
facts. Collection schemas and publishing rules remain in the root
[AGENTS.md](../../AGENTS.md); technical behaviour is documented in the
[plugin README](README.md).

## Default: update the source, then review the home page

Update the relevant project or award note first. The home page combines generated
content with a small amount of deliberately curated copy. A new entry is not a
reason to add another home section or repeat its whole description on the home
page. Review the affected home content, make only necessary editorial changes,
and say when no manual home edit was needed.

Keep this guide, the implementation, and the short Home page section in
`AGENTS.md` consistent if the maintenance rules change. Do not create another
independent list of homepage projects or facts in a config file.

## What updates automatically on the next build

- **Selected projects:** published `content/projects/` entries with
  `significance: spotlight`, sorted by most recent known end/point date or start
  date, with title as the tie-breaker, capped at six. `featured` and `standard`
  entries remain available in the collection but do not enter this selection.
  An ongoing project's start date is used; it is not assigned today's date.
  Do not hardcode or reorder this list in `Portfolio.tsx` or `content/index.md`.
- **Selected cards:** title, description, dates, affiliation, tags, significance,
  and first `## Gallery` image come from the entry. A missing image leaves a
  text-only card. Correct the entry rather than making a home-only patch.
- **Contribution/result stories:** `homeContent.ts` reads the first published
  paragraph under `## Role and constraints` and the first sentence of the first
  published paragraph under `## Result`. Missing contributions fall back to the
  description; missing results are omitted. Keep these exact body headings from
  the project template. Frontmatter `role`/`outcome` is not the source here.
  The result's opening sentence must be truthful on its own, including essential
  context such as a team prize, prototype status, or measured conditions.
- **Counts and archive links:** project totals, hackathon-build totals, total
  awards, and hackathon-award totals are derived. Hackathon builds are projects
  tagged `hackathon`; hackathon awards are award entries tagged `Hackathon`,
  matched case-insensitively. Do not duplicate an award just to increase a count.
- **History graph:** all dated project entries contribute to the rail, including
  entries outside the selected six. Dates, hiatuses, nodes, parent/series links,
  and thumbnail colours come from the collection data.
- **Curated milestones' presentation:** the award links in the home milestones
  list select the records; their current title, description, issuer, date, and
  first Gallery image supply the displayed content. Adding a Gallery image to a
  linked award moves it from the text rows into the photo grid on the next build.
  Existing explanatory text in the source list is not the rendered award blurb;
  the award note's `description` is authoritative. Keep the source list wording
  consistent too: the generated Markdown export retains that authored list.
- **Newsletter:** the build resolves Substack, preserving the last-good feed or
  using the verified fallback if necessary. Home HTML and its Markdown preview
  include the latest post only when it is within four calendar months of build
  time. Do not manually hide or restore the section for each new post. A rebuild
  is needed to discover a post or age a preview out; this static site does not
  change at midnight without a build. Keep the Substack contact link available.
- **Agent exports:** `/index.md`, collection Markdown, `/search-index.json`, and
  `/llms.txt` are generated. Never edit these output files under `public/`.

## When to edit the curated home content

The source is `content/index.md`, with photo-reel data in `content/coverflow.md`.
Search both files for the affected project slug, organization, metric, or claim.

- **Routine new project or award:** add the canonical entry, accurate dates/tags,
  and images. Check the generated selection and totals. Leave the curated home
  copy unchanged if its existing claims and balance still hold.
- **Change to a featured story or its outcome:** update the entry first, then
  correct any corresponding hero fact or narrative in `content/index.md`.
  Detailed chapters such as JARVIS and cell-safe are authored copy, not automatic
  expansions of their project pages. Correct relevant numbers, role attribution,
  status, assumptions, and captions in both places.
- **A substantially stronger example:** consider replacing an existing hero fact,
  smaller-tool example, hackathon experiment, or process story that serves the
  same purpose. Prefer replacement over growth. Preserve the mix of technical
  work, how it was built, collaboration, curiosity, and a clear way to get in
  touch. Spotlight selection alone does not require a new narrative chapter.
- **Biography or role changes:** review the introduction, four concrete facts,
  community role dates, and education/path copy. Confirm the actual status and
  dates from user-provided or verified sources. Do not advance a study year,
  extend an ended role, or invent a current position from the calendar alone.
  Keep ended-role metrics scoped to the period in which they were recorded.
- **A milestone worth highlighting:** add its award entry, then decide whether
  to replace one of the home milestone links. Not every award belongs here.
  Use the existing list and canonical `/awards/slug` link, not custom JSX.
- **New or changed photos:** a Gallery change updates derived cards automatically.
  Curated chapter images and the photo reel require a separate editorial choice.
  Check captions, alt text, framing, and unnecessary repetition between adjacent
  sections. Keep the people section focused on sharing or community work.
- **Renames or removals:** check home narrative links, the milestone list, and
  coverflow `link` values. Update them to the canonical entry URL and preserve
  old entry URLs as aliases when appropriate. Do not leave a curated reference
  to an unpublished or removed entry.
- **Resume updates:** the live PDF and `/resume/resume.md` belong to the separate
  resume repository. The portfolio's resume-workflow project describes the tooling;
  it is not another maintained copy of the résumé. Refresh its claims or image
  only when those change, and do not copy private exports into the website.

For copy that must exist in both an entry and a narrative chapter, keep the
entry as the detailed source of truth and the home version as a concise summary.
Do not repeat mutable facts in more sections than necessary. Leave intentional
`[Replace with: …]` prompts alone without verified content; the build hides them.

## Preserve the source structure

Before the first `##`, keep the intro paragraph, a list of concise concrete
profile facts, and the Email/GitHub/LinkedIn links. Projects/Awards navigation and
counts are rendered by the component, not authored into this Markdown.

Each `##` starts a narrative chapter. Text before its first `###` becomes the
intro; each `###` starts a group. For illustrated groups, use the current pattern:
a heading, one image-only paragraph, then a body paragraph. Desktop shares those
three rows across the columns and bottom-aligns headings above the images;
mobile follows natural reading order. Consolidate extra detail into the entry
rather than adding unmatched paragraphs inside one column. A standalone internal
project/archive link at the end of the final group becomes a section-wide CTA.

The following generated IDs have special rendering or styling. Renaming these
headings requires checking `HomeChapter` in `components/Portfolio.tsx` and
`styles/portfolio.scss`; changing the visible words alone can remove the layout:

- `building-with-people`: photo beside stacked text groups.
- `a-few-milestones-along-the-way`: award links resolve into milestone cards.
- `lets-build-something-useful`: first paragraph is the invitation, second
  paragraph supplies action links, later paragraphs contain other profiles.

Other chapter IDs may have a scoped background tint. Check those selectors when
renaming a heading. Keep the home body colour equal to the introduction
(`--portfolio-frost`), preserve the shared column rows, and keep primary links
large enough to recognize and tap. Do not restore numbered orange uppercase
section labels, scroll-driven reveals, or fixed viewport-height chapters.

Use original asset paths in narrative Markdown, such as
`/assets/tab-panels/name.webp`. The build chooses small/preview variants; full
images are for expansion. Run `npm run images` for missing variants. The existing
coverflow data may already name a small variant; preserve that convention when
editing the reel. Do not add large original images to the initially loaded reel.
Its first image is eager; the rest are lazy. Keep icon pause/play controls and
reduced-motion behaviour intact when changing its content.

## Verification and handoff

For content-only edits, generate any missing image variants, build Quartz, and
check Markdown output. When plugin code changes, rebuild the plugin first.
Before a release, run from the repository root:

```sh
npm run images
npm run check
npm run typecheck --prefix site-plugins/portfolio
node --import tsx --test site-plugins/portfolio/src/*.test.ts
npm run build --prefix site-plugins/portfolio
node quartz/bootstrap-cli.mjs build
node scripts/check-markdown-output.mjs public
```

Use the existing preview process for visual checks; do not start another
`--serve` process unless requested. Check the changed areas at desktop and mobile
widths, including a narrow 320px layout for structural changes. Verify wrapped
headings, shared image/text alignment, readable copy in both themes, link touch
targets, and absence of horizontal overflow. Check entry modals, archive links,
and photo expansion when changing their targets. If a milestone gains a photo,
check its move into the photo grid. If newsletter behaviour changes, run its
tests with recent, stale, cached, and fallback posts.

In the handoff, say what updates automatically, what curated home copy changed
(or why none did), what was verified, and any source uncertainty left unresolved.
Do not commit or push unless the user has authorized it; publishing to `v5`
triggers the GitHub Pages workflow.
