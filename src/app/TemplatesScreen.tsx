// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { useState } from "react";

import {
  Badge,
  Button,
  ConfirmDialog,
  IconButton,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@niclaslindstedt/oss-framework/components";

import { TemplateIcon } from "./icons.tsx";
import { useT } from "./i18n/index.ts";
import { liveContext } from "./ids.ts";
import { DEFAULT_LAYOUT } from "./layout.ts";
import type { Region } from "./regions/index.ts";
import { TemplateEditModal } from "./TemplateEditModal.tsx";
import { templateList, type Template } from "./types.ts";
import type { DocStore } from "./useDocStore.ts";

// What a new invoice starts from: a template's look, its section order, its
// terms and its defaults. One card per template; the one marked default is
// what "New invoice" seeds from.

type Props = {
  store: DocStore;
  region: Region;
  defaultTemplateId: string | null;
  onSetDefault: (id: string | null) => void;
  onNotice: (message: string) => void;
};

export function newTemplate(now: string, id: string, region: Region): Template {
  return {
    id,
    name: "",
    layout: DEFAULT_LAYOUT(),
    dueDays: region.defaultDueDays,
    vatRate: region.vatRates[0] ?? 0,
    unit: "hour",
    currency: region.currency,
    note: "",
    roundTotal: region.roundTotal,
    updatedAt: now,
  };
}

export function TemplatesScreen({
  store,
  region,
  defaultTemplateId,
  onSetDefault,
  onNotice,
}: Props) {
  const t = useT();
  const [editing, setEditing] = useState<{
    template: Template;
    isNew: boolean;
  } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Template | null>(null);
  const templates = templateList(store.data);
  const effectiveDefault =
    defaultTemplateId && store.data.templates[defaultTemplateId]
      ? defaultTemplateId
      : (templates[0]?.id ?? null);

  return (
    <div className="flex flex-col gap-3 px-3 py-3">
      <div className="flex justify-end">
        <Button
          variant="primary"
          onClick={() => {
            const ctx = liveContext();
            setEditing({
              template: newTemplate(ctx.now, ctx.id(), region),
              isNew: true,
            });
          }}
        >
          <span className="inline-flex items-center gap-1.5">
            <PlusIcon className="h-4 w-4" />
            {t("templates.new")}
          </span>
        </Button>
      </div>

      {templates.length === 0 && (
        <div className="rounded-2xl border border-line bg-surface-3 p-6 text-center">
          <TemplateIcon className="mx-auto h-8 w-8 text-muted" />
          <p className="mt-3 text-sm text-muted">{t("templates.empty")}</p>
        </div>
      )}

      {templates.map((tpl) => {
        const isDefault = tpl.id === effectiveDefault;
        return (
          <div
            key={tpl.id}
            className={`rounded-2xl border p-4 ${
              isDefault
                ? "border-accent/40 bg-accent/10"
                : "border-line bg-surface-3"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h2 className="min-w-0 truncate text-lg font-bold text-fg-bright">
                    {tpl.name || t("common.untitled")}
                  </h2>
                  {isDefault && (
                    <Badge tone="accent">{t("templates.default")}</Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted">
                  {t("templates.summary", {
                    dueDays: String(tpl.dueDays),
                    vatRate: String(tpl.vatRate),
                    typeface: t(
                      `templates.typeface.${tpl.layout.typeface}` as "templates.typeface.sans",
                    ),
                  })}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <IconButton
                  label={t("common.edit")}
                  onClick={() => setEditing({ template: tpl, isNew: false })}
                >
                  <PencilIcon className="h-4 w-4" />
                </IconButton>
                <IconButton
                  label={t("templates.delete")}
                  className="hover:border-danger/50 hover:text-danger!"
                  onClick={() => setConfirmDelete(tpl)}
                >
                  <TrashIcon className="h-4 w-4" />
                </IconButton>
              </div>
            </div>
            {!isDefault && (
              <div className="mt-3">
                <Button variant="primary" onClick={() => onSetDefault(tpl.id)}>
                  {t("templates.makeDefault")}
                </Button>
              </div>
            )}
          </div>
        );
      })}

      {editing && (
        <TemplateEditModal
          template={editing.template}
          region={region}
          isNew={editing.isNew}
          onSave={(tpl) => {
            store.saveTemplate({ ...tpl, updatedAt: new Date().toISOString() });
            setEditing(null);
          }}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        title={t("templates.deleteConfirm", {
          name: confirmDelete?.name ?? "",
        })}
        description={t("templates.deleteHint")}
        confirmLabel={t("common.delete")}
        tone="danger"
        labels={{ cancel: t("common.cancel"), close: t("common.close") }}
        onConfirm={() => {
          if (confirmDelete) {
            store.deleteTemplate(confirmDelete.id);
            if (confirmDelete.id === defaultTemplateId) onSetDefault(null);
          }
          setConfirmDelete(null);
          onNotice(t("common.done"));
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
