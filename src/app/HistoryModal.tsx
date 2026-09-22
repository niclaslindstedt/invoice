// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { useId, useState } from "react";

import { Button, Modal } from "@niclaslindstedt/oss-framework/components";

import { useLang, useT } from "./i18n/index.ts";
import { fieldLabel, formatMoment } from "./labels.ts";
import type { Region } from "./regions/index.ts";
import { changedPaths, type Revision } from "./revisions.ts";
import { ModalHeader } from "./ModalHeader.tsx";
import type { Party } from "./types.ts";

// A record's history: every version it has been, newest first, with what
// changed between one and the one before it. Pick a version and it is laid
// out in full; restore it and it becomes the current one — as a new
// revision, so the history goes on being the whole story.

type Props = {
  name: string;
  history: Revision<Party>[];
  region: Region;
  onRestore: (party: Party) => void;
  onClose: () => void;
};

export function HistoryModal({
  name,
  history,
  region,
  onRestore,
  onClose,
}: Props) {
  const t = useT();
  const lang = useLang();
  const titleId = useId();
  const newestFirst = [...history].reverse();
  const [picked, setPicked] = useState<number>(0);
  const chosen = newestFirst[picked] ?? null;

  const fieldName = (path: string): string => {
    if (path.startsWith("details.")) {
      return fieldLabel(region, lang, path.slice("details.".length));
    }
    return t(`history.fields.${path}` as "history.fields.name");
  };

  return (
    <Modal
      open
      onClose={onClose}
      labelledBy={titleId}
      closeLabel={t("common.close")}
    >
      <ModalHeader
        titleId={titleId}
        title={t("history.title", { name })}
        onCancel={onClose}
      />
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        <p className="text-xs text-muted">{t("history.intro")}</p>
        {newestFirst.length === 0 && (
          <p className="text-sm text-muted">{t("history.empty")}</p>
        )}
        <ol className="flex flex-col gap-1">
          {newestFirst.map((rev, i) => {
            const previous = newestFirst[i + 1];
            const changed = previous
              ? changedPaths(previous.data, rev.data).map(fieldName)
              : [];
            const on = i === picked;
            return (
              <li key={rev.at}>
                <button
                  type="button"
                  onClick={() => setPicked(i)}
                  aria-pressed={on}
                  className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                    on
                      ? "border-accent bg-accent/10"
                      : "border-line bg-surface-2"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-fg-bright">
                      {formatMoment(lang, rev.at)}
                    </span>
                    {i === 0 && (
                      <span className="text-xs text-accent">
                        {t("history.current")}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted">
                    {previous
                      ? t("history.changed", {
                          fields: changed.join(", ") || "—",
                        })
                      : t("history.first")}
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
        {chosen && (
          <div className="rounded-md border border-line bg-surface-3 p-3 text-sm">
            <PartySummary party={chosen.data} region={region} />
            {picked > 0 && (
              <div className="mt-3">
                <Button
                  variant="primary"
                  onClick={() => {
                    onRestore(chosen.data);
                    onClose();
                  }}
                >
                  {t("history.restore")}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

/** A party laid out in full, the way the page prints it. */
export function PartySummary({
  party,
  region,
}: {
  party: Party;
  region: Region;
}) {
  const lang = useLang();
  const lines = [
    party.name,
    party.address.street,
    [party.address.zip, party.address.city].filter(Boolean).join(" "),
    party.address.country,
    party.reference,
    party.email,
    party.phone,
    party.website,
  ].filter(Boolean);
  return (
    <div className="flex flex-col gap-0.5">
      {lines.map((line, i) => (
        <div
          key={i}
          className={i === 0 ? "font-semibold text-fg-bright" : "text-fg"}
        >
          {line}
        </div>
      ))}
      {Object.entries(party.details).map(([id, value]) => (
        <div key={id} className="text-muted">
          {fieldLabel(region, lang, id)}: {value === "yes" ? "✓" : value}
        </div>
      ))}
    </div>
  );
}
