# The invoice model

What an invoice is made of, how it adds up, and what happens to it. All of it
is `src/app/invoice.ts`, pure and clock-free, with `tests/invoice_test.ts`
pinning every rule below.

## Lines

A line is a description, a quantity, a unit, a price per unit, a VAT rate
in percent and a discount in percent. Its **net** is quantity × price less
the discount, rounded to two decimals — half away from zero, so a negative
line on a credit note rounds the way a calculator would. Its VAT is the rate
on that rounded net.

## Totals

The subtotal is the sum of the rounded line nets, so a printed column adds up
under a calculator. VAT is grouped by rate over those nets — one row per rate
in use, highest first — and the gross is net plus VAT.

If the invoice **rounds its total** (on by default in Sweden), the amount to
pay is the gross rounded to a whole unit of currency, and the difference is
printed as its own line, so the VAT block still reconciles.

## Numbers

A draft has no number. Sending assigns the next one: one past the highest
number in use, or the company's **first invoice number** when nothing has
been sent yet. Numbers are never reused and never edited — Sweden requires an
unbroken series, and a cancelled invoice keeps its number so the gap is the
record of it.

## Sources, live and frozen

A draft prints the company and the customer as they are _now_, and an edit to
either on the page is an edit to the record. Sending copies both onto the
invoice (`seller`, `buyer`); from then on the page reads the copies, whatever
happens to the customer afterwards.

## Statuses

```
draft ──send──▶ sent ──mark paid──▶ paid
  │              ├──cancel──▶ cancelled ──reopen──▶ draft
  │              └──credit──▶ credited   (+ a credit note, itself a draft)
  └──cancel──▶ cancelled
```

Every step is recorded as an event with its moment, and the editor prints the
list under the page. A **credit note** mirrors the original's lines with
their quantities negated and points back at it.

## Revisions

Saving the company or a customer appends a snapshot of its party details to
its history — unless nothing changed — through the framework's `revisions`
module. A snapshot is the whole record, so what
a customer's address was on a given date is a lookup. The history modal lists
every version, what changed from the one before, and restores one as a new
version, so the history goes on being the whole story. Two devices' histories
merge as a union by timestamp.
