// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  LabeledInput,
  ToggleRow,
} from "@niclaslindstedt/oss-framework/components";

import { useLang, useT } from "./i18n/index.ts";
import { fieldLabel } from "./labels.ts";
import { fieldsFor, type Region, type RegionField } from "./regions/index.ts";
import type { Party } from "./types.ts";

// The form for what the company and a customer have in common: the name,
// the address, how to reach them, and the region's identifiers for that
// side. One form for both, so an organisation number is asked for the same
// way whoever it belongs to.
//
// The region's fields are drawn from its table: a `flag` is a toggle, and
// everything else a text field with the keyboard the region asked for. A
// value the region cannot validate is marked, never refused — a form that
// will not take a number until it is perfect is a form nobody finishes.

type Props = {
  party: Party;
  /** Which of the region's fields to offer. */
  side: "seller" | "buyer";
  region: Region;
  /** Which of the region's placements to draw — `party` for the identifiers
   *  printed with the name, `payment` for the bank details. Both by default. */
  placements?: RegionField["placement"][];
  onChange: (party: Party) => void;
  /** Leave out the name, address and contact — for a form that only wants
   *  the region's fields. */
  fieldsOnly?: boolean;
};

export function PartyForm({
  party,
  side,
  region,
  placements = ["party", "payment"],
  onChange,
  fieldsOnly = false,
}: Props) {
  const t = useT();
  const lang = useLang();
  const set = <K extends keyof Party>(key: K, value: Party[K]) =>
    onChange({ ...party, [key]: value });
  const setAddress = (key: keyof Party["address"], value: string) =>
    onChange({ ...party, address: { ...party.address, [key]: value } });
  const setDetail = (id: string, value: string) => {
    const details = { ...party.details };
    if (value) details[id] = value;
    else delete details[id];
    onChange({ ...party, details });
  };
  const fields = fieldsFor(region, side).filter((f) =>
    placements.includes(f.placement),
  );

  return (
    <div className="flex flex-col gap-3">
      {!fieldsOnly && (
        <>
          <LabeledInput
            label={t("common.name")}
            value={party.name}
            required
            onCommit={(v) => set("name", v)}
            autoCapitalize="words"
          />
          <LabeledInput
            label={t("common.street")}
            value={party.address.street}
            onCommit={(v) => setAddress("street", v)}
            autoCapitalize="words"
          />
          <div className="grid grid-cols-[1fr_2fr] gap-2">
            <LabeledInput
              label={t("common.zip")}
              value={party.address.zip}
              onCommit={(v) => setAddress("zip", v)}
            />
            <LabeledInput
              label={t("common.city")}
              value={party.address.city}
              onCommit={(v) => setAddress("city", v)}
              autoCapitalize="words"
            />
          </div>
          <LabeledInput
            label={t("common.country")}
            value={party.address.country}
            onCommit={(v) => setAddress("country", v)}
            autoCapitalize="words"
          />
          <LabeledInput
            label={t("common.reference")}
            value={party.reference}
            onCommit={(v) => set("reference", v)}
            autoCapitalize="words"
          />
          <LabeledInput
            label={t("common.email")}
            value={party.email}
            type="email"
            inputMode="email"
            autoCapitalize="none"
            onCommit={(v) => set("email", v)}
          />
          <LabeledInput
            label={t("common.phone")}
            value={party.phone}
            type="tel"
            inputMode="tel"
            onCommit={(v) => set("phone", v)}
          />
          <LabeledInput
            label={t("common.website")}
            value={party.website}
            type="url"
            inputMode="url"
            autoCapitalize="none"
            onCommit={(v) => set("website", v)}
          />
        </>
      )}
      {fields.map((field) =>
        field.kind === "flag" ? (
          <ToggleRow
            key={field.id}
            label={fieldLabel(region, lang, field.id)}
            checked={party.details[field.id] === "yes"}
            onChange={(next) => setDetail(field.id, next ? "yes" : "")}
          />
        ) : (
          <LabeledInput
            key={field.id}
            label={fieldLabel(region, lang, field.id)}
            value={party.details[field.id] ?? ""}
            required={field.required}
            invalid={Boolean(
              party.details[field.id] &&
              field.validate &&
              !field.validate(
                (field.normalize ?? ((v: string) => v))(
                  party.details[field.id] ?? "",
                ),
              ),
            )}
            inputMode={field.inputMode}
            autoCapitalize="characters"
            onCommit={(v) =>
              setDetail(
                field.id,
                (field.normalize ?? ((x: string) => x.trim()))(v),
              )
            }
          />
        ),
      )}
    </div>
  );
}
