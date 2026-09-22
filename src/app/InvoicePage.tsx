// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { useEffect, useState, type CSSProperties } from "react";

import { TrashIcon } from "@niclaslindstedt/oss-framework/components";

import { useLang, useT } from "./i18n/index.ts";
import { formatMoney, formatQuantity, invoiceTotals } from "./invoice.ts";
import { fieldLabel, formatDate, noticeLabel, unitLabel } from "./labels.ts";
import { ACCENT, PAPER, TYPEFACE } from "./layout.ts";
import { fieldsFor, type Region } from "./regions/index.ts";
import type {
  Customer,
  Invoice,
  InvoiceLine,
  Party,
  SectionId,
} from "./types.ts";

// The page: the invoice as it prints, one section at a time. Paint only —
// the figures are `invoice.ts`'s, the words the catalog's and the region's,
// and which sections in which order is the layout's. The same component
// draws the preview, the edit mode and the printout; what differs is
// whether the fields are inputs.
//
// A field on the page commits on blur, the way the framework's labelled
// fields do, so an edit to a source — the customer's address, say — becomes
// one revision rather than one per keystroke.

export type PageEdits = {
  invoice: (patch: Partial<Invoice>) => void;
  line: (id: string, patch: Partial<InvoiceLine>) => void;
  removeLine: (id: string) => void;
  seller: (party: Party) => void;
  buyer: (party: Party) => void;
};

type Props = {
  invoice: Invoice;
  seller: Party;
  buyer: Party;
  customer: Customer | null;
  region: Region;
  /** Non-null in the edit mode: what an edit on the page does. */
  edits: PageEdits | null;
  /** The number of the invoice this one credits, when it is a credit note
   *  and the original has one. The page prints the number, never the id. */
  creditOfNumber: number | null;
  /** Draw one section; the editor wraps each in its frame. */
  wrap: (id: SectionId, node: React.ReactNode) => React.ReactNode;
  sections: SectionId[];
};

