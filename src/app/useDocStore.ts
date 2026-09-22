// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createIdbStore } from "@niclaslindstedt/oss-framework/storage";

import { parseDoc, serializeDoc } from "./migrations.ts";
import { normalizeDetails, regionOf } from "./regions/index.ts";
import { recordRevision } from "./revisions.ts";
import {
  COMPANY_KEY,
  emptyDoc,
  partyOf,
  type AppData,
  type Company,
  type Customer,
  type Invoice,
  type Template,
} from "./types.ts";
import * as output from "../output.ts";

// The app's data store. Holds the document in state, persists it to
// IndexedDB, and exposes the edits the app can make — save a customer, the
// company, an invoice, a template, delete one, replace the lot. This is the
// framework's "store stays in the app" seam: the framework owns the storage
// adapters and the UI kit, this hook owns where the document lives and what
// an edit means.
//
// IndexedDB rather than localStorage: an invoice document grows — every
// party keeps its revisions and every invoice its frozen parties — and
// localStorage is a few megabytes spent synchronously on the UI thread. The
// price is that the first read is asynchronous, which is what `loaded` is
// for: the shell paints a spinner for the one frame it takes.
//
// The device's copy is always the working copy. The folder and the cloud
// (see `useSyncEngine`) read and write *around* this hook rather than through
// it, so losing a folder's permission never costs an edit.

const DB_NAME = "invoice";
const STORE_NAME = "document";
const DOC_KEY = "doc";

/** The document storage seam. The store never touches IndexedDB directly —
 *  it reads and writes through a `DocBackend`, so a test can take over
 *  storage without the store changing. */
export type DocBackend = {
  readonly id: string;
  /** The current document, or an empty one when nothing is stored. */
  load(): Promise<AppData>;
  /** Persist the document, answering whether the bytes actually landed. A
   *  best-effort sink — it must not throw — but the answer is what lets the
   *  app tell a write that happened from one that didn't. */
  save(doc: AppData): Promise<boolean>;
};

const idb = createIdbStore<string>({
  dbName: DB_NAME,
  storeName: STORE_NAME,
  // Where the document *lives*: a write that does not land must not look
  // like a success.
  strict: true,
});

/**
 * The real backend: one JSON document in IndexedDB, run through the
 * migration pipeline on the way in and out.
 *
 * Both directions are *non-destructive*. A document that exists but this
 * build can't read — most often one a NEWER build already upgraded, then read
 * by a stale (service-worker-cached) build mid-update — is left in place
 * rather than replaced with a blank starter, so it comes back on its own once
 * the update finishes.
 */
export const idbDocBackend: DocBackend = {
  id: "idb",
  async load() {
    let raw: string | null;
    try {
      raw = await idb.get(DOC_KEY);
    } catch (err) {
      output.error(
        `Couldn't open the storage on this device — ${describe(err)}.`,
      );
      return emptyDoc();
    }
    if (!raw) return emptyDoc();
    try {
      return parseDoc(raw);
    } catch (err) {
      // Bytes exist but can't be parsed. Keep the original — the caller must
      // NOT persist the empty document we return here over it (see the
      // persist guard below) — and quarantine a copy so it stays recoverable
      // even if a later edit does overwrite the live key.
      output.error(
        `Couldn't read the invoices saved on this device — ${describe(
          err,
        )}. The stored copy is left untouched and should reappear once the app finishes updating.`,
      );
      try {
        await idb.set(`${DOC_KEY}:unreadable`, raw);
      } catch {
        // No room to quarantine — the live key is still left intact.
      }
      return emptyDoc();
    }
  },
  async save(doc) {
    try {
      await idb.set(DOC_KEY, serializeDoc(doc));
      return true;
    } catch (err) {
      output.error(`Couldn't save to this device — ${describe(err)}.`);
      return false;
    }
  },
};

