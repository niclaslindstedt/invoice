// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import { invoiceTotals } from "../src/app/invoice.ts";
import { noticeLabel } from "../src/app/labels.ts";
import {
  REGION_IDS,
  clampRegion,
  fieldAsked,
  fieldIssues,
  fieldsFor,
  normalizeDetails,
  normalizeField,
  regionOf,
} from "../src/app/regions/index.ts";
import {
  LATE_FEE_SEK,
  REMINDER_FEE_MAX_SEK,
  reminderFeeOf,
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
      for (const key of [
        "missing",
        "invalid",
        "noPayment",
        "noLines",
        "buyerVatNumber",
        "noVatUnderTreatment",
        "vatInSek",
      ]) {
        expect(words.issues[key]).toBeTruthy();
      }
      for (const key of [
        "fSkatt",
        "seat",
        "lateInterest",
        "lateInterestAgreed",
        "lateFee",
        "reminderFee",
        "terms",
        "reverseCharge",
        "exempt",
      ]) {
        expect(words.notices[key]).toBeTruthy();
      }
      for (const field of se.fields) {
        if (field.kind !== "choice") continue;
        for (const value of field.choices ?? []) {
          expect(words.choices[field.id]?.[value]).toBeTruthy();
        }
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
    expect(fieldsFor(se, "buyer").map((f) => f.id)).toEqual([
      "orgNumber",
      "vatNumber",
    ]);
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
      "seat",
      "lateInterest",
    ]);
    const fees = { ...seller.details, lateFee: "yes", reminderFee: "yes" };
    expect(se.notices({ ...seller, details: fees }).map((n) => n.key)).toEqual([
      "fSkatt",
      "seat",
      "lateInterest",
      "lateFee",
      "reminderFee",
    ]);
  });

  it("wants the seat of a limited company and of nobody else", () => {
    const inv = invoice();
    const noSeat = { ...seller.details };
    delete noSeat.seat;
    expect(
      se.check(inv, { ...seller, details: noSeat }, buyer, invoiceTotals(inv)),
    ).toEqual([{ key: "missing", party: "seller", field: "seat" }]);
    expect(
      se.check(
        inv,
        { ...seller, details: { ...noSeat, companyForm: "sole" } },
        buyer,
        invoiceTotals(inv),
      ),
    ).toEqual([]);
  });

  it("under reverse charge wants the buyer's VAT number and no VAT on the lines", () => {
    const reversed = invoice({
      vatTreatment: "reverseCharge",
      lines: [line({ vatRate: 0 })],
    });
    expect(se.check(reversed, seller, buyer, invoiceTotals(reversed))).toEqual([
      { key: "buyerVatNumber", party: "buyer", field: "vatNumber" },
    ]);
    const registered = {
      ...buyer,
      details: { ...buyer.details, vatNumber: "SE556036079301" },
    };
    expect(
      se.check(reversed, seller, registered, invoiceTotals(reversed)),
    ).toEqual([]);
    const withVat = invoice({ vatTreatment: "reverseCharge" });
    expect(
      se
        .check(withVat, seller, registered, invoiceTotals(withVat))
        .map((i) => i.key),
    ).toEqual(["noVatUnderTreatment"]);
  });

  it("wants the VAT in kronor on an invoice in another currency", () => {
    const eur = invoice({ currency: "EUR" });
    expect(se.check(eur, seller, buyer, invoiceTotals(eur))).toEqual([
      { key: "vatInSek" },
    ]);
    const stated = invoice({ currency: "EUR", vatInBaseCurrency: 25000 });
    expect(se.check(stated, seller, buyer, invoiceTotals(stated))).toEqual([]);
  });

  it("prints the invoice's own notices: the terms and the VAT treatment", () => {
    expect(se.invoiceNotices(invoice(), seller, buyer)).toEqual([
      { key: "terms", params: { days: "30" } },
    ]);
    expect(
      se
        .invoiceNotices(
          invoice({ vatTreatment: "reverseCharge" }),
          seller,
          buyer,
        )
        .map((n) => n.key),
    ).toEqual(["terms", "reverseCharge"]);
    expect(
      se
        .invoiceNotices(invoice({ vatTreatment: "exempt" }), seller, buyer)
        .map((n) => n.key),
    ).toEqual(["terms", "exempt"]);
  });

  it("keeps only a known company form", () => {
    expect(normalizeDetails(se, { companyForm: "ab" })).toEqual({
      companyForm: "ab",
    });
    expect(normalizeDetails(se, { companyForm: "plc" })).toEqual({});
  });
});

