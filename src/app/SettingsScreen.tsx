// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { useState } from "react";

import {
  Button,
  CloudIcon,
  ConfirmDialog,
  DatabaseIcon,
  GlobeIcon,
  InfoIcon,
  PaletteIcon,
  ScrollTextIcon,
  SegmentedControl,
  Section,
  ToggleRow,
} from "@niclaslindstedt/oss-framework/components";
import { LogViewer } from "@niclaslindstedt/oss-framework/logging";

import { downloadBackup, readBackupFile } from "./backup.ts";
import { logStore } from "./log.ts";
import { LANGS, setLanguage, useLang, useT, type Lang } from "./i18n/index.ts";
import { mergeDocs } from "./merge.ts";
import { serializeDoc } from "./migrations.ts";
import { emptyDoc } from "./types.ts";
import type { AppSettings, ThemeChoice } from "./useAppSettings.ts";
import type { DocStore } from "./useDocStore.ts";
import { type SyncBackendId, type SyncEngine } from "./useSyncEngine.ts";

// One scrolling page of settings: the look, the language, where the
// invoices are kept, backup and restore, the developer knobs, and the build.
// The company — the setting that is really *data* — has a screen of its own.

type Props = {
  settings: AppSettings;
  update: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  store: DocStore;
  sync: SyncEngine;
  providerName: (id: SyncBackendId) => string;
  onNotice: (message: string) => void;
};

