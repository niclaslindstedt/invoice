// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The persistence pipeline: raw JSON in, a validated `AppData` out, and
// back. Every read — from IndexedDB, from a folder, from Dropbox, from a
// restored backup — goes through `parseDoc`, so no other module has to trust
// the bytes it was handed.
//
// The framework owns the migration *runner* (`createMigrator`); this module
// owns the step table and the shape validation. A schema change means
// bumping `DOC_VERSION` in `types.ts` and appending one step here — never
// editing an existing step, which would silently rewrite documents that
// already migrated through it.

import { createMigrator } from "@niclaslindstedt/oss-framework/storage";

import { clampLayout } from "./layout.ts";
import { clampRegion, normalizeDetails, regionOf } from "./regions/index.ts";
import type { Revision } from "./revisions.ts";
import {
  DOC_VERSION,
  INVOICE_STATUSES,
  type Address,
  type AppData,
  type Company,
  type Customer,
  type Invoice,
  type InvoiceEvent,
  type InvoiceLine,
  type InvoiceStatus,
  type Party,
  type Template,
} from "./types.ts";

const migrator = createMigrator({
  latestVersion: DOC_VERSION,
  migrations: {
    // v0 (pre-versioning / empty) → v1: the first shape.
    0: (doc) => ({ ...doc, version: 1 }),
  },
});

type Raw = Record<string, unknown>;

