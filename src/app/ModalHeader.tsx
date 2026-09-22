// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type { ReactNode } from "react";

import { Button } from "@niclaslindstedt/oss-framework/components";

import { useT } from "./i18n/index.ts";

// The top of every modal that is saved or abandoned: cancel on the left, the
// title between them, save on the right. At the top because the bottom of
// the screen belongs to the nav; a sibling of the modal's scrolling body so
// it stays put over a long form. Escape is the framework's `Modal`'s.

type Props = {
  /** The id the modal's `labelledBy` points at. */
  titleId: string;
  title: string;
  onCancel: () => void;
  onSave?: () => void;
  saveDisabled?: boolean;
  saveLabel?: string;
  /** Something beside the save — a history button, say. */
  extra?: ReactNode;
};

export function ModalHeader({
  titleId,
  title,
  onCancel,
  onSave,
  saveDisabled = false,
  saveLabel,
  extra,
}: Props) {
  const t = useT();
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-line bg-surface-3 px-2 py-2">
      <Button className="min-h-10 shrink-0" onClick={onCancel}>
        {onSave ? t("common.cancel") : t("common.close")}
      </Button>
      <h2
        id={titleId}
        className="min-w-0 flex-1 truncate text-center text-sm font-bold text-fg-bright"
      >
        {title}
      </h2>
      {extra}
      {onSave && (
        <Button
          variant="primary"
          className="min-h-10 shrink-0 font-bold"
          disabled={saveDisabled}
          onClick={onSave}
        >
          {saveLabel ?? t("common.save")}
        </Button>
      )}
    </div>
  );
}
