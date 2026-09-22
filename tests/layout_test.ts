// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import {
  ACCENT_IDS,
  DEFAULT_LAYOUT,
  PAPER_IDS,
  SECTION_IDS,
  TYPEFACE,
  TYPEFACE_IDS,
  clampLayout,
  hiddenSections,
  hideSection,
  moveSection,
  printedSections,
  showSection,
} from "../src/app/layout.ts";
import { se } from "../src/app/regions/se/index.ts";

describe("the layout", () => {
  it("starts with every section in the default order", () => {
    expect(DEFAULT_LAYOUT().sections).toEqual(SECTION_IDS);
    expect(printedSections(DEFAULT_LAYOUT(), se)).toEqual(SECTION_IDS);
    expect(hiddenSections(DEFAULT_LAYOUT(), se)).toEqual([]);
  });

  it("moves a section, and a drop to the same place is a no-op", () => {
    const moved = moveSection(DEFAULT_LAYOUT(), se, "note", 0);
    expect(printedSections(moved, se)[0]).toBe("note");
    expect(moveSection(moved, se, "note", 0)).toEqual(moved);
  });

  it("hides a section the region does not require, and refuses one it does", () => {
    const hidden = hideSection(DEFAULT_LAYOUT(), se, "note");
    expect(printedSections(hidden, se)).not.toContain("note");
    expect(hiddenSections(hidden, se)).toEqual(["note"]);
    const kept = hideSection(DEFAULT_LAYOUT(), se, "lines");
    expect(printedSections(kept, se)).toContain("lines");
  });

  it("puts a section back where the default order has it", () => {
    let layout = hideSection(DEFAULT_LAYOUT(), se, "meta");
    layout = hideSection(layout, se, "note");
    layout = showSection(layout, se, "meta");
    expect(printedSections(layout, se)).toEqual([
      "header",
      "parties",
      "meta",
      "lines",
      "totals",
      "payment",
      "footer",
    ]);
    layout = showSection(layout, se, "note");
    expect(printedSections(layout, se)).toEqual(SECTION_IDS);
  });

  it("prints a required section even when a stored list left it out", () => {
    const layout = {
      ...DEFAULT_LAYOUT(),
      sections: ["note", "footer"] as const,
    };
    expect(
      printedSections({ ...layout, sections: [...layout.sections] }, se),
    ).toEqual([
      "header",
      "parties",
      "meta",
      "lines",
      "totals",
      "payment",
      "note",
      "footer",
    ]);
  });
});

describe("clampLayout", () => {
  it("drops unknown sections and duplicates and falls back on the look", () => {
    const clamped = clampLayout({
      sections: ["lines", "bogus", "lines", "header"],
      typeface: "comic",
      accent: "plum",
      paper: 3,
    });
    expect(clamped.sections).toEqual(["lines", "header"]);
    expect(clamped.typeface).toBe("sans");
    expect(clamped.accent).toBe("plum");
    expect(clamped.paper).toBe("white");
  });

  it("reads garbage as the default", () => {
    expect(clampLayout(null)).toEqual(DEFAULT_LAYOUT());
    expect(clampLayout("x")).toEqual(DEFAULT_LAYOUT());
  });
});

describe("the vocabulary", () => {
  it("has a spec for every id", () => {
    for (const id of TYPEFACE_IDS) expect(TYPEFACE[id].family).toBeTruthy();
    expect(ACCENT_IDS.length).toBeGreaterThan(3);
    expect(PAPER_IDS).toEqual(["white", "cream"]);
  });
});