function asRaw(value: unknown): Raw {
  return typeof value === "object" && value !== null ? (value as Raw) : {};
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function num(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function stamp(value: unknown): string {
  return typeof value === "string" && value
    ? value
    : "1970-01-01T00:00:00.000Z";
}

function readAddress(value: unknown): Address {
  const raw = asRaw(value);
  return {
    street: str(raw.street),
    zip: str(raw.zip),
    city: str(raw.city),
    country: str(raw.country),
  };
}

function readDetails(value: unknown): Record<string, string> {
  const raw = asRaw(value);
  const out: Record<string, string> = {};
  for (const [key, v] of Object.entries(raw)) {
    if (typeof v === "string" && v) out[key] = v;
  }
  return out;
}

/** A party, with its details tidied by the company's region. Every party
 *  in the document is invoiced under the one company, so its region is the
 *  region of every detail. */
function readParty(
  value: unknown,
  regionId: ReturnType<typeof clampRegion>,
): Party {
  const raw = asRaw(value);
  return {
    name: str(raw.name),
    address: readAddress(raw.address),
    email: str(raw.email),
    phone: str(raw.phone),
    website: str(raw.website),
    reference: str(raw.reference),
    details: normalizeDetails(regionOf(regionId), readDetails(raw.details)),
  };
}

function readCompany(value: unknown): Company | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Raw;
  const region = clampRegion(raw.region);
  return {
    ...readParty(raw, region),
    region,
    firstInvoiceNumber: Math.max(1, Math.floor(num(raw.firstInvoiceNumber, 1))),
    updatedAt: stamp(raw.updatedAt),
  };
}

function readCustomer(
  id: string,
  value: unknown,
  region: ReturnType<typeof clampRegion>,
): Customer {
  const raw = asRaw(value);
  return {
    ...readParty(raw, region),
    id,
    number: str(raw.number),
    defaultUnitPrice: Math.max(0, num(raw.defaultUnitPrice, 0)),
    notes: str(raw.notes),
    archived: bool(raw.archived, false),
    updatedAt: stamp(raw.updatedAt),
  };
}

function readLine(value: unknown, index: number): InvoiceLine | null {
  const raw = asRaw(value);
  const id = str(raw.id) || `line-${index}`;
  return {
    id,
    description: str(raw.description),
    quantity: num(raw.quantity, 0),
    unit: str(raw.unit),
    unitPrice: num(raw.unitPrice, 0),
    vatRate: num(raw.vatRate, 0),
    discount: num(raw.discount, 0),
  };
}

const EVENT_KINDS: InvoiceEvent["kind"][] = [
  "created",
  "sent",
  "paid",
  "cancelled",
  "credited",
  "reopened",
];

function readEvents(value: unknown): InvoiceEvent[] {
  if (!Array.isArray(value)) return [];
  const out: InvoiceEvent[] = [];
  for (const entry of value) {
    const raw = asRaw(entry);
    const kind = raw.kind;
    if (!EVENT_KINDS.includes(kind as InvoiceEvent["kind"])) continue;
    out.push({ at: stamp(raw.at), kind: kind as InvoiceEvent["kind"] });
  }
  return out;
}

function readStatus(value: unknown): InvoiceStatus {
  return INVOICE_STATUSES.includes(value as InvoiceStatus)
    ? (value as InvoiceStatus)
    : "draft";
}

function readInvoice(
  id: string,
  value: unknown,
  region: ReturnType<typeof clampRegion>,
): Invoice | null {
  const raw = asRaw(value);
  const customerId = str(raw.customerId);
  if (!customerId) return null;
  const number =
    raw.number === null || raw.number === undefined ? null : num(raw.number, 0);
  const lines = Array.isArray(raw.lines)
    ? raw.lines.map(readLine).filter((l): l is InvoiceLine => l !== null)
    : [];
  return {
    id,
    number: number !== null && number > 0 ? Math.floor(number) : null,
    customerId,
    currency: str(raw.currency) || regionOf(region).currency,
    issueDate: str(raw.issueDate),
    dueDate: str(raw.dueDate),
    deliveryDate: str(raw.deliveryDate) || null,
    period: str(raw.period),
    yourReference: str(raw.yourReference),
    ourReference: str(raw.ourReference),
    note: str(raw.note),
    lines,
    layout: clampLayout(raw.layout),
    status: readStatus(raw.status),
    events: readEvents(raw.events),
    seller: raw.seller ? readParty(raw.seller, region) : null,
    buyer: raw.buyer ? readParty(raw.buyer, region) : null,
    creditOf: str(raw.creditOf) || null,
    roundTotal: bool(raw.roundTotal, true),
    updatedAt: stamp(raw.updatedAt),
  };
}

function readTemplate(id: string, value: unknown): Template {
  const raw = asRaw(value);
  return {
    id,
    name: str(raw.name),
    layout: clampLayout(raw.layout),
    dueDays: Math.max(0, Math.round(num(raw.dueDays, 30))),
    vatRate: num(raw.vatRate, 25),
    unit: str(raw.unit),
    currency: str(raw.currency),
    note: str(raw.note),
    roundTotal: bool(raw.roundTotal, true),
    updatedAt: stamp(raw.updatedAt),
  };
}

function readRevisions(
  value: unknown,
  region: ReturnType<typeof clampRegion>,
): Revision<Party>[] {
  if (!Array.isArray(value)) return [];
  const out: Revision<Party>[] = [];
  for (const entry of value) {
    const raw = asRaw(entry);
    if (typeof raw.at !== "string") continue;
    out.push({ at: raw.at, data: readParty(raw.data, region) });
  }
  return out.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
}

/**
 * The shape validator: anything JSON-shaped in, a well-formed `AppData` out.
 * Unknown fields are dropped, missing ones defaulted, and a record with no
 * usable identity is left out — so a hand-edited or half-written document
 * still loads with everything readable in it.
 */
export function normalizeDoc(value: unknown): AppData {
  const raw = asRaw(value);
  const company = readCompany(raw.company);
  const region = company?.region ?? clampRegion(undefined);

  const customers: AppData["customers"] = {};
  for (const [id, c] of Object.entries(asRaw(raw.customers))) {
    if (id) customers[id] = readCustomer(id, c, region);
  }
  const invoices: AppData["invoices"] = {};
  for (const [id, inv] of Object.entries(asRaw(raw.invoices))) {
    const read = id ? readInvoice(id, inv, region) : null;
    if (read) invoices[id] = read;
  }
  const templates: AppData["templates"] = {};
  for (const [id, tpl] of Object.entries(asRaw(raw.templates))) {
    if (id) templates[id] = readTemplate(id, tpl);
  }
  const revisions: AppData["revisions"] = {};
  for (const [key, list] of Object.entries(asRaw(raw.revisions))) {
    const read = readRevisions(list, region);
    if (read.length > 0) revisions[key] = read;
  }
  return {
    version: DOC_VERSION,
    company,
    customers,
    invoices,
    templates,
    revisions,
  };
}

/** Stored bytes → the document. Throws on bytes that are not JSON, or on a
 *  document written by a newer build than this one. */
export function parseDoc(raw: string): AppData {
  const { data } = migrator.migrate(JSON.parse(raw) as unknown);
  return normalizeDoc(data);
}

/** The document → stored bytes. */
export function serializeDoc(doc: AppData): string {
  return JSON.stringify({ ...doc, version: migrator.latestVersion });
}
