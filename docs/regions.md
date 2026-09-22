# Regions

Everything an invoice has to get right _because of where it is sent from_ is
a region: one folder under `src/app/regions/`, behind one interface
(`regions/index.ts`), with its own strings in every language the app speaks.
A screen never asks which country it is; it asks the region for its fields,
its notices and its issues.

A region answers:

- **Fields** — the identifiers a party carries, stored in `Party.details`
  under the field's id: who carries it (seller, buyer, both), whether it is
  required, where the page prints it (with the name, or in the payment block),
  a normaliser and a validator.
- **Required sections** — what the page may not go without.
- **Rates, currency, locale, due term, rounding.**
- **Notices** — the lines the page prints that nobody typed.
- **The check** — given a finished invoice and its two parties, what still
  stands between it and one that may be sent.

## Sweden (`se`)

What a Swedish invoice must carry comes from two laws.

The VAT Act (_mervärdesskattelagen_, chapter 17) lists the content of a full
invoice: the date of issue; a sequential number that identifies it uniquely;
the seller's VAT registration number; the seller's and the buyer's name and
address; the quantity and nature of what was supplied; the date of supply
where it differs from the date of issue; the taxable amount per rate; the
rate; and the VAT amount. The Companies Act (_aktiebolagslagen_ 28 kap. 5 §)
adds, for a limited company, the company's name, registered office and
organisation number on every business letter.

Beyond the law, a Swedish invoice says **Godkänd för F-skatt** — the Tax
Agency's own advice, because without it the payer may be liable to withhold
tax — and is paid by **bankgiro** or **plusgiro**, so one of those (or an
IBAN) is what the payment block needs. Late interest under the Interest Act
(_räntelagen_) is stated.

| Field       | Who    | Required | Check                                                                           |
| ----------- | ------ | -------- | ------------------------------------------------------------------------------- |
| `orgNumber` | both   | seller   | ten digits, Luhn, printed `XXXXXX-XXXX`; a personal number's century is dropped |
| `vatNumber` | seller | yes      | `SE` + the organisation number + `01`; derived when the number alone is typed   |
| `seat`      | seller | no       | free text; printed as a notice                                                  |
| `fSkatt`    | seller | no       | a flag; prints "Godkänd för F-skatt"                                            |
| `bankgiro`  | seller | no       | 7–8 digits, Luhn, printed `XXX(X)-XXXX`                                         |
| `plusgiro`  | seller | no       | 2–8 digits, Luhn, dash before the check digit                                   |
| `iban`      | seller | no       | mod-97, grouped in fours                                                        |
| `bic`       | seller | no       | 8 or 11 characters                                                              |
| `ocr`       | seller | no       | free text                                                                       |

The check refuses: a missing or malformed seller identifier, a malformed
buyer organisation number (a private customer may have none), a missing
name or address on either side, a missing date, no lines, a line with no
description, a VAT rate other than 25 / 12 / 6 / 0, and — when there is
something to pay — no way to pay.

Rates: 25 % (the usual), 12 % (food, hotels), 6 % (books, culture, transport),
0 % (exempt or reverse-charged). Öre rounding to a whole krona is on by
default. Due in 30 days by default.

## Adding a region

Run the `add-region` skill (`.agents/skills/add-region/SKILL.md`). In short:
a folder with an `index.ts` implementing `Region` and a `strings.ts` with the
region's words for every `Lang`; the id in `RegionId`, `REGIONS` and
`REGION_IDS`; a test file that pins every validator, the check and the
notices; and a section here citing the laws it follows. No screen changes.