export function InvoicePage({
  invoice,
  seller,
  buyer,
  customer,
  region,
  edits,
  creditOfNumber,
  wrap,
  sections,
}: Props) {
  const t = useT();
  const lang = useLang();
  const totals = invoiceTotals(invoice);
  const locale = region.locale;
  const money = (n: number) => formatMoney(n, invoice.currency, locale);
  const face = TYPEFACE[invoice.layout.typeface];
  const paper = PAPER[invoice.layout.paper];
  const style = {
    "--page-family": face.family,
    "--page-heading": face.heading,
    "--page-ink": paper.ink,
    "--page-paper": paper.background,
    "--page-accent": ACCENT[invoice.layout.accent],
  } as CSSProperties;
  const isCredit = invoice.creditOf !== null;
  const partyFields = (side: "seller" | "buyer") =>
    fieldsFor(region, side).filter(
      (f) => f.placement === "party" && f.kind === "text",
    );
  const paymentFields = fieldsFor(region, "seller").filter(
    (f) => f.placement === "payment" && f.kind === "text",
  );

  const render = (id: SectionId): React.ReactNode => {
    switch (id) {
      case "header":
        return (
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold leading-tight">
                {seller.name}
              </h1>
            </div>
            <div className="text-right">
              <h2 className="text-3xl font-bold uppercase tracking-wide">
                {isCredit ? t("page.creditNote") : t("page.invoice")}
              </h2>
              <div
                className="mt-1 text-sm"
                style={{ color: "var(--page-muted)" }}
              >
                {t("page.number")} {invoice.number ?? "—"}
              </div>
              {isCredit && (
                <div className="text-sm" style={{ color: "var(--page-muted)" }}>
                  {t("page.creditOf", {
                    number:
                      creditOfNumber === null ? "—" : String(creditOfNumber),
                  })}
                </div>
              )}
            </div>
          </div>
        );
      case "parties":
        return (
          <div className="grid grid-cols-2 gap-8">
            <PartyBlock
              heading={t("page.from")}
              party={seller}
              fields={partyFields("seller")}
              region={region}
              onChange={edits?.seller ?? null}
            />
            <PartyBlock
              heading={t("page.to")}
              party={buyer}
              fields={partyFields("buyer")}
              region={region}
              onChange={edits?.buyer ?? null}
              extra={
                customer?.number
                  ? [[t("page.customerNumber"), customer.number]]
                  : []
              }
            />
          </div>
        );
      case "meta":
        return (
          <dl className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm sm:grid-cols-3">
            <Meta
              label={t("page.date")}
              value={formatDate(lang, invoice.issueDate)}
            />
            <Meta
              label={t("page.dueDate")}
              value={formatDate(lang, invoice.dueDate)}
            />
            {invoice.deliveryDate && (
              <Meta
                label={t("page.deliveryDate")}
                value={formatDate(lang, invoice.deliveryDate)}
              />
            )}
            {(invoice.period || edits) && (
              <Meta label={t("page.period")}>
                <PageText
                  value={invoice.period}
                  placeholder={t("editor.period")}
                  onCommit={edits ? (v) => edits.invoice({ period: v }) : null}
                />
              </Meta>
            )}
            {(invoice.ourReference || edits) && (
              <Meta label={t("page.ourReference")}>
                <PageText
                  value={invoice.ourReference}
                  placeholder={t("editor.ourReference")}
                  onCommit={
                    edits ? (v) => edits.invoice({ ourReference: v }) : null
                  }
                />
              </Meta>
            )}
            {(invoice.yourReference || edits) && (
              <Meta label={t("page.yourReference")}>
                <PageText
                  value={invoice.yourReference}
                  placeholder={t("editor.yourReference")}
                  onCommit={
                    edits ? (v) => edits.invoice({ yourReference: v }) : null
                  }
                />
              </Meta>
            )}
          </dl>
        );
      case "lines":
        return (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr
                className="text-left text-xs uppercase tracking-wide"
                style={{
                  color: "var(--page-accent)",
                  borderBottom: "1.5px solid var(--page-accent)",
                }}
              >
                <th className="py-1 pr-2 font-semibold">
                  {t("page.description")}
                </th>
                <th className="py-1 pr-2 text-right font-semibold">
                  {t("page.quantity")}
                </th>
                <th className="py-1 pr-2 font-semibold">{t("page.unit")}</th>
                <th className="py-1 pr-2 text-right font-semibold">
                  {t("page.unitPrice")}
                </th>
                <th className="py-1 pr-2 text-right font-semibold">
                  {t("page.vat")}
                </th>
                <th className="py-1 text-right font-semibold">
                  {t("page.amount")}
                </th>
                {edits && <th data-section-chrome className="w-8" />}
              </tr>
            </thead>
            <tbody>
              {invoice.lines.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-3 text-center"
                    style={{ color: "var(--page-muted)" }}
                  >
                    {t("page.empty")}
                  </td>
                </tr>
              )}
              {invoice.lines.map((line) => (
                <LineRow
                  key={line.id}
                  line={line}
                  locale={locale}
                  currency={invoice.currency}
                  unitLabel={unitLabel(t, line.unit)}
                  edits={edits}
                  discountLabel={t("page.discount", {
                    percent: String(line.discount),
                  })}
                  discountFieldLabel={t("editor.discount")}
                  removeLabel={t("editor.removeLine")}
                />
              ))}
            </tbody>
          </table>
        );
      case "totals":
        return (
          <div className="ml-auto w-full max-w-sm text-sm">
            <Row label={t("page.net")} value={money(totals.net)} />
            {totals.vat.map((g) => (
              <Row
                key={g.rate}
                // With one rate the base is the net, printed a line up;
                // only a second rate needs its own base named.
                label={
                  totals.vat.length > 1
                    ? `${t("page.vatAt", { rate: formatQuantity(g.rate, locale) })} ${t("page.vatOn", { base: money(g.net) })}`
                    : t("page.vatAt", { rate: formatQuantity(g.rate, locale) })
                }
                value={money(g.vat)}
              />
            ))}
            {invoice.roundTotal && totals.rounding !== 0 && (
              <Row label={t("page.rounding")} value={money(totals.rounding)} />
            )}
            <div
              className="mt-1 flex items-baseline justify-between gap-4 border-t-2 pt-1 text-base font-bold"
              style={{ borderColor: "var(--page-accent)" }}
            >
              <span>{t("page.total")}</span>
              <span className="shrink-0 whitespace-nowrap tabular-nums">
                {money(totals.total)}
              </span>
            </div>
            {invoice.currency !== region.currency &&
              (invoice.vatInBaseCurrency !== null || edits) && (
                <div className="mt-1 flex items-baseline justify-between gap-4 py-0.5">
                  <span style={{ color: "var(--page-muted)" }}>
                    {t("page.vatInCurrency", { currency: region.currency })}
                  </span>
                  <span className="tabular-nums">
                    {edits ? (
                      <PageText
                        value={
                          invoice.vatInBaseCurrency === null
                            ? ""
                            : String(invoice.vatInBaseCurrency)
                        }
                        type="number"
                        align="right"
                        className="w-24"
                        onCommit={(v) =>
                          edits.invoice({
                            vatInBaseCurrency:
                              v.trim() === ""
                                ? null
                                : Number(v.replace(",", ".")) || 0,
                          })
                        }
                      />
                    ) : (
                      formatMoney(
                        invoice.vatInBaseCurrency ?? 0,
                        region.currency,
                        locale,
                      )
                    )}
                  </span>
                </div>
              )}
            <ul className="mt-2 text-xs" style={{ color: "var(--page-muted)" }}>
              {region.invoiceNotices(invoice, seller, buyer).map((n) => (
                <li key={n.key}>
                  {noticeLabel(region, lang, n, seller.details)}
                </li>
              ))}
            </ul>
          </div>
        );
      case "payment":
        return (
          <div className="text-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wide">
              {t("page.payment")}
            </h3>
            <p className="mt-1">
              {t("page.payBy", {
                total: money(totals.total),
                date: formatDate(lang, invoice.dueDate),
              })}
            </p>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5">
              {paymentFields.map((f) => {
                const value = seller.details[f.id] ?? "";
                if (!value && !edits) return null;
                return (
                  <Meta key={f.id} label={fieldLabel(region, lang, f.id)}>
                    <PageText
                      value={value}
                      placeholder={fieldLabel(region, lang, f.id)}
                      onCommit={
                        edits
                          ? (v) => {
                              const details = { ...seller.details };
                              const next = (
                                f.normalize ?? ((x: string) => x.trim())
                              )(v);
                              if (next) details[f.id] = next;
                              else delete details[f.id];
                              edits.seller({ ...seller, details });
                            }
                          : null
                      }
                    />
                  </Meta>
                );
              })}
            </dl>
            <ul className="mt-2" style={{ color: "var(--page-muted)" }}>
              {region.notices(seller).map((n) => (
                <li key={n.key}>
                  {noticeLabel(region, lang, n, seller.details)}
                </li>
              ))}
            </ul>
          </div>
        );
      case "note":
        return edits ? (
          <PageText
            value={invoice.note}
            placeholder={t("editor.noteHint")}
            multiline
            onCommit={(v) => edits.invoice({ note: v })}
          />
        ) : invoice.note ? (
          <p className="whitespace-pre-wrap text-sm">{invoice.note}</p>
        ) : null;
      case "footer":
        return (
          <div
            className="border-t pt-2 text-xs"
            style={{
              borderColor: "var(--page-rule)",
              color: "var(--page-muted)",
            }}
          >
            <div className="flex flex-wrap gap-x-4 gap-y-0.5">
              <span>{seller.name}</span>
              {partyFields("seller").map((f) =>
                seller.details[f.id] ? (
                  <span key={f.id}>
                    {fieldLabel(region, lang, f.id)} {seller.details[f.id]}
                  </span>
                ) : null,
              )}
              {addressLine(seller) && <span>{addressLine(seller)}</span>}
              {seller.email && <span>{seller.email}</span>}
              {seller.phone && <span>{seller.phone}</span>}
              {seller.website && <span>{seller.website}</span>}
            </div>
          </div>
        );
    }
  };

  return (
    <div
      className="invoice-page flex flex-col gap-8"
      data-invoice-page
      style={style}
    >
      {sections.map((id) => (
        <div key={id}>{wrap(id, render(id))}</div>
      ))}
    </div>
  );
}

