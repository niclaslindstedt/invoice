// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { useCallback } from "react";

import { useLocalStorageState } from "@niclaslindstedt/oss-framework/hooks";

// The app's own (non-document) settings: which of the two themes is active,
// which template a new invoice starts from, and the developer knobs. Per
// device on purpose — the theme you read the app in is not a fact about your
// invoices, so it does not sync — and persisted to localStorage so a reload
// keeps your choices. The language is the i18n runtime's own key.

/** The theme choice. Deliberately three values and no more — one light, one
 *  dark, and "follow the device". */
export type ThemeChoice = "light" | "dark" | "system";

export type AppSettings = {
  theme: ThemeChoice;
  /** The template a new invoice is seeded from. Null means the first by
   *  name, or none when there are none. */
  defaultTemplateId: string | null;
  /** Surface the developer affordances in Settings. */
  devMode: boolean;
  /** Mirror console output into the in-app log buffer. */
  captureLogs: boolean;
};

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "system",
  defaultTemplateId: null,
  devMode: false,
  captureLogs: false,
};

const STORAGE_KEY = "invoice:settings";

/** Stored bytes → settings, every field clamped. Exported for the tests;
 *  the app reads it through `useAppSettings`. */
export function parseSettings(raw: string): AppSettings {
  const parsed = JSON.parse(raw) as unknown;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return DEFAULT_SETTINGS;
  }
  const merged = { ...DEFAULT_SETTINGS, ...(parsed as object) } as AppSettings;
  return {
    theme:
      merged.theme === "light" || merged.theme === "dark"
        ? merged.theme
        : "system",
    defaultTemplateId:
      typeof merged.defaultTemplateId === "string"
        ? merged.defaultTemplateId
        : null,
    devMode: merged.devMode === true,
    captureLogs: merged.captureLogs === true,
  };
}

export function useAppSettings() {
  // The framework hook owns the persistence mechanics (safe parse,
  // write-through); this store owns the key, the shape, and the clamping.
  const [settings, setSettings] = useLocalStorageState<AppSettings>(
    STORAGE_KEY,
    DEFAULT_SETTINGS,
    { parse: parseSettings },
  );

  const update = useCallback(
    <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
      setSettings((prev) => ({ ...prev, [key]: value })),
    [setSettings],
  );

  const reset = useCallback(() => setSettings(DEFAULT_SETTINGS), [setSettings]);

  return { settings, update, reset, setSettings };
}
