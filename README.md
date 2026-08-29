# Prajwal Prashanth’s portfolio

Built with [Quartz 5](https://quartz.jzhao.xyz/) and deployed as a static site on GitHub Pages at [prajwal.is-a.dev](https://prajwal.is-a.dev).

## Structure

```
content/                  # Markdown pages + assets (the CMS)
  index.md                # Home bio
  coverflow.md            # Home photo reel
  projects|hackathons|awards/
  assets/
    tab-panels/           # Full-size entry images
      small/              # 800px-wide gallery / coverflow thumbs
      preview/            # 256px-wide timeline thumbs
    coverflow/            # Home reel photos
    icons/                # Inline bio link icons
site-plugins/portfolio/   # Site-specific Quartz plugin (UI)
scripts/                  # Image variants + git-hook installer
.githooks/pre-commit      # Runs npm run images before commit
quartz.config.yaml        # Site config, theme, plugins
.github/workflows/pages.yml
```

There is no separate content sync step or generated data file. Collection listing UI is driven by the portfolio plugin from Markdown frontmatter.

## Update content

- Edit Markdown under `content/`.
- Add a project in `content/projects/`, a hackathon in `content/hackathons/`, or an award in `content/awards/`.
- Put the full image in `content/assets/tab-panels/` and set `cover: assets/tab-panels/….webp`. Collection pages are `/awards/` (trailing slash); entries are `/awards/some-slug` (no slash).
- Missing `small/` and `preview/` files are created on commit (after `npm run hooks`), or anytime with `npm run images`. Existing variants are left alone unless you run `npm run images -- --force`.
- Home coverflow: edit `photos` in `content/coverflow.md`. Optional `link` opens an entry modal (e.g. `/awards/class-valedictorian`); omit `link` for a full-image lightbox.
- Project pages may still contain `[Replace with: …]` prompts — replace only when you have verified copy.

### Image sizing convention

| Surface | Variant | Size |
|---------|---------|------|
| Gallery cards + coverflows | `tab-panels/small/` | 800px wide |
| Timeline thumbs | `tab-panels/preview/` | 256px wide |
| Lightbox / expanded | `tab-panels/` (full) | original |

The plugin rewrites paths automatically; keep frontmatter and gallery Markdown pointed at the full image. Variants are **not** generated during `npx quartz build` or GitHub Pages CI.

Install the pre-commit hook once:

```sh
npm run hooks
```

That copies [`.githooks/pre-commit`](.githooks/pre-commit) into `.git/hooks/` so each commit fills in missing thumbs and stages them.

## Develop

Requires Node.js 22 or newer.

```sh
npm install
npx quartz plugin install --from-config
npm run hooks
npx quartz build --serve
```

If you change the local plugin source:

```sh
npm run build --prefix site-plugins/portfolio
npx quartz plugin install --from-config
```

Then rebuild or refresh the running serve process.

Checks and production build:

```sh
npm run check
npx quartz build
```

## Deploy (GitHub Pages)

Workflow: [`.github/workflows/pages.yml`](.github/workflows/pages.yml) builds on push to `v5` and deploys `public/`. CNAME is `content/CNAME` (`prajwal.is-a.dev`). Commit generated `small/` and `preview/` files; the Action does not resize images.

You can do this in GitHub **before** any push:

1. Repo **Settings → Pages → Source** = **GitHub Actions** (not “Deploy from a branch”).
2. Custom domain should already be `prajwal.is-a.dev` (matches `content/CNAME`).

When you are ready to cut over (after content edits):

3. Locally verify: `npm run check` and `npx quartz build`, then spot-check `/`, `/awards/`, coverflow lightbox, and an entry modal.
4. Push the `v5` branch to `origin` (this repo’s deploy branch).
5. Confirm the **Deploy portfolio** Action succeeds.
6. Confirm [prajwal.is-a.dev](https://prajwal.is-a.dev) serves the new build.

`main` may still hold the older Astro site until you fully cut over. Do not push until content is ready.

## Keeping Quartz up to date

Remote `upstream` points at [jackyzha0/quartz](https://github.com/jackyzha0/quartz) (`v5`).

There is **no automatic sync**. Periodically:

```sh
git fetch upstream
git merge upstream/v5
# resolve conflicts carefully around quartz.config.yaml and site-plugins/
npm install
npx quartz plugin install --from-config
npm run hooks
npm run check
npx quartz build
```

Prefer keeping customizations in `site-plugins/portfolio/` and `content/` so upstream merges stay small. A scheduled PR workflow can be added later if needed.