export function SettingsScreen({
  settings,
  update,
  store,
  sync,
  providerName,
  onNotice,
}: Props) {
  const t = useT();
  const lang = useLang();
  const [confirmClear, setConfirmClear] = useState(false);
  const [busy, setBusy] = useState(false);

  const importBackup = async (file: File) => {
    try {
      const doc = await readBackupFile(file);
      const count = (d: typeof doc) =>
        Object.keys(d.customers).length +
        Object.keys(d.invoices).length +
        Object.keys(d.templates).length;
      const merged = mergeDocs(store.data, doc);
      store.replaceAll(merged);
      onNotice(t("settings.imported", { count: String(count(doc)) }));
    } catch {
      onNotice(t("settings.importFailed"));
    }
  };

  const languageLabel = (l: Lang) =>
    l === "sv" ? t("settings.swedish") : t("settings.english");

  return (
    <div className="flex flex-col gap-3 px-3 py-3">
      <Section
        title={t("settings.appearance")}
        icon={<PaletteIcon className="h-3.5 w-3.5" />}
      >
        <SegmentedControl<ThemeChoice>
          value={settings.theme}
          options={[
            { value: "light", label: t("settings.themeLight") },
            { value: "dark", label: t("settings.themeDark") },
            { value: "system", label: t("settings.themeSystem") },
          ]}
          onChange={(theme) => update("theme", theme)}
          ariaLabel={t("settings.theme")}
          fullWidth
        />
      </Section>

      <Section
        title={t("settings.language")}
        icon={<GlobeIcon className="h-3.5 w-3.5" />}
      >
        <SegmentedControl<Lang>
          value={lang}
          options={LANGS.map((l) => ({ value: l, label: languageLabel(l) }))}
          onChange={(next) => setLanguage(next)}
          ariaLabel={t("settings.language")}
          fullWidth
        />
        <p className="text-xs text-muted">{t("settings.languageHint")}</p>
      </Section>

      <Section
        title={t("settings.storage")}
        icon={<CloudIcon className="h-3.5 w-3.5" />}
      >
        <p className="text-xs text-muted">
          {sync.available.includes("folder")
            ? t("settings.storageHint")
            : t("settings.storageHintNoFolder")}
        </p>
        <SegmentedControl<SyncBackendId>
          value={sync.backend}
          options={sync.available.map((id) => ({
            value: id,
            label: providerName(id),
          }))}
          onChange={(next) => {
            if (next === sync.backend) return;
            if (next === "local") {
              sync.disconnect();
              return;
            }
            setBusy(true);
            void sync
              .connect(next)
              .catch((err: unknown) =>
                onNotice(err instanceof Error ? err.message : String(err)),
              )
              .finally(() => setBusy(false));
          }}
          ariaLabel={t("settings.backend")}
          fullWidth
        />
        <p className="text-xs text-muted">
          {sync.connected
            ? t("settings.connected", { name: providerName(sync.backend) })
            : t("settings.localOnly")}
          {sync.location.path ? ` · ${sync.location.path}` : ""}
        </p>
        {sync.backend !== "local" && (
          <div className="flex flex-wrap gap-2">
            {sync.connected ? (
              <>
                <Button onClick={sync.saveNow} disabled={busy || !sync.dirty}>
                  {t("settings.saveNow")}
                </Button>
                <Button onClick={() => void sync.reload()} disabled={busy}>
                  {t("settings.reload")}
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  void sync
                    .reconnect()
                    .catch((err: unknown) =>
                      onNotice(
                        err instanceof Error ? err.message : String(err),
                      ),
                    )
                    .finally(() => setBusy(false));
                }}
              >
                {t("settings.reconnect")}
              </Button>
            )}
            <Button variant="danger" onClick={sync.disconnect}>
              {t("settings.disconnect")}
            </Button>
          </div>
        )}
      </Section>

      <Section
        title={t("settings.data")}
        icon={<DatabaseIcon className="h-3.5 w-3.5" />}
      >
        <div className="flex flex-col gap-1">
          <Button onClick={() => downloadBackup(store.data)}>
            {t("settings.export")}
          </Button>
          <p className="text-xs text-muted">{t("settings.exportHint")}</p>
        </div>
        <div className="flex flex-col gap-1">
          <label className="inline-flex">
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(e) => {
                const input = e.currentTarget;
                const file = input.files?.[0];
                if (file) void importBackup(file);
                input.value = "";
              }}
            />
            <span className="cursor-pointer rounded-md border border-line px-3 py-1.5 text-sm text-fg hover:bg-surface-2">
              {t("settings.import")}
            </span>
          </label>
          <p className="text-xs text-muted">{t("settings.importHint")}</p>
        </div>
        <div className="flex flex-col gap-1">
          <Button variant="danger" onClick={() => setConfirmClear(true)}>
            {t("settings.deleteAll")}
          </Button>
          <p className="text-xs text-muted">{t("settings.deleteAllHint")}</p>
        </div>
      </Section>

      <Section
        title={t("settings.developer")}
        icon={<ScrollTextIcon className="h-3.5 w-3.5" />}
      >
        <ToggleRow
          label={t("settings.devMode")}
          hint={t("settings.devModeHint")}
          checked={settings.devMode}
          onChange={(next) => update("devMode", next)}
        />
        {settings.devMode && (
          <>
            <ToggleRow
              label={t("settings.captureLogs")}
              hint={t("settings.captureLogsHint")}
              checked={settings.captureLogs}
              onChange={(next) => {
                update("captureLogs", next);
                logStore.setCaptureEnabled(next);
              }}
            />
            <p className="text-xs text-muted">
              {t("settings.documentSize")}:{" "}
              {serializeDoc(store.data).length.toLocaleString()} bytes
            </p>
            <div className="max-h-64 overflow-auto rounded-md border border-line p-2">
              <LogViewer store={logStore} />
            </div>
          </>
        )}
      </Section>

      <Section
        title={t("settings.about")}
        icon={<InfoIcon className="h-3.5 w-3.5" />}
      >
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-muted">{t("settings.version")}</dt>
          <dd className="text-fg">{__APP_VERSION__}</dd>
          <dt className="text-muted">{t("settings.build")}</dt>
          <dd className="text-fg">{__BUILD_LABEL__}</dd>
        </dl>
        <p className="text-xs leading-snug text-muted">
          {t("settings.privacy")}
        </p>
      </Section>

      <ConfirmDialog
        open={confirmClear}
        title={t("settings.deleteAllConfirm")}
        description={t("settings.deleteAllHint")}
        confirmLabel={t("common.delete")}
        tone="danger"
        labels={{ cancel: t("common.cancel"), close: t("common.close") }}
        onConfirm={() => {
          store.replaceAll(emptyDoc());
          setConfirmClear(false);
          onNotice(t("settings.deleted"));
        }}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  );
}
