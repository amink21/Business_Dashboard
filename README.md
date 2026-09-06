# Hustle Desk

Read-only dashboards for your hustle spreadsheet, dressed as a payments admin: window
chrome, a gross-volume hero, charts, a transaction feed and lock-screen sale alerts.
Every number and every alert is real data pulled live from the sheet - the styling is the
only thing that is theatre.

Two tabs:

| Tab | Sheet tab | What it tracks |
| --- | --- | --- |
| **3D Printing** (`/`) | `3D Print Orders` | 44 print orders, pipeline, materials, print hours |
| **Tesla Chargers** (`/tesla`) | `Tesla Inventory` | 83 chargers bought and resold, stock, sell-through |

Next.js, fetching the sheet's CSV export directly - no Google Cloud service account,
no API key, no OAuth.

## 1. Share your spreadsheet as link-viewable

In your Google Sheet: Share -> "General access" -> "Anyone with the link" -> Viewer.

**Already done on your sheet** - verified by fetching it anonymously.

This makes the sheet readable by anyone who has the exact URL (not searchable, not indexed,
no login). Fine for order logs; if you'd rather keep it locked to your account only, that
needs a service-account setup instead.

## 2. Environment variables

`.env.local` is already written for you:

```
SPREADSHEET_ID=1EYbvKH3QeEaMUcD2BQgAmtbQH_tvPIfgVMUxuoQIKA8
SHEET_NAME=3D Print Orders
TESLA_SHEET_NAME=Tesla Inventory
PRINT_SUMMARY_SHEET_NAME=3D Print Summary
```

Each must match a tab name exactly (case-insensitive, but spelled the same). The tabs in
your sheet are: `Tesla Inventory`, `Tesla Summary`, `3D Print Orders`, `3D Print Summary`,
`Master Dashboard`. Point one at a name that doesn't exist and the API returns an error
listing the real tab names.

## 3. Run locally

```bash
cd printing-dashboard
npm install
npm run dev
```

Open http://localhost:3000. To open it on your phone, use this machine's LAN address
(`http://192.168.2.25:3000`) on the same wifi - `next.config.js` reads the machine's own
network interfaces and allows them, so Next's cross-origin dev check stays quiet even when
DHCP hands out a different IP.

## 4. Deploy to Vercel (free)

```bash
npm install -g vercel
vercel
```

Follow the prompts. Then add `SPREADSHEET_ID`, `SHEET_NAME`, `TESLA_SHEET_NAME` and
`PRINT_SUMMARY_SHEET_NAME` under
Project -> Settings -> Environment Variables (`.env.local` is gitignored, so it is not
uploaded). `vercel --prod` gives you the permanent URL.

## 5. Install it on your phone

It is a real PWA, so "Add to Home Screen" gives you an app icon, a dark splash screen and
no browser chrome - plus it opens offline.

- **iOS**: open the URL in Safari -> Share -> "Add to Home Screen".
- **Android**: Chrome offers "Install app"; long-pressing the installed icon gives shortcuts
  straight to either hustle.

`public/manifest.webmanifest` carries the name, the `#0a0a0b` theme and background (iOS
builds its own splash from those, so there are no per-device startup images to maintain),
and both `any` and `maskable` icons so Android's circle mask doesn't crop the artwork. The
icons in `public/icons/` are rendered from an SVG of the same rising-revenue mark the
dashboard uses.

### Offline

`public/sw.js` registers in production builds only - dev serves uncached chunks a worker
would fight with. Three rules, by what the request is for:

| Request | Strategy |
| --- | --- |
| `/_next/static/*`, `/icons/*` | cache-first (immutable, never revalidated) |
| `/api/*` | network-first, falling back to the last good copy |
| page navigations | network-first, falling back to cache, then to an offline page |

Open it once while connected and it works on the subway. A sheet response served from cache
is tagged `x-from-cache`, and the footer then reads "Offline · showing last synced numbers"
rather than pretending it just synced.

## How it reads the sheet

`/api/sheet?tab=print|tesla` (or any literal tab name). Your tabs have a merged title banner
in row 1 ("3D PRINT ORDER TRACKER"), so row 2 holds the real column headers. The route
resolves the tab name to its `gid`, pulls the raw CSV export, then treats the first row with
more than one filled cell as the header row - so the banner is skipped without hardcoding
"skip row 1". Responses are cached for 15 seconds so rapid refreshes don't hammer Google.

## What's on each tab

Both pages share one filter row (date range, search, status). It scopes the hero, every
chart, every tile and the feed together, so the numbers on screen always agree with the list
under them.

**3D Printing** - gross volume hero + cumulative revenue chart; 12 tiles; revenue by month
split into profit vs cost; order pipeline by status; top items and top customers by net
profit; the payments feed.

Four of those tiles are about whether the printer is worth running:

- **After equipment** - net profit minus what the printer and filament cost, read live from
  the `Total Equipment & Filament Spent` cell on the summary tab. Everything else on the page
  is gross of capex; this is the only figure that isn't.
- **Typical rate** - the *median* job's profit per print hour. The median, not the mean: one
  30-hour job would otherwise drag the whole picture down.
- **Queued print time** - printer hours already promised to orders that haven't shipped.
- **Under rate** - how many queued jobs would earn less per printer hour than a typical past
  one. Profit is blank until an order closes, so it falls back to sale minus cost.

