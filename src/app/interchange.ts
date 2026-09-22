// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The file another app hands this one to fill an invoice with: a JSON
// document of lines — what was done, how much of it, in what unit — over a
// period, for a named project. The Time app writes one from a range of
// hours ("Export for Invoice" on its Report screen); dropping it onto an
// invoice here turns each line into an invoice line at the customer's
// price.
//
// The format is deliberately small and knows nothing about money: the
// exporter says what was delivered, and the invoice says what it costs.
// It is versioned so that either app can move on without breaking the
// other — a reader accepts any file whose major version it knows.
//
// Documented for other writers in `docs/interchange.md`.

import type { EditContext } from "./ids.ts";
import type { InvoiceLine } from "./types.ts";

export const INTERCHANGE_FORMAT = "invoice-lines";
export const INTERCHANGE_VERSION = 1;

/** The units a line may be in. The invoice prints them through its own
 *  catalog, so a Swedish invoice says "tim" for an hour exported in
 *  English. */
export type InterchangeUnit = "hour" | "day" | "piece";

export type InterchangeLine = {
  description: string;
  quantity: number;
  unit: InterchangeUnit;
  /** The day the line is for, when it is a day's line. */
  date?: string;
};

export type InvoiceLinesFile = {
  format: typeof INTERCHANGE_FORMAT;
  version: number;
  /** Who wrote it, for the record. */
  source: { app: string; version?: string };
  exportedAt: string;
  project: { name: string };
  period: { from: string; to: string; label: string };
  lines: InterchangeLine[];
};

const UNITS: InterchangeUnit[] = ["hour", "day", "piece"];

export class InterchangeError extends Error {
  constructor(public readonly reason: "notJson" | "notInvoiceLines" | "newer") {
    super(reason);
  }
}

/** Read a file's text as an invoice-lines document. Throws an
 *  `InterchangeError` naming why when it is not one. */
export function parseInvoiceLinesFile(text: string): InvoiceLinesFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new InterchangeError("notJson");
  }
  if (typeof raw !== "object" || raw === null) {
    throw new InterchangeError("notInvoiceLines");
  }
  const doc = raw as Record<string, unknown>;
  if (doc.format !== INTERCHANGE_FORMAT) {
    throw new InterchangeError("notInvoiceLines");
  }
  const version = Number(doc.version);
  if (!Number.isInteger(version) || version < 1) {
    throw new InterchangeError("notInvoiceLines");
  }
  if (version > INTERCHANGE_VERSION) throw new InterchangeError("newer");
  if (!Array.isArray(doc.lines)) throw new InterchangeError("notInvoiceLines");

  const lines: InterchangeLine[] = [];
  for (const entry of doc.lines) {
    if (typeof entry !== "object" || entry === null) continue;
    const line = entry as Record<string, unknown>;
    const quantity = Number(line.quantity);
    if (!Number.isFinite(quantity)) continue;
    const unit = UNITS.includes(line.unit as InterchangeUnit)
      ? (line.unit as InterchangeUnit)
      : "piece";
    const out: InterchangeLine = {
      description: typeof line.description === "string" ? line.description : "",
      quantity,
      unit,
    };
    if (typeof line.date === "string") out.date = line.date;
    lines.push(out);
  }

  const project = asObject(doc.project);
  const period = asObject(doc.period);
  const source = asObject(doc.source);
  return {
    format: INTERCHANGE_FORMAT,
    version,
    source: {
      app: str(source.app) || "unknown",
      ...(str(source.version) ? { version: str(source.version) } : {}),
    },
    exportedAt: str(doc.exportedAt),
    project: { name: str(project.name) },
    period: {
      from: str(period.from),
      to: str(period.to),
      label: str(period.label),
    },
    lines,
  };
}

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Whether a picked or dropped file could be one of ours — the gate the
 *  drop zone runs before reading anything. */
export function looksLikeInterchange(file: {
  name: string;
  type: string;
}): boolean {
  return (
    file.type === "application/json" ||
    file.type === "" ||
    file.name.toLowerCase().endsWith(".json")
  );
}

/** The file's lines as invoice lines, priced at the customer's rate. The
 *  unit is left as the interchange word; the page prints it through the
 *  catalog. */
export function linesFromInterchange(
  file: InvoiceLinesFile,
  ctx: EditContext,
  defaults: { unitPrice: number; vatRate: number },
): InvoiceLine[] {
  return file.lines.map((line) => ({
    id: ctx.id(),
    description: line.description,
    quantity: line.quantity,
    unit: line.unit,
    unitPrice: defaults.unitPrice,
    vatRate: defaults.vatRate,
    discount: 0,
  }));
}
