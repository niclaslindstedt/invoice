# Invoice

> A local-first invoicing PWA — your company, your customers, your templates and your invoices, laid out on a page you can rearrange and printed from the device. No account, no server.

[![ci](https://github.com/niclaslindstedt/invoice/actions/workflows/ci.yml/badge.svg)](https://github.com/niclaslindstedt/invoice/actions/workflows/ci.yml)
[![seo](https://github.com/niclaslindstedt/invoice/actions/workflows/seo.yml/badge.svg)](https://github.com/niclaslindstedt/invoice/actions/workflows/seo.yml)
[![pages](https://github.com/niclaslindstedt/invoice/actions/workflows/pages.yml/badge.svg)](https://github.com/niclaslindstedt/invoice/actions/workflows/pages.yml)
[![license](https://img.shields.io/badge/license-PolyForm--Noncommercial--1.0.0-blue.svg)](LICENSE)

## What

**Invoice** is an invoicing app that runs entirely in your browser. You
register the **company** that sends the invoices — its name, address,
identifiers and bank details — and the **customers** that receive them. An
invoice is written against a customer: lines with a quantity, a unit, a
price and a VAT rate, the dates and references, and a note. The page is shown
as it prints, and an **edit mode** shows the same page with every section
movable — drag it by its handle or use the arrows — hideable, and editable in
place: the lines, the note, the references, and the customer's and the
company's own details, which are the records themselves. Correct the
customer's address on the invoice and the customer is corrected; every such
change is kept as a **revision**, so what address they had in March is a
lookup rather than a memory.

An invoice starts from a **template**: a typeface out of a bundled set, an
accent, a paper, the sections a new page starts with and in what order, the
terms, the VAT rate and the due days. Sending an invoice gives it the next
**number** in the series and freezes what the page said; from then on it is
marked paid, cancelled or credited with a credit note, and its **history** —
created, sent, paid — is written under it.

Everything a country requires of an invoice lives in a **region**. Sweden is
the first: the organisation and VAT numbers with their check digits, the
"Godkänd för F-skatt" line, bankgiro and plusgiro, the 25 / 12 / 6 / 0 % VAT
rates, öre rounding, and a check that says what still stands between a draft
and one that may be sent. A second region is a folder.

It is a companion to the [Time](https://github.com/niclaslindstedt/time)
app: a month of hours exported there drops onto an invoice here as lines, at
the customer's default price. Both are built on
[`@niclaslindstedt/oss-framework`](https://github.com/niclaslindstedt/oss-framework),
the shared React/Preact surface behind the sibling apps — same storage
adapters, same theme engine, same PWA update lifecycle. English and Swedish.

## Why

- **It is your record.** Who you billed, for what, and where to pay you is
  the kind of thing that lives in a database somebody else runs. Here it lives
  in your browser's IndexedDB, and leaves the device only if you connect a
  folder you pick or **your own** Dropbox — to a JSON file you can read. No
  analytics, no telemetry, no third-party requests at runtime.
- **The page is the editor.** What you rearrange is what prints. There is no
  separate form to keep in your head.
- **Sources, not copies.** A customer's details are typed once. An invoice
  reads them live until it is sent, then keeps its own frozen copy — and the
  record keeps every version it has been.
- **The law is a folder.** Regional rules are isolated, tested, and stated in
  the app's own words, so a Swedish invoice says what a Swedish invoice must.
- **Works offline, installs as an app.** A PWA with a self-updating service
  worker; the network is never on the critical path.

## Prerequisites

- Node.js ≥ 22 (CI pins 24 — see `.nvmrc`), npm ≥ 10
- A GitHub personal access token with `read:packages` in `~/.npmrc` — the
  `@niclaslindstedt/oss-framework` dependency resolves from GitHub Packages

## Install

```sh
npm config set //npm.pkg.github.com/:_authToken <your-token>
git clone https://github.com/niclaslindstedt/invoice.git
cd invoice
npm ci
```

Or just open the hosted app at
[invoice.niclaslindstedt.se](https://invoice.niclaslindstedt.se/) and install
it from your browser's "Add to Home Screen" / install prompt — it is a PWA and
works fully offline.

## Quick start

```sh
npm run dev
```

Open the printed URL. The app opens on **Invoices** and asks for the company
first: fill in its name, address, organisation number and VAT number, tick
**Approved for F-tax** and give it a bankgiro, then save. Add a **customer**
the same way. Back on Invoices, **New invoice** opens a draft in the edit mode:
add lines, or drop a file exported from Time onto it, and press **Send** once
the issues list reads "Ready to send". The printer glyph prints the page, or
saves it as a PDF from the print dialog.

To try the production build the way it deploys:

```sh
npm run build && npm run preview
```

## Usage

Four places to be. On a phone they are the bottom bar — swipe left or right to
move between them; on a desk (a window 1024px or wider) they are tabs on the
top bar:

| Tab           | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Invoices**  | Every invoice, newest first, filtered by where it is in its life. Open one and it is the page as it prints; a draft has an **Edit** mode with the details card above the page and every section on the page framed: drag the handle or use the arrows to move it, the eye to hide it, and the fields to edit in place — a customer's details edited here update the customer. Drop a Time export on the editor to add its hours as lines. The **…** menu sends, prints, marks paid, cancels, writes a credit note, reopens, duplicates or deletes. |
| **Customers** | One card per customer: the party form (name, address, contact, the region's identifiers), a customer number, the default price a dropped-in hour starts at, notes, archive. The clock glyph opens the customer's **history** — every version, what changed, and a restore.                                                                                                                                                                                                                                                                         |
| **Templates** | What a new invoice starts from: name, due days, VAT rate, unit, currency, the default note, rounding, the sections and their order, and the look — typeface, accent, paper. One is the default for **New invoice**.                                                                                                                                                                                                                                                                                                                                |
| **Company**   | Who the invoices are from: the region, the party form with the region's identifiers, the payment details, the first invoice number, and the notices the region prints on every page. Saved with a button, and every save that changed something is a revision.                                                                                                                                                                                                                                                                                     |

…and one button for the screen you visit and leave:

| Button | What it does                                                                                                                                                            |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **⚙**  | Settings: theme, language (English / Svenska), where the invoices are kept (this device, a folder, Dropbox), backup / restore / delete, developer tools, and the build. |

## Configuration

The app needs no configuration to run. One build-time variable switches the
Dropbox backend on; it is a public OAuth client identifier (the flow is PKCE,
so there is no secret to protect), and leaving it unset simply hides the
provider. The folder backend needs nothing but a browser with the File System
Access API (Chrome, Edge).

| Variable                  | Effect                                                       |
| ------------------------- | ------------------------------------------------------------ |
| `VITE_DROPBOX_APP_KEY`    | Enables the Dropbox backend.                                 |
| `VITE_DROPBOX_APP_FOLDER` | Folder name the document is filed under (default `invoice`). |
| `VITE_BASE`               | Deploy base path (default `/`).                              |

See [`docs/configuration.md`](docs/configuration.md) for the details.

## Examples

Add up an invoice — the arithmetic is pure, so it runs anywhere, no DOM
required:

```ts
import { invoiceTotals, nextInvoiceNumber } from "./src/app/invoice.ts";

const totals = invoiceTotals({
  roundTotal: true,
  lines: [
    {
      id: "a",
      description: "Consulting",
      quantity: 128.5,
      unit: "hour",
      unitPrice: 900,
      vatRate: 25,
      discount: 0,
    },
    {
      id: "b",
      description: "Travel",
      quantity: 1,
      unit: "piece",
      unitPrice: 1234.5,
      vatRate: 6,
      discount: 0,
    },
  ],
});
// → { net: 116884.5, vat: [{ rate: 25, net: 115650, vat: 28912.5 }, { rate: 6, net: 1234.5, vat: 74.07 }],
//     vatTotal: 28986.57, gross: 145871.07, rounding: -0.07, total: 145871 }

nextInvoiceNumber({}, 1000); // → 1000 — the series starts where the company says
```

Every figure is rounded at the line, so a printed column adds up under a
calculator, and VAT is grouped by rate over those rounded nets. See
[`docs/invoice-model.md`](docs/invoice-model.md).

## Troubleshooting

| Symptom                                     | Fix                                                                                                                                 |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `npm install` fails with `401 Unauthorized` | The framework comes from GitHub Packages — see Prerequisites.                                                                       |
| `npm install` fails on `edgesOut`           | An npm 10 bug with alias overrides; use `npm ci` against the committed lockfile.                                                    |
| **New invoice** is greyed out               | An invoice needs a company to be from and a customer to be for. Fill in **Company**, then add a customer.                           |
| **Send** is greyed out                      | The list under "Before it can be sent" names what is missing — usually an identifier on the company, or a line with no description. |
| "A folder" is not offered under Settings    | The browser has no File System Access API. Chrome and Edge have it; Firefox and Safari do not.                                      |
| The folder asks to be reconnected           | The browser wants its permission confirmed again. Tap **Reconnect** — it needs a click.                                             |
| A dropped file did nothing                  | It must be an `invoice-lines` export (see [`docs/interchange.md`](docs/interchange.md)), dropped on a draft.                        |

More in [`docs/troubleshooting.md`](docs/troubleshooting.md).

## Documentation

- [Getting started](docs/getting-started.md)
- [Configuration](docs/configuration.md)
- [Architecture](docs/architecture.md)
- [The invoice model](docs/invoice-model.md) — lines, VAT, rounding, numbers, statuses, revisions
- [Regions](docs/regions.md) — what Sweden requires, and how a region is added
- [The interchange format](docs/interchange.md) — the file Time writes and this app reads
- [Sync](docs/sync.md)
- [Troubleshooting](docs/troubleshooting.md)
- [`AGENTS.md`](AGENTS.md) — conventions for humans and coding agents

## Contributing

Bugs and feature requests go to
[Issues](https://github.com/niclaslindstedt/invoice/issues); open-ended
questions to [Discussions](https://github.com/niclaslindstedt/invoice/discussions).
See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the workflow, and
[`SECURITY.md`](SECURITY.md) for private vulnerability reporting.

## License

[PolyForm Noncommercial 1.0.0](LICENSE) © Niclas Lindstedt.
