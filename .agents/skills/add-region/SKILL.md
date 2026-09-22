---
name: add-region
description: "Use when asked to support invoicing from a new country — adds a region under src/app/regions/<id>/ with its identifiers, VAT rates, required sections, notices, checks and its own strings, wires it into the registry, and pins it with tests."
---

# Add a region

Everything about a country lives in one folder (see `AGENTS.md` → "A region is a folder"). This skill is the playbook for adding one without touching a screen.

## When to run

- A user wants to invoice from a country the app does not know.
- A region's law changed (a new rate, a new mandatory line) — the same playbook, applied to an existing folder.

## Tracking mechanism

`.agents/skills/add-region/.last-updated` holds the commit this skill last ran against. It is per-request rather than periodic, so the marker is a record of the last region added.

## Discovery process

1. Read the interface and the reference implementation end to end:

   ```sh
   cat src/app/regions/index.ts
   cat src/app/regions/se/index.ts src/app/regions/se/strings.ts
   cat tests/regions_se_test.ts
   ```

2. Find out what an invoice must carry in the new country: the tax authority's list of mandatory invoice content, the company-law lines a limited company must print, the customary payment identifiers and their check digits, the VAT rates and which is the usual one, the customary due term.

3. List every language the app speaks — the region must bring words for each:

   ```sh
   grep -n "export type Lang" src/app/i18n/index.ts
   ```

## Mapping

| Source of truth                         | Output                                                                                          |
| --------------------------------------- | ----------------------------------------------------------------------------------------------- |
| The country's mandatory invoice content | `check` in `src/app/regions/<id>/index.ts` + an `issues` string per finding                     |
| Identifiers and their check digits      | `fields` (with `normalize` / `validate`) + a `fields` string per id                             |
| Lines the page must print               | `notices` + a `notices` string per key                                                          |
| VAT rates, currency, locale, due term   | `vatRates`, `currency`, `locale`, `defaultDueDays`, `roundTotal`                                |
| Sections the page may not go without    | `requiredSections`                                                                              |
| The registry                            | `RegionId` union, `REGIONS`, `REGION_IDS` in `src/app/regions/index.ts`                         |
| The docs                                | `docs/regions.md` (a section per region), `docs/features/company.md`, the README's What section |

## Update checklist

- [ ] Create `src/app/regions/<id>/index.ts` exporting a `Region` and `strings.ts` exporting `Record<Lang, RegionStrings>`
- [ ] Add the id to `RegionId`, `REGIONS` and `REGION_IDS`
- [ ] Write `tests/regions_<id>_test.ts`: every identifier's validator with a good and a bad value, `check` on a complete invoice (no issues) and on an empty one (every issue named), the notices, and that strings exist for every field, issue and notice in every language
- [ ] Add the region to `docs/regions.md` with the laws it follows, cited
- [ ] Add a `.changes/unreleased/` fragment (`type: Added`)
- [ ] `make fmt && make lint && make test`
- [ ] Record the marker:

      git rev-parse HEAD > .agents/skills/add-region/.last-updated

## Verification

1. `make test` passes, including the new region's file.
2. Choosing the region under **Company** shows its fields in the company form, the customer form and on the page, with no change to any screen.
3. An invoice with everything filled in reports "Ready to send"; one with a required identifier missing names it.
4. `grep -rn "<id>" src/app --include=*.tsx` finds nothing: no screen knows the region by name.

## Skill self-improvement

If a region needed something the `Region` interface could not express — a rule that depends on the buyer's country, a second number series — extend the interface in `regions/index.ts`, re-run Sweden's tests, and note the addition here. If a screen had to be touched, that is a design bug: move the knowledge into the interface and record what moved.
