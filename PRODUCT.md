# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

One user: the owner, who runs both business lines himself. Opened mostly on a phone,
one-handed, in the moments between doing the work — standing at the printer, packing an
order, deciding whether to take a job. Installed to the home screen as a PWA rather than
visited as a website. Nobody else has the link; the whole site sits behind a password.

Occasionally shown to other people on the owner's own screen, which is why it has to look
finished, but it is never handed out.

## Product Purpose

A live view of two side businesses that otherwise exist only as rows in a Google Sheet:
3D-printed items made to order, and Tesla chargers bought and resold.

It exists to answer questions the spreadsheet holds but does not surface — what a job earns
per hour of printer time, how many days of charger stock are left, whether the printer has
paid for itself yet — and to make the answers feel like a real operation rather than a
hobby ledger.

Success is both at once: the owner reaches for it to make a decision, and it looks like the
admin panel of a funded company while doing it. Neither half is decoration.

## Positioning

The numbers are real and the styling is theatre, and the two never swap places. Tools that
look this way are usually mockups with invented figures; ledgers with figures this real are
usually spreadsheets. This is a spreadsheet's truth wearing a payments dashboard's face.

## Operating Context

- **The sheet is the system of record.** One Google Spreadsheet, shared link-viewable, with
  five tabs. `3D Print Orders` and `Tesla Inventory` hold the rows; `3D Print Summary`,
  `Tesla Summary` and `Master Dashboard` hold the owner's own computed totals, which the
  site recomputes independently and agrees with.
- Rows are entered in the sheet, by hand, on a laptop. The site is where they are read back.
- Reading needs no credentials: the tabs are pulled as CSV exports. Writing goes through a
  Google Apps Script web app the owner owns, because changing a cell requires a signed-in
  identity.
- Deployed on Vercel. Used on mobile data as often as wifi, so it caches and works offline
  from the last sync.
- Print orders move through: Need to Print → Printed → Waiting for Pickup → Completed, or
  Cancelled. Chargers are Available → Pending Pickup → Sold.
- Sales happen almost entirely through Facebook Marketplace, delivered around Montreal and
  Ottawa.

## Capabilities and Constraints

- Reads both business lines live, on a shared date-range/search/status filter that scopes
  every figure on a page at once.
- Writes exactly one thing today: an order's status. Everything else is entered in the sheet.
- The whole site, pages and data routes alike, is behind a single password.
- Profit and margin are blank in the sheet until an order closes, so any figure derived from
  them counts completed rows only.
- The sheet changes under the site constantly — row counts quoted anywhere go stale within
  days. Nothing should hardcode them.
- Undecided: whether more business lines get added. The current two are not a commitment in
  either direction, so nothing should assume exactly two.

## Brand Commitments

"Hustle Desk" across both lines, with "Print Lab" and "Charger Desk" as the per-line names.
No logo, no wordmark, no external brand to honour.

The current dark payments-admin look is the incumbent design, deliberately **not** declared
binding: it is the state of the work, not a promise about it.

## Evidence on Hand

- The spreadsheet is the only source of data, and the only evidence that exists.
- There are no testimonials, reviews, customer quotes, press, case studies, logos, or
  screenshots of third-party tools — and none may be invented to fill a layout. Customer
  first names in the sheet are real people and are not marketing copy.
- Current shape of the record, as a sense of scale rather than a fact to quote: roughly four
  dozen print orders and ninety-odd chargers, a few thousand dollars of profit, most of it
  from the charger line.

## Product Principles

1. **Every figure traces to a row.** Styling may be theatre; data never is. Anything that
   cannot be derived from the sheet does not appear as if it could be.
2. **The sheet wins.** It is the record. The site reflects it and, where it writes, writes
   carefully enough never to damage what is already there.
3. **Earn the screen by answering a decision.** A number that does not change what the owner
   does next is decoration, and there is already enough of that on purpose.
4. **Phone-first, one-handed, sometimes offline.** The real usage scene is thirty seconds
   standing next to a printer, not a desk session.
5. **Impressive and useful are both requirements.** When they conflict, say so rather than
   quietly sacrificing one.

## Accessibility & Inclusion

No formal standard was set. Established by use: a single user on a phone, frequently
one-handed and in variable light, which is why the interface is dark, high-contrast, and
never conveys a state through colour alone.
