// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// App-owned glyphs — the marks the framework's set has no vocabulary for
// because they are this app's domain: an invoice, a receipt. Everything else
// (cog, cloud, chevrons, folder, plus, trash, person, building) comes from
// `@niclaslindstedt/oss-framework/components`, so the two sets only ever
// differ where the domain does.
//
// Traced on the same Lucide 24×24 grid at the same 2px stroke weight as the
// framework glyphs, and stroked with `currentColor`, so a mark from either
// set sits on the same line without retuning.

import type { ReactNode } from "react";

export type IconProps = { className?: string };

function Glyph({ className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/**
 * The app mark — a sheet with a dollar sign on it, the same shape as the
 * favicon and the install icon, drawn in `currentColor` on nothing. Geometry
 * is mirrored by hand into `public/icons/icon.svg` and
 * `scripts/generate-icons.mjs`.
 */
export function AppMarkIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect x="28" y="16" width="44" height="68" rx="7" strokeWidth={10} />
      <path
        d="M58.2 33.8 A10 10 0 1 0 48.3 49.3 L51.7 50.7 A10 10 0 1 1 41.8 66.2 M50 26 L50 74"
        strokeWidth={7}
      />
    </svg>
  );
}

/** An invoice: a sheet with lines and a total. */
export function InvoiceIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8M8 17h5" />
    </Glyph>
  );
}

/** A template: a sheet with a dashed outline. */
export function TemplateIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <rect x="4" y="3" width="16" height="18" rx="2" strokeDasharray="3 2" />
      <path d="M8 8h8M8 12h8M8 16h4" />
    </Glyph>
  );
}

/** An eye, for showing a section. */
export function EyeIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </Glyph>
  );
}

/** An eye struck through, for hiding a section. */
export function EyeOffIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <path d="M9.9 5.1A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.4 3.3" />
      <path d="M6.6 6.6A16.6 16.6 0 0 0 2 12s3.5 7 10 7a10.1 10.1 0 0 0 5.4-1.6" />
      <path d="M2 2l20 20" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </Glyph>
  );
}

/** A printer. */
export function PrinterIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <path d="M6 9V3h12v6" />
      <rect x="6" y="14" width="12" height="7" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    </Glyph>
  );
}

/** A clock with an arrow round it — history. */
export function HistoryIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l3 2" />
    </Glyph>
  );
}

/** A paper plane — send. */
export function SendIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4z" />
    </Glyph>
  );
}

/** A ⋯ button. */
export function MoreIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </Glyph>
  );
}
