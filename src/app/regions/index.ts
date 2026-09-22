// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The region layer: everything an invoice has to get right *because of where
// it is sent from*, behind one interface, one folder per region.
//
// A region answers five questions. Which identifiers a party carries (an
// organisation number, a VAT number, a bank giro) and which of them the
// seller or the buyer must have; which sections of the page may not be
// hidden; what the VAT rates are and which is the usual one; what the page
// must print by law that is not a field anyone typed (Sweden's F-skatt
// notice); and, given a finished invoice, what is still wrong with it. It
// also brings its own words, in every language the app speaks, so a second
// region is a folder and a row in `REGIONS` and nothing else changes.
//
// What a region does *not* do is arithmetic: how a line adds up, how VAT is
// grouped and how a total is rounded is `invoice.ts`'s, the same for every
// region, and a region only says which of those switches are on.

import type { Lang } from "../i18n/index.ts";
import type { Invoice, Party, SectionId } from "../types.ts";
import type { InvoiceTotals } from "../invoice.ts";
import { se } from "./se/index.ts";

export type RegionId = "se";

/** A party field the region defines, stored under `id` in `Party.details`. */
export type RegionField = {
  id: string;
  /** Who carries it: the seller, the buyer, or both. */
  party: "seller" | "buyer" | "both";
  /** Whether the party may not be invoiced without it. */
  required: boolean;
  /** Where the page prints it: with the party's name and address, in the
   *  payment block — a giro number is how to pay, not who is paying — or
   *  nowhere, for a fact the region needs but the page does not show. */
  placement: "party" | "payment" | "none";
  /** A `yes` / `no` field, one of a fixed set of values, or free text. */
  kind: "text" | "flag" | "choice";
  /** The values a `choice` field may take; labelled by the region's
   *  `choices` strings. */
  choices?: string[];
  /** The soft keyboard a phone should open for it. */
  inputMode?: "text" | "numeric" | "email" | "url";
  /** Tidy a typed value into its canonical form (spacing, a dash). */
  normalize?: (value: string) => string;
  /** Whether a normalised value is well-formed. Absent means anything goes. */
  validate?: (value: string) => boolean;
};

/** Something the region finds wrong with an invoice. `key` names the region's
 *  own string for it; `path` says where on the invoice it is. */
export type RegionIssue = {
  key: string;
  party?: "seller" | "buyer";
  field?: string;
};

/** A line the region prints on the page that nobody typed — a legal notice,
 *  a note on late payment. `params` fill the string's placeholders. */
export type RegionNotice = { key: string; params?: Record<string, string> };

export type Region = {
  id: RegionId;
  /** The BCP-47 locale figures are formatted in. */
  locale: string;
  currency: string;
  /** The VAT rates a line may carry, in percent, the usual one first. */
  vatRates: number[];
  /** Days until an invoice is due when a template does not say. */
  defaultDueDays: number;
  fields: RegionField[];
  /** Sections the page may not go without. */
  requiredSections: SectionId[];
  /** Whether the total is rounded to a whole unit of currency by default. */
  roundTotal: boolean;
  /** The lines printed under the payment block for this seller. */
  notices: (seller: Party) => RegionNotice[];
  /** The lines printed with the totals for this invoice — the VAT
   *  treatment's own words, the payment terms. */
  invoiceNotices: (
    invoice: Invoice,
    seller: Party,
    buyer: Party,
  ) => RegionNotice[];
  /** What still stands between this invoice and one that may be sent. */
  check: (
    invoice: Invoice,
    seller: Party,
    buyer: Party,
    totals: InvoiceTotals,
  ) => RegionIssue[];
  /** The region's own words: its name, its fields' labels, its issues and
   *  notices — keyed by `RegionField.id`, `RegionIssue.key` and
   *  `RegionNotice.key`, per language. */
  strings: Record<Lang, RegionStrings>;
};

export type RegionStrings = {
  name: string;
  fields: Record<string, string>;
  /** The labels of a `choice` field's values, keyed by field id. */
  choices: Record<string, Record<string, string>>;
  issues: Record<string, string>;
  notices: Record<string, string>;
};

export const REGIONS: Record<RegionId, Region> = { se };

export const REGION_IDS: RegionId[] = ["se"];

export const DEFAULT_REGION: RegionId = "se";

export function regionOf(id: RegionId): Region {
  return REGIONS[id];
}

/** A region id, or the default when the value is not one — what the
 *  document reader and the settings store clamp to. */
export function clampRegion(value: unknown): RegionId {
  return typeof value === "string" && value in REGIONS
    ? (value as RegionId)
    : DEFAULT_REGION;
}

/** The fields a party of this side carries, in the region's order. */
export function fieldsFor(
  region: Region,
  party: "seller" | "buyer",
): RegionField[] {
  return region.fields.filter((f) => f.party === "both" || f.party === party);
}

/** A party's details with every value tidied and every key the region does
 *  not define dropped — what a save and a read both run through. */
export function normalizeDetails(
  region: Region,
  details: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const field of region.fields) {
    const raw = details[field.id];
    if (typeof raw !== "string") continue;
    const value = (field.normalize ?? ((v: string) => v.trim()))(raw);
    if (!value) continue;
    if (field.kind === "choice" && !(field.choices ?? []).includes(value)) {
      continue;
    }
    out[field.id] = value;
  }
  return out;
}

/** The fields that are missing or malformed on a party — what the form
 *  marks red and the region's `check` reports. */
export function fieldIssues(
  region: Region,
  party: "seller" | "buyer",
  details: Record<string, string>,
): RegionIssue[] {
  const out: RegionIssue[] = [];
  for (const field of fieldsFor(region, party)) {
    const value = details[field.id] ?? "";
    if (!value) {
      if (field.required) out.push({ key: "missing", party, field: field.id });
      continue;
    }
    if (field.validate && !field.validate(value)) {
      out.push({ key: "invalid", party, field: field.id });
    }
  }
  return out;
}
