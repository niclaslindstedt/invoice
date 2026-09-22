# Troubleshooting

## Install and build

**`npm install` fails with `401 Unauthorized` for `@niclaslindstedt/oss-framework`.**
The package comes from GitHub Packages, which requires a token even for public
packages. Put one with the `read:packages` scope in `~/.npmrc`:
`//npm.pkg.github.com/:_authToken=<token>`. The project's own `.npmrc` only
maps the scope to the registry and carries no token.

**`npm install` fails with `Cannot read properties of null (reading 'edgesOut')`.**
An npm 10 bug with the `react → preact/compat` alias overrides. Use `npm ci`
against the committed `package-lock.json`.

**`make lint` fails on types from `react`.** The app runs on Preact;
`tsconfig.json`'s `paths` point `react` at `preact/compat`. Don't add
`@types/react` — see `AGENTS.md`.

## Writing an invoice

**New invoice is greyed out.** An invoice needs a company to be from and a
customer to be for. Fill in **Company** and save, then add a customer.

**Send is greyed out.** The list under "Before it can be sent" names what is
missing. The usual ones: the company's organisation or VAT number is missing
or fails its check digit, a line has no description, or there is no bankgiro,
plusgiro or IBAN to pay to.

**The VAT number is marked wrong.** A Swedish VAT number is `SE`, the ten
digits of the organisation number, and `01`. Type the organisation number
alone and the field derives the rest.

**The total is a few öre off the lines.** The total is rounded to a whole
krona and the difference is printed as its own line. Turn **Round the total**
off on the invoice or in the template if you do not want that.

**A section cannot be hidden.** The region requires it: the header, the
parties, the dates, the lines, the totals and the payment block are what a
Swedish invoice must carry. Everything else can go.

**I edited the customer on the invoice and the customer changed.** By design:
a draft reads the customer live, and an edit on the page is an edit to the
record. The old version is in the customer's history (the clock glyph), and
can be restored from there. A sent invoice never changes.

## Hours from Time

**A dropped file did nothing.** It must be an `invoice-lines` export from the
Time app (**Report → … → Export for Invoice**), dropped on a _draft_. A sent
invoice takes no new lines; duplicate it or write a new one.

**The lines came in at price 0.** The customer has no default price per unit.
Set the price on the lines, or on the customer for next time.

## Storage

**"A folder" is not offered.** The browser has no File System Access API.
Chrome and Edge have it; Firefox and Safari do not. Dropbox works everywhere.

**The folder asks to be reconnected.** The browser wants its permission
confirmed again after a restart. Tap the storage glyph → **Reconnect**; it
needs a click.

**"Reconnect needed" on Dropbox.** The session lapsed. Tap the storage glyph,
then **Reconnect**.

**A deleted customer came back.** The merge is per record, last edit wins,
and a deletion has no record to win with — the other device's copy is restored
on the next sync. Delete it on the other device too. See [`sync.md`](sync.md).

## Recovery

**The app opened empty after an update.** A document a newer build wrote can
be unreadable to an older one still cached by the service worker. The app
leaves the stored copy untouched and quarantines a copy under
`doc:unreadable` in IndexedDB; reload once the update has applied and it
comes back.