/** An in-memory backend, for tests and for a browser with no IndexedDB. */
export function memoryDocBackend(initial: AppData = emptyDoc()): DocBackend {
  let doc = initial;
  return {
    id: "memory",
    load: async () => doc,
    save: async (next) => {
      doc = next;
      return true;
    },
  };
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export type DocStore = {
  data: AppData;
  /** Save the company; a change is recorded as a revision. */
  saveCompany: (company: Company) => void;
  /** Upsert a customer; a change to its party details is recorded as a
   *  revision. */
  saveCustomer: (customer: Customer) => void;
  /** Remove a customer. Its invoices stay, frozen or not, and so does its
   *  history — an absence is not a reason to forget what was sent. */
  deleteCustomer: (id: string) => void;
  saveInvoice: (invoice: Invoice) => void;
  /** Save two at once — a credit note and the invoice it credits — as one
   *  edit, so a sync between the two can never separate them. */
  saveInvoices: (invoices: Invoice[]) => void;
  deleteInvoice: (id: string) => void;
  saveTemplate: (template: Template) => void;
  deleteTemplate: (id: string) => void;
  /** Replace the whole document — used by the sync adopt path and by the
   *  Settings restore flow. */
  replaceAll: (doc: AppData) => void;
  /** Monotonic counter bumped on every edit. The sync engine debounces on it
   *  rather than deep-comparing the document. */
  editCount: number;
  /** True once the first load has been applied. */
  loaded: boolean;
  /** How many write-throughs have failed. A counter rather than a flag so a
   *  second failure raises a second warning. */
  writeFailures: number;
};

export function useDocStore(backend: DocBackend = idbDocBackend): DocStore {
  const [data, setData] = useState<AppData>(emptyDoc);
  const [loaded, setLoaded] = useState(false);
  const [editCount, setEditCount] = useState(0);
  const [writeFailures, setWriteFailures] = useState(0);
  // Whether the document in state is the backend's own — the guard that
  // keeps the empty starter from being written over a stored document
  // before the load has landed.
  const loadedRef = useRef(false);
  const dataRef = useRef(data);
  dataRef.current = data;

  // Load on mount, and adopt a new backend's document on a swap rather than
  // writing this one over it.
  useEffect(() => {
    let alive = true;
    loadedRef.current = false;
    setLoaded(false);
    void backend.load().then((doc) => {
      if (!alive) return;
      setData(doc);
      loadedRef.current = true;
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [backend]);

  // Write-through on every change, guarded so the document is only ever
  // persisted after a load has been applied.
  useEffect(() => {
    if (!loadedRef.current) return;
    void backend.save(data).then((ok) => {
      if (!ok) setWriteFailures((n) => n + 1);
    });
  }, [backend, data]);

  const bump = () => setEditCount((n) => n + 1);

  const saveCompany = useCallback((company: Company) => {
    setData((prev) => ({
      ...prev,
      company: {
        ...company,
        details: normalize(company.region, company.details),
      },
      revisions: {
        ...prev.revisions,
        [COMPANY_KEY]: recordRevision(
          prev.revisions[COMPANY_KEY] ?? [],
          partyOf({
            ...company,
            details: normalize(company.region, company.details),
          }),
          company.updatedAt,
        ),
      },
    }));
    bump();
  }, []);

  const saveCustomer = useCallback((customer: Customer) => {
    setData((prev) => {
      const region = prev.company?.region ?? "se";
      const next = {
        ...customer,
        details: normalize(region, customer.details),
      };
      return {
        ...prev,
        customers: { ...prev.customers, [customer.id]: next },
        revisions: {
          ...prev.revisions,
          [customer.id]: recordRevision(
            prev.revisions[customer.id] ?? [],
            partyOf(next),
            customer.updatedAt,
          ),
        },
      };
    });
    bump();
  }, []);

  const deleteCustomer = useCallback((id: string) => {
    setData((prev) => {
      if (!prev.customers[id]) return prev;
      const customers = { ...prev.customers };
      delete customers[id];
      return { ...prev, customers };
    });
    bump();
  }, []);

  const saveInvoices = useCallback((invoices: Invoice[]) => {
    setData((prev) => {
      const next = { ...prev.invoices };
      for (const inv of invoices) next[inv.id] = inv;
      return { ...prev, invoices: next };
    });
    bump();
  }, []);

  const saveInvoice = useCallback(
    (invoice: Invoice) => saveInvoices([invoice]),
    [saveInvoices],
  );

  const deleteInvoice = useCallback((id: string) => {
    setData((prev) => {
      if (!prev.invoices[id]) return prev;
      const invoices = { ...prev.invoices };
      delete invoices[id];
      return { ...prev, invoices };
    });
    bump();
  }, []);

  const saveTemplate = useCallback((template: Template) => {
    setData((prev) => ({
      ...prev,
      templates: { ...prev.templates, [template.id]: template },
    }));
    bump();
  }, []);

  const deleteTemplate = useCallback((id: string) => {
    setData((prev) => {
      if (!prev.templates[id]) return prev;
      const templates = { ...prev.templates };
      delete templates[id];
      return { ...prev, templates };
    });
    bump();
  }, []);

  const replaceAll = useCallback((doc: AppData) => {
    setData(doc);
    bump();
  }, []);

  return useMemo(
    () => ({
      data,
      saveCompany,
      saveCustomer,
      deleteCustomer,
      saveInvoice,
      saveInvoices,
      deleteInvoice,
      saveTemplate,
      deleteTemplate,
      replaceAll,
      editCount,
      loaded,
      writeFailures,
    }),
    [
      data,
      saveCompany,
      saveCustomer,
      deleteCustomer,
      saveInvoice,
      saveInvoices,
      deleteInvoice,
      saveTemplate,
      deleteTemplate,
      replaceAll,
      editCount,
      loaded,
      writeFailures,
    ],
  );
}

/** A party's details as the company's region keeps them — tidied, and with
 *  every key the region does not define dropped. */
function normalize(
  region: Company["region"],
  details: Record<string, string>,
): Record<string, string> {
  return normalizeDetails(regionOf(region), details);
}
