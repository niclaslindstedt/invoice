// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  Field,
  ReorderButtons,
  SegmentedControl,
  SelectPicker,
} from "@niclaslindstedt/oss-framework/components";

import { EyeIcon, EyeOffIcon } from "./icons.tsx";
import { useT } from "./i18n/index.ts";
import {
  ACCENT,
  ACCENT_IDS,
  PAPER_IDS,
  TYPEFACE,
  TYPEFACE_IDS,
  hiddenSections,
  hideSection,
  moveSection,
  printedSections,
  showSection,
} from "./layout.ts";
import type { Region } from "./regions/index.ts";
import type {
  AccentId,
  InvoiceLayout,
  PaperId,
  SectionId,
  TypefaceId,
} from "./types.ts";

// The controls a layout is edited with, off the page: the section list with
// its arrows and eyes, and the three pickers for the look. The template
// editor uses all of it; the invoice editor uses the look, because there the
// sections are moved on the page itself.

export function sectionName(t: ReturnType<typeof useT>, id: SectionId): string {
  return t(`page.sections.${id}` as "page.sections.header");
}

export function SectionList({
  layout,
  region,
  onChange,
}: {
  layout: InvoiceLayout;
  region: Region;
  onChange: (layout: InvoiceLayout) => void;
}) {
  const t = useT();
  const printed = printedSections(layout, region);
  const hidden = hiddenSections(layout, region);
  return (
    <div className="flex flex-col gap-1">
      {printed.map((id, i) => {
        const required = region.requiredSections.includes(id);
        return (
          <div
            key={id}
            className="flex items-center gap-2 rounded-md border border-line bg-surface-2 px-2 py-1"
          >
            <ReorderButtons
              onMoveUp={() => onChange(moveSection(layout, region, id, i - 1))}
              onMoveDown={() =>
                onChange(moveSection(layout, region, id, i + 1))
              }
              canMoveUp={i > 0}
              canMoveDown={i < printed.length - 1}
              upLabel={t("common.moveUp")}
              downLabel={t("common.moveDown")}
            />
            <span className="min-w-0 flex-1 truncate text-sm text-fg">
              {sectionName(t, id)}
            </span>
            {required ? (
              <span className="text-xs text-muted">{t("editor.required")}</span>
            ) : (
              <button
                type="button"
                aria-label={t("editor.hide", { section: sectionName(t, id) })}
                title={t("editor.hide", { section: sectionName(t, id) })}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-surface-3 hover:text-fg"
                onClick={() => onChange(hideSection(layout, region, id))}
              >
                <EyeOffIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      })}
      {hidden.length > 0 && (
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted">{t("editor.hidden")}:</span>
          {hidden.map((id) => (
            <button
              key={id}
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-line px-2.5 py-1 text-xs text-muted hover:border-accent hover:text-fg"
              onClick={() => onChange(showSection(layout, region, id))}
              title={t("editor.show", { section: sectionName(t, id) })}
            >
              <EyeIcon className="h-3.5 w-3.5" />
              {sectionName(t, id)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function LookControls({
  layout,
  onChange,
}: {
  layout: InvoiceLayout;
  onChange: (layout: InvoiceLayout) => void;
}) {
  const t = useT();
  return (
    <div className="flex flex-col gap-3">
      <Field label={t("editor.typeface")}>
        <SelectPicker<TypefaceId>
          value={layout.typeface}
          options={TYPEFACE_IDS.map((id) => ({
            value: id,
            label: t(`templates.typeface.${id}` as "templates.typeface.sans"),
            labelStyle: { fontFamily: TYPEFACE[id].heading },
          }))}
          onChange={(typeface) => onChange({ ...layout, typeface })}
          ariaLabel={t("editor.typeface")}
        />
      </Field>
      <Field label={t("editor.accent")}>
        <div
          className="flex flex-wrap gap-1.5"
          role="radiogroup"
          aria-label={t("editor.accent")}
        >
          {ACCENT_IDS.map((id) => {
            const on = layout.accent === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={on}
                title={t(`templates.accent.${id}` as "templates.accent.ink")}
                aria-label={t(
                  `templates.accent.${id}` as "templates.accent.ink",
                )}
                onClick={() => onChange({ ...layout, accent: id })}
                className={`h-8 w-8 rounded-full border-2 ${
                  on ? "border-accent" : "border-transparent"
                }`}
                style={{ background: ACCENT[id] }}
              />
            );
          })}
        </div>
      </Field>
      <Field label={t("editor.paper")}>
        <SegmentedControl<PaperId>
          value={layout.paper}
          options={PAPER_IDS.map((id) => ({
            value: id,
            label: t(`templates.paper.${id}` as "templates.paper.white"),
          }))}
          onChange={(paper) => onChange({ ...layout, paper })}
          ariaLabel={t("editor.paper")}
        />
      </Field>
    </div>
  );
}

export type { AccentId };
