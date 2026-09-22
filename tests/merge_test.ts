// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import { mergeDocs } from "../src/app/merge.ts";
import { emptyDoc, partyOf } from "../src/app/types.ts";
import { company, customer, invoice } from "./fixtures/helpers.ts";

describe("mergeDocs", () => {
  it("keeps the later edit of a record and every record either side has", () => {
    const local = {
      ...emptyDoc(),
      customers: {
        acme: customer({ name: "Acme old", updatedAt: "2026-09-01T00:00:00Z" }),
        mine: customer({ id: "mine", name: "Mine" }),
      },
    };
    const remote = {
      ...emptyDoc(),
      customers: {
        acme: customer({ name: "Acme new", updatedAt: "2026-09-02T00:00:00Z" }),
        theirs: customer({ id: "theirs", name: "Theirs" }),
      },
      invoices: { "inv-1": invoice() },
    };
    const merged = mergeDocs(local, remote);
    expect(merged.customers.acme?.name).toBe("Acme new");
    expect(Object.keys(merged.customers).sort()).toEqual([
      "acme",
      "mine",
      "theirs",
    ]);
    expect(merged.invoices["inv-1"]).toBeDefined();
  });

  it("takes whichever company is newer, or the one that exists", () => {
    const older = company({ name: "Old", updatedAt: "2026-01-01T00:00:00Z" });
    const newer = company({ name: "New", updatedAt: "2026-02-01T00:00:00Z" });
    expect(
      mergeDocs(
        { ...emptyDoc(), company: older },
        { ...emptyDoc(), company: newer },
      ).company?.name,
    ).toBe("New");
    expect(
      mergeDocs(emptyDoc(), { ...emptyDoc(), company: newer }).company?.name,
    ).toBe("New");
    expect(
      mergeDocs({ ...emptyDoc(), company: older }, emptyDoc()).company?.name,
    ).toBe("Old");
  });

  it("unions the revisions", () => {
    const p = partyOf(customer());
    const local = {
      ...emptyDoc(),
      revisions: { acme: [{ at: "2026-01-01T00:00:00Z", data: p }] },
    };
    const remote = {
      ...emptyDoc(),
      revisions: {
        acme: [
          { at: "2026-01-01T00:00:00Z", data: p },
          { at: "2026-02-01T00:00:00Z", data: { ...p, name: "Acme 2" } },
        ],
        other: [{ at: "2026-03-01T00:00:00Z", data: p }],
      },
    };
    const merged = mergeDocs(local, remote);
    expect(merged.revisions.acme?.map((r) => r.at)).toEqual([
      "2026-01-01T00:00:00Z",
      "2026-02-01T00:00:00Z",
    ]);
    expect(merged.revisions.other).toHaveLength(1);
  });
});
