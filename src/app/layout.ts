// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// How a page is put together: the sections it is made of, the order they
// print in, and what the page is set in. Pure.
//
// A section is a block of the page that means one thing — who it is from
// and to, the dates and references, the lines, the totals, how to pay. The
// edit mode moves them, hides them and shows them; the region says which of
// them the page may not go without. The order is a stored list of ids, and
// the framework's `order` module owns what a stored arrangement means when
// the set of sections and the stored list disagree.

import { applyOrder, moveInOrder } from "@niclaslindstedt/oss-framework/order";

import type { Region } from "./regions/index.ts";
import type {
  AccentId,
  InvoiceLayout,
  PaperId,
  SectionId,
  TypefaceId,
} from "./types.ts";

/** Every section, in the order a new page starts with. */
export const SECTION_IDS: SectionId[] = [
  "header",
  "parties",
  "meta",
  "lines",
  "totals",
  "payment",
  "note",
  "footer",
];

export function isSectionId(value: unknown): value is SectionId {
  return typeof value === "string" && (SECTION_IDS as string[]).includes(value);
}

/** The typefaces a page may be set in — each a family the app bundles from
 *  `@fontsource` (see `main.tsx`), with the system stack behind it, so a
 *  page looks the same on every device and costs a request to nobody. */
export const TYPEFACE: Record<
  TypefaceId,
  { family: string; heading: string; features?: string }
> = {
  sans: {
    family: '"Inter", system-ui, sans-serif',
    heading: '"Inter", system-ui, sans-serif',
  },
  serif: {
    family: '"Source Serif 4", Georgia, serif',
    heading: '"Source Serif 4", Georgia, serif',
  },
  display: {
    family: '"Inter", system-ui, sans-serif',
    heading: '"Playfair Display", Georgia, serif',
  },
  geometric: {
    family: '"Jost", system-ui, sans-serif',
    heading: '"Jost", system-ui, sans-serif',
  },
  mono: {
    family: '"JetBrains Mono", ui-monospace, monospace',
    heading: '"JetBrains Mono", ui-monospace, monospace',
  },
};

export const TYPEFACE_IDS = Object.keys(TYPEFACE) as TypefaceId[];

/** The accents: fixed hex rather than theme tokens, because a printed page
 *  has a colour of its own and is opened by people who have never seen the
 *  app. */
export const ACCENT: Record<AccentId, string> = {
  ink: "#1a1a1a",
  green: "#1f7a4d",
  blue: "#1d4f91",
  plum: "#6b2d5c",
  rust: "#a8422a",
  teal: "#0f6e6e",
  gold: "#8a6d1f",
};

export const ACCENT_IDS = Object.keys(ACCENT) as AccentId[];

export const PAPER: Record<PaperId, { background: string; ink: string }> = {
  white: { background: "#ffffff", ink: "#1a1a1a" },
  cream: { background: "#fbf7ee", ink: "#26221a" },
};

export const PAPER_IDS = Object.keys(PAPER) as PaperId[];

export function DEFAULT_LAYOUT(): InvoiceLayout {
  return {
    sections: [...SECTION_IDS],
    typeface: "sans",
    accent: "ink",
    paper: "white",
  };
}

/** A stored layout, clamped: unknown sections dropped, duplicates folded,
 *  and a typeface, accent or paper this build does not have replaced by the
 *  default. */
export function clampLayout(value: unknown): InvoiceLayout {
  const base = DEFAULT_LAYOUT();
  const raw = (
    typeof value === "object" && value !== null ? value : {}
  ) as Partial<Record<keyof InvoiceLayout, unknown>>;
  const sections = Array.isArray(raw.sections)
    ? raw.sections.filter(isSectionId)
    : base.sections;
  return {
    sections: [...new Set(sections)],
    typeface: oneOf(TYPEFACE, raw.typeface, base.typeface),
    accent: oneOf(ACCENT, raw.accent, base.accent),
    paper: oneOf(PAPER, raw.paper, base.paper),
  };
}

function oneOf<K extends string>(
  table: Record<K, unknown>,
  value: unknown,
  fallback: K,
): K {
  return typeof value === "string" && value in table ? (value as K) : fallback;
}

/** The sections the page prints, in order: the layout's list, with any the
 *  region requires put back where the default order has them. A required
 *  section can be moved but never lost. */
export function printedSections(
  layout: InvoiceLayout,
  region: Region,
): SectionId[] {
  const shown = new Set<SectionId>([
    ...layout.sections,
    ...region.requiredSections,
  ]);
  const inDefaultOrder = SECTION_IDS.filter((id) => shown.has(id));
  return applyOrder(
    inDefaultOrder.map((id) => ({ id })),
    layout.sections,
  ).map((s) => s.id);
}

/** The sections the page does not print — what the edit mode offers to put
 *  back. */
export function hiddenSections(
  layout: InvoiceLayout,
  region: Region,
): SectionId[] {
  const printed = new Set(printedSections(layout, region));
  return SECTION_IDS.filter((id) => !printed.has(id));
}

/** Move a section one place, or to a place: what the up / down arrows and a
 *  dropped drag both resolve to. */
export function moveSection(
  layout: InvoiceLayout,
  region: Region,
  id: SectionId,
  to: number,
): InvoiceLayout {
  const order = printedSections(layout, region);
  const from = order.indexOf(id);
  if (from < 0) return layout;
  return { ...layout, sections: moveInOrder(order, from, to) as SectionId[] };
}

/** Take a section off the page. A required one stays. */
export function hideSection(
  layout: InvoiceLayout,
  region: Region,
  id: SectionId,
): InvoiceLayout {
  if (region.requiredSections.includes(id)) return layout;
  return {
    ...layout,
    sections: printedSections(layout, region).filter((s) => s !== id),
  };
}

/** Put a section back, where the default order has it relative to the
 *  sections already printed. */
export function showSection(
  layout: InvoiceLayout,
  region: Region,
  id: SectionId,
): InvoiceLayout {
  const printed = printedSections(layout, region);
  if (printed.includes(id)) return layout;
  const rank = SECTION_IDS.indexOf(id);
  const at = printed.findIndex((s) => SECTION_IDS.indexOf(s) > rank);
  const next = [...printed];
  next.splice(at < 0 ? next.length : at, 0, id);
  return { ...layout, sections: next };
}
