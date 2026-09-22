// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Domain value → label, in one place: an invoice's status, a line's unit, a
// date as the reader's language prints it, and a region's own words — so a
// status is one word on the list, on the badge and in the history.

import {
  formatDayKey,
  type DayKey,
} from "@niclaslindstedt/oss-framework/calendar";

import type { Lang, TFn } from "./i18n/index.ts";
import { localeOf } from "./i18n/index.ts";
import type { Region, RegionIssue, RegionNotice } from "./regions/index.ts";
import type { InvoiceStatus } from "./types.ts";

export function statusLabel(t: TFn, status: InvoiceStatus): string {
  return t(`invoices.status.${status}` as "invoices.status.draft");
}

/** A line's unit as printed: the interchange words (`hour`, `day`, `piece`)
 *  go through the catalog; anything typed is printed as typed. */
export function unitLabel(t: TFn, unit: string): string {
  if (unit === "hour" || unit === "day" || unit === "piece") {
    return t(`units.${unit}` as "units.hour");
  }
  return unit;
}

/** A day key as a date in the language's shape. */
export function formatDate(
  lang: Lang,
  date: DayKey | null | undefined,
): string {
  if (!date) return "";
  return formatDayKey(
    date,
    { year: "numeric", month: "short", day: "numeric" },
    localeOf(lang),
  );
}

/** A moment as date and time. */
export function formatMoment(lang: Lang, iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(localeOf(lang), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

/** A region's label for one of its fields. */
export function fieldLabel(region: Region, lang: Lang, id: string): string {
  return region.strings[lang].fields[id] ?? id;
}

export function regionName(region: Region, lang: Lang): string {
  return region.strings[lang].name;
}

/** A region's issue, as a sentence. */
export function issueLabel(
  region: Region,
  lang: Lang,
  issue: RegionIssue,
): string {
  const template = region.strings[lang].issues[issue.key] ?? issue.key;
  return template.replace(
    "{field}",
    issue.field ? fieldLabel(region, lang, issue.field) : "",
  );
}

/** A region's notice, filled in from the seller's details. */
export function noticeLabel(
  region: Region,
  lang: Lang,
  notice: RegionNotice,
  details: Record<string, string>,
): string {
  const template = region.strings[lang].notices[notice.key] ?? notice.key;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => details[key] ?? "");
}
