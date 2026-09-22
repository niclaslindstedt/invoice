// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The app's data model: the company that sends the invoices, the customers
// that receive them, the invoices themselves, the templates a new invoice
// starts from, and the revisions the two kinds of party have been through.
//
// An invoice is written against *sources* — the company and a customer — by
// id, and reads their details live while it is a draft, so a correction made
// on the invoice is a correction to the record. The moment it is sent, what
// the page showed is frozen onto the invoice (`seller` / `buyer`), because a
// document that has left the building must go on saying what it said.
//
// Everything a region decides — which identifiers a party carries, which
// notices the page must print, what the VAT rates are — is kept out of these
// shapes: a party's regional identifiers live in `details`, a free map whose
// keys the region defines (see `regions/`).

import type { DayKey } from "@niclaslindstedt/oss-framework/calendar";

import type { RegionId } from "./regions/index.ts";
import type { Revision } from "@niclaslindstedt/oss-framework/revisions";

/** A postal address, one field a line. `country` is free text: it is
 *  printed, never parsed. */
export type Address = {
  street: string;
  zip: string;
  city: string;
  country: string;
};

/** What the sender and the receiver of an invoice have in common — the
 *  block the page prints for either of them. */
export type Party = {
  name: string;
  address: Address;
  email: string;
  phone: string;
  website: string;
  /** The person to speak to — "our reference" on the seller's side, "your
   *  reference" on the buyer's. */
  reference: string;
  /** Region-defined identifiers and payment details — an organisation
   *  number, a VAT number, a bank giro. The region's field table says which
   *  keys exist and what they mean; anything else is dropped on read. */
  details: Record<string, string>;
};

/** The one company the app invoices as. */
export type Company = Party & {
  /** Which region's rules the company invoices under. Every invoice it
   *  writes is checked against them. */
  region: RegionId;
  /** The number the next invoice takes when none has been sent yet; after
   *  that the series counts on from the highest number used. */
  firstInvoiceNumber: number;
  updatedAt: string;
};

export type Customer = Party & {
  id: string;
  /** A customer number of your own, printed on the invoice when set. */
  number: string;
  /** The price a line starts at when this customer's hours are dropped in
   *  from the Time app, per unit. Zero means "ask". */
  defaultUnitPrice: number;
  notes: string;
  archived: boolean;
  updatedAt: string;
};

export type InvoiceLine = {
  id: string;
  description: string;
  quantity: number;
  /** The unit the quantity is in — hours, pieces, days — as printed. */
  unit: string;
  unitPrice: number;
  /** Percent, 0–100. */
  vatRate: number;
  /** Percent off the line's net, 0–100. */
  discount: number;
};

/**
 * Where an invoice is in its life.
 *
 *   draft     — being written; reads its sources live and has no number
 *   sent      — numbered, frozen, and out of the door
 *   paid      — settled
 *   cancelled — withdrawn without a credit note (a draft that never went
 *               out, or a sent invoice the region allows to be voided)
 *   credited  — reversed by a credit note that points back at it
 */
export type InvoiceStatus =
  "draft" | "sent" | "paid" | "cancelled" | "credited";

export const INVOICE_STATUSES: InvoiceStatus[] = [
  "draft",
  "sent",
  "paid",
  "cancelled",
  "credited",
];

/** One thing that happened to an invoice — its history, as the Invoices
 *  screen tells it. */
export type InvoiceEvent = {
  at: string;
  kind: "created" | "sent" | "paid" | "cancelled" | "credited" | "reopened";
};

/** The ids of the sections a page is made of, in the order a template or an
 *  invoice keeps them. See `layout.ts`. */
export type SectionId =
  | "header"
  | "parties"
  | "meta"
  | "lines"
  | "totals"
  | "payment"
  | "note"
  | "footer";

export type TypefaceId = "sans" | "serif" | "display" | "geometric" | "mono";
export type AccentId =
  "ink" | "green" | "blue" | "plum" | "rust" | "teal" | "gold";
export type PaperId = "white" | "cream";

/** How a page is laid out: which sections, in what order, and what it is set
 *  in. An invoice carries its own copy, seeded from a template, so a change
 *  to the template never rearranges an invoice already written. */
export type InvoiceLayout = {
  /** Every section, in print order. A section not listed is not printed. */
  sections: SectionId[];
  typeface: TypefaceId;
  accent: AccentId;
  paper: PaperId;
};