function addressLine(party: Party): string {
  return [party.address.street, party.address.zip, party.address.city]
    .filter(Boolean)
    .join(", ");
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-0.5">
      <span className="min-w-0" style={{ color: "var(--page-muted)" }}>
        {label}
      </span>
      <span className="shrink-0 whitespace-nowrap tabular-nums">{value}</span>
    </div>
  );
}

function Meta({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs" style={{ color: "var(--page-muted)" }}>
        {label}
      </dt>
      <dd className="min-w-0">{children ?? value}</dd>
    </div>
  );
}

/** Text on the page, or a field in its place when the page is being edited.
 *  Holds a local draft and commits on blur. */
export function PageText({
  value,
  placeholder,
  onCommit,
  multiline = false,
  align = "left",
  type = "text",
  className = "",
}: {
  value: string;
  placeholder?: string;
  onCommit: ((next: string) => void) | null;
  multiline?: boolean;
  align?: "left" | "right";
  type?: "text" | "number";
  className?: string;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  if (!onCommit) {
    return multiline ? (
      <span className={`whitespace-pre-wrap ${className}`}>{value}</span>
    ) : (
      <span className={className}>{value}</span>
    );
  }
  const commit = () => {
    if (draft !== value) onCommit(draft);
  };
  const alignClass = align === "right" ? "text-right" : "";
  return multiline ? (
    <textarea
      className={`page-field ${alignClass} ${className}`}
      value={draft}
      placeholder={placeholder}
      rows={3}
      onChange={(e) => setDraft(e.currentTarget.value)}
      onBlur={commit}
    />
  ) : (
    <input
      className={`page-field ${alignClass} ${className}`}
      type={type}
      inputMode={type === "number" ? "decimal" : undefined}
      step={type === "number" ? "any" : undefined}
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.currentTarget.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
      }}
    />
  );
}

