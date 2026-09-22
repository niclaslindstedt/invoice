// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  SpinnerIcon,
  ToastViewport,
  createToastStore,
} from "@niclaslindstedt/oss-framework/components";
import {
  useMediaQuery,
  useSwipeNav,
} from "@niclaslindstedt/oss-framework/hooks";
import { LogViewer } from "@niclaslindstedt/oss-framework/logging";
import { UpdateToast, usePwaUpdate } from "@niclaslindstedt/oss-framework/pwa";
import {
  SyncDetailsModal,
  SyncStatus,
} from "@niclaslindstedt/oss-framework/sync";
import { useApplyTheme } from "@niclaslindstedt/oss-framework/theme";

import {
  BottomNav,
  isNavTab,
  screenEnter,
  TABS,
  type NavTab,
  type ScreenEnter,
  type Tab,
} from "./app/BottomNav.tsx";
import { CompanyScreen } from "./app/CompanyScreen.tsx";
import { CustomersScreen } from "./app/CustomersScreen.tsx";
import { useT } from "./app/i18n/index.ts";
import { InvoiceEditor } from "./app/InvoiceEditor.tsx";
import { InvoicesScreen } from "./app/InvoicesScreen.tsx";
import { appearanceFor } from "./app/look.ts";
import { logStore } from "./app/log.ts";
import { cacheIdForBase } from "./app/pwa.ts";
import { DEFAULT_REGION, regionOf } from "./app/regions/index.ts";
import { SettingsScreen } from "./app/SettingsScreen.tsx";
import { TemplatesScreen } from "./app/TemplatesScreen.tsx";
import { TopBar } from "./app/TopBar.tsx";
import { useAppSettings } from "./app/useAppSettings.ts";
import { useDocStore } from "./app/useDocStore.ts";
import { useSyncEngine, type SyncBackendId } from "./app/useSyncEngine.ts";
import { status } from "./output.ts";

// A local-first invoicing app built from the framework's shared surface. The
// app owns the document store, the invoice arithmetic, the region layer and
// the five screens; the framework supplies the theme engine, the storage
// adapters behind the folder and Dropbox backends, the form primitives, the
// bottom bar, and the PWA update lifecycle.
//
// Everything hangs off one document in IndexedDB. There is no server: a
// folder or Dropbox, when connected, holds a copy of that same document.

const toasts = createToastStore();

const DESK_QUERY = "(min-width: 64rem)";

