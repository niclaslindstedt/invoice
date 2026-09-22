// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import {
  changedPaths,
  mergeRevisions,
  recordRevision,
  revisionAt,
  sameRecord,
} from "../src/app/revisions.ts";

type Rec = { name: string; address: { city: string } };

const a: Rec = { name: "Acme", address: { city: "Malmö" } };
const b: Rec = { name: "Acme", address: { city: "Lund" } };

describe("sameRecord", () => {
  it("compares structure, not key order", () => {
    expect(sameRecord({ x: 1, y: 2 }, { y: 2, x: 1 })).toBe(true);
    expect(sameRecord(a, { ...a })).toBe(true);
    expect(sameRecord(a, b)).toBe(false);
    expect(sameRecord([1, 2], [1, 2])).toBe(true);
    expect(sameRecord([1, 2], { 0: 1, 1: 2 })).toBe(false);
  });
});

describe("recordRevision", () => {
  it("appends a changed snapshot and skips an unchanged one", () => {
    const h1 = recordRevision<Rec>([], a, "2026-01-01T00:00:00Z");
    expect(h1).toHaveLength(1);
    const h2 = recordRevision(h1, { ...a }, "2026-01-02T00:00:00Z");
    expect(h2).toHaveLength(1);
    const h3 = recordRevision(h2, b, "2026-01-03T00:00:00Z");
    expect(h3).toHaveLength(2);
    expect(h3[1]?.data.address.city).toBe("Lund");
  });

  it("files a snapshot by its stamp", () => {
    const h = recordRevision(
      recordRevision<Rec>([], a, "2026-01-05T00:00:00Z"),
      b,
      "2026-01-01T00:00:00Z",
    );
    expect(h.map((r) => r.at)).toEqual([
      "2026-01-01T00:00:00Z",
      "2026-01-05T00:00:00Z",
    ]);
  });

  it("never mutates the history it was given", () => {
    const h1 = recordRevision<Rec>([], a, "2026-01-01T00:00:00Z");
    const copy = [...h1];
    recordRevision(h1, b, "2026-01-02T00:00:00Z");
    expect(h1).toEqual(copy);
  });
});

describe("revisionAt", () => {
  const history = [
    { at: "2026-01-01T00:00:00Z", data: a },
    { at: "2026-03-01T00:00:00Z", data: b },
  ];

  it("answers the version in force at a moment", () => {
    expect(revisionAt(history, "2026-02-01T00:00:00Z")?.data).toBe(a);
    expect(revisionAt(history, "2026-03-01T00:00:00Z")?.data).toBe(b);
    expect(revisionAt(history, "2027-01-01T00:00:00Z")?.data).toBe(b);
  });

  it("answers null before the record existed", () => {
    expect(revisionAt(history, "2025-01-01T00:00:00Z")).toBeNull();
  });
});

describe("mergeRevisions", () => {
  it("unions two histories by stamp, in order", () => {
    const mine = [{ at: "2026-01-01T00:00:00Z", data: a }];
    const theirs = [
      { at: "2026-01-01T00:00:00Z", data: a },
      { at: "2026-02-01T00:00:00Z", data: b },
    ];
    const merged = mergeRevisions(mine, theirs);
    expect(merged.map((r) => r.at)).toEqual([
      "2026-01-01T00:00:00Z",
      "2026-02-01T00:00:00Z",
    ]);
  });
});

describe("changedPaths", () => {
  it("names the dotted paths that differ", () => {
    expect(changedPaths(a, b)).toEqual(["address.city"]);
    expect(
      changedPaths(a, { name: "Beta", address: { city: "Lund" } }),
    ).toEqual(["address.city", "name"]);
    expect(changedPaths(a, a)).toEqual([]);
  });

  it("treats a missing side as a change at the parent", () => {
    expect(changedPaths({ x: { y: 1 } }, {})).toEqual(["x"]);
  });
});
