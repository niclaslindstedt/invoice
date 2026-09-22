// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Identifiers for customers, invoices, templates and lines. Random rather
// than sequential so two devices creating things between syncs cannot
// collide (see `merge.ts`); short rather than a full UUID because every one
// of them lives in the document forever. An invoice's *number* is the one
// sequential thing in the app and is not an id — see `invoice.ts`.
//
// The pure domain modules never call this — they take ids through a `ctx`
// argument — so a test can name its ids and a derivation never depends on
// chance.

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/** A fresh 12-character id from the platform's random source. */
export function makeId(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

/** What the edits need from the outside world: an id when they create
 *  something, and the moment they did it. */
export type EditContext = {
  id: () => string;
  now: string;
};

/** The real context: random ids and the wall clock. */
export function liveContext(): EditContext {
  return { id: makeId, now: new Date().toISOString() };
}
