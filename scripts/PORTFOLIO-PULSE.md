# Portfolio pulse

Generate a local report from `prajwal.goatcounter.com` with Node.js 22+. The
detailed report stays local. A separate build-side plugin publishes only last
month's page-visit total in the website footer.
Project and award entry headings also show their own visit total for that same
month, including in modals. Known alias, `.html`, and trailing-slash variants
contribute to the entry's count. Projects and Awards listing headings show visits
to the listing page itself, combining slash and index URL variants. Cards do not
show counts.

## API key

In GoatCounter, open your username menu → **API** → create a token. Give it only
**Read statistics** access, scoped to the Prajwal site if the token form offers
site selection. The report only performs GET requests against that site's API.

Create `.env.pulse` in the repository root, beside `package.json`:

```dotenv
GOATCOUNTER_API_TOKEN=paste-your-token-here
```

`.env.pulse` is covered by the existing `.env.*` ignore rule. Do not put the key
in `quartz.config.yaml`, `content/`, client scripts, a report, or a chat message.
An existing `GOATCOUNTER_API_TOKEN` environment variable takes precedence over
the file. Reports never contain the token, and API errors omit response bodies.

For the public footer count, add the same key as a **repository Actions secret**:

1. Open the repository's [Actions secrets settings](https://github.com/Toricane/Toricane.github.io/settings/secrets/actions).
2. Choose **New repository secret**.
3. Name it **`GOATCOUNTER_API_TOKEN`** and paste the token as its value.
4. Run **Deploy portfolio** from the Actions tab, or push a site change.

The build passes the secret only to the Quartz build step. The public footer
contains only a number and its month, such as `135 page visits in Oct 2026`.
Paths, events, referrers, and credentials are not emitted with that aggregate.
No public analytics JSON endpoint is added. With no key or a failed refresh, the
footer simply omits the count. Local site builds can also use `.env.pulse`.

The existing Pages workflow now rebuilds on the second day of each month at
09:17 UTC, in addition to pushes and manual runs. `v5` is the repository's
default branch, so GitHub can run this schedule. This refreshes the public count;
it never generates or uploads the detailed pulse. Schedule times are best effort.

## Run it

```sh
npm run pulse
node scripts/portfolio-pulse.mjs --month=2026-11
node scripts/portfolio-pulse.mjs --days=30
npm run pulse:demo
npm run pulse:test
```

The default compares the last complete calendar month with the preceding month.
`--month YYYY-MM` selects another complete month. `--days 30` compares the last
30 complete UTC days with the 30 days before them. Today is excluded from rolling
reports so a partial day does not distort the comparison.

Use the direct `node` commands for options in Windows PowerShell: its `npm.ps1`
wrapper can consume the `--` separator and swallow script flags. Plain
`npm run pulse` and `npm run pulse:demo` do not need forwarded flags.

If an API request fails, the error identifies the endpoint and status without
printing your key or the response body. A 401/403 points to authentication or
statistics permissions; a 404 means the requested API resource was unavailable.
Retry a 404 before changing your token, and retain the endpoint name if it recurs.

Open the generated `.html` report in your browser. Matching `.md` and `.json`
files are saved beside it under **`private/portfolio-pulse/`**, which is already
ignored by Git and Quartz. The HTML is self-contained: no remote fonts, scripts,
tracking, or API key are needed to view it. Print it from the browser if needed.
Demo files have a `-demo` suffix and a prominent demo label; they use synthetic
data and do not access the API. `--out DIRECTORY` can change the destination,
but the script refuses `content/` and `public/` to prevent site publication.

Live reports require a configured token. Missing or unauthorized tokens,
invalid data, failed requests, and stalled pagination fail
without generating a misleading partial report. Existing reports remain intact.

## What the report means

- **Page visits:** sum of GoatCounter's visitor counts for non-event paths. These
  are neither site-wide unique people nor raw pageview totals. One person can
  contribute visits to several pages.
- **Tracked clicks:** recognized resume, email, GitHub, LinkedIn, and outbound
  events. Other events are excluded and noted. Counts follow GoatCounter's
  session deduplication rather than recording every repeated click.
- **Projects:** entry paths under `/projects/`, including modal views once that
  instrumentation was deployed. Trailing-slash variants are combined. Projects
  only seen in the previous period remain visible with zero current visits.
- **Placements and pages generating clicks:** aggregate where the action
  happened, including tap banner/bar and entry modal links.
- **Referrers:** requests are scoped to non-event page IDs, so click events do
  not inflate discovery counts. Internal website referrals are omitted. `nfc`,
  `linkedin`, `github`, and `resume` can come from the site's source labels.
  This is not a visitor-level attribution or conversion funnel.

The report shows raw current and previous counts and changes. Percentages are
suppressed when the baseline is below 20 or tracking is not comparable. Periods
with fewer than 50 page visits get a small-sample warning. Months with different
lengths also show visits per day. Click/modal/NFC/source tracking began on
**2026-10-25**, so reports spanning that rollout explicitly flag incomplete
coverage. Older events and previously uncounted modal views cannot be recovered.

Each report proposes one cautious next step. It never infers that an email was
sent, that a resume was read, or that a particular person followed a funnel.

## Keeping reports local

Run the report at the start of each month, or use the optional local task
installer once your key is configured:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/install-portfolio-pulse-task.ps1
```

This registers a per-user Windows task named `Portfolio monthly pulse`, running
on the second day of each month at 09:17 UTC. It runs only while you are logged
in, catches up after a missed run, and saves reports in this checkout's ignored
`private/portfolio-pulse/` folder. It uses the local `.env.pulse` file and does
not place the token in the task definition. The installer prints how to remove
the task. It is not installed by `npm install`, site builds, or this report CLI.

Detailed reports should not be uploaded to this public repository's Actions
artifacts or job summaries if you want to keep them private. The public footer
count is a separate, deliberately limited aggregate generated at build time;
it does not publish this report or expose the token.

## API references

- [Authentication and API overview](https://www.goatcounter.com/help/api)
- [Request and response schemas](https://www.goatcounter.com/api.json)

Path pagination uses `exclude_paths`; referrer pagination uses `offset`. The
client waits at least 300 ms between requests and retries HTTP 429/5xx responses
up to three attempts. Inclusive hourly end bounds stop at 23:00 on the final
reported day, so adjacent periods do not count the next midnight twice.
