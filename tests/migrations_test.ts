// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import { normalizeDoc, parseDoc, serializeDoc } from "../src/app/migrations.ts";
import { DOC_VERSION, emptyDoc } from "../src/app/types.ts";
import { company, customer, invoice, template } from "./fixtures/helpers.ts";

describe("the document pipeline", () => {
  it("round-trips a document", () => {
    const doc = {
      ...emptyDoc(),
      company: company(),
      customers: { acme: customer() },
      invoices: { "inv-1": invoice() },
      templates: { "tpl-1": template() },
      revisions: {
        acme: [{ at: "2026-09-01T08:00:00.000Z", data: partyLike() }],
      },
    };
    expect(parseDoc(serializeDoc(doc))).toEqual(doc);
  });

  it("stamps the version", () => {
    expect(JSON.parse(serializeDoc(emptyDoc())).version).toBe(DOC_VERSION);
  });

  it("reads an empty or pre-versioned blob as an empty document", () => {
    expect(parseDoc("{}")).toEqual(emptyDoc());
    expect(parseDoc("null")).toEqual(emptyDoc());
  });

  it("refuses a document from a newer build", () => {
    expect(() =>
      parseDoc(JSON.stringify({ version: DOC_VERSION + 1 })),
    ).toThrow();
  });

  it("drops what it cannot read and keeps the rest", () => {
    const doc = normalizeDoc({
      company: {
        name: "X",
        region: "mars",
        details: { orgNumber: "5560360793", foo: 1 },
      },
      customers: { a: { name: "A" }, "": { name: "nameless" } },
      invoices: {
        good: { customerId: "a", status: "bogus", lines: [{ quantity: "2" }] },
        bad: { lines: [] },
      },
      templates: { t: { name: "T", dueDays: "14" } },
      revisions: {
        a: [{ at: "2026-01-01T00:00:00Z", data: { name: "Old" } }, { nope: 1 }],
      },
    });
    expect(doc.company?.region).toBe("se");
    expect(doc.company?.details).toEqual({ orgNumber: "556036-0793" });
    expect(Object.keys(doc.customers)).toEqual(["a"]);
    expect(Object.keys(doc.invoices)).toEqual(["good"]);
    expect(doc.invoices.good?.status).toBe("draft");
    expect(doc.invoices.good?.lines[0]?.quantity).toBe(2);
    expect(doc.invoices.good?.currency).toBe("SEK");
    expect(doc.invoices.good?.vatTreatment).toBe("standard");
    expect(doc.invoices.good?.vatInBaseCurrency).toBeNull();
    expect(doc.templates.t?.dueDays).toBe(14);
    expect(doc.revisions.a).toHaveLength(1);
    expect(doc.revisions.a?.[0]?.data.name).toBe("Old");
  });
});

function partyLike() {
  const c = customer();
  return {
    name: c.name,
    address: c.address,
    email: c.email,
    phone: c.phone,
    website: c.website,
    reference: c.reference,
    details: c.details,
  };
}
