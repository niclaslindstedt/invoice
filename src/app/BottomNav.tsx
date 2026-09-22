// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { useMemo, type ReactNode } from "react";

import {
  BottomNav as NavBar,
  BuildingIcon,
  PersonIcon,
  stepDirection,
} from "@niclaslindstedt/oss-framework/components";

import { InvoiceIcon, TemplateIcon } from "./icons.tsx";
import { useT } from "./i18n/index.ts";

// The app's navigation: four tabs pinned to the bottom of the screen on a
// phone, the same four as tabs on the top bar on a desk (`TopBar.tsx`).
// Settings is not a place you are but a thing you do, so it lives on the
// top bar's cog on both.
//
// The order is the order of the work: the invoices, who they are for, what
// they start from, and who they are from.

/** Every screen the shell can show. */
export type Tab =
  "invoices" | "customers" | "templates" | "company" | "settings";

/** The screens that are *destinations* — the ones the bottom bar carries and
 *  a swipe moves between. */
export type NavTab = "invoices" | "customers" | "templates" | "company";

export const TABS: NavTab[] = ["invoices", "customers", "templates", "company"];

export function isNavTab(tab: Tab): tab is NavTab {
  return (TABS as Tab[]).includes(tab);
}

export type ScreenEnter = "forward" | "back" | "none";

/** How a move from one screen to another should animate: in from the side
 *  the bar's order puts it on, or a fade for Settings, which is off the bar. */
export function screenEnter(from: Tab, to: Tab): ScreenEnter {
  return stepDirection(TABS, from as NavTab, to as NavTab);
}

export const NAV_ICONS: Record<
  NavTab,
  (props: { className?: string }) => ReactNode
> = {
  invoices: InvoiceIcon,
  customers: PersonIcon,
  templates: TemplateIcon,
  company: BuildingIcon,
};

export function BottomNav({
  active,
  onSelect,
}: {
  active: Tab;
  onSelect: (tab: NavTab) => void;
}) {
  const t = useT();
  const items = useMemo(
    () =>
      TABS.map((tab) => ({
        id: tab,
        label: t(`nav.${tab}` as const),
        icon: NAV_ICONS[tab],
      })),
    [t],
  );
  return (
    <NavBar
      items={items}
      active={active}
      onSelect={onSelect}
      label={t("app.name")}
      className="app-bottom-nav"
    />
  );
}
