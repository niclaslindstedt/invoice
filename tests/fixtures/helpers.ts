// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Shared fixtures: a company that passes Sweden's checks, a customer, a
// named-id edit context, and an invoice with a couple of lines.

import type { EditContext } from "../../src/app/ids.ts";
import { DEFAULT_LAYOUT } from "../../src/app/layout.ts";
import type {
  Company,
  Customer,
  Invoice,
  InvoiceLine,
  Template,
} from "../../src/app/types.ts";

/** A context whose ids are `id-1`, `id-2`, … and whose clock is fixed. */
export function ctx(now = "2026-09-22T10:00:00.000Z"): EditContext {
  let n = 0;
  return { id: () => `id-${++n}`, now };
}

export function company(overrides: Partial<Company> = {}): Company {
  return {
    name: "Agilator AB",
    address: {
      street: "Storgatan 1",
      zip: "111 22",
      city: "Stockholm",
      country: "Sverige",
    },
    email: "hej@agilator.se",
    phone: "",
    website: "https://agilator.se",
    reference: "Niclas",
    details: {
      orgNumber: "556036-0793",
      vatNumber: "SE556036079301",
      fSkatt: "yes",
      bankgiro: "5050-1055",
    },
    region: "se",
    firstInvoiceNumber: 1000,
    updatedAt: "2026-09-01T08:00:00.000Z",
    ...overrides,
  };
}

export function customer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: "acme",
    name: "Acme AB",
    address: {
      street: "Lilla vägen 2",
      zip: "222 33",
      city: "Malmö",
      country: "Sverige",
    },
    email: "faktura@acme.se",
    phone: "",
    website: "",
    reference: "Anna",
    details: { orgNumber: "556036-0793" },
    number: "C-1",
    defaultUnitPrice: 900,
    notes: "",
    archived: false,
    updatedAt: "2026-09-01T08:00:00.000Z",
    ...overrides,
  };
}

export function line(overrides: Partial<InvoiceLine> = {}): InvoiceLine {
  return {
    id: "l1",
    description: "Consulting",
    quantity: 10,
    unit: "hour",
    unitPrice: 900,
    vatRate: 25,
    discount: 0,
    ...overrides,
  };
}

export function invoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: "inv-1",
    number: null,
    customerId: "acme",
    currency: "SEK",
    issueDate: "2026-09-30",
    dueDate: "2026-10-30",
    deliveryDate: null,
    period: "September 2026",
    yourReference: "Anna",
    ourReference: "Niclas",
    note: "",
    lines: [line()],
    layout: DEFAULT_LAYOUT(),
    status: "draft",
    events: [{ at: "2026-09-30T08:00:00.000Z", kind: "created" }],
    seller: null,
    buyer: null,
    creditOf: null,
    roundTotal: true,
    updatedAt: "2026-09-30T08:00:00.000Z",
    ...overrides,
  };
}

export function template(overrides: Partial<Template> = {}): Template {
  return {
    id: "tpl-1",
    name: "Standard",
    layout: DEFAULT_LAYOUT(),
    dueDays: 30,
    vatRate: 25,
    unit: "hour",
    currency: "SEK",
    note: "Thank you.",
    roundTotal: true,
    updatedAt: "2026-09-01T08:00:00.000Z",
    ...overrides,
  };
}
