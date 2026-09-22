// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Reconciling two copies of the document — this device's and the folder's
// or Dropbox's.
//
// Customers, invoices and templates are keyed by id, the company is one
// record, and each carries the timestamp of its last edit, so two copies
// merge record by record with the later edit winning. Revisions are the
// exception and the reason this works out: they are appended, never edited,
// so two histories merge as a union — a customer saved on two devices keeps
// both saves, in order.
//
// The known cost: a *deleted* record is an absence, not a tombstone, so a
// customer deleted on one device comes back from the other until that
// device syncs. Deletions are rare here — an invoice is cancelled rather
// than deleted — and `docs/sync.md` says so.
//
// Pure and total: same inputs, same output, no clock, no storage.

import { mergeRevisions } from "./revisions.ts";
import { DOC_VERSION, type AppData } from "./types.ts";

function newer<T extends { updatedAt: string }>(a: T, b: T): T {
  return b.updatedAt > a.updatedAt ? b : a;
}

function mergeRecords<T extends { updatedAt: string }>(
  local: Record<string, T>,
  remote: Record<string, T>,
): Record<string, T> {
  const out: Record<string, T> = { ...local };
  for (const [key, value] of Object.entries(remote)) {
    const mine = out[key];
    out[key] = mine ? newer(mine, value) : value;
  }
  return out;
}

/** Merge two documents record by record, last edit winning; revisions as
 *  the union of both histories. */
export function mergeDocs(local: AppData, remote: AppData): AppData {
  const revisions: AppData["revisions"] = { ...local.revisions };
  for (const [key, list] of Object.entries(remote.revisions)) {
    revisions[key] = mergeRevisions(revisions[key] ?? [], list);
  }
  return {
    version: DOC_VERSION,
    company:
      local.company && remote.company
        ? newer(local.company, remote.company)
        : (local.company ?? remote.company),
    customers: mergeRecords(local.customers, remote.customers),
    invoices: mergeRecords(local.invoices, remote.invoices),
    templates: mergeRecords(local.templates, remote.templates),
    revisions,
  };
}
