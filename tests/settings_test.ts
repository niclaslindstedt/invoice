// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import { DEFAULT_SETTINGS, parseSettings } from "../src/app/useAppSettings.ts";

describe("parseSettings", () => {
  it("clamps every field", () => {
    expect(
      parseSettings(JSON.stringify({ theme: "purple", devMode: "yes" })),
    ).toEqual(DEFAULT_SETTINGS);
    expect(
      parseSettings(JSON.stringify({ theme: "dark", defaultTemplateId: "t" })),
    ).toEqual({
      ...DEFAULT_SETTINGS,
      theme: "dark",
      defaultTemplateId: "t",
    });
  });

  it("reads garbage as the defaults", () => {
    expect(parseSettings("[]")).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("42")).toEqual(DEFAULT_SETTINGS);
  });
});
