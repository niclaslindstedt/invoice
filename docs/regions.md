# Regions

Everything an invoice has to get right _because of where it is sent from_ is
a region: one folder under `src/app/regions/`, behind one interface
(`regions/index.ts`), with its own strings in every language the app speaks.
A screen never asks which country it is; it asks the region for its fields,
its notices and its issues.

A region answers:

- **Fields** — the identifiers a party carries, stored in `Party.details`
  under the field's id: who carries it (seller, buyer, both), whether it is
  required, where the page prints it (with the name, in the payment block, or
  nowhere), a normaliser and a validator. A field is free text, a flag, a
  choice from a fixed set, or a number — a figure the seller sets within the
  range the region allows, which the page never prints as a detail of its own
  because a notice says what it means. A field may hang off another
  (`dependsOn`), and is then asked only once that one is set.
- **Required sections** — what the page may not go without.
- **Rates, currency, locale, due term, rounding.**
- **Notices** — the lines the page prints that nobody typed: the seller's
  (under the payment block) and the invoice's own (under the totals).
- **The check** — given a finished invoice and its two parties, what still
  stands between it and one that may be sent.

## Sweden (`se`)

### What the law requires

The VAT Act (_mervärdesskattelagen_, chapter 17) lists the content of a full
invoice, and Skatteverket's guidance spells it out: the date of issue; a
unique sequential number from one or more series; the seller's VAT
registration number; the buyer's VAT number when the buyer accounts for the
VAT; the seller's and the buyer's name and address; the quantity and nature of
what was supplied; the date of supply where it differs from the date of
issue; the taxable amount per rate and the unit price excluding VAT; the
rate; and the VAT amount. A credit note (_ändringsfaktura_) carries its own
number in the same series, the amounts with a minus sign at the original's
rate, and an unambiguous reference to the original invoice's **number**. An
invoice in a currency other than kronor must state the VAT in kronor as well.
Under reverse charge (_omvänd betalningsskyldighet_ — building services
between VAT-registered companies, services to businesses abroad) the buyer's
VAT number goes on the invoice and the page says so; an exempt supply cites
the exemption. A simplified invoice is allowed under 4 000 kr including VAT,
which this app does not use: a full invoice is always acceptable.

The Companies Act (_aktiebolagslagen_ 28 kap. 5 §) adds, for a limited
company, the company's registered name, the seat of the board and the
organisation number on every invoice, letter and order form — and only for a
limited company, which is why the company form is a field here. A sole
trader's organisation number is their personal number, and their VAT number
is `SE` + those ten digits + `01`.

Beyond the law, every Swedish invoice says **Godkänd för F-skatt** (the exact
wording the Tax Agency's own guidance uses, and what lets the payer skip
withholding tax) and is paid by **bankgiro** or **plusgiro**, so one of those
(or an IBAN) is what the payment block needs.

### What custom adds

Payment terms are not in the VAT Act, but every template carries them:
"Betalningsvillkor: 30 dagar netto" beside the due date. The three
late-payment lines that follow can only be charged if the invoice says so, so
each of them is the company's to turn on — but only two of the three are the
company's to set an amount for, and the difference is the law's:

| Line                                      | The law                                                                                                                                                                                                                         | On the company form                                                |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Late interest (_dröjsmålsränta_)          | The Interest Act's rate is the reference rate plus eight percentage points, but the Act yields to what the parties agreed (1 §, 6 §); it runs from thirty days after the invoice, and a public body may not demand longer terms | a rate in per cent — **empty is the statutory one**                |
| Late-payment fee (_förseningsersättning_) | 450 kr flat, räntelagen 4 a §, owed by a business debtor without a reminder and not waivable against the creditor                                                                                                               | a switch, nothing more — **the amount is not the seller's to set** |
| Reminder fee (_påminnelseavgift_)         | At most 60 kr (lagen 1981:739 with förordning 1981:1057), and only where it was agreed in advance                                                                                                                               | a switch and an amount, **capped at 60 kr**; empty charges 60      |

A term that cuts the creditor's interest short is void against a business
debtor (räntelagen 8 §), so a rate below the statutory one binds a consumer
and not a company. That is the seller's call, and the app does not refuse
it — it only says, under the field, where the figure comes from.

Templates from the Swedish bookkeeping vendors agree on a shape: the company
top left, "FAKTURA" and the number top right, a right-aligned block of dates,
terms and references, the line table, a totals block ending in "ATT BETALA",
the payment details and the legal lines at the foot.

### The fields

| Field               | Who    | Required                           | Check                                                                                                |
| ------------------- | ------ | ---------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `orgNumber`         | both   | seller                             | ten digits, Luhn, printed `XXXXXX-XXXX`; a personal number's century is dropped                      |
| `vatNumber`         | both   | seller; buyer under reverse charge | `SE` + the organisation number + `01`; derived when the number alone is typed                        |
| `companyForm`       | seller | no                                 | limited company, sole trader, partnership, other — not printed; decides whether the seat is required |
| `seat`              | seller | for a limited company              | free text; printed as "Säte: …"                                                                      |
| `fSkatt`            | seller | no                                 | a flag; prints "Godkänd för F-skatt"                                                                 |
| `bankgiro`          | seller | no                                 | 7–8 digits, Luhn, printed `XXX(X)-XXXX`                                                              |
| `plusgiro`          | seller | no                                 | 2–8 digits, Luhn, dash before the check digit                                                        |
| `iban`              | seller | no                                 | mod-97, grouped in fours                                                                             |
| `bic`               | seller | no                                 | 8 or 11 characters                                                                                   |
| `ocr`               | seller | no                                 | free text                                                                                            |
| `lateInterestRate`  | seller | no                                 | a number, 0–100 %, a comma or a dot; empty prints the Interest Act's rate instead of an agreed one   |
| `lateFee`           | seller | no                                 | a flag; prints the 450 kr late-fee line, an amount räntelagen 4 a § fixes                            |
| `reminderFee`       | seller | no                                 | a flag; prints the reminder-fee line                                                                 |
| `reminderFeeAmount` | seller | no                                 | a number, asked only while `reminderFee` is on, clamped to the statutory 60 kr; empty charges 60     |

### The check

It refuses: a missing or malformed seller identifier; a missing seat on a
limited company; a malformed buyer organisation or VAT number (a private
customer may have neither); a missing buyer VAT number under reverse charge; a
line with VAT under reverse charge or an exemption; a missing name or address
on either side; a missing date; no lines; a line with no description; a VAT
rate other than 25 / 12 / 6 / 0; an invoice in another currency with no VAT
stated in kronor; and — when there is something to pay — no way to pay.

Rates: 25 % (the usual), 12 % (food, hotels), 6 % (books, culture, transport),
0 % (exempt or reverse-charged). Öre rounding to a whole krona is on by
default. Due in 30 days by default.

### What the region does not do yet

- **E-invoicing.** Suppliers to the public sector have had to send Peppol BIS
  Billing 3 e-invoices since April 2019 (lag 2018:1277). Under ViDA,
  cross-border B2B e-invoicing and digital reporting become mandatory in July
  2030, and in February 2026 the government appointed an inquiry into
  extending the requirement to domestic B2B. This app prints a PDF; a Peppol
  UBL export is the natural next feature and the model already carries every
  field it needs.
- **ROT / RUT.** Invoices to private persons for household work have their
  own content rules (the labour cost shown separately, the buyer's personal
  number, the property). Out of scope for now.
- **Exemption references.** An exempt supply should cite the provision; the
  page prints the generic line and the note field carries the citation.

### Sources

- [Momslagens regler om fakturering — Skatteverket](https://www.skatteverket.se/foretag/moms/saljavarorochtjanster/momslagensregleromfakturering.4.58d555751259e4d66168000403.html)
- [Kreditnota — Skatteverket, rättslig vägledning](https://www4.skatteverket.se/rattsligvagledning/edition/2019.8/321575.html)
- [Omvänd skattskyldighet inom byggsektorn — Skatteverket](https://www.skatteverket.se/foretag/moms/sarskildamomsregler/byggverksamhet/omvandbetalningsskyldighetinombyggsektorn.4.47eb30f51122b1aaad28000545.html)
- [Uppgifter på webbplats, fakturor m.m. för aktiebolag — Bolagsverket](https://bolagsverket.se/foretag/aktiebolag/startaaktiebolag/foretagsnamnochverksamhetforaktiebolag/uppgifterpawebbplatsfakturormmforaktiebolag.495.html)
- [Organisationsnummer — FAR Online](https://www.faronline.se/dokument/rattserien/ratt-bolagsratt/o/rb_organisationsnummer/)
- [Vad ska en faktura innehålla? — Bokio](https://www.bokio.se/blogg/vad-ska-en-faktura-innehalla/)
- [Vad ska stå på en faktura? — Fakturamallen](https://fakturamallen.se/guider/vad-ska-sta-pa-en-faktura)
- [Fakturamall: lagkrav och gratis mall — Astrid](https://astrid.so/guider/fakturering/faktura-mall)
- [Kreditfaktura — Fakturamallen](https://fakturamallen.se/guider/kreditfaktura)
- [Betalningsvillkor på faktura — Finansia](https://www.finansia.se/betalningsvillkor-pa-faktura/)
- [Dröjsmålsränta och förseningsersättning — Björn Lundén](https://bjornlunden.com/se/bjornkoll/blogg/drojsmalsranta-och-forseningsersattning/)
- [Räntelag (1975:635) — Riksdagen](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/rantelag-1975635_sfs-1975-635/)
- [Lag (1981:739) om ersättning för inkassokostnader m.m. — Riksdagen](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/lag-1981739-om-ersattning-for-inkassokostnader_sfs-1981-739/)
- [Förordning (1981:1057) om ersättning för inkassokostnader m.m. — Riksdagen](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/forordning-19811057-om-ersattning-for_sfs-1981-1057/)
- [För enskild firma är organisationsnummer ditt personnummer — Zervant](https://www.zervant.com/sv/blogg/for-enskild-firma-ar-organisationsnummer-ditt-personnummer/)
- [Lag, förordning och föreskrifter inom e-handel för leverantörer till offentlig sektor — Digg](https://www.digg.se/kunskap-och-stod/e-handel/lag-forordning-och-foreskrifter-for-e-handel/lag-forordning-och-foreskrifter-inom-e-handel-for-leverantorer-till-offentlig-sektor)
- [Peppol BIS Billing 3 — SFTI](https://sfti.se/sfti/standarder/peppolbisehandel/peppolbisbilling3.49021.html)
- [Transaktionsbaserad rapportering och e-fakturering — Skatteverket](https://www.skatteverket.se/foretag/internationellt/transaktionsbaseradrapporteringochefakturering.4.386bd4b919276cc86c42b3f.html)
- [Nu utreds obligatorisk eFaktura i Sverige — Strålfors](https://www.stralfors.se/insikter/artiklar/nu-utreds-obligatorisk-efaktura-i-sverige-aer-ni-foerberedda-/)

## Adding a region

Run the `add-region` skill (`.agents/skills/add-region/SKILL.md`). In short:
a folder with an `index.ts` implementing `Region` and a `strings.ts` with the
region's words for every `Lang`; the id in `RegionId`, `REGIONS` and
`REGION_IDS`; a test file that pins every validator, the check and the
notices; and a section here citing the laws it follows, with its sources. No
screen changes.
