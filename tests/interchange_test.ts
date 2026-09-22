// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import {
  INTERCHANGE_FORMAT,
  INTERCHANGE_VERSION,
  InterchangeError,
  linesFromInterchange,
  looksLikeInterchange,
  parseInvoiceLinesFile,
} from "../src/app/interchange.ts";
import { ctx } from "./fixtures/helpers.ts";

const file = {
  format: INTERCHANGE_FORMAT,
  version: INTERCHANGE_VERSION,
  source: { app: "time", version: "0.1.0" },
  exportedAt: "2026-10-01T08:00:00.000Z",
  project: { name: "Acme" },
  period: { from: "2026-09-01", to: "2026-09-30", label: "September 2026" },
  lines: [
    { description: "Acme — September 2026", quantity: 128.5, unit: "hour" },
    { description: "1 Sep", quantity: 8.25, unit: "hour", date: "2026-09-01" },
  ],
};

describe("parseInvoiceLinesFile", () => {
  it("reads a well-formed file", () => {
    const parsed = parseInvoiceLinesFile(JSON.stringify(file));
    expect(parsed.project.name).toBe("Acme");
    expect(parsed.period.label).toBe("September 2026");
    expect(parsed.lines).toHaveLength(2);
    expect(parsed.lines[1]?.date).toBe("2026-09-01");
    expect(parsed.source).toEqual({ app: "time", version: "0.1.0" });
  });

  it("says why when it is not one", () => {
    expect(() => parseInvoiceLinesFile("{")).toThrow(InterchangeError);
    expect(() => parseInvoiceLinesFile("{")).toThrow("notJson");
    expect(() => parseInvoiceLinesFile('{"format":"x"}')).toThrow(
      "notInvoiceLines",
    );
    expect(() =>
      parseInvoiceLinesFile(JSON.stringify({ ...file, version: 99 })),
    ).toThrow("newer");
    expect(() =>
      parseInvoiceLinesFile(JSON.stringify({ ...file, lines: "no" })),
    ).toThrow("notInvoiceLines");
  });

  it("keeps what it can of a sloppy file", () => {
    const parsed = parseInvoiceLinesFile(
      JSON.stringify({
        format: INTERCHANGE_FORMAT,
        version: 1,
        lines: [
          { description: "ok", quantity: "3", unit: "furlong" },
          { quantity: "x" },
          "junk",
        ],
      }),
    );
    expect(parsed.lines).toEqual([
      { description: "ok", quantity: 3, unit: "piece" },
    ]);
    expect(parsed.source.app).toBe("unknown");
    expect(parsed.project.name).toBe("");
  });
});

describe("looksLikeInterchange", () => {
  it("accepts JSON by type or by name", () => {
    expect(
      looksLikeInterchange({ name: "a.json", type: "application/json" }),
    ).toBe(true);
    expect(looksLikeInterchange({ name: "acme_invoice.json", type: "" })).toBe(
      true,
    );
    expect(
      looksLikeInterchange({ name: "a.pdf", type: "application/pdf" }),
    ).toBe(false);
  });
});

describe("linesFromInterchange", () => {
  it("prices the lines at the given rate with fresh ids", () => {
    const parsed = parseInvoiceLinesFile(JSON.stringify(file));
    const lines = linesFromInterchange(parsed, ctx(), {
      unitPrice: 900,
      vatRate: 25,
    });
    expect(lines.map((l) => l.id)).toEqual(["id-1", "id-2"]);
    expect(lines[0]).toMatchObject({
      description: "Acme — September 2026",
      quantity: 128.5,
      unit: "hour",
      unitPrice: 900,
      vatRate: 25,
      discount: 0,
    });
  });
});
