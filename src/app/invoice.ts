// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The arithmetic of an invoice, and the edits it goes through. Pure and
// clock-free: an amount is a function of the lines, and the moment an edit
// happened comes in through `ctx`.
//
// Money is a number of currency units with two decimals, and every figure
// is rounded to the öre — to the cent — at the line, because that is where
// a reader with a calculator checks it: a column of printed line totals has
// to add up to the printed subtotal, and a subtotal computed from unrounded
// lines does not. VAT is then grouped by rate over those rounded nets, so
// the VAT block reconciles against the lines the same way.

import { addDays, type DayKey } from "@niclaslindstedt/oss-framework/calendar";

import type { EditContext } from "./ids.ts";
import { DEFAULT_LAYOUT } from "./layout.ts";
import type {
  AppData,
  Customer,
  Invoice,
  InvoiceLine,
  InvoiceStatus,
  Party,
  Template,
} from "./types.ts";

/** Round to two decimals, half away from zero — what a calculator does and
 *  what `Math.round`, which rounds half towards +∞, does not for a negative
 *  credit line. */
export function money(value: number): number {
  const sign = value < 0 ? -1 : 1;
  return (sign * Math.round(Math.abs(value) * 100 + 1e-9)) / 100;
}

/** A line's net: quantity × price, less its discount. */
export function lineNet(line: InvoiceLine): number {
  const gross = line.quantity * line.unitPrice;
  return money(gross * (1 - clampPercent(line.discount) / 100));
}

export function lineVat(line: InvoiceLine): number {
  return money((lineNet(line) * clampPercent(line.vatRate)) / 100);
}

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export type VatGroup = { rate: number; net: number; vat: number };

export type InvoiceTotals = {
  net: number;
  /** One row per VAT rate in use, highest rate first. */
  vat: VatGroup[];
  vatTotal: number;
  /** Net plus VAT, before any rounding. */
  gross: number;
  /** What the rounding added or took away; zero when the total is not
   *  rounded. */
  rounding: number;
  /** What is to be paid. */
  total: number;
};

export function invoiceTotals(invoice: {
  lines: InvoiceLine[];
  roundTotal: boolean;
}): InvoiceTotals {
  const byRate = new Map<number, VatGroup>();
  let net = 0;
  for (const line of invoice.lines) {
    const rate = clampPercent(line.vatRate);
    const n = lineNet(line);
    const v = lineVat(line);
    net = money(net + n);
    const group = byRate.get(rate) ?? { rate, net: 0, vat: 0 };
    group.net = money(group.net + n);
    group.vat = money(group.vat + v);
    byRate.set(rate, group);
  }
  const vat = [...byRate.values()].sort((a, b) => b.rate - a.rate);
  const vatTotal = money(vat.reduce((sum, g) => sum + g.vat, 0));
  const gross = money(net + vatTotal);
  const total = invoice.roundTotal ? Math.round(gross) : gross;
  return {
    net,
    vat,
    vatTotal,
    gross,
    rounding: money(total - gross),
    total,
  };
}

/** The number the next sent invoice takes: one past the highest in use, or
 *  the series' first when none has been sent. Numbers are never reused —
 *  a cancelled invoice keeps its number, and the gap is the record of it. */
export function nextInvoiceNumber(
  invoices: Record<string, Invoice>,
  first: number,
): number {
  let highest = 0;
  for (const inv of Object.values(invoices)) {
    if (inv.number !== null && inv.number > highest) highest = inv.number;
  }
  return highest === 0 ? Math.max(1, Math.floor(first)) : highest + 1;
}

export function dueDateFor(issueDate: DayKey, dueDays: number): DayKey {
  return addDays(issueDate, Math.max(0, Math.round(dueDays)));
}

/** A blank line at the template's defaults. */
export function blankLine(
  ctx: EditContext,
  defaults: { unit: string; vatRate: number },
): InvoiceLine {
  return {
    id: ctx.id(),
    description: "",
    quantity: 1,
    unit: defaults.unit,
    unitPrice: 0,
    vatRate: defaults.vatRate,
    discount: 0,
  };
}

