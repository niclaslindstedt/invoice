// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  Field,
  LabeledInput,
  SelectPicker,
  ToggleRow,
} from "@niclaslindstedt/oss-framework/components";

import { useLang, useT } from "./i18n/index.ts";
import { choiceLabel, fieldHint, fieldLabel } from "./labels.ts";
import {
  fieldAsked,
  fieldsFor,
  normalizeField,
  type Region,
  type RegionField,
} from "./regions/index.ts";
import type { Party } from "./types.ts";

// The form for what the company and a customer have in common: the name,
// the address, how to reach them, and the region's identifiers for that
// side. One form for both, so an organisation number is asked for the same
// way whoever it belongs to.
//
// The region's fields are drawn from its table: a `flag` is a toggle, a
// `choice` a picker, and everything else a text field with the keyboard the
// region asked for. A value the region cannot validate is marked, never
// refused — a form that will not take a number until it is perfect is a form
// nobody finishes. A field the region hangs off another (the amount of a fee
// that is not being charged) is left out until that one is set.
//
// A `number` is a text field too, deliberately: `<input type="number">`
// throws away a value with a comma in it, and a comma is how a Swedish
// keypad writes a decimal point. The region reads either mark and clamps the
// figure to its range when the field is committed.

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
  // A field the page never prints (`none`) is asked for with the party's
  // own details.
  const fields = fieldsFor(region, side).filter(
    (f) =>
      placements.includes(f.placement === "none" ? "party" : f.placement) &&
      fieldAsked(f, party.details),
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
      {fields.map((field) => {
        const label = fieldLabel(region, lang, field.id);
        const hint = fieldHint(region, lang, field.id);
        const commit = (v: string) =>
          setDetail(field.id, normalizeField(field, v));
        if (field.kind === "flag") {
          return (
            <ToggleRow
              key={field.id}
              label={label}
              hint={hint || undefined}
              checked={party.details[field.id] === "yes"}
              onChange={(next) => setDetail(field.id, next ? "yes" : "")}
            />
          );
        }
        const value = party.details[field.id] ?? "";
        return (
          <div key={field.id} className="flex flex-col gap-1">
            {field.kind === "choice" ? (
              <Field label={label}>
                <SelectPicker<string>
                  value={value}
                  options={[
                    { value: "", label: "—" },
                    ...(field.choices ?? []).map((v) => ({
                      value: v,
                      label: choiceLabel(region, lang, field.id, v),
                    })),
                  ]}
                  onChange={(v: string) => setDetail(field.id, v)}
                  ariaLabel={label}
                />
              </Field>
            ) : (
              <LabeledInput
                // The field keeps a draft of what was typed and seeds it once,
                // so a commit the region rewrote — a giro number given its
                // dash, a fee clamped to what the law allows — would otherwise
                // go on showing the raw text while the page prints the tidied
                // value. Keying on the stored value re-seeds the draft; the
                // field has already been left by then, so nothing is
                // interrupted.
                key={value}
                label={label}
                value={value}
                required={field.required}
                invalid={Boolean(
                  value &&
                  field.validate &&
                  !field.validate(normalizeField(field, value)),
                )}
                inputMode={field.inputMode}
                autoCapitalize={field.kind === "number" ? "none" : "characters"}
                onCommit={commit}
              />
            )}
            {hint && <p className="text-xs text-muted">{hint}</p>}
          </div>
        );
      })}
    </div>
  );
}
