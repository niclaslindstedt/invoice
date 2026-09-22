// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The edit history of a record, as a list of the snapshots it has been.
//
// A revision is the *whole* record at a moment rather than a diff: reading
// what a customer's address was in March is then a lookup rather than a
// replay, and a device that missed a revision in the middle still reads every
// other one correctly. The cost is bytes, and a party is a few hundred of
// them.
//
// Pure and total: no clock, no ids, no storage. The caller says when.
//
// This module is the shape of a framework `revisions` module and is written
// to move there: nothing in it knows what a party is.

export type Revision<T> = {
  /** ISO timestamp of the save that produced this snapshot. */
  at: string;
  data: T;
};

/** Structural equality on plain JSON-shaped values — the test for "did this
 *  save change anything". Key order does not count. */
export function sameRecord(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || !a || !b) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a as object).sort();
  const kb = Object.keys(b as object).sort();
  if (ka.length !== kb.length || ka.some((k, i) => k !== kb[i])) return false;
  return ka.every((k) =>
    sameRecord(
      (a as Record<string, unknown>)[k],
      (b as Record<string, unknown>)[k],
    ),
  );
}

/** Append a snapshot, unless it says nothing the latest one does not.
 *  The list stays sorted by `at`; a snapshot stamped earlier than the latest
 *  (a clock set back) is filed where its stamp puts it. */
export function recordRevision<T>(
  history: readonly Revision<T>[],
  data: T,
  at: string,
): Revision<T>[] {
  const latest = history[history.length - 1];
  if (latest && sameRecord(latest.data, data)) return [...history];
  const next = [...history, { at, data }];
  next.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
  return next;
}

/** The snapshot in force at a moment: the latest one stamped at or before
 *  it, or null when the record did not exist yet. */
export function revisionAt<T>(
  history: readonly Revision<T>[],
  at: string,
): Revision<T> | null {
  let found: Revision<T> | null = null;
  for (const rev of history) {
    if (rev.at <= at) found = rev;
    else break;
  }
  return found;
}

/** Two histories of the same record, as one: the union by timestamp, so two
 *  devices that each saved the customer keep both saves. */
export function mergeRevisions<T>(
  a: readonly Revision<T>[],
  b: readonly Revision<T>[],
): Revision<T>[] {
  const byAt = new Map<string, Revision<T>>();
  for (const rev of a) byAt.set(rev.at, rev);
  for (const rev of b) if (!byAt.has(rev.at)) byAt.set(rev.at, rev);
  return [...byAt.values()].sort((x, y) =>
    x.at < y.at ? -1 : x.at > y.at ? 1 : 0,
  );
}

/** The dotted paths whose values differ between two snapshots — what a
 *  history screen highlights. Nested objects are walked; arrays are compared
 *  whole. */
export function changedPaths(a: unknown, b: unknown, prefix = ""): string[] {
  if (sameRecord(a, b)) return [];
  const objects =
    typeof a === "object" &&
    typeof b === "object" &&
    a &&
    b &&
    !Array.isArray(a) &&
    !Array.isArray(b);
  if (!objects) return [prefix || "."];
  const keys = new Set([
    ...Object.keys(a as object),
    ...Object.keys(b as object),
  ]);
  const out: string[] = [];
  for (const key of [...keys].sort()) {
    out.push(
      ...changedPaths(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key],
        prefix ? `${prefix}.${key}` : key,
      ),
    );
  }
  return out;
}
