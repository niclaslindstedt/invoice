// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The app's i18n runtime, built once from the framework's `createI18n`
// factory over the app's own catalogs. English is bundled; Swedish is
// code-split and loaded on demand. The app owns the strings; the framework
// owns the machinery that loads, caches, resolves, and re-renders against
// them — including the first-paint gate `LanguageRoot` provides.
//
// A region brings its own words too (see `regions/`): a region's field
// labels and notices are read through `regionStrings`, keyed by the same
// `Lang`, so adding a language here means adding it to every region.

import { createI18n } from "@niclaslindstedt/oss-framework/i18n";

import { en, type Catalog } from "./en.ts";

export type Lang = "en" | "sv";
export type { Catalog };

export const LANGS: Lang[] = ["en", "sv"];

export const i18n = createI18n<Lang, Catalog>({
  fallbackLang: "en",
  fallbackCatalog: en,
  loaders: { sv: () => import("./sv.ts").then((m) => m.sv) },
  toBcp47: (lang) => (lang === "sv" ? "sv-SE" : "en-GB"),
  storageKey: "invoice:language",
  eventName: "invoice:language",
});

export const { LanguageRoot, useT, useLang, setLanguage, supportedLangs } =
  i18n;

/** The translate function `useT()` returns — a message key (optionally with
 *  interpolation params) to a resolved string. Handy where copy is composed
 *  outside a component. */
export type TFn = ReturnType<typeof useT>;

/** The BCP-47 tag figures and dates are formatted in for a language. */
export function localeOf(lang: Lang): string {
  return lang === "sv" ? "sv-SE" : "en-GB";
}
