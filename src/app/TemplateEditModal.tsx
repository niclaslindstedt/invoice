// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { useId, useState } from "react";

import {
  LabeledInput,
  LabeledTextarea,
  Modal,
  Section,
  ToggleRow,
} from "@niclaslindstedt/oss-framework/components";

import { useT } from "./i18n/index.ts";
import { LookControls, SectionList } from "./LayoutControls.tsx";
import { ModalHeader } from "./ModalHeader.tsx";
import type { Region } from "./regions/index.ts";
import type { Template } from "./types.ts";

// The template editor: what a new invoice starts from. Edited as a draft and
// saved whole.

type Props = {
  template: Template;
  region: Region;
  isNew: boolean;
  onSave: (template: Template) => void;
  onClose: () => void;
};

export function TemplateEditModal({
  template,
  region,
  isNew,
  onSave,
  onClose,
}: Props) {
  const t = useT();
  const titleId = useId();
  const [draft, setDraft] = useState<Template>(template);
  const valid = draft.name.trim().length > 0;

  return (
    <Modal
      open
      onClose={onClose}
      labelledBy={titleId}
      closeLabel={t("common.close")}
    >
      <ModalHeader
        titleId={titleId}
        title={isNew ? t("templates.new") : t("templates.editTitle")}
        onCancel={onClose}
        onSave={() => onSave({ ...draft, name: draft.name.trim() })}
        saveDisabled={!valid}
      />
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        <LabeledInput
          label={t("templates.name")}
          value={draft.name}
          required
          onCommit={(v) => setDraft((d) => ({ ...d, name: v }))}
        />
        <div className="grid grid-cols-2 gap-2">
          <LabeledInput
            label={t("templates.dueDays")}
            value={String(draft.dueDays)}
            type="number"
            inputMode="numeric"
            min={0}
            onCommit={(v) =>
              setDraft((d) => ({
                ...d,
                dueDays: Math.max(0, Math.round(Number(v) || 0)),
              }))
            }
          />
          <LabeledInput
            label={t("templates.vatRate")}
            value={String(draft.vatRate)}
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            onCommit={(v) =>
              setDraft((d) => ({ ...d, vatRate: Number(v) || 0 }))
            }
          />
          <LabeledInput
            label={t("templates.unit")}
            value={draft.unit}
            onCommit={(v) => setDraft((d) => ({ ...d, unit: v.trim() }))}
          />
          <LabeledInput
            label={t("templates.currency")}
            value={draft.currency}
            autoCapitalize="characters"
            onCommit={(v) =>
              setDraft((d) => ({ ...d, currency: v.trim().toUpperCase() }))
            }
          />
        </div>
        <LabeledTextarea
          label={t("templates.note")}
          value={draft.note}
          rows={3}
          onCommit={(v) => setDraft((d) => ({ ...d, note: v }))}
        />
        <ToggleRow
          label={t("templates.roundTotal")}
          hint={t("editor.roundTotalHint")}
          checked={draft.roundTotal}
          onChange={(next) => setDraft((d) => ({ ...d, roundTotal: next }))}
        />
        <Section title={t("editor.sections")}>
          <p className="text-xs text-muted">{t("templates.layoutHint")}</p>
          <SectionList
            layout={draft.layout}
            region={region}
            onChange={(layout) => setDraft((d) => ({ ...d, layout }))}
          />
        </Section>
        <Section title={t("editor.look")}>
          <LookControls
            layout={draft.layout}
            onChange={(layout) => setDraft((d) => ({ ...d, layout }))}
          />
        </Section>
      </div>
    </Modal>
  );
}
