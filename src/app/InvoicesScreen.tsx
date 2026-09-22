// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { useState } from "react";

import { dayKeyOf } from "@niclaslindstedt/oss-framework/calendar";
import {
  Badge,
  Button,
  PlusIcon,
  SegmentedControl,
} from "@niclaslindstedt/oss-framework/components";

import { InvoiceIcon } from "./icons.tsx";
import { useLang, useT } from "./i18n/index.ts";
import { liveContext } from "./ids.ts";
import { formatMoney, invoiceTotals, newInvoice } from "./invoice.ts";
import { formatDate, statusLabel } from "./labels.ts";
import type { Region } from "./regions/index.ts";
import {
  customerList,
  invoiceList,
  templateList,
  type Invoice,
  type InvoiceStatus,
} from "./types.ts";
import type { DocStore } from "./useDocStore.ts";

// The invoices: a list, newest first, a filter by where each is in its life,
// and the button that starts a new one. The onboarding is here too, because
// an invoice needs a company to be from and a customer to be for before it
// can be started.

type Filter = "all" | InvoiceStatus;

type Props = {
  store: DocStore;
  region: Region;
  defaultTemplateId: string | null;
  onOpen: (invoiceId: string) => void;
  onSetUpCompany: () => void;
  onAddCustomer: () => void;
};

export function InvoicesScreen({
  store,
  region,
  defaultTemplateId,
  onOpen,
  onSetUpCompany,
  onAddCustomer,
}: Props) {
  const t = useT();
  const [filter, setFilter] = useState<Filter>("all");
  const invoices = invoiceList(store.data).filter(
    (inv) => filter === "all" || inv.status === filter,
  );
  const customers = customerList(store.data).filter((c) => !c.archived);
  const hasCompany = store.data.company !== null;
  const canStart = hasCompany && customers.length > 0;

  const startInvoice = () => {
    const customer = customers[0];
    if (!customer) return;
    const templates = templateList(store.data);
    const template =
      (defaultTemplateId
        ? store.data.templates[defaultTemplateId]
        : undefined) ??
      templates[0] ??
      null;
    const inv = newInvoice(
      customer,
      template,
      dayKeyOf(new Date()),
      liveContext(),
      {
        currency: region.currency,
        vatRate: region.vatRates[0] ?? 0,
        dueDays: region.defaultDueDays,
        unit: "hour",
      },
    );
    store.saveInvoice(inv);
    onOpen(inv.id);
  };

  return (
    <div className="flex flex-col gap-3 px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentedControl<Filter>
          value={filter}
          options={[
            { value: "all", label: t("invoices.filterAll") },
            { value: "draft", label: t("invoices.status.draft") },
            { value: "sent", label: t("invoices.status.sent") },
            { value: "paid", label: t("invoices.status.paid") },
          ]}
          onChange={setFilter}
          ariaLabel={t("nav.invoices")}
        />
        <Button variant="primary" onClick={startInvoice} disabled={!canStart}>
          <span className="inline-flex items-center gap-1.5">
            <PlusIcon className="h-4 w-4" />
            {t("invoices.new")}
          </span>
        </Button>
      </div>

      {!canStart && (
        <div className="rounded-2xl border border-line bg-surface-3 p-6 text-center">
          <InvoiceIcon className="mx-auto h-8 w-8 text-muted" />
          <p className="mt-3 text-sm text-muted">
            {!hasCompany
              ? t("invoices.needCompany")
              : t("invoices.needCustomer")}
          </p>
          <div className="mt-3">
            {!hasCompany ? (
              <Button variant="primary" onClick={onSetUpCompany}>
                {t("invoices.setUpCompany")}
              </Button>
            ) : (
              <Button variant="primary" onClick={onAddCustomer}>
                {t("invoices.addCustomer")}
              </Button>
            )}
          </div>
        </div>
      )}

      {canStart && invoices.length === 0 && (
        <div className="rounded-2xl border border-line bg-surface-3 p-6 text-center">
          <InvoiceIcon className="mx-auto h-8 w-8 text-muted" />
          <p className="mt-3 text-sm text-muted">{t("invoices.empty")}</p>
        </div>
      )}

      {invoices.map((inv) => (
        <InvoiceCard
          key={inv.id}
          invoice={inv}
          store={store}
          region={region}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}

function InvoiceCard({
  invoice,
  store,
  region,
  onOpen,
}: {
  invoice: Invoice;
  store: DocStore;
  region: Region;
  onOpen: (id: string) => void;
}) {
  const t = useT();
  const lang = useLang();
  const customer = store.data.customers[invoice.customerId];
  const name =
    invoice.buyer?.name ?? customer?.name ?? t("invoices.unknownCustomer");
  const totals = invoiceTotals(invoice);
  const title = invoice.number
    ? t(invoice.creditOf ? "invoices.creditNumber" : "invoices.number", {
        number: String(invoice.number),
      })
    : invoice.creditOf
      ? t("invoices.credit")
      : t("invoices.draft");
  const paid = invoice.events.find((e) => e.kind === "paid");
  const when =
    invoice.status === "paid" && paid
      ? t("invoices.paidOn", { date: formatDate(lang, paid.at.slice(0, 10)) })
      : invoice.status === "sent"
        ? t("invoices.due", { date: formatDate(lang, invoice.dueDate) })
        : t("invoices.issued", { date: formatDate(lang, invoice.issueDate) });
  return (
    <button
      type="button"
      onClick={() => onOpen(invoice.id)}
      className="rounded-2xl border border-line bg-surface-3 p-4 text-left hover:border-accent/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="min-w-0 truncate text-base font-bold text-fg-bright">
              {title}
            </span>
            <Badge tone={invoice.status === "paid" ? "accent" : undefined}>
              {statusLabel(t, invoice.status)}
            </Badge>
          </div>
          <p className="truncate text-sm text-fg">{name}</p>
          <p className="text-xs text-muted">{when}</p>
        </div>
        <span className="shrink-0 text-base font-semibold text-fg-bright tabular-nums">
          {formatMoney(totals.total, invoice.currency, region.locale)}
        </span>
      </div>
    </button>
  );
}