describe("the late-payment lines", () => {
  const seller = partyOf(company());
  const charging = (details: Record<string, string>) => ({
    ...seller,
    details: { ...seller.details, ...details },
  });

  it("prints the Interest Act's rate until one is agreed", () => {
    expect(se.notices(seller)).toContainEqual({ key: "lateInterest" });
    expect(se.notices(charging({ lateInterestRate: "9.5" }))).toContainEqual({
      key: "lateInterestAgreed",
      params: { rate: "9,5" },
    });
    // One line about interest, never both.
    const keys = se
      .notices(charging({ lateInterestRate: "12" }))
      .map((n) => n.key);
    expect(keys).toContain("lateInterestAgreed");
    expect(keys).not.toContain("lateInterest");
  });

  it("takes a rate typed with a comma and refuses one that is not a number", () => {
    expect(normalizeDetails(se, { lateInterestRate: "9,5" })).toEqual({
      lateInterestRate: "9.5",
    });
    expect(normalizeDetails(se, { lateInterestRate: "16 " })).toEqual({
      lateInterestRate: "16",
    });
    expect(normalizeDetails(se, { lateInterestRate: "soon" })).toEqual({});
    // An empty field is the statutory rate, not zero interest.
    expect(normalizeDetails(se, { lateInterestRate: "" })).toEqual({});
  });

  it("keeps the late fee at the amount räntelagen 4 a § fixes", () => {
    expect(se.notices(charging({ lateFee: "yes" }))).toContainEqual({
      key: "lateFee",
      params: { amount: "450" },
    });
    // No field sets it, in either direction.
    expect(se.fields.find((f) => f.id === "lateFee")?.kind).toBe("flag");
    expect(se.fields.map((f) => f.id)).not.toContain("lateFeeAmount");
    // And the words quote the figure the constant holds.
    for (const lang of ["en", "sv"] as const) {
      expect(se.strings[lang].fields.lateFee).toContain(String(LATE_FEE_SEK));
      expect(
        noticeLabel(
          se,
          lang,
          { key: "lateFee", params: { amount: String(LATE_FEE_SEK) } },
          {},
        ),
      ).toContain(String(LATE_FEE_SEK));
    }
  });

  it("charges the statutory maximum reminder fee unless a smaller one is set", () => {
    expect(se.notices(charging({ reminderFee: "yes" }))).toContainEqual({
      key: "reminderFee",
      params: { amount: String(REMINDER_FEE_MAX_SEK) },
    });
    expect(
      se.notices(charging({ reminderFee: "yes", reminderFeeAmount: "40" })),
    ).toContainEqual({ key: "reminderFee", params: { amount: "40" } });
    expect(
      se.notices(charging({ reminderFee: "yes", reminderFeeAmount: "0" })),
    ).toContainEqual({ key: "reminderFee", params: { amount: "0" } });
    expect(reminderFeeOf({})).toBe(REMINDER_FEE_MAX_SEK);
    expect(reminderFeeOf({ reminderFeeAmount: "40" })).toBe(40);
    expect(reminderFeeOf({ reminderFeeAmount: "0" })).toBe(0);
  });

  it("reads a figure the way the form commits it", () => {
    // `<input type="number">` throws a comma away, so the field is text and
    // the region does the reading — the same function a stored document
    // goes through.
    const rate = se.fields.find((f) => f.id === "lateInterestRate")!;
    const amount = se.fields.find((f) => f.id === "reminderFeeAmount")!;
    expect(normalizeField(rate, "9,5")).toBe("9.5");
    expect(normalizeField(rate, " 12 ")).toBe("12");
    expect(normalizeField(rate, "200")).toBe("100");
    expect(normalizeField(rate, "")).toBe("");
    expect(normalizeField(rate, "later")).toBe("");
    expect(normalizeField(amount, "95")).toBe("60");
    expect(normalizeField(amount, "39,50")).toBe("39.5");
  });

  it("clamps a reminder fee to what the law allows to be claimed", () => {
    expect(
      normalizeDetails(se, { reminderFee: "yes", reminderFeeAmount: "80" }),
    ).toEqual({ reminderFee: "yes", reminderFeeAmount: "60" });
    expect(normalizeDetails(se, { reminderFeeAmount: "-5" })).toEqual({
      reminderFeeAmount: "0",
    });
  });

  it("asks the amount only while the fee is being charged", () => {
    const amount = se.fields.find((f) => f.id === "reminderFeeAmount");
    expect(amount?.dependsOn).toBe("reminderFee");
    expect(fieldAsked(amount!, {})).toBe(false);
    expect(fieldAsked(amount!, { reminderFee: "yes" })).toBe(true);
    // A figure left behind by a fee that was turned off is not an issue.
    const identifiers = {
      orgNumber: "556036-0793",
      vatNumber: "SE556036079301",
    };
    expect(
      fieldIssues(se, "seller", { ...identifiers, reminderFeeAmount: "99" }),
    ).toEqual([]);
    expect(
      fieldIssues(se, "seller", {
        ...identifiers,
        reminderFee: "yes",
        reminderFeeAmount: "99",
      }),
    ).toEqual([
      { key: "invalid", party: "seller", field: "reminderFeeAmount" },
    ]);
  });

  it("says the configured figures in both languages", () => {
    const details = charging({
      lateInterestRate: "9.5",
      reminderFee: "yes",
      reminderFeeAmount: "40",
    }).details;
    const lines = (lang: "en" | "sv") =>
      se
        .notices(charging(details))
        .map((n) => noticeLabel(se, lang, n, details))
        .join("\n");
    expect(lines("en")).toContain("9,5 % per year");
    expect(lines("en")).toContain("SEK 40");
    expect(lines("sv")).toContain("9,5 % per år");
    expect(lines("sv")).toContain("Påminnelseavgift 40 kr");
  });

  it("is never printed as a payment detail of its own", () => {
    // The page prints the seller's `text` payment fields as rows; a figure
    // that only shapes a notice is a `number` and stays out of them.
    const printed = fieldsFor(se, "seller")
      .filter((f) => f.placement === "payment" && f.kind === "text")
      .map((f) => f.id);
    expect(printed).not.toContain("lateInterestRate");
    expect(printed).not.toContain("reminderFeeAmount");
  });
});
