// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { useCallback, useEffect, useRef, useState } from "react";

// Dragging a block to a new place in a vertical list, with the pointer.
//
// A handle is pressed, the pointer moves, and whichever block it is over is
// asked which half it is in: above the middle means "before", below means
// "after". Releasing moves the pressed block there. The hook owns the
// gesture and the arithmetic; the caller draws the blocks and says what a
// move means (`onMove(from, to)`, in the indices of the list as drawn).
//
// Pointer events rather than HTML drag-and-drop, because the native API
// gives a phone nothing and a mouse a ghost image of the whole section; and
// `setPointerCapture` on the handle, so the move keeps reporting when the
// finger leaves the handle — which it does at once.

export type DropSide = "before" | "after";

export type DragState = {
  from: number;
  over: number | null;
  side: DropSide;
};

export function useDragReorder(onMove: (from: number, to: number) => void) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const blocks = useRef(new Map<number, HTMLElement>());
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  /** Give the hook the element a block is drawn in, so the pointer can be
   *  read against it. */
  const register = useCallback((index: number, el: HTMLElement | null) => {
    if (el) blocks.current.set(index, el);
    else blocks.current.delete(index);
  }, []);

  /** What a block is pressed with: the handle's `onPointerDown`. */
  const start = useCallback(
    (index: number) =>
      (
        e:
          | PointerEvent
          | {
              pointerId: number;
              currentTarget: EventTarget | null;
              preventDefault: () => void;
              button?: number;
            },
      ) => {
        if (e.button !== undefined && e.button !== 0) return;
        e.preventDefault();
        const target = e.currentTarget as HTMLElement | null;
        try {
          target?.setPointerCapture(e.pointerId);
        } catch {
          // Capture is a courtesy; the document listeners below still see the
          // move without it.
        }
        setDrag({ from: index, over: null, side: "after" });
      },
    [],
  );

  useEffect(() => {
    if (!drag) return;
    const onPointerMove = (e: PointerEvent) => {
      let over: number | null = null;
      let side: DropSide = "after";
      for (const [index, el] of blocks.current) {
        const rect = el.getBoundingClientRect();
        if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
          over = index;
          side = e.clientY < rect.top + rect.height / 2 ? "before" : "after";
          break;
        }
      }
      setDrag((d) => (d ? { ...d, over, side } : d));
    };
    const onPointerUp = () => {
      setDrag((d) => {
        if (d && d.over !== null) {
          // Dropping on the block's own edges is no move at all.
          let to = d.side === "before" ? d.over : d.over + 1;
          if (to > d.from) to -= 1;
          if (to !== d.from) onMoveRef.current(d.from, to);
        }
        return null;
      });
    };
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", onPointerUp);
    return () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", onPointerUp);
    };
  }, [drag]);

  /** Where the drop line is drawn for a block, if anywhere. The block being
   *  dragged never shows one on itself. */
  const dropSide = useCallback(
    (index: number): DropSide | null => {
      if (!drag || drag.over !== index || drag.from === index) return null;
      if (drag.side === "before" && drag.from === index - 1) return null;
      if (drag.side === "after" && drag.from === index + 1) return null;
      return drag.side;
    },
    [drag],
  );

  return { drag, register, start, dropSide };
}
