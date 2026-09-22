// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type { ReactNode } from "react";

import { CogIcon } from "@niclaslindstedt/oss-framework/components";

import { NAV_ICONS, TABS, type NavTab, type Tab } from "./BottomNav.tsx";
import { AppMarkIcon } from "./icons.tsx";
import { useT } from "./i18n/index.ts";

// The bar across the top: the app's mark and name, the storage glyph when
// the document is kept somewhere besides this device, and the cog. On a
// desk the four destinations sit here too, in the bottom bar's order.

type Props = {
  active: Tab;
  onOpenSettings: () => void;
  /** The desk's tabs. On the phone the bottom bar carries them. */
  onSelect?: (tab: NavTab) => void;
  /** The storage glyph, when the document is kept somewhere. */
  syncSlot?: ReactNode;
};

export function TopBar({ active, onOpenSettings, onSelect, syncSlot }: Props) {
  const t = useT();
  return (
    <header className="app-header relative flex shrink-0 items-center justify-between gap-2 border-b border-line bg-surface-3 px-4 pb-3">
      <h1 className="app-wordmark flex min-w-0 items-center gap-2 text-accent">
        <AppMarkIcon className="h-6 w-6 shrink-0" />
        <span className="truncate">{t("app.name")}</span>
      </h1>

      {onSelect && (
        <nav
          aria-label={t("app.name")}
          className="absolute top-1/2 left-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1 lg:flex"
        >
          {TABS.map((tab) => {
            const Icon = NAV_ICONS[tab];
            const on = active === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => onSelect(tab)}
                aria-current={on ? "page" : undefined}
                className={`flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors ${
                  on
                    ? "bg-accent/15 text-fg-bright"
                    : "text-muted hover:bg-surface-2 hover:text-fg"
                }`}
              >
                <Icon
                  className={`h-4 w-4 ${on ? "text-accent" : "text-muted"}`}
                />
                {t(`nav.${tab}` as const)}
              </button>
            );
          })}
        </nav>
      )}

      <div className="flex min-w-0 shrink items-center gap-2">
        {syncSlot}
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label={t("nav.settings")}
          aria-current={active === "settings" ? "page" : undefined}
          title={t("nav.settings")}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-accent transition-colors ${
            active === "settings" ? "bg-accent/15" : "hover:bg-surface-2"
          }`}
        >
          <CogIcon className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
