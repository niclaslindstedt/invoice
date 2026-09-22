// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { useEffect, useState } from "react";

import {
  Button,
  LabeledInput,
  Section,
  SelectPicker,
  BuildingIcon,
  ShieldIcon,
} from "@niclaslindstedt/oss-framework/components";

import { HistoryModal } from "./HistoryModal.tsx";
import { HistoryIcon } from "./icons.tsx";
import { useLang, useT } from "./i18n/index.ts";
import { noticeLabel, regionName } from "./labels.ts";
import { PartyForm } from "./PartyForm.tsx";
import {
  DEFAULT_REGION,
  REGION_IDS,
  regionOf,
  type RegionId,
} from "./regions/index.ts";
import { sameRecord } from "./revisions.ts";
import {
  COMPANY_KEY,
  emptyParty,
  partyOf,
  type Company,
  type Party,
} from "./types.ts";
import type { DocStore } from "./useDocStore.ts";

// Who the invoices are from. One form, saved with a button rather than on
// every keystroke: every save that changed something is a revision, and a
// company typed in one letter at a time would be a history of typing.

type Props = {
  store: DocStore;
  onNotice: (message: string) => void;
};

export function emptyCompany(now: string): Company {
  return {
    ...emptyParty(),
    region: DEFAULT_REGION,
    firstInvoiceNumber: 1,
    updatedAt: now,
  };
}

export function CompanyScreen({ store, onNotice }: Props) {
  const t = useT();
  const lang = useLang();
  const saved = store.data.company;
  const [draft, setDraft] = useState<Company>(
    () => saved ?? emptyCompany(new Date().toISOString()),
  );
  const [history, setHistory] = useState(false);
  // A restore from the history, or a merge from another device, replaces the
  // saved company under the form; the draft follows unless it has been
  // touched, so a half-finished edit is never yanked away.
  const dirty = saved ? !sameRecord(draft, saved) : true;
  useEffect(() => {
    if (saved && !dirty) setDraft(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved]);

  const region = regionOf(draft.region);
  const valid = draft.name.trim().length > 0;
  const setParty = (party: Party) => setDraft((d) => ({ ...d, ...party }));

  const save = () => {
    store.saveCompany({
      ...draft,
      name: draft.name.trim(),
      updatedAt: new Date().toISOString(),
    });
    onNotice(t("company.saved"));
  };

  return (
    <div className="flex flex-col gap-3 px-3 py-3">
      <p className="px-1 text-sm text-muted">{t("company.intro")}</p>

      <Section
        title={t("company.region")}
        icon={<ShieldIcon className="h-3.5 w-3.5" />}
      >
        <SelectPicker<RegionId>
          value={draft.region}
          options={REGION_IDS.map((id) => ({
            value: id,
            label: regionName(regionOf(id), lang),
          }))}
          onChange={(next) => setDraft((d) => ({ ...d, region: next }))}
          ariaLabel={t("company.region")}
        />
        <p className="text-xs text-muted">{t("company.regionHint")}</p>
      </Section>

      <Section
        title={t("company.title")}
        icon={<BuildingIcon className="h-3.5 w-3.5" />}
      >
        <PartyForm
          party={draft}
          side="seller"
          region={region}
          placements={["party"]}
          onChange={setParty}
        />
      </Section>

      <Section title={t("company.payment")}>
        <PartyForm
          party={draft}
          side="seller"
          region={region}
          placements={["payment"]}
          onChange={setParty}
          fieldsOnly
        />
        <div className="flex flex-col gap-1">
          <LabeledInput
            label={t("company.firstInvoiceNumber")}
            value={String(draft.firstInvoiceNumber)}
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            onCommit={(v) =>
              setDraft((d) => ({
                ...d,
                firstInvoiceNumber: Math.max(1, Math.floor(Number(v) || 1)),
              }))
            }
          />
          <p className="text-xs text-muted">
            {t("company.firstInvoiceNumberHint")}
          </p>
        </div>
      </Section>

      <Section title={t("company.notices")}>
        <ul className="flex flex-col gap-1 text-sm text-fg">
          {region.notices(draft).map((n) => (
            <li key={n.key}>{noticeLabel(region, lang, n, draft.details)}</li>
          ))}
        </ul>
      </Section>

      <div className="flex items-center justify-between gap-2">
        <Button onClick={() => setHistory(true)} disabled={!saved}>
          <span className="inline-flex items-center gap-1.5">
            <HistoryIcon className="h-4 w-4" />
            {t("common.history")}
          </span>
        </Button>
        <Button variant="primary" onClick={save} disabled={!valid || !dirty}>
          {t("common.save")}
        </Button>
      </div>

      {history && saved && (
        <HistoryModal
          name={saved.name}
          history={store.data.revisions[COMPANY_KEY] ?? []}
          region={region}
          onRestore={(party) => {
            const next = {
              ...saved,
              ...partyOf(party),
              updatedAt: new Date().toISOString(),
            };
            store.saveCompany(next);
            setDraft(next);
            onNotice(t("history.restored"));
          }}
          onClose={() => setHistory(false)}
        />
      )}
    </div>
  );
}
