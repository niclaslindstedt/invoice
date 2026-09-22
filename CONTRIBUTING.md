# Contributing to invoice

Thanks for your interest! This document describes how to set up a dev
environment, the conventions we follow, and how to get a change merged.

## Prerequisites

- Node.js ≥ 22 (CI pins 24 — see `.nvmrc`), npm ≥ 10
- A GitHub personal access token with `read:packages` in `~/.npmrc` — the
  `@niclaslindstedt/oss-framework` dependency resolves from GitHub Packages
  (see the README's Install section)

## Getting the source

```sh
git clone https://github.com/niclaslindstedt/invoice.git
cd invoice
npm install
```

## Build, test, lint

```sh
make build
make test
make lint
make fmt-check
```

```sh
make native-install      # install its dependencies
make native-bundle       # build the web app into native/assets/webroot.zip
make native-typecheck    # what CI's `native` job runs
```

Store builds run on EAS by manual dispatch; see
[`native/RELEASING.md`](native/RELEASING.md).

A change to how the dial draws is judged by eye. `make shots` builds and
photographs the watch face in a few states into `shots/`, with a contact sheet
of them all in `shots/sheet.png` (see `scripts/dial-shots.mjs` for the
options); it needs Playwright, which is not a
dependency of the app — the script says how to install it outside the lockfile.

## Development workflow

1. Fork the repo.
2. Create a topic branch: `git checkout -b feat/<slug>` or `fix/<slug>`.
3. Make focused commits using [Conventional Commits](https://www.conventionalcommits.org/):
   ```
   <type>(<scope>): <summary>
   ```
   Types: `feat`, `fix`, `perf`, `docs`, `test`, `refactor`, `chore`, `ci`,
   `build`, `style`. Breaking changes: `<type>!:` or `BREAKING CHANGE:` footer.
4. If the change is user-visible, add a changelog fragment under
   `.changes/unreleased/` (CI enforces this via the `changeset` job):

   ```
   .changes/unreleased/$(date +%s)-short-slug.md
   ---
   type: Added        # Added | Changed | Fixed | Removed | Security | Deprecated
   breaking: true     # optional — forces a major release
   ---

   One line users will read in the changelog.
   ```

   Pure refactors, CI/build tweaks, and docs-only PRs are exempt (skip-list in
   `scripts/release/check-changeset.mjs`); or label the PR `no-changelog` to opt
   out. `version-bump.yml` collates these into `CHANGELOG.md` and derives the
   semver bump — run `make bump` to preview it.

5. Open a PR. The **PR title** must be conventional-commit format because we
   squash-merge and that title becomes the commit message on `main`.
6. CI must be green and at least one reviewer must approve.

## Tests

Tests live in `tests/` with a `_test` suffix (OSS_SPEC §20.2) and cover the
pure domain modules — the invoice arithmetic, the region layer (Sweden's
identifiers and checks), the page layout, the revision history, the
interchange format, the document merge, and the storage migrations. Run one
file with `npx vitest run tests/invoice_test.ts`. UI changes should keep the
boot smoke path working: `npm run build && npm run preview`, set up the
company, add a customer, start an invoice, and check that it can be sent.

The arithmetic is deliberately clock-free — the moment an edit happened comes
in through a `ctx` argument, never `new Date()` inside `invoice.ts` — so a
test never needs fake timers. Keep it that way.

## Documentation

If your change touches user-visible behavior, update the relevant `docs/`
topic and the README quick start. See `AGENTS.md` for the full sync table.

## Governance

This is a single-maintainer project: [@niclaslindstedt](https://github.com/niclaslindstedt)
merges PRs and makes final decisions. Disputes are resolved in the PR thread;
sustained, high-quality contributions are the path to being invited as a
maintainer. If the project is abandoned, the license permits noncommercial
forks — open an issue first so a successor can be blessed.

## Code of Conduct

By participating you agree to abide by the [Code of Conduct](CODE_OF_CONDUCT.md).

## Reporting security issues

See [SECURITY.md](SECURITY.md). Do **not** open public issues for security
problems.
