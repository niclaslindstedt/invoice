# Architecture

A frontend-only PWA. No server, no API, no build-time data source. Everything
below runs in the browser tab.

```
index.html
  └── src/main.tsx            mounts <App> inside the i18n LanguageRoot
       └── src/App.tsx        theme, store, storage engine, tab switch, chrome
            ├── TopBar            mark + wordmark, the desk's tabs, storage glyph, cog
            ├── InvoicesScreen    the list, the filter, New invoice, the onboarding
            │    └── InvoiceEditor   one invoice: details, look, issues, the page, the actions
            │         └── InvoicePage   the page as it prints — preview, edit mode and printout
            ├── CustomersScreen   the customers, the editor and the history behind each
            ├── TemplatesScreen   the templates and the editor behind each
            ├── CompanyScreen     who the invoices are from, and its history
            ├── SettingsScreen    theme, language, storage, backup, developer, about
            └── BottomNav         the four destinations, on the phone

src/app/
  types.ts          the model: Party, Company, Customer, Invoice, Template, AppData
  regions/          everything about a country, one folder each
    index.ts          the Region interface, the registry, the field helpers
    se/               Sweden: identifiers, rates, notices, the check, its strings
  invoice.ts        the arithmetic and the edits: totals, VAT groups, rounding, the number series, send, statuses, credit (pure, clock-free)
  layout.ts         the sections, the typefaces / accents / papers, and the moves (pure)
  interchange.ts    the invoice-lines file the Time app writes (pure)
  merge.ts          two documents → one, revisions as a union (pure)
  migrations.ts     bytes ⇄ AppData, with validation
  useDocStore.ts    the document in state, persisted to IndexedDB
  useSyncEngine.ts  the folder or Dropbox copy: pull on open, debounced push on edit
  useAppSettings.ts the settings blob
  labels.ts         domain value → label, and a region's words by language
  look.ts           the two themes
  i18n/             the runtime, the English and the Swedish catalog
  InvoicePage.tsx   the page, one section at a time; PageText commits on blur
  InvoiceEditor.tsx the editor over the page: modes, actions, the drop zone
  SectionFrame.tsx  a section's chrome in the edit mode: handle, arrows, eye
  useDragReorder.ts the pointer drag that moves a section
  LayoutControls.tsx the section list and the look pickers, off the page
  PartyForm.tsx     the form the company and a customer share; the region's fields from its table
  HistoryModal.tsx  a record's versions, what changed, restore
  CustomerEditModal.tsx, TemplateEditModal.tsx  the two editors
  backup.ts         export / restore a JSON file
  log.ts, pwa.ts    the log buffer; the precache id both sides agree on
```

## The shape of the data

One document (`AppData`, `src/app/types.ts`), stored as JSON:

```
{
  version: 1,
  company: Company | null,          // the one seller: a Party + region, firstInvoiceNumber
  customers:  { [id]: Customer },    // a Party + number, defaultUnitPrice, notes, archived
  invoices:   { [id]: Invoice },     // customerId, dates, lines, layout, status, events,
                                     // seller/buyer (frozen once sent), creditOf
  templates:  { [id]: Template },    // layout, dueDays, vatRate, unit, currency, note
  revisions:  { [customerId | "company"]: [{ at, data: Party }] }
}
```

A `Party` is the part the sender and the receiver share: name, address,
contact, and `details` — a free map whose keys the region defines (an
organisation number, a bankgiro). Every record carries `updatedAt`, the
tiebreak when two copies merge; revisions are appended, never edited, and
merge as a union.

Nothing derived is stored: an invoice's totals, its VAT groups, its issues and
which sections print are recomputed on render from `invoice.ts`, the region
and `layout.ts`.

## The service worker

`pwa-plugin.ts` emits `sw.js`, `version.json` and `precache-manifest.json` at
build time; the framework's `usePwaUpdate` registers the worker and drives the
update prompt. The worker precaches the build, parks in `waiting`, and applies
on the toast's "Reload". The cache is named from the deploy base
(`src/app/pwa.ts`), so `/` and `/preview/` never share one.

## Dependency direction

Screens → stores → framework. Nothing imports from the framework's internals,
only its published subpaths (`components`, `hooks`, `storage`, `sync`, `i18n`,
`calendar`, `order`, `revisions`, `files`, `logging`, `pwa`, `theme`). The app runs on
Preact through `preact/compat` — see `AGENTS.md`.
