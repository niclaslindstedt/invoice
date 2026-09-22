// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { useCallback, useMemo, useRef, useState } from "react";

import { dayKeyOf, type DayKey } from "@niclaslindstedt/oss-framework/calendar";
import {
  ActionMenuList,
  Badge,
  Button,
  ConfirmDialog,
  Field,
  FloatingPanel,
  IconButton,
  LabeledDateInput,
  Section,
  SegmentedControl,
  SelectPicker,
  ToggleRow,
  ArrowLeftIcon,
  PlusIcon,
  UploadIcon,
  type FloatingPlacement,
} from "@niclaslindstedt/oss-framework/components";
import { useFileDrop } from "@niclaslindstedt/oss-framework/hooks";

import { MoreIcon, PrinterIcon, SendIcon } from "./icons.tsx";
import { useLang, useT } from "./i18n/index.ts";
import { liveContext } from "./ids.ts";
import {
  InterchangeError,
  linesFromInterchange,
  looksLikeInterchange,
  parseInvoiceLinesFile,
} from "./interchange.ts";
import {
  blankLine,
  creditInvoice,
  dueDateFor,
  invoiceTotals,
  sendInvoice,
  setStatus,
} from "./invoice.ts";
import { InvoicePage, type PageEdits } from "./InvoicePage.tsx";
import { issueLabel, statusLabel } from "./labels.ts";
import {
  hideSection,
  moveSection,
  printedSections,
  showSection,
} from "./layout.ts";
import { LookControls, sectionName } from "./LayoutControls.tsx";
import { EyeIcon } from "./icons.tsx";
import { hiddenSections } from "./layout.ts";
import type { Region } from "./regions/index.ts";
import { SectionFrame } from "./SectionFrame.tsx";
import {
  VAT_TREATMENTS,
  customerList,
  partyOf,
  templateList,
  type Invoice,
  type InvoiceLine,
  type Party,
  type SectionId,
  type VatTreatment,
} from "./types.ts";
import type { DocStore } from "./useDocStore.ts";
import { useDragReorder } from "./useDragReorder.ts";

// One invoice: the page as it prints, and the same page with everything on
// it movable and editable. Two modes over one component (`InvoicePage`),
// because a preview that is drawn differently from the edit view is a
// preview of something else.
//
// A draft reads its sources live — the company and the customer — and an
// edit to either of them *on the page* is an edit to the record, which
// records a revision. Once sent, the invoice carries its own copies and the
// page is read-only; a change is a credit note.

type Props = {
  store: DocStore;
  invoiceId: string;
  region: Region;
  onBack: () => void;
  onOpen: (invoiceId: string) => void;
  onNotice: (message: string) => void;
};

type Mode = "preview" | "edit";

const ACTION_MENU: FloatingPlacement = {
  width: { kind: "min", minPx: 200 },
  anchor: "right",
  gap: 4,
  coordinateSpace: "viewport",
};

