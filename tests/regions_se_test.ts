// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import { invoiceTotals } from "../src/app/invoice.ts";
import {
  REGION_IDS,
  clampRegion,
  fieldIssues,
  fieldsFor,
  normalizeDetails,
  regionOf,
} from "../src/app/regions/index.ts";
import {
  se,
  validBankgiro,
  validIban,
  validOrgNumber,
  validPlusgiro,
  validVatNumber,
} from "../src/app/regions/se/index.ts";
import { partyOf } from "../src/app/types.ts";
import { company, customer, invoice, line } from "./fixtures/helpers.ts";

describe("the registry", () => {
  it("knows Sweden and clamps to it", () => {
    expect(REGION_IDS).toEqual(["se"]);
    expect(regionOf("se")).toBe(se);
    expect(clampRegion("xx")).toBe("se");
    expect(clampRegion(undefined)).toBe("se");
  });

  it("brings words for every field, issue and notice in both languages", () => {
    for (const lang of ["en", "sv"] as const) {
      const words = se.strings[lang];
      for (const field of se.fields)
        expect(words.fields[field.id]).toBeTruthy();
      for (const key of ["missing", "invalid", "noPayment", "noLines"]) {
        expect(words.issues[key]).toBeTruthy();
      }
      for (const key of ["fSkatt", "seat", "lateInterest"]) {
        expect(words.notices[key]).toBeTruthy();
      }
    }
  });
});

describe("Swedish identifiers", () => {
  it("checks an organisation number's Luhn digit and prints it with a dash", () => {
    expect(validOrgNumber("5560360793")).toBe(true);
    expect(validOrgNumber("556036-0793")).toBe(true);
    expect(validOrgNumber("556036-0794")).toBe(false);
    expect(validOrgNumber("12345")).toBe(false);
    expect(normalizeDetails(se, { orgNumber: "5560360793" }).orgNumber).toBe(
      "556036-0793",
    );
    // A twelve-digit personal number loses its century.
    expect(normalizeDetails(se, { orgNumber: "195560360793" }).orgNumber).toBe(
      "556036-0793",
    );
  });

  it("derives a VAT number from the organisation number and checks it", () => {
    expect(normalizeDetails(se, { vatNumber: "556036-0793" }).vatNumber).toBe(
      "SE556036079301",
    );
    expect(validVatNumber("SE556036079301")).toBe(true);
    expect(validVatNumber("SE 5560360793 01")).toBe(true);
    expect(validVatNumber("SE556036079302")).toBe(false);
    expect(validVatNumber("DE123456789")).toBe(false);
  });

  it("checks a bankgiro and a plusgiro", () => {
    expect(validBankgiro("5050-1055")).toBe(true);
    expect(validBankgiro("50501056")).toBe(false);
    expect(normalizeDetails(se, { bankgiro: "50501055" }).bankgiro).toBe(
      "5050-1055",
    );
    expect(normalizeDetails(se, { bankgiro: "1234567" }).bankgiro).toBe(
      "123-4567",
    );
    expect(validPlusgiro("4171-5")).toBe(true);
    expect(validPlusgiro("4171-4")).toBe(false);
    expect(normalizeDetails(se, { plusgiro: "41715" }).plusgiro).toBe("4171-5");
  });

  it("checks an IBAN mod 97 and groups it in fours", () => {
    expect(validIban("SE4550000000058398257466")).toBe(true);
    expect(validIban("SE45 5000 0000 0583 9825 7466")).toBe(true);
    expect(validIban("SE4550000000058398257467")).toBe(false);
    expect(
      normalizeDetails(se, { iban: "se4550000000058398257466" }).iban,
    ).toBe("SE45 5000 0000 0583 9825 7466");
  });

  it("drops keys the region does not define, and empty values", () => {
    expect(
      normalizeDetails(se, { foo: "bar", seat: " ", bic: "ndeasess" }),
    ).toEqual({ bic: "NDEASESS" });
  });
});

describe("the fields", () => {
  it("are the seller's, the buyer's or both", () => {
    expect(fieldsFor(se, "buyer").map((f) => f.id)).toEqual(["orgNumber"]);
    expect(fieldsFor(se, "seller").map((f) => f.id)).toContain("vatNumber");
    expect(fieldsFor(se, "seller").map((f) => f.id)).toContain("bankgiro");
  });

  it("report what is missing and what is malformed", () => {
    expect(fieldIssues(se, "seller", {})).toEqual([
      { key: "missing", party: "seller", field: "orgNumber" },
      { key: "missing", party: "seller", field: "vatNumber" },
    ]);
    expect(
      fieldIssues(se, "seller", {
        orgNumber: "556036-0794",
        vatNumber: "SE556036079301",
      }),
    ).toEqual([{ key: "invalid", party: "seller", field: "orgNumber" }]);
  });
});

describe("the check", () => {
  const seller = partyOf(company());
  const buyer = partyOf(customer());

  it("passes a complete invoice", () => {
    const inv = invoice();
    expect(se.check(inv, seller, buyer, invoiceTotals(inv))).toEqual([]);
  });

  it("names every gap", () => {
    const inv = invoice({ lines: [], issueDate: "", dueDate: "" });
    const issues = se
      .check(
        inv,
        { ...seller, name: "", details: {} },
        { ...buyer, address: { street: "", zip: "", city: "", country: "" } },
        invoiceTotals(inv),
      )
      .map((i) => i.key + (i.field ? `:${i.field}` : ""));
    expect(issues).toEqual([
      "sellerName",
      "buyerAddress",
      "missing:orgNumber",
      "missing:vatNumber",
      "noIssueDate",
      "noDueDate",
      "noLines",
    ]);
  });

  it("wants a way to pay when there is something to pay", () => {
    const inv = invoice();
    const noGiro = { ...seller, details: { ...seller.details } };
    delete noGiro.details.bankgiro;
    expect(se.check(inv, noGiro, buyer, invoiceTotals(inv))).toEqual([
      { key: "noPayment" },
    ]);
    const zero = invoice({ lines: [line({ unitPrice: 0 })] });
    expect(se.check(zero, noGiro, buyer, invoiceTotals(zero))).toEqual([]);
  });

  it("lets a private customer go without an organisation number but not a wrong one", () => {
    const inv = invoice();
    const person = { ...buyer, details: {} };
    expect(se.check(inv, seller, person, invoiceTotals(inv))).toEqual([]);
    const wrong = { ...buyer, details: { orgNumber: "556036-0794" } };
    expect(se.check(inv, seller, wrong, invoiceTotals(inv))).toEqual([
      { key: "invalid", party: "buyer", field: "orgNumber" },
    ]);
  });

  it("refuses a VAT rate Sweden does not use", () => {
    const inv = invoice({ lines: [line({ vatRate: 20 })] });
    expect(se.check(inv, seller, buyer, invoiceTotals(inv))).toEqual([
      { key: "vatRate" },
    ]);
  });

  it("prints the notices the seller's details call for", () => {
    expect(se.notices(seller).map((n) => n.key)).toEqual([
      "fSkatt",
      "lateInterest",
    ]);
    expect(
      se
        .notices({
          ...seller,
          details: { ...seller.details, seat: "Stockholm" },
        })
        .map((n) => n.key),
    ).toEqual(["fSkatt", "seat", "lateInterest"]);
  });
});