export function App() {
  const t = useT();
  const { settings, update } = useAppSettings();
  useApplyTheme(useMemo(() => appearanceFor(settings.theme), [settings.theme]));

  const store = useDocStore();
  const sync = useSyncEngine(store);
  const region = regionOf(store.data.company?.region ?? DEFAULT_REGION);

  const desk = useMediaQuery(DESK_QUERY);
  const [tab, setTab] = useState<Tab>("invoices");
  const [home, setHome] = useState<NavTab>("invoices");
  const [enter, setEnter] = useState<ScreenEnter>("none");
  // The invoice open in the editor, over the Invoices tab.
  const [openInvoice, setOpenInvoice] = useState<string | null>(null);
  const [openNewCustomer, setOpenNewCustomer] = useState(false);

  const show = useCallback(
    (next: Tab) => {
      setEnter(screenEnter(tab, next));
      if (isNavTab(next)) setHome(next);
      setTab(next);
      if (next !== "invoices") setOpenInvoice(null);
    },
    [tab],
  );
  const toggleSettings = useCallback(() => {
    const target: Tab = tab === "settings" ? home : "settings";
    setEnter(screenEnter(tab, target));
    setTab(target);
  }, [tab, home]);

  // A swipe moves one tab along the bar and stops at its ends; from Settings
  // it goes back to the tab it was opened from. Not while an invoice is
  // open: the page is scrolled sideways on a phone.
  const main = useRef<HTMLElement>(null);
  const swipe = useCallback(
    (direction: 1 | -1) => {
      if (!isNavTab(tab)) {
        setEnter(screenEnter(tab, home));
        setTab(home);
        return;
      }
      const next = TABS[TABS.indexOf(tab) + direction];
      if (next !== undefined) show(next);
    },
    [tab, home, show],
  );
  useSwipeNav(main, swipe, { enabled: !desk && openInvoice === null });

  const [syncDetailsOpen, setSyncDetailsOpen] = useState(false);
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    logStore.setCaptureEnabled(settings.captureLogs);
  }, [settings.captureLogs]);

  const notice = useCallback((message: string) => {
    toasts.clear();
    toasts.push({ message, kind: "success", durationMs: 3000 });
  }, []);

  useEffect(() => {
    if (store.writeFailures === 0) return;
    toasts.clear();
    toasts.push({
      message: t("settings.importFailed"),
      kind: "danger",
      durationMs: 8000,
    });
  }, [store.writeFailures, t]);

  const pwa = usePwaUpdate({
    base: import.meta.env.BASE_URL,
    cacheId: cacheIdForBase(import.meta.env.BASE_URL),
    enabled: !import.meta.env.DEV,
  });
  useEffect(() => {
    if (pwa.needRefresh) status(`Update ready: ${pwa.incomingVersion ?? "?"}`);
  }, [pwa.needRefresh, pwa.incomingVersion]);

  const providerName = useCallback(
    (id: SyncBackendId) => t(`sync.provider.${id}` as "sync.provider.local"),
    [t],
  );

  const screen = !store.loaded ? (
    <div className="flex flex-1 items-center justify-center gap-3 p-6 text-sm text-muted">
      <SpinnerIcon className="h-5 w-5 animate-spin text-accent" />
      {t("app.loading")}
    </div>
  ) : tab === "invoices" && openInvoice ? (
    <InvoiceEditor
      store={store}
      invoiceId={openInvoice}
      region={region}
      onBack={() => setOpenInvoice(null)}
      onOpen={setOpenInvoice}
      onNotice={notice}
    />
  ) : tab === "invoices" ? (
    <InvoicesScreen
      store={store}
      region={region}
      defaultTemplateId={settings.defaultTemplateId}
      onOpen={setOpenInvoice}
      onSetUpCompany={() => show("company")}
      onAddCustomer={() => {
        setOpenNewCustomer(true);
        show("customers");
      }}
    />
  ) : tab === "customers" ? (
    <CustomersScreen
      store={store}
      region={region}
      onNotice={notice}
      openNew={openNewCustomer}
      onOpenedNew={() => setOpenNewCustomer(false)}
    />
  ) : tab === "templates" ? (
    <TemplatesScreen
      store={store}
      region={region}
      defaultTemplateId={settings.defaultTemplateId}
      onSetDefault={(id) => update("defaultTemplateId", id)}
      onNotice={notice}
    />
  ) : tab === "company" ? (
    <CompanyScreen store={store} onNotice={notice} />
  ) : (
    <SettingsScreen
      settings={settings}
      update={update}
      store={store}
      sync={sync}
      providerName={providerName}
      onNotice={notice}
    />
  );

  return (
    <div className="flex h-full flex-col bg-page text-fg">
      <TopBar
        active={tab}
        onOpenSettings={toggleSettings}
        onSelect={desk ? show : undefined}
        syncSlot={
          sync.backend !== "local" ? (
            <SyncStatus
              providerName={providerName(sync.backend)}
              status={sync.status}
              dirty={sync.dirty}
              offline={sync.offline}
              onOpenDetails={() => setSyncDetailsOpen(true)}
              labels={{ syncedTo: (name) => t("sync.syncedTo", { name }) }}
            />
          ) : undefined
        }
      />

      <main
        ref={main}
        className="app-main relative min-h-0 flex-1 overflow-clip"
      >
        <div className="h-full overflow-y-auto overflow-x-hidden">
          <div
            key={`${tab}:${openInvoice ?? ""}`}
            data-enter={enter}
            className={`app-screen mx-auto flex min-h-full max-w-2xl flex-col ${
              desk || openInvoice ? "lg:max-w-4xl" : ""
            }`}
          >
            {screen}
          </div>
        </div>
      </main>

      <div className="app-update-slot relative z-[60]">
        {pwa.needRefresh && reloading ? (
          <div
            role="status"
            aria-live="polite"
            className="absolute inset-x-3 bottom-3 mx-auto flex max-w-md items-center gap-3 rounded-sm border border-line bg-surface px-3 py-2.5 text-fg shadow-md"
          >
            <SpinnerIcon className="h-5 w-5 animate-spin text-accent" />
            <span className="text-sm font-medium">{t("update.reload")}</span>
          </div>
        ) : (
          <UpdateToast
            needRefresh={pwa.needRefresh}
            incomingVersion={pwa.incomingVersion}
            onReload={() => {
              setReloading(true);
              pwa.reload();
            }}
            onDismiss={() => pwa.dismiss()}
            labels={{
              ready: t("update.available"),
              action: t("update.reload"),
              dismiss: t("common.close"),
            }}
          />
        )}
      </div>

      {!desk && <BottomNav active={tab} onSelect={show} />}

      <SyncDetailsModal
        open={syncDetailsOpen}
        providerName={providerName(sync.backend)}
        backendKind={sync.backend === "folder" ? "folder" : "cloud"}
        location={sync.location}
        status={sync.status}
        statusDetail={sync.statusDetail}
        dirty={sync.dirty}
        offline={sync.offline}
        onSaveNow={sync.saveNow}
        onReload={() => void sync.reload()}
        onReconnect={sync.reconnect}
        onCheckConnection={sync.checkConnection}
        logPanel={settings.devMode ? <LogViewer store={logStore} /> : undefined}
        onClose={() => setSyncDetailsOpen(false)}
      />

      <ToastViewport
        store={toasts}
        labels={{ dismiss: t("common.close") }}
        className="app-toasts pointer-events-none fixed inset-x-0 top-0 z-[70] flex flex-col items-center gap-2 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]"
      />
    </div>
  );
}
