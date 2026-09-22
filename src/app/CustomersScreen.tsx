// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { useState } from "react";

import {
  Badge,
  Button,
  ConfirmDialog,
  IconButton,
  PencilIcon,
  PersonIcon,
  PlusIcon,
  TrashIcon,
} from "@niclaslindstedt/oss-framework/components";

import { CustomerEditModal } from "./CustomerEditModal.tsx";
import { HistoryModal } from "./HistoryModal.tsx";
import { HistoryIcon } from "./icons.tsx";
import { useT } from "./i18n/index.ts";
import { liveContext } from "./ids.ts";
import type { Region } from "./regions/index.ts";
import {
  customerList,
  emptyParty,
  type Customer,
  type Party,
} from "./types.ts";
import type { DocStore } from "./useDocStore.ts";

// Who the invoices are for. One card per customer, with the editor and the
// history behind each. A customer is a source an invoice reads live while it
// is a draft, so a correction here is a correction on every draft — and a
// revision in the history, so the address it used to have is a lookup.

type Props = {
  store: DocStore;
  region: Region;
  onNotice: (message: string) => void;
  /** Open the editor for a new customer on mount — the Invoices screen's
   *  onboarding button lands here. */
  openNew?: boolean;
  onOpenedNew?: () => void;
};

export function newCustomer(now: string, id: string): Customer {
  return {
    ...emptyParty(),
    id,
    number: "",
    defaultUnitPrice: 0,
    notes: "",
    archived: false,
    updatedAt: now,
  };
}

export function CustomersScreen({
  store,
  region,
  onNotice,
  openNew = false,
  onOpenedNew,
}: Props) {
  const t = useT();
  const [editing, setEditing] = useState<{
    customer: Customer;
    isNew: boolean;
  } | null>(() => {
    if (!openNew) return null;
    const ctx = liveContext();
    return { customer: newCustomer(ctx.now, ctx.id()), isNew: true };
  });
  const [history, setHistory] = useState<Customer | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Customer | null>(null);
  const customers = customerList(store.data);
  const invoiceCount = (id: string) =>
    Object.values(store.data.invoices).filter((inv) => inv.customerId === id)
      .length;

  const closeEditor = () => {
    setEditing(null);
    if (openNew) onOpenedNew?.();
  };

  const save = (customer: Customer) => {
    store.saveCustomer({ ...customer, updatedAt: new Date().toISOString() });
    onNotice(t("customers.saved"));
    closeEditor();
  };

  const restore = (customer: Customer, party: Party) => {
    store.saveCustomer({
      ...customer,
      ...party,
      updatedAt: new Date().toISOString(),
    });
    onNotice(t("history.restored"));
  };

  return (
    <div className="flex flex-col gap-3 px-3 py-3">
      <div className="flex justify-end">
        <Button
          variant="primary"
          onClick={() => {
            const ctx = liveContext();
            setEditing({
              customer: newCustomer(ctx.now, ctx.id()),
              isNew: true,
            });
          }}
        >
          <span className="inline-flex items-center gap-1.5">
            <PlusIcon className="h-4 w-4" />
            {t("customers.new")}
          </span>
        </Button>
      </div>

      {customers.length === 0 && (
        <div className="rounded-2xl border border-line bg-surface-3 p-6 text-center">
          <PersonIcon className="mx-auto h-8 w-8 text-muted" />
          <p className="mt-3 text-sm text-muted">{t("customers.empty")}</p>
        </div>
      )}

      {customers.map((c) => {
        const count = invoiceCount(c.id);
        return (
          <div
            key={c.id}
            className={`rounded-2xl border border-line bg-surface-3 p-4 ${
              c.archived ? "opacity-60" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h2 className="min-w-0 truncate text-lg font-bold text-fg-bright">
                    {c.name || t("common.untitled")}
                  </h2>
                  {c.archived && <Badge>{t("customers.archived")}</Badge>}
                </div>
                <p className="mt-1 text-sm text-muted">
                  {[c.address.street, c.address.zip, c.address.city]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                <p className="text-xs text-muted">
                  {[
                    c.number,
                    c.reference,
                    count === 1
                      ? t("customers.invoiceCountOne")
                      : t("customers.invoiceCount", { count: String(count) }),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <IconButton
                  label={t("common.history")}
                  onClick={() => setHistory(c)}
                >
                  <HistoryIcon className="h-4 w-4" />
                </IconButton>
                <IconButton
                  label={t("common.edit")}
                  onClick={() => setEditing({ customer: c, isNew: false })}
                >
                  <PencilIcon className="h-4 w-4" />
                </IconButton>
                <IconButton
                  label={t("customers.delete")}
                  className="hover:border-danger/50 hover:text-danger!"
                  onClick={() => setConfirmDelete(c)}
                >
                  <TrashIcon className="h-4 w-4" />
                </IconButton>
              </div>
            </div>
          </div>
        );
      })}

      {editing && (
        <CustomerEditModal
          customer={editing.customer}
          region={region}
          isNew={editing.isNew}
          onSave={save}
          onClose={closeEditor}
          onHistory={() => setHistory(editing.customer)}
        />
      )}

      {history && (
        <HistoryModal
          name={history.name}
          history={store.data.revisions[history.id] ?? []}
          region={region}
          onRestore={(party) => restore(history, party)}
          onClose={() => setHistory(null)}
        />
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        title={t("customers.deleteConfirm", {
          name: confirmDelete?.name ?? "",
        })}
        description={t("customers.deleteHint")}
        confirmLabel={t("common.delete")}
        tone="danger"
        labels={{ cancel: t("common.cancel"), close: t("common.close") }}
        onConfirm={() => {
          if (confirmDelete) store.deleteCustomer(confirmDelete.id);
          setConfirmDelete(null);
          onNotice(t("customers.deleted"));
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