function PartyBlock({
  heading,
  party,
  fields,
  region,
  onChange,
  extra = [],
}: {
  heading: string;
  party: Party;
  fields: ReturnType<typeof fieldsFor>;
  region: Region;
  onChange: ((party: Party) => void) | null;
  extra?: [string, string][];
}) {
  const t = useT();
  const lang = useLang();
  const set = (patch: Partial<Party>) => onChange?.({ ...party, ...patch });
  const setAddress = (key: keyof Party["address"], v: string) =>
    onChange?.({ ...party, address: { ...party.address, [key]: v } });
  const editing = onChange !== null;
  return (
    <div className="min-w-0 text-sm">
      <h3 className="text-xs font-semibold uppercase tracking-wide">
        {heading}
      </h3>
      <div className="mt-1 font-semibold">
        <PageText
          value={party.name}
          placeholder={t("common.name")}
          onCommit={editing ? (v) => set({ name: v }) : null}
        />
      </div>
      {(party.address.street || editing) && (
        <div>
          <PageText
            value={party.address.street}
            placeholder={t("common.street")}
            onCommit={editing ? (v) => setAddress("street", v) : null}
          />
        </div>
      )}
      {editing ? (
        <div className="flex gap-2">
          <PageText
            value={party.address.zip}
            placeholder={t("common.zip")}
            onCommit={(v) => setAddress("zip", v)}
            className="max-w-24"
          />
          <PageText
            value={party.address.city}
            placeholder={t("common.city")}
            onCommit={(v) => setAddress("city", v)}
          />
        </div>
      ) : (
        (party.address.zip || party.address.city) && (
          <div>
            {[party.address.zip, party.address.city].filter(Boolean).join(" ")}
          </div>
        )
      )}
      {(party.address.country || editing) && (
        <div>
          <PageText
            value={party.address.country}
            placeholder={t("common.country")}
            onCommit={editing ? (v) => setAddress("country", v) : null}
          />
        </div>
      )}
      <dl
        className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0"
        style={{ color: "var(--page-muted)" }}
      >
        {fields.map((f) => {
          const value = party.details[f.id] ?? "";
          if (!value && !editing) return null;
          return (
            <div key={f.id} className="contents">
              <dt>{fieldLabel(region, lang, f.id)}</dt>
              <dd>
                <PageText
                  value={value}
                  placeholder={fieldLabel(region, lang, f.id)}
                  onCommit={
                    editing
                      ? (v) => {
                          const details = { ...party.details };
                          const next = (
                            f.normalize ?? ((x: string) => x.trim())
                          )(v);
                          if (next) details[f.id] = next;
                          else delete details[f.id];
                          set({ details });
                        }
                      : null
                  }
                />
              </dd>
            </div>
          );
        })}
        {extra.map(([label, value]) => (
          <div key={label} className="contents">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
        {(party.reference || editing) && (
          <div className="contents">
            <dt>{t("page.reference")}</dt>
            <dd>
              <PageText
                value={party.reference}
                placeholder={t("common.reference")}
                onCommit={editing ? (v) => set({ reference: v }) : null}
              />
            </dd>
          </div>
        )}
        {(party.email || editing) && (
          <div className="contents">
            <dt>{t("page.email")}</dt>
            <dd>
              <PageText
                value={party.email}
                placeholder={t("common.email")}
                onCommit={editing ? (v) => set({ email: v }) : null}
              />
            </dd>
          </div>
        )}
        {(party.phone || editing) && (
          <div className="contents">
            <dt>{t("page.phone")}</dt>
            <dd>
              <PageText
                value={party.phone}
                placeholder={t("common.phone")}
                onCommit={editing ? (v) => set({ phone: v }) : null}
              />
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}

function LineRow({
  line,
  locale,
  currency,
  unitLabel: unit,
  edits,
  discountLabel,
  removeLabel,
}: {
  line: InvoiceLine;
  locale: string;
  currency: string;
  unitLabel: string;
  edits: PageEdits | null;
  discountLabel: string;
  discountFieldLabel: string;
  removeLabel: string;
}) {
  const net = formatMoney(
    invoiceTotals({ lines: [line], roundTotal: false }).net,
    currency,
    locale,
  );
  const numeric = (key: "quantity" | "unitPrice" | "vatRate" | "discount") =>
    edits
      ? (v: string) =>
          edits.line(line.id, { [key]: Number(v.replace(",", ".")) || 0 })
      : null;
  return (
    <tr
      className="align-top"
      style={{ borderBottom: "1px solid var(--page-rule)" }}
    >
      <td className="py-1.5 pr-2">
        <PageText
          value={line.description}
          onCommit={
            edits ? (v) => edits.line(line.id, { description: v }) : null
          }
        />
        {line.discount > 0 && (
          <div className="text-xs" style={{ color: "var(--page-muted)" }}>
            {discountLabel}
          </div>
        )}
        {edits && (
          <div
            data-section-chrome
            className="mt-1 text-xs"
            style={{ color: "var(--page-muted)" }}
          >
            <label className="inline-flex items-center gap-1">
              <span>%</span>
              <PageText
                value={String(line.discount)}
                type="number"
                onCommit={numeric("discount")}
                className="max-w-12"
              />
            </label>
          </div>
        )}
      </td>
      <td className="py-1.5 pr-2 text-right tabular-nums">
        {edits ? (
          <PageText
            value={String(line.quantity)}
            type="number"
            align="right"
            onCommit={numeric("quantity")}
          />
        ) : (
          formatQuantity(line.quantity, locale)
        )}
      </td>
      <td className="py-1.5 pr-2">
        {edits ? (
          <PageText
            value={line.unit}
            onCommit={(v) => edits.line(line.id, { unit: v })}
            className="max-w-16"
          />
        ) : (
          unit
        )}
      </td>
      <td className="py-1.5 pr-2 text-right tabular-nums">
        {edits ? (
          <PageText
            value={String(line.unitPrice)}
            type="number"
            align="right"
            onCommit={numeric("unitPrice")}
          />
        ) : (
          formatMoney(line.unitPrice, currency, locale)
        )}
      </td>
      <td className="py-1.5 pr-2 text-right tabular-nums">
        {edits ? (
          <PageText
            value={String(line.vatRate)}
            type="number"
            align="right"
            onCommit={numeric("vatRate")}
            className="max-w-14"
          />
        ) : (
          `${formatQuantity(line.vatRate, locale)}%`
        )}
      </td>
      <td className="py-1.5 text-right tabular-nums">{net}</td>
      {edits && (
        <td data-section-chrome className="py-1 pl-1">
          <button
            type="button"
            aria-label={removeLabel}
            title={removeLabel}
            onClick={() => edits.removeLine(line.id)}
            className="flex h-6 w-6 items-center justify-center rounded"
            style={{ color: "var(--page-muted)" }}
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        </td>
      )}
    </tr>
  );
}