**Tesla Chargers** - the same shape, with 12 tiles including:

- **Days of cover** - stock divided by the actual sales rate over the window the sales span.
  Turns red under two weeks; it is the reorder signal.
- **Return on cost** - profit per dollar of stock bought.
- **Profit / day held** - what a day of inventory earns, the charger analogue of profit per
  print hour.
- **Oldest unit** - the longest-held unsold charger.

Range presets default to **All time**. Every completed print order lands in a two-month
window, so `30 days` there honestly shows $0 closed and only the open pipeline; the charger
side is still selling, so its shorter ranges are populated.

## The other four pages

**Quote** (`/quote`) prices a job against your own finished work. Enter print hours, material
cost and a price; it returns the profit per printer hour, where that lands among past jobs,
and what to charge to match your median, your all-in average, or your top quartile. It lists
the nearest jobs by length as a sanity check. Every benchmark is your history, not a rule of
thumb.

**Console** (`/console`) renders every sheet row as the API call that would have created it -
`POST /v1/charges 200`, `POST /v1/refunds 402`, `PUT /v1/inventory 201` - streaming in one
line at a time, filterable, each expanding to a JSON body. Amounts, items, statuses and dates
are real; the ids, clock times and latencies are set dressing, and the page says so. Purely
for the bit.

**Wrapped** (`/wrapped`) is a twelve-card story across both hustles: money in, best day, best
month, printer hours, your regular customer, fastest flip, which hustle won. Tap to advance,
hold to pause, arrow keys work, screenshot to share. Cards with no data behind them are
dropped rather than padded.

**Daily net profit** is a calendar heatmap on both dashboards - one square per day, shaded by
what that day earned.

## Sale alerts

One lock-screen alert per visit, picked at random when the sheet data lands, then gone
after about five seconds. `New alert` in the header rolls another (never the same one
twice in a row).

The pool is built in `lib/alerts.js` from the ten most recent sales plus computed
highlights - biggest order, best day, best month, best hourly rate, a returning customer,
fastest flip, the leading product line, lifetime totals. Every one of them is a fact out of
the sheet, so a screenshot of any alert is still true. Near-identical entries are deduped
by their rendered text, which matters on the charger side where a run of sales would
otherwise all read "$200 · 120V Mobile Connector".

The random pick happens in an effect rather than during render - the server has no way to
agree on a dice roll - and the pool is read through a ref so typing in the search box never
re-rolls the alert.

## Chart choices

- **Cumulative volume** is an area chart: single series, 2px line, 10%-opacity fill, hairline
  solid gridlines. The crosshair snaps to the nearest date on hover and on arrow keys, and
  `Chart / Table` swaps in a table with the same numbers - nothing is reachable only by
  hovering.
- **Revenue by month** stacks rather than groups, because profit is *part of* revenue, not a
  series beside it. Profit wears the accent, cost the de-emphasis neutral - the emphasis
  form, so no second hue is needed. Columns are capped at 24px with a 2px gap between
  segments; the total sits on the bar cap.
- **Bar charts** use one color for every bar (a darker-where-bigger ramp would just
  re-encode length) and carry their value at the tip, so no value is hover-only.
- **Pipeline / inventory bars** are the exception: there the category *is* a state, so they
  wear status colors - always beside the sheet's own status text.
- **The calendar** is sequential encoding: one hue, low to high, with break points taken from
  the data's own quantiles so a quiet month still shows shape. Being continuous magnitude, its
  quietest step is allowed to recede toward the surface - which is why it ships with a scale
  legend and a table twin instead of leaning on color alone.

## Colors

Defined once in `styles/globals.css`. The accent `#05af80` and the de-emphasis `#75767e`
were checked against the dark surface with a palette validator (OKLCH lightness band, chroma
floor, WCAG contrast, and CVD separation for the pair) rather than picked by eye.
`--warning` and `--critical` are reserved status tokens and always ship beside a text label,
so state is never carried by color alone.

Dark-only on purpose - every color is painted explicitly rather than inheriting the OS theme.

## Layout

```
lib/data.js     shared: parsing, date ranges, cumulative + spark series, formatting
lib/print.js    3D print orders: normalize, summarize, monthly stack, pipeline
lib/tesla.js    charger inventory: normalize, summarize, monthly stack, stock
lib/alerts.js   the pool of real moments the lock-screen alert draws from
lib/wrapped.js  the twelve story cards, built from both hustles
lib/console.js  sheet rows rendered as API traffic
components/     Shell (chrome + tabs), FilterRow, VolumePanel, VolumeChart/Table,
                StackedColumnChart, BarChart, StatTile, Sparkline, RecordFeed,
                StatusPill, AlertToast, BrowserChrome, Card, ProfitCalendar
pages/          index.js (3D printing), tesla.js, quote.js, console.js,
                wrapped.js, api/sheet.js
public/         manifest.webmanifest, sw.js, icons/
```

## Notes

- Read-only by design. Writing back to the sheet would need real authentication (OAuth or a
  service account), since writes require a signed-in identity.
- The `Tesla Summary`, `3D Print Summary` and `Master Dashboard` tabs aren't read - every
  figure here is recomputed from the two raw data tabs, which is why they agree with those
  summary tabs rather than depending on them.
#   B u s i n e s s _ D a s h b o a r d 
 
 