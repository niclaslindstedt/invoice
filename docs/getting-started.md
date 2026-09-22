# Getting started

Invoice is a local-first invoicing app. There is nothing to sign up for and
nothing to install beyond the app itself.

## Use the hosted app

Open [invoice.niclaslindstedt.se](https://invoice.niclaslindstedt.se/). On a
phone, use the browser's **Add to Home Screen** / install prompt: the app then
opens full-screen like a native one and works with no network at all.

## Run it locally

```sh
npm config set //npm.pkg.github.com/:_authToken <your-token>
git clone https://github.com/niclaslindstedt/invoice.git
cd invoice
npm ci
npm run dev
```

The token needs the `read:packages` scope — the
`@niclaslindstedt/oss-framework` dependency comes from GitHub Packages, which
requires authentication even for public packages.

## Your first invoice

1. The app opens on **Invoices** and asks for the company first. Under
   **Company**, pick the region (Sweden today), fill in the name and address,
   the organisation number and the VAT number — both are checked as you type
   — tick **Approved for F-tax**, give it a bankgiro, plusgiro or IBAN, and
   save. The notices the region will print on every invoice are listed at the
   bottom.
2. Under **Customers**, add one: name, address, the organisation number if
   it is a company, and — if you bill hours — the price an hour starts at.
3. Back on **Invoices**, **New invoice** opens a draft in the edit mode. Add
   lines with the button, or drop a file exported from the Time app onto the
   editor and its hours arrive as lines. Set the dates. Anything wrong is
   listed under "Before it can be sent".
4. Rearrange the page if you like: every section has a handle to drag, arrows
   to move, and an eye to hide. Pick a typeface, an accent and a paper, or
   set them once in a **template** and pick the template.
5. **Send**. The invoice takes the next number in the series and what the
   page says is frozen. The printer glyph prints it; choose "Save as PDF" in
   the print dialog for a file.

## Where the data lives

In your browser's IndexedDB, on this device. **Settings → Your data**
downloads a JSON backup or restores one. To keep a copy in a folder you pick
or in your own Dropbox, and to work on two devices, see
[`features/storage.md`](features/storage.md).
