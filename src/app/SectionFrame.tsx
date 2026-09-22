// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type { ReactNode } from "react";

import {
  GripIcon,
  ReorderButtons,
} from "@niclaslindstedt/oss-framework/components";

import { EyeOffIcon } from "./icons.tsx";
import { useT } from "./i18n/index.ts";
import type { DropSide } from "./useDragReorder.ts";

// The frame a section wears in the edit mode: a handle to drag it by, the
// arrows to move it a place at a time, and the eye that hides it. The chrome
// sits on a row of its own above the section rather than over it, so
// nothing on the page is covered while it is being edited; the edit mode
// never prints, so the row costs the printout nothing.

type Props = {
  name: string;
  index: number;
  count: number;
  required: boolean;
  dragging: boolean;
  dropSide: DropSide | null;
  register: (el: HTMLElement | null) => void;
  onHandleDown: (e: {
    pointerId: number;
    currentTarget: EventTarget | null;
    preventDefault: () => void;
    button?: number;
  }) => void;
  onMove: (to: number) => void;
  onHide: () => void;
  children: ReactNode;
};

export function SectionFrame({
  name,
  index,
  count,
  required,
  dragging,
  dropSide,
  register,
  onHandleDown,
  onMove,
  onHide,
  children,
}: Props) {
  const t = useT();
  return (
    <div
      ref={register}
      className="section-frame"
      data-dragging={dragging ? "true" : undefined}
      data-drop={dropSide ?? undefined}
    >
      <div
        data-section-chrome
        className="absolute -top-3 right-0 z-10 flex items-center gap-1 rounded-md border border-line bg-surface px-1 py-0.5 text-fg shadow-sm"
        style={{
          fontFamily: "var(--app-font-family, system-ui, sans-serif)",
          fontSize: "0.75rem",
        }}
      >
        <button
          type="button"
          aria-label={t("editor.dragHandle", { section: name })}
          title={t("editor.dragHandle", { section: name })}
          onPointerDown={onHandleDown}
          className="flex h-7 w-7 cursor-grab touch-none items-center justify-center rounded text-muted hover:bg-surface-2 hover:text-fg active:cursor-grabbing"
        >
          <GripIcon className="h-4 w-4" />
        </button>
        <span className="px-1 text-xs font-medium text-muted">{name}</span>
        <ReorderButtons
          upLabel={t("common.moveUp")}
          downLabel={t("common.moveDown")}
          canMoveUp={index > 0}
          canMoveDown={index < count - 1}
          onMoveUp={() => onMove(index - 1)}
          onMoveDown={() => onMove(index + 1)}
        />
        {required ? (
          <span className="px-1 text-xs text-muted">
            {t("editor.required")}
          </span>
        ) : (
          <button
            type="button"
            aria-label={t("editor.hide", { section: name })}
            title={t("editor.hide", { section: name })}
            onClick={onHide}
            className="flex h-7 w-7 items-center justify-center rounded text-muted hover:bg-surface-2 hover:text-fg"
          >
            <EyeOffIcon className="h-4 w-4" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