export function InvoiceEditor({
  store,
  invoiceId,
  region,
  onBack,
  onOpen,
  onNotice,
}: Props) {
  const t = useT();
  const lang = useLang();
  const invoice = store.data.invoices[invoiceId] ?? null;
  const company = store.data.company;
  const customer = invoice
    ? (store.data.customers[invoice.customerId] ?? null)
    : null;
  const draft = invoice?.status === "draft";
  const [mode, setMode] = useState<Mode>(draft ? "edit" : "preview");
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLButtonElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  // The parties the page shows: the frozen copies once sent, the live
  // records while a draft.
  const seller: Party = useMemo(
    () => invoice?.seller ?? (company ? partyOf(company) : emptyPartyLike()),
    [invoice?.seller, company],
  );
  const buyer: Party = useMemo(
    () => invoice?.buyer ?? (customer ? partyOf(customer) : emptyPartyLike()),
    [invoice?.buyer, customer],
  );
  const totals = useMemo(
    () => (invoice ? invoiceTotals(invoice) : null),
    [invoice],
  );
  const issues = useMemo(
    () =>
      invoice && totals && draft
        ? region.check(invoice, seller, buyer, totals)
        : [],
    [invoice, totals, draft, region, seller, buyer],
  );

  const patch = useCallback(
    (p: Partial<Invoice>) => {
      if (!invoice) return;
      store.saveInvoice({
        ...invoice,
        ...p,
        updatedAt: new Date().toISOString(),
      });
    },
    [invoice, store],
  );

  const edits: PageEdits | null = useMemo(() => {
    if (!invoice || !draft || mode !== "edit") return null;
    return {
      invoice: patch,
      line: (id, p) =>
        patch({
          lines: invoice.lines.map((l) => (l.id === id ? { ...l, ...p } : l)),
        }),
      removeLine: (id) =>
        patch({ lines: invoice.lines.filter((l) => l.id !== id) }),
      seller: (party) => {
        if (!company) return;
        store.saveCompany({
          ...company,
          ...party,
          updatedAt: new Date().toISOString(),
        });
      },
      buyer: (party) => {
        if (!customer) return;
        store.saveCustomer({
          ...customer,
          ...party,
          updatedAt: new Date().toISOString(),
        });
      },
    };
  }, [invoice, draft, mode, patch, company, customer, store]);

  const sections = useMemo(
    () => (invoice ? printedSections(invoice.layout, region) : []),
    [invoice, region],
  );
  const hidden = invoice ? hiddenSections(invoice.layout, region) : [];
  const move = useCallback(
    (from: number, to: number) => {
      if (!invoice) return;
      const id = sections[from];
      if (id) patch({ layout: moveSection(invoice.layout, region, id, to) });
    },
    [invoice, sections, region, patch],
  );
  const { drag, register, start, dropSide } = useDragReorder(move);

  // Dropping a file from the Time app anywhere on the editor.
  const importFile = useCallback(
    async (file: File) => {
      if (!invoice) return;
      if (!draft) {
        onNotice(t("editor.importFrozen"));
        return;
      }
      try {
        const parsed = parseInvoiceLinesFile(await file.text());
        const ctx = liveContext();
        const price = customer?.defaultUnitPrice ?? 0;
        const vatRate = region.vatRates[0] ?? 0;
        const lines: InvoiceLine[] = linesFromInterchange(parsed, ctx, {
          unitPrice: price,
          vatRate,
        });
        const period = invoice.period || parsed.period.label;
        patch({ lines: [...invoice.lines, ...lines], period });
        onNotice(
          t("editor.imported", {
            count: String(lines.length),
            project: parsed.project.name || file.name,
            period: parsed.period.label || "",
          }) + (price === 0 ? ` ${t("editor.importedNoPrice")}` : ""),
        );
        setMode("edit");
      } catch (err) {
        if (err instanceof InterchangeError) {
          const key =
            err.reason === "notJson"
              ? "editor.importNotJson"
              : err.reason === "newer"
                ? "editor.importNewer"
                : "editor.importNotInvoiceLines";
          onNotice(t(key));
        } else {
          onNotice(t("editor.importNotJson"));
        }
      }
    },
    [invoice, draft, customer, region, patch, onNotice, t],
  );
  const { active: dropping } = useFileDrop({
    targetRef: root,
    onDrop: (files) => {
      const file = files.find(looksLikeInterchange) ?? files[0];
      if (file) void importFile(file);
    },
  });

  if (!invoice || !totals) {
    return (
      <div className="flex flex-col gap-3 px-3 py-3">
        <Button onClick={onBack}>{t("common.back")}</Button>
      </div>
    );
  }

  const ctxNow = () => liveContext();
  const send = () => {
    const sent = sendInvoice(invoice, store.data, seller, buyer, ctxNow());
    store.saveInvoice(sent);
    setMode("preview");
    onNotice(t("invoices.status.sent"));
  };
  const print = () => {
    setMode("preview");
    // Two frames: one for the mode to render, one for the layout to settle.
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
  };
  const credit = () => {
    const { credit: note, original } = creditInvoice(
      invoice,
      dayKeyOf(new Date()),
      ctxNow(),
    );
    store.saveInvoices([note, original]);
    onOpen(note.id);
  };
  const duplicate = () => {
    const c = ctxNow();
    const copy: Invoice = {
      ...invoice,
      id: c.id(),
      number: null,
      status: "draft",
      events: [{ at: c.now, kind: "created" }],
      seller: null,
      buyer: null,
      creditOf: null,
      issueDate: dayKeyOf(new Date()),
      dueDate: dueDateFor(dayKeyOf(new Date()), 30),
      lines: invoice.lines.map((l) => ({ ...l, id: c.id() })),
      updatedAt: c.now,
    };
    store.saveInvoice(copy);
    onOpen(copy.id);
  };

  const actions = [
    ...(draft ? [{ label: t("invoices.action.send"), onSelect: send }] : []),
    { label: t("invoices.action.print"), onSelect: print },
    ...(invoice.status === "sent"
      ? [
          {
            label: t("invoices.action.markPaid"),
            onSelect: () =>
              store.saveInvoice(setStatus(invoice, "paid", ctxNow())),
          },
          { label: t("invoices.action.credit"), onSelect: credit },
          {
            label: t("invoices.action.cancel"),
            onSelect: () =>
              store.saveInvoice(setStatus(invoice, "cancelled", ctxNow())),
          },
        ]
      : []),
    ...(invoice.status === "cancelled"
      ? [
          {
            label: t("invoices.action.reopen"),
            onSelect: () =>
              store.saveInvoice(setStatus(invoice, "draft", ctxNow())),
          },
        ]
      : []),
    { label: t("invoices.action.duplicate"), onSelect: duplicate },
    ...(draft
      ? [
          {
            label: t("invoices.action.cancel"),
            onSelect: () =>
              store.saveInvoice(setStatus(invoice, "cancelled", ctxNow())),
          },
          {
            label: t("invoices.action.delete"),
            onSelect: () => setConfirmDelete(true),
          },
        ]
      : []),
  ];

  const title = invoice.number
    ? t(invoice.creditOf ? "invoices.creditNumber" : "invoices.number", {
        number: String(invoice.number),
      })
    : invoice.creditOf
      ? t("invoices.credit")
      : t("invoices.draft");

  const customers = customerList(store.data);
  const templates = templateList(store.data);

  return (
    <div ref={root} className="relative flex flex-col gap-3 px-3 py-3">
      {dropping && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-accent/10 backdrop-blur-[1px]">
          <div className="rounded-lg border-2 border-dashed border-accent bg-surface px-6 py-4 text-sm font-medium text-fg-bright shadow-lg">
            {t("editor.dropActive")}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <IconButton label={t("common.back")} onClick={onBack}>
          <ArrowLeftIcon className="h-4 w-4" />
        </IconButton>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="min-w-0 truncate text-lg font-bold text-fg-bright">
              {title}
            </h2>
            <Badge tone={invoice.status === "paid" ? "accent" : undefined}>
              {statusLabel(t, invoice.status)}
            </Badge>
          </div>
          <p className="truncate text-xs text-muted">
            {customer?.name ?? buyer.name ?? t("invoices.unknownCustomer")}
          </p>
        </div>
        {draft && (
          <Button variant="primary" onClick={send} disabled={issues.length > 0}>
            <span className="inline-flex items-center gap-1.5">
              <SendIcon className="h-4 w-4" />
              {t("invoices.action.send")}
            </span>
          </Button>
        )}
        <IconButton label={t("invoices.action.print")} onClick={print}>
          <PrinterIcon className="h-4 w-4" />
        </IconButton>
        <IconButton
          ref={menuRef}
          label={t("common.edit")}
          expanded={menu}
          onClick={() => setMenu(true)}
        >
          <MoreIcon className="h-4 w-4" />
        </IconButton>
      </div>

      {draft ? (
        <SegmentedControl<Mode>
          value={mode}
          options={[
            { value: "preview", label: t("editor.preview") },
            { value: "edit", label: t("editor.edit") },
          ]}
          onChange={setMode}
          ariaLabel={t("editor.title")}
          fullWidth
        />
      ) : (
        <p className="rounded-md border border-line bg-surface-3 px-3 py-2 text-xs text-muted">
          {t("invoices.frozen")}
        </p>
      )}

      {draft && mode === "edit" && (
        <>
          <Section title={t("editor.title")}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={t("editor.customer")}>
                <SelectPicker<string>
                  value={invoice.customerId}
                  options={customers.map((c) => ({
                    value: c.id,
                    label: c.name || t("common.untitled"),
                  }))}
                  onChange={(id) => {
                    const next = store.data.customers[id];
                    patch({
                      customerId: id,
                      yourReference: next?.reference ?? invoice.yourReference,
                    });
                  }}
                  ariaLabel={t("editor.customer")}
                />
              </Field>
              <Field label={t("editor.template")}>
                <SelectPicker<string>
                  value=""
                  options={[
                    { value: "", label: t("editor.noTemplate") },
                    ...templates.map((tpl) => ({
                      value: tpl.id,
                      label: tpl.name,
                    })),
                  ]}
                  onChange={(id) => {
                    const tpl = store.data.templates[id];
                    if (!tpl) return;
                    patch({
                      layout: {
                        ...tpl.layout,
                        sections: [...tpl.layout.sections],
                      },
                      dueDate: dueDateFor(invoice.issueDate, tpl.dueDays),
                      currency: tpl.currency || invoice.currency,
                      roundTotal: tpl.roundTotal,
                      note: invoice.note || tpl.note,
                    });
                  }}
                  ariaLabel={t("editor.template")}
                />
              </Field>
              <LabeledDateInput
                label={t("editor.issueDate")}
                value={invoice.issueDate}
                onCommit={(v) => patch({ issueDate: v as DayKey })}
              />
              <LabeledDateInput
                label={t("editor.dueDate")}
                value={invoice.dueDate}
                onCommit={(v) => patch({ dueDate: v as DayKey })}
              />
              <LabeledDateInput
                label={t("editor.deliveryDate")}
                value={invoice.deliveryDate ?? ""}
                onCommit={(v) => patch({ deliveryDate: (v as DayKey) || null })}
              />
              <Field label={t("editor.currency")}>
                <input
                  className="w-24 rounded-md border border-line bg-surface-2 px-2 py-1.5 text-sm text-fg outline-none focus:border-accent"
                  value={invoice.currency}
                  aria-label={t("editor.currency")}
                  onBlur={(e) => {
                    const v = e.currentTarget.value.trim().toUpperCase();
                    if (v && v !== invoice.currency) patch({ currency: v });
                  }}
                  onChange={() => undefined}
                />
              </Field>
            </div>
            <Field label={t("editor.vatTreatment")}>
              <SegmentedControl<VatTreatment>
                value={invoice.vatTreatment}
                options={VAT_TREATMENTS.map((v) => ({
                  value: v,
                  label: t(
                    `editor.vatTreatments.${v}` as "editor.vatTreatments.standard",
                  ),
                }))}
                onChange={(vatTreatment) =>
                  patch({
                    vatTreatment,
                    // Under reverse charge or an exemption no line carries VAT.
                    lines:
                      vatTreatment === "standard"
                        ? invoice.lines
                        : invoice.lines.map((l) => ({ ...l, vatRate: 0 })),
                  })
                }
                ariaLabel={t("editor.vatTreatment")}
              />
            </Field>
            <p className="text-xs text-muted">{t("editor.vatTreatmentHint")}</p>
            <ToggleRow
              label={t("editor.roundTotal")}
              hint={t("editor.roundTotalHint")}
              checked={invoice.roundTotal}
              onChange={(next) => patch({ roundTotal: next })}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() =>
                  patch({
                    lines: [
                      ...invoice.lines,
                      blankLine(ctxNow(), {
                        unit: "hour",
                        vatRate: region.vatRates[0] ?? 0,
                      }),
                    ],
                  })
                }
              >
                <span className="inline-flex items-center gap-1.5">
                  <PlusIcon className="h-4 w-4" />
                  {t("editor.addLine")}
                </span>
              </Button>
              <label className="inline-flex">
                <input
                  type="file"
                  accept="application/json,.json"
                  className="sr-only"
                  onChange={(e) => {
                    const input = e.currentTarget;
                    const file = input.files?.[0];
                    if (file) void importFile(file);
                    input.value = "";
                  }}
                />
                <span className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm text-fg hover:bg-surface-2">
                  <UploadIcon className="h-4 w-4" />
                  {t("editor.importFile")}
                </span>
              </label>
            </div>
            <p className="text-xs text-muted">{t("editor.drop")}</p>
          </Section>

          <Section title={t("editor.look")}>
            <LookControls
              layout={invoice.layout}
              onChange={(layout) => patch({ layout })}
            />
            <p className="text-xs text-muted">{t("editor.sectionsHint")}</p>
            {hidden.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted">
                  {t("editor.hidden")}:
                </span>
                {hidden.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full border border-dashed border-line px-2.5 py-1 text-xs text-muted hover:border-accent hover:text-fg"
                    onClick={() =>
                      patch({ layout: showSection(invoice.layout, region, id) })
                    }
                    title={t("editor.show", { section: sectionName(t, id) })}
                  >
                    <EyeIcon className="h-3.5 w-3.5" />
                    {sectionName(t, id)}
                  </button>
                ))}
              </div>
            )}
            <p className="text-xs text-muted">
              {t("editor.editSource", {
                party: `${t("editor.sellerParty")} / ${t("editor.buyerParty")}`,
              })}
            </p>
          </Section>
        </>
      )}

      {draft && (
        <Section title={t("invoices.issues")}>
          {issues.length === 0 ? (
            <p className="text-sm text-accent">{t("invoices.issuesNone")}</p>
          ) : (
            <ul className="list-disc pl-5 text-sm text-fg">
              {issues.map((issue, i) => (
                <li key={i}>{issueLabel(region, lang, issue)}</li>
              ))}
            </ul>
          )}
        </Section>
      )}

      <div className="overflow-x-auto">
        <InvoicePage
          invoice={invoice}
          seller={seller}
          buyer={buyer}
          customer={customer}
          region={region}
          edits={edits}
          creditOfNumber={
            invoice.creditOf
              ? (store.data.invoices[invoice.creditOf]?.number ?? null)
              : null
          }
          sections={sections}
          wrap={(id: SectionId, node) =>
            edits ? (
              <SectionFrame
                name={sectionName(t, id)}
                index={sections.indexOf(id)}
                count={sections.length}
                required={region.requiredSections.includes(id)}
                dragging={drag?.from === sections.indexOf(id)}
                dropSide={dropSide(sections.indexOf(id))}
                register={(el) => register(sections.indexOf(id), el)}
                onHandleDown={start(sections.indexOf(id))}
                onMove={(to) => move(sections.indexOf(id), to)}
                onHide={() =>
                  patch({ layout: hideSection(invoice.layout, region, id) })
                }
              >
                {node}
              </SectionFrame>
            ) : (
              node
            )
          }
        />
      </div>
      <p className="px-1 text-xs text-muted">{t("editor.printHint")}</p>

      {invoice.events.length > 0 && (
        <Section title={t("common.history")}>
          <ul className="flex flex-col gap-0.5 text-sm">
            {[...invoice.events].reverse().map((ev, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span className="text-fg">
                  {t(`invoices.event.${ev.kind}` as "invoices.event.created")}
                </span>
                <span className="text-muted">
                  {new Date(ev.at).toLocaleString(
                    lang === "sv" ? "sv-SE" : "en-GB",
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <FloatingPanel
        open={menu}
        onClose={() => setMenu(false)}
        triggerRef={menuRef}
        placement={ACTION_MENU}
        className="py-1"
      >
        <ActionMenuList
          actions={actions}
          ariaLabel={t("common.edit")}
          onActivate={(action) => {
            setMenu(false);
            action.onSelect();
          }}
        />
      </FloatingPanel>

      <ConfirmDialog
        open={confirmDelete}
        title={t("invoices.action.deleteConfirm")}
        description={t("invoices.action.deleteHint")}
        confirmLabel={t("common.delete")}
        tone="danger"
        labels={{ cancel: t("common.cancel"), close: t("common.close") }}
        onConfirm={() => {
          store.deleteInvoice(invoice.id);
          setConfirmDelete(false);
          onBack();
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

function emptyPartyLike(): Party {
  return {
    name: "",
    address: { street: "", zip: "", city: "", country: "" },
    email: "",
    phone: "",
    website: "",
    reference: "",
    details: {},
  };
}
