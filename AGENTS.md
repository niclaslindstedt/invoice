# Agent guidance for invoice

This file is the canonical source of truth for AI coding agents working in this
repo. `CLAUDE.md`, `.cursorrules`, `.windsurfrules`, `GEMINI.md`, and
`.github/copilot-instructions.md` are symlinks to this file.

## OSS Spec conformance

This repository adheres to [`OSS_SPEC.md`](OSS_SPEC.md), a prescriptive
specification for open source project layout, documentation, automation, and
governance. A copy of the spec lives at the repository root so contributors and
AI agents can consult it without leaving the repo; its version is recorded in
the YAML front matter at the top of the file.

Run `oss-spec validate .` (or the standalone
[`validate.sh`](https://github.com/niclaslindstedt/oss-spec/blob/main/scripts/validate.sh))
to verify conformance. When in doubt about a layout, naming, or workflow
decision, consult the relevant section of `OSS_SPEC.md` — it is the source of
truth for the conventions this repo follows.

## What this app is, and the one rule that follows from it

An invoice is a record of who a company billed, for what, and how to pay
them — and the company's own bank details sit on every page. The whole design
premise is that the record never leaves the device unless its owner explicitly
connects a folder or a cloud account of their own.

**So: never add a network call that isn't the user's own storage backend.** No
analytics, no error reporting service, no font CDN, no exchange-rate lookup, no
"anonymous" telemetry, no third-party script — not behind a flag, not in dev
only. If a change would send a byte of the document, or a byte _about_ the
document, anywhere the user did not choose, it is the wrong change however
useful the feature is. This is the constraint the README and the privacy copy
promise; it outranks convenience.

## Build and test commands

```sh
make install       # npm install (needs GitHub Packages auth — see below)
make build         # production build (vite build)
make test          # full test suite (vitest)
make lint          # eslint + tsc --noEmit
make fmt           # prettier --write
make fmt-check     # verify formatting (CI)
make check-seo     # build + assert the structural SEO/PWA signals
make icons         # regenerate the PWA icons, favicon, and og image
```

The `@niclaslindstedt/oss-framework` dependency comes from the **GitHub
Packages** npm registry (see `.npmrc`). GitHub Packages requires auth even for
public packages, so local installs need a `read:packages` token in `~/.npmrc`
(`//npm.pkg.github.com/:_authToken=<token>`); CI authenticates with the
workflow's `GITHUB_TOKEN`.

### Dependency install in web sessions

Claude Code on the web runs `.claude/hooks/session-start.sh` on `SessionStart`
(wired up in `.claude/settings.json`), so **dependencies install automatically
in the background** — an agent shouldn't run `make install` by hand first. The
hook resolves a GitHub Packages token from the environment
(`NODE_AUTH_TOKEN` / `GITHUB_PAT` / `GH_TOKEN` / `GITHUB_TOKEN`, first wins),
writes it to `~/.npmrc`, and runs `npm install` — the committed project
`.npmrc` stays token-free. It runs in **async** mode, so `node_modules` may
still be populating for a moment after the session opens; if a `make` target
fails on a missing dependency, wait and retry. The hook is a no-op outside the
web environment (`CLAUDE_CODE_REMOTE`), so it never touches a local developer's
npm config.

One npm gotcha: `npm install` from an empty tree can fail with `Cannot read
properties of null (reading 'edgesOut')` — an npm 10 bug with the
`react → preact/compat` alias overrides. The committed `package-lock.json`
sidesteps it; keep it committed and prefer `npm ci`.

## Commit and PR conventions

- All commits follow [Conventional Commits](https://www.conventionalcommits.org/).
- PRs are squash-merged; the **PR title** becomes the single commit on `main`,
  so it must follow conventional-commit format.
- Breaking changes use `<type>!:` or a `BREAKING CHANGE:` footer.

### Watching a PR after you open it

Don't babysit a PR with polling. **Do not** schedule `send_later`, cron jobs,
`ScheduleWakeup`, or timed self-check-ins to re-check CI or merge state — those
just burn turns. Open the PR, confirm the checks you can see are green, then
stop. CI failures and review comments are delivered to the session as webhook
events, so you'll be woken when there's actually something to act on.

## Architecture summary

This is a **frontend-only, local-first PWA** — there is no server. It is built
on [`oss-framework`](https://github.com/niclaslindstedt/oss-framework), the
same shared surface behind the sibling `time` app, which this one is the
companion of: a range of hours exported from Time drops onto an invoice here
as lines (see `interchange.ts`).

The framework owns the UI kit and the generic mechanics: modals, form
primitives, the theme engine, the bottom bar and the tab-paging swipe, the
storage adapters (IndexedDB, a local folder, Dropbox), the i18n runtime,
logging, the toast store, the stored-order arithmetic behind the section list,
and the PWA update state machine. What stays here is the vocabulary — what an
invoice is made of, what a region requires of it, and how a page is put
together.

### The renderer is Preact

`preact` is the only renderer dependency — **never add `react` or `react-dom`
back.** `@preact/preset-vite` compiles JSX against `preact/jsx-runtime` and
aliases `react` / `react-dom` (and their `/jsx-runtime` + `/client` subpaths)
onto `preact/compat`; `tsconfig.json` `paths` and `package.json` `overrides`
mirror that for `tsc` and npm, so the framework — which is built against React
— resolves to Preact too. App code keeps importing hooks and types from
`"react"`, which is the supported compat path; only `src/main.tsx` uses
Preact's own `render`. Two differences bite in new code: use `e.currentTarget`
rather than `e.target` in event handlers, and spell string-valued attributes
like SVG's `focusable` as `"false"` rather than a JSX boolean.

### The app owns the domain ("store stays in the app")

- `src/app/types.ts` — the model. A `Party` is what the sender and the
  receiver of an invoice have in common (name, address, contact, and
  `details`, a free map of region-defined identifiers); a `Company` and a
  `Customer` are both parties. An `Invoice` is written _against_ a customer by
  id and reads the two parties live while a draft; `sendInvoice` freezes them
  onto it (`seller`, `buyer`). It carries its own `layout` (a copy of the
  template's, so a template edit never rearranges an invoice already written),
  its `lines`, its `status` and the `events` that got it there. `Template` is
  what a new invoice starts from. `AppData` holds the lot plus `revisions`, the
  edit history of every party keyed by customer id (or `COMPANY_KEY`).
- `src/app/regions/` — **everything about a country in one folder.**
  `index.ts` is the `Region` interface and the registry; `se/` is Sweden. A
  region answers: which identifiers a party carries and which are required
  (`fields`, stored in `Party.details`); which sections the page may not go
  without (`requiredSections`); the VAT rates, the currency, the locale; the
  notices the page prints that nobody typed (`notices` — "Godkänd för
  F-skatt", the seat, late interest); and, given a finished invoice, what is
  still wrong with it (`check`). It brings its own words in every `Lang`
  (`strings`), so adding a region touches nothing outside its folder but the
  `REGIONS` row. It does no arithmetic.
- `src/app/invoice.ts` — the arithmetic and the edits: `money` (two decimals,
  half away from zero), `lineNet` / `lineVat`, `invoiceTotals` (VAT grouped by
  rate over rounded line nets, optional rounding of the total to a whole unit
  printed as its own line), `nextInvoiceNumber` (one past the highest in use —
  numbers are never reused, a cancelled invoice keeps its number and the gap
  is the record), `newInvoice`, `sendInvoice`, `setStatus` / `nextStatuses`,
  `creditInvoice`, and the money and quantity formatters. **Pure and
  clock-free** — the moment comes in through `ctx`.
- `src/app/layout.ts` — how a page is put together: the eight `SECTION_IDS`,
  the typefaces, accents and papers a page may be set in (fixed hex, never
  theme tokens — a printed document has a colour of its own), and the moves:
  `printedSections` (the layout's order with the region's required sections
  put back), `moveSection`, `hideSection`, `showSection`. Built on the
  framework's `order` module, which owns what a stored arrangement means when
  the set of sections and the stored list disagree. Pure.
- A party's edit history is the framework's `revisions` module
  (`recordRevision`, `revisionAt`, `mergeRevisions`, `changedPaths`): whole
  snapshots, a save that changed nothing skipped, two devices' lists merged
  as a union. The store records one on every company or customer save.
- `src/app/interchange.ts` — the file the Time app writes and this app reads:
  `invoice-lines`, versioned, lines of what was done and how much of it, and
  no money at all. `parseInvoiceLinesFile` validates and names what is wrong;
  `linesFromInterchange` prices the lines at the customer's default rate.
  Documented for other writers in `docs/interchange.md`.
- `src/app/merge.ts` — the per-record, last-edit-wins document merge that both
  sync and backup restore run through, with revisions as a union.
- `src/app/migrations.ts` — parse / normalise / serialize; the only module that
  trusts stored bytes. A party's `details` are tidied by the company's region
  on the way in.
- `src/app/useDocStore.ts` — the document store, over a `DocBackend` seam. The
  real backend is one JSON document in IndexedDB (`createIdbStore`, strict),
  so the first read is asynchronous and the shell paints a spinner behind
  `loaded`. Saving the company or a customer records a revision.
- `src/app/useSyncEngine.ts` — the storage engine over the framework's
  adapters: the device's copy is the working copy, and a connected folder
  (File System Access API, its handle remembered in IndexedDB) or Dropbox
  holds a copy of it — pulled on open, pushed after a 1.2 s debounce, merged
  on conflict. A folder whose permission the browser wants re-confirming is
  the same "reconnect needed" a lapsed OAuth session is.
- `src/app/useAppSettings.ts` — the per-device settings: theme, the default
  template, the developer knobs. The language is the i18n runtime's own key.
- `src/app/labels.ts` — domain value → label: a status, a unit, a date, and a
  region's own words looked up by `Lang`.
- `src/app/i18n/` — the runtime (`index.ts`), the English catalog (`en.ts`,
  the message-key type's source) and the Swedish one (`sv.ts`, code-split,
  typed as `Catalog` so a missing key is a compile error).
- `src/app/InvoicePage.tsx` — the page: the invoice as it prints, one section
  at a time. Paint only. The same component draws the preview, the edit mode
  and the printout; what differs is whether the fields are inputs (`edits`).
  A field on the page (`PageText`) holds a local draft and commits on blur, so
  an edit to a source is one revision rather than one per keystroke.
- `src/app/InvoiceEditor.tsx` — one invoice: the details card, the look, the
  issues the region still finds, the page in preview or edit mode, and the
  actions (send, print, mark paid, cancel, credit, reopen, duplicate, delete).
  A draft reads its sources live and an edit to a party _on the page_ saves
  the record; once sent the page is read-only. The whole editor is a drop zone
  for an interchange file (`useFileDrop`).
- `src/app/SectionFrame.tsx` + `useDragReorder.ts` — the chrome a section
  wears in the edit mode (handle, arrows, eye) and the pointer-drag that moves
  it. The hook owns the gesture and the arithmetic; the frame draws.
- `src/app/LayoutControls.tsx` — the section list with its arrows and eyes,
  and the three look pickers, for the template editor and the invoice editor.
- `src/app/InvoicesScreen.tsx`, `CustomersScreen.tsx`, `TemplatesScreen.tsx`,
  `CompanyScreen.tsx`, `SettingsScreen.tsx` — the five screens. Four are
  bottom-nav tabs; Settings is reached from the cog.
- `src/app/CustomerEditModal.tsx`, `TemplateEditModal.tsx`, `PartyForm.tsx`,
  `HistoryModal.tsx` — the two editors, the one form both kinds of party share
  (the region's fields drawn from its table), and a record's history with
  restore.
- `src/output.ts` — the §19.4 central output module (semantic log helpers over
  the in-app log store).
- `pwa-plugin.ts` — emits the service worker + version/precache manifests the
  framework's `usePwaUpdate` consumes.

Dependency direction: screens → stores → framework. Nothing imports from the
framework's internals — only its published subpaths.

### Sources are live until sent, then frozen

A draft prints the company and the customer as they are _now_. Editing them on
the page edits the record — and records a revision — so making sure a customer
has the right address can be done from either the Customers screen or the
invoice being written, and both say the same thing. `sendInvoice` copies both
parties onto the invoice and from then on the page reads the copies: a
document that has left the building goes on saying what it said, whatever
happens to the customer afterwards. Do not read a live record on a sent
invoice, and do not write to a source from anywhere but a draft.

### Numbers are a series, never a setting

An invoice's number is assigned when it is sent, one past the highest number
in use, starting from the company's `firstInvoiceNumber`. A draft has none. A
number is never reused and never edited: Sweden requires an unbroken series,
and a cancelled invoice keeps its number so the gap is the record of it.

### A region is a folder

Anything that is true _because of where the invoice is sent from_ — an
identifier, a notice, a rate, a rule — lives under `src/app/regions/<id>/` and
nowhere else. A screen never asks "is this Sweden"; it asks the region for its
fields and its issues. A second region is a folder, a `RegionId`, a row in
`REGIONS`, and its own strings for every `Lang`.

## Where new code goes

| Change                                           | Goes in                                                                                                                                                                |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A new region                                     | `src/app/regions/<id>/index.ts` (+ `strings.ts`) implementing `Region`, a `RegionId`, a row in `REGIONS`, tests in `tests/regions_<id>_test.ts` — nothing else         |
| A new identifier a Swedish party carries         | `src/app/regions/se/index.ts` (`fields`, with `normalize` / `validate`) and `strings.ts` — the forms and the page draw it from the table                               |
| A new rule about what an invoice must say        | The region's `check` (+ an `issues` string) — never a screen                                                                                                           |
| A new figure on the page                         | `src/app/invoice.ts` (`invoiceTotals`, tested in `tests/invoice_test.ts`) + `InvoicePage.tsx` (paint)                                                                  |
| A new section of the page                        | `src/app/types.ts` (`SectionId`) + `layout.ts` (`SECTION_IDS`) + `InvoicePage.tsx` (its render) + a `page.sections.<id>` string                                        |
| A new typeface, accent or paper                  | `src/app/layout.ts` (id + spec, walked by `tests/layout_test.ts`), `main.tsx` for a bundled `@fontsource` family, a `templates.*` string                               |
| A change to what an invoice holds                | `src/app/types.ts` + `migrations.ts` (the reader) + `invoice.ts` if it changes a figure — an additive optional field needs the validation, a shape change needs a step |
| A change to what a party holds                   | `src/app/types.ts` (`Party`) + `migrations.ts` + `PartyForm.tsx` + `InvoicePage.tsx`'s `PartyBlock` + `history.fields` strings                                         |
| A change to the interchange format               | `src/app/interchange.ts` (bump `INTERCHANGE_VERSION` on a breaking change) + `docs/interchange.md` + the Time app's `invoiceExport.ts`                                 |
| A change to how sections are moved               | `src/app/layout.ts` (the arithmetic, tested) or `useDragReorder.ts` (the gesture) — never a second order in a screen                                                   |
| A change to an invoice's life (statuses, events) | `src/app/invoice.ts` (`nextStatuses` / `setStatus`, tested) + `InvoiceEditor.tsx` (the actions)                                                                        |
| A new setting                                    | `src/app/useAppSettings.ts` (shape + clamping) + a `Section` in `SettingsScreen.tsx`                                                                                   |
| A new storage backend                            | The framework, not here — this app only wires adapters up in `useSyncEngine.ts`                                                                                        |
| A new screen                                     | `src/app/<Name>Screen.tsx` + a tab in `src/app/BottomNav.tsx`, or a button in `src/app/TopBar.tsx` if it is an action rather than a place                              |
| Any user-facing string                           | `src/app/i18n/en.ts` **and** `sv.ts`, never inline in a component — except a region's words, which are the region's `strings.ts`                                       |
| A shared UI primitive                            | The framework, if it is domain-free; `src/app/` only if it is invoice-specific                                                                                         |

## Test conventions

Tests live in `tests/` with a `_test` suffix (OSS_SPEC §20.2) and run under
Vitest in the `node` environment — they cover the pure domain modules
(`invoice`, `layout`, `interchange`, `migrations`, `merge`,
`regions/se`, the settings parser), which is where the app's real logic is. No
DOM, no testing-library, no mocked clock. `tests/fixtures/helpers.ts` holds
the shared fixtures (a company that passes Sweden's checks, a customer, an
invoice, a template, a named-id `ctx`).

Run one file with `npx vitest run tests/invoice_test.ts`.

A change to the arithmetic or to a region's rules without a test that pins the
new behaviour is not finished. UI changes should keep the boot smoke path
working: `npm run build && npm run preview`, set up the company, add a
customer, start an invoice, drop an interchange file on it, and send it.

## Changelog and feature docs

`CHANGELOG.md`'s released sections are **generated** — never hand-edit them.
Every user-visible change adds a fragment under `.changes/unreleased/`:

```
.changes/unreleased/$(date +%s)-short-slug.md
---
type: Added        # Added | Changed | Fixed | Removed | Security | Deprecated
title: Short bold title
breaking: true     # optional — forces a major release
---

One sentence a user will read in the changelog.
```

A fragment for a substantial feature links to its doc under `docs/features/`
with `[Learn more](feature:<slug>)`.

## Documentation sync points

| If you change…                                | Update…                                                                                                         |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `invoice.ts`                                  | `docs/invoice-model.md`, `docs/features/invoices.md`, and the README's Examples block if the output shape moved |
| A region, or `regions/index.ts`               | `docs/regions.md`, `docs/features/company.md`                                                                   |
| `layout.ts` or the editor                     | `docs/features/editor.md` and the README's Usage table                                                          |
| How a revision is recorded (`useDocStore.ts`) | `docs/features/customers.md`, `docs/invoice-model.md` (the history section)                                     |
| `interchange.ts`                              | `docs/interchange.md` — and the Time app's export, which writes what this reads                                 |
| The `Invoice`, `Party` or doc shape           | `docs/architecture.md`'s data shape and a `migrations.ts` step                                                  |
| The sync engine or the merge                  | `docs/sync.md`, `docs/features/storage.md`                                                                      |
| A `VITE_*` variable                           | `docs/configuration.md`, `src/vite-env.d.ts`, the README's Configuration table, and the workflows that pass it  |
| A screen's behaviour                          | The matching `docs/features/*.md` and the README's Usage table                                                  |
| Module layout                                 | The "Where new code goes" table above and `docs/architecture.md`                                                |
| A make target or script                       | `CONTRIBUTING.md`, the README's Quick start, and this file's command list                                       |

## Parity and cross-cutting rules

- **Every string goes through `t()`, in both languages.** `sv.ts` is typed as
  `Catalog`, so a key added to `en.ts` without its Swedish line fails the
  build. A region's words are the region's, in `regions/<id>/strings.ts`, for
  every `Lang`.
- **Two themes only** — one light, one dark, plus "follow the device". The
  framework ships a dozen palettes; this app deliberately exposes none of
  them. The page's colours (`layout.ts`'s accents and papers) are the
  document's own and never reach the UI around it.
- **Four destinations, no sidebar, no drawer.** Invoices, Customers,
  Templates, Company on the bottom bar in that order; the same four as tabs on
  the top bar on a desk. Settings is the cog.
- **The page is one component.** `InvoicePage` draws the preview, the edit
  mode and the printout. A second renderer for any of them is a second layout
  waiting to disagree.
- **Sources are written from a draft and nowhere else.** See above.
- **No dependency creep.** The framework, Preact, the bundled fonts, and
  workbox-window. A new runtime dependency needs a reason that the framework
  can't serve. Fonts are `@fontsource` packages imported in `main.tsx` and
  bundled from this origin — never reached for over the network.

## Website staleness

The app _is_ the website (OSS_SPEC §11.2 / §11.4) — `pages.yml` builds it and
deploys `dist/`. There is no separate marketing site to drift out of date, but
the SEO surface in `index.html` and `public/` does: when the app's description
changes, update `index.html`'s title/description/OG/JSON-LD, `public/llms.txt`,
and the manifest copy in `pwa-plugin.ts` together. `make check-seo` asserts the
structure, not the wording — it will not catch a stale sentence.

## Maintenance skills

Skills live under `.agents/skills/` (OSS_SPEC §21); `.claude/skills` is a
symlink into that tree. Each has a `SKILL.md` with its discovery process, its
source→output mapping, and a `.last-updated` marker.

| Skill             | Runs when                                                                          |
| ----------------- | ---------------------------------------------------------------------------------- |
| `maintenance`     | The registry and run order for every other skill — start here                      |
| `write-changeset` | Any user-visible change, before opening the PR                                     |
| `update-docs`     | `src/app/` changed in a way a `docs/` topic describes                              |
| `update-readme`   | Commands, configuration, or the feature set changed                                |
| `add-region`      | A new country's invoicing rules are asked for — one folder, one row, its own tests |