/**
 * How VAT is handled on an invoice.
 *
 *   standard      — the seller charges VAT at each line's rate
 *   reverseCharge — the buyer accounts for the VAT (building services between
 *                   VAT-registered companies, services to businesses abroad);
 *                   every line is at 0 % and the page says so
 *   exempt        — the supply is exempt or zero-rated and the page cites it
 */
export type VatTreatment = "standard" | "reverseCharge" | "exempt";

export const VAT_TREATMENTS: VatTreatment[] = [
  "standard",
  "reverseCharge",
  "exempt",
];

export type Invoice = {
  id: string;
  /** The number in the series, assigned when sent; null while a draft. */
  number: number | null;
  customerId: string;
  currency: string;
  issueDate: DayKey;
  dueDate: DayKey;
  /** When the goods or services were supplied, when that differs from the
   *  issue date — a month of hours is delivered over the month. */
  deliveryDate: DayKey | null;
  /** A period the lines cover, printed under the title when set. */
  period: string;
  yourReference: string;
  ourReference: string;
  note: string;
  lines: InvoiceLine[];
  layout: InvoiceLayout;
  status: InvoiceStatus;
  events: InvoiceEvent[];
  /** The sources as they were when the invoice was sent. Null while a draft,
   *  when the page reads the live records instead. */
  seller: Party | null;
  buyer: Party | null;
  /** The invoice this one credits, when it is a credit note. */
  creditOf: string | null;
  /** Whether the total is rounded to a whole unit of currency, with the
   *  difference printed as its own line — Sweden's öresavrundning. */
  roundTotal: boolean;
  vatTreatment: VatTreatment;
  /** The VAT amount in the region's own currency, for an invoice written in
   *  another one — Sweden requires the VAT stated in kronor as well. Null
   *  when the invoice is in the region's currency, or not yet given. */
  vatInBaseCurrency: number | null;
  updatedAt: string;
};

export type Template = {
  id: string;
  name: string;
  layout: InvoiceLayout;
  /** Days from the issue date to the due date. */
  dueDays: number;
  vatRate: number;
  unit: string;
  currency: string;
  /** The note a new invoice starts with — terms, a thank-you. */
  note: string;
  roundTotal: boolean;
  updatedAt: string;
};

/** The persisted document — the whole app state, one JSON blob. */
export type AppData = {
  /** Schema version; bumped by a migration step in `migrations.ts`. */
  version: number;
  company: Company | null;
  customers: Record<string, Customer>;
  invoices: Record<string, Invoice>;
  templates: Record<string, Template>;
  /** The edit history of every party, keyed by the customer's id — or by
   *  `COMPANY_KEY` for the company. Every save that changed something
   *  appends one, so what a customer's address was in March is a lookup. */
  revisions: Record<string, Revision<Party>[]>;
};

/** The revisions key the company files under — it has no id of its own. */
export const COMPANY_KEY = "company";

/** The current document schema version. */
export const DOC_VERSION = 1;

/** The document a first run starts from. */
export function emptyDoc(): AppData {
  return {
    version: DOC_VERSION,
    company: null,
    customers: {},
    invoices: {},
    templates: {},
    revisions: {},
  };
}

export function emptyAddress(): Address {
  return { street: "", zip: "", city: "", country: "" };
}

export function emptyParty(): Party {
  return {
    name: "",
    address: emptyAddress(),
    email: "",
    phone: "",
    website: "",
    reference: "",
    details: {},
  };
}

/** The party half of a company or a customer — what a revision records and
 *  what an invoice freezes. */
export function partyOf(source: Party): Party {
  return {
    name: source.name,
    address: { ...source.address },
    email: source.email,
    phone: source.phone,
    website: source.website,
    reference: source.reference,
    details: { ...source.details },
  };
}

/** Every customer, by name, the archived ones last. */
export function customerList(data: AppData): Customer[] {
  return Object.values(data.customers).sort(
    (a, b) =>
      Number(a.archived) - Number(b.archived) || a.name.localeCompare(b.name),
  );
}

/** Every invoice, newest first: by number where there is one, else by issue
 *  date, drafts ahead of everything sent. */
export function invoiceList(data: AppData): Invoice[] {
  return Object.values(data.invoices).sort((a, b) => {
    if ((a.status === "draft") !== (b.status === "draft")) {
      return a.status === "draft" ? -1 : 1;
    }
    if (a.number !== null && b.number !== null) return b.number - a.number;
    return a.issueDate < b.issueDate ? 1 : a.issueDate > b.issueDate ? -1 : 0;
  });
}

/** Every template, by name. */
export function templateList(data: AppData): Template[] {
  return Object.values(data.templates).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}
