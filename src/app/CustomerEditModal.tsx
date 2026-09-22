// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { useId, useState } from "react";

import {
  IconButton,
  LabeledInput,
  LabeledTextarea,
  Modal,
  ToggleRow,
} from "@niclaslindstedt/oss-framework/components";

import { HistoryIcon } from "./icons.tsx";
import { useT } from "./i18n/index.ts";
import { ModalHeader } from "./ModalHeader.tsx";
import { PartyForm } from "./PartyForm.tsx";
import type { Region } from "./regions/index.ts";
import type { Customer, Party } from "./types.ts";

// The customer editor: the party form, a customer number, the price a
// dropped-in hour starts at, notes, and whether it is archived. Edited as a
// draft and saved whole, so a half-typed rename never reaches the document
// — and never becomes a revision.

type Props = {
  customer: Customer;
  region: Region;
  isNew: boolean;
  onSave: (customer: Customer) => void;
  onClose: () => void;
  onHistory?: () => void;
};

export function CustomerEditModal({
  customer,
  region,
  isNew,
  onSave,
  onClose,
  onHistory,
}: Props) {
  const t = useT();
  const titleId = useId();
  const [draft, setDraft] = useState<Customer>(customer);
  const valid = draft.name.trim().length > 0;
  const setParty = (party: Party) => setDraft((d) => ({ ...d, ...party }));

  return (
    <Modal
      open
      onClose={onClose}
      labelledBy={titleId}
      closeLabel={t("common.close")}
    >
      <ModalHeader
        titleId={titleId}
        title={isNew ? t("customers.new") : t("customers.editTitle")}
        onCancel={onClose}
        onSave={() => onSave({ ...draft, name: draft.name.trim() })}
        saveDisabled={!valid}
        extra={
          onHistory && !isNew ? (
            <IconButton label={t("common.history")} onClick={onHistory}>
              <HistoryIcon className="h-4 w-4" />
            </IconButton>
          ) : undefined
        }
      />
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        <PartyForm
          party={draft}
          side="buyer"
          region={region}
          onChange={setParty}
        />
        <LabeledInput
          label={t("customers.number")}
          value={draft.number}
          onCommit={(v) => setDraft((d) => ({ ...d, number: v.trim() }))}
        />
        <div className="flex flex-col gap-1">
          <LabeledInput
            label={t("customers.defaultUnitPrice")}
            value={draft.defaultUnitPrice ? String(draft.defaultUnitPrice) : ""}
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            onCommit={(v) =>
              setDraft((d) => ({
                ...d,
                defaultUnitPrice: Math.max(0, Number(v) || 0),
              }))
            }
          />
          <p className="text-xs text-muted">
            {t("customers.defaultUnitPriceHint")}
          </p>
        </div>
        <LabeledTextarea
          label={t("customers.notes")}
          value={draft.notes}
          rows={3}
          onCommit={(v) => setDraft((d) => ({ ...d, notes: v }))}
        />
        {!isNew && (
          <ToggleRow
            label={t("customers.archived")}
            checked={draft.archived}
            onChange={(next) => setDraft((d) => ({ ...d, archived: next }))}
          />
        )}
      </div>
    </Modal>
  );
}