/** A new draft against a customer, seeded from a template. */
export function newInvoice(
  customer: Customer,
  template: Template | null,
  issueDate: DayKey,
  ctx: EditContext,
  defaults: {
    currency: string;
    vatRate: number;
    dueDays: number;
    unit: string;
  },
): Invoice {
  const dueDays = template?.dueDays ?? defaults.dueDays;
  return {
    id: ctx.id(),
    number: null,
    customerId: customer.id,
    currency: template?.currency || defaults.currency,
    issueDate,
    dueDate: dueDateFor(issueDate, dueDays),
    deliveryDate: null,
    period: "",
    yourReference: customer.reference,
    ourReference: "",
    note: template?.note ?? "",
    lines: [],
    layout: template
      ? { ...template.layout, sections: [...template.layout.sections] }
      : DEFAULT_LAYOUT(),
    status: "draft",
    events: [{ at: ctx.now, kind: "created" }],
    seller: null,
    buyer: null,
    creditOf: null,
    roundTotal: template?.roundTotal ?? true,
    updatedAt: ctx.now,
  };
}

/** Send: number it, freeze what the page showed, and note the moment. The
 *  caller has already run the region's `check`; this only records. */
export function sendInvoice(
  invoice: Invoice,
  data: AppData,
  seller: Party,
  buyer: Party,
  ctx: EditContext,
): Invoice {
  if (invoice.status !== "draft") return invoice;
  return {
    ...invoice,
    number:
      invoice.number ??
      nextInvoiceNumber(data.invoices, data.company?.firstInvoiceNumber ?? 1),
    status: "sent",
    seller,
    buyer,
    events: [...invoice.events, { at: ctx.now, kind: "sent" }],
    updatedAt: ctx.now,
  };
}

/** The statuses an invoice may move to from where it is. A draft is only
 *  ever sent or cancelled; a sent invoice is paid, cancelled or credited; a
 *  paid or credited one is done, and a cancelled one may be reopened. */
export function nextStatuses(status: InvoiceStatus): InvoiceStatus[] {
  switch (status) {
    case "draft":
      return ["sent", "cancelled"];
    case "sent":
      return ["paid", "cancelled", "credited"];
    case "cancelled":
      return ["draft"];
    default:
      return [];
  }
}

/** Move an invoice along, recording the step. Anything `nextStatuses` does
 *  not allow is a no-op. */
export function setStatus(
  invoice: Invoice,
  status: InvoiceStatus,
  ctx: EditContext,
): Invoice {
  if (!nextStatuses(invoice.status).includes(status)) return invoice;
  const kind: Invoice["events"][number]["kind"] =
    status === "draft" ? "reopened" : status;
  return {
    ...invoice,
    status,
    events: [...invoice.events, { at: ctx.now, kind }],
    updatedAt: ctx.now,
  };
}

/** A credit note for a sent invoice: the same lines with their quantities
 *  negated, pointing back at the original. Returns the credit note and the
 *  original marked credited. */
export function creditInvoice(
  original: Invoice,
  issueDate: DayKey,
  ctx: EditContext,
): { credit: Invoice; original: Invoice } {
  const credit: Invoice = {
    ...original,
    id: ctx.id(),
    number: null,
    issueDate,
    dueDate: issueDate,
    status: "draft",
    events: [{ at: ctx.now, kind: "created" }],
    lines: original.lines.map((l) => ({
      ...l,
      id: ctx.id(),
      quantity: -l.quantity,
    })),
    creditOf: original.id,
    seller: null,
    buyer: null,
    updatedAt: ctx.now,
  };
  return {
    credit,
    original: setStatus(original, "credited", ctx),
  };
}

/** Money as the region prints it: the locale's grouping and decimals, the
 *  currency code after. `Intl` is deliberately given the code as a suffix
 *  rather than as a currency style, so "SEK" never becomes "kr" on one
 *  device and "SEK" on another. */
export function formatMoney(
  amount: number,
  currency: string,
  locale: string,
): string {
  const figure = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${figure} ${currency}`;
}

/** A quantity as printed: up to two decimals, no trailing zeros. */
export function formatQuantity(quantity: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(quantity);
}
