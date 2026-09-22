// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import {
  creditInvoice,
  dueDateFor,
  formatMoney,
  invoiceTotals,
  lineNet,
  lineVat,
  money,
  nextInvoiceNumber,
  nextStatuses,
  sendInvoice,
  setStatus,
} from "../src/app/invoice.ts";
import { emptyDoc, partyOf } from "../src/app/types.ts";
import { company, ctx, customer, invoice, line } from "./fixtures/helpers.ts";

describe("money", () => {
  it("rounds to the öre, half away from zero", () => {
    expect(money(1.005)).toBe(1.01);
    expect(money(-1.005)).toBe(-1.01);
    expect(money(2.675)).toBe(2.68);
  });
});

describe("a line", () => {
  it("nets quantity times price less the discount", () => {
    expect(lineNet(line({ quantity: 10, unitPrice: 900 }))).toBe(9000);
    expect(lineNet(line({ quantity: 10, unitPrice: 900, discount: 10 }))).toBe(
      8100,
    );
  });

  it("carries its VAT on the discounted net", () => {
    expect(lineVat(line({ quantity: 10, unitPrice: 900, discount: 10 }))).toBe(
      2025,
    );
  });

  it("clamps a nonsense rate", () => {
    expect(lineVat(line({ vatRate: 250 }))).toBe(9000);
    expect(lineVat(line({ vatRate: Number.NaN }))).toBe(0);
  });
});

describe("invoiceTotals", () => {
  it("groups VAT by rate, highest first, and adds up", () => {
    const totals = invoiceTotals({
      roundTotal: false,
      lines: [
        line({ id: "a", quantity: 1, unitPrice: 100, vatRate: 25 }),
        line({ id: "b", quantity: 1, unitPrice: 100, vatRate: 6 }),
        line({ id: "c", quantity: 1, unitPrice: 50, vatRate: 25 }),
      ],
    });
    expect(totals.net).toBe(250);
    expect(totals.vat).toEqual([
      { rate: 25, net: 150, vat: 37.5 },
      { rate: 6, net: 100, vat: 6 },
    ]);
    expect(totals.vatTotal).toBe(43.5);
    expect(totals.gross).toBe(293.5);
    expect(totals.rounding).toBe(0);
    expect(totals.total).toBe(293.5);
  });

  it("rounds the total to a whole unit and says by how much", () => {
    const totals = invoiceTotals({
      roundTotal: true,
      lines: [line({ quantity: 1, unitPrice: 99.9, vatRate: 25 })],
    });
    expect(totals.gross).toBe(124.88);
    expect(totals.total).toBe(125);
    expect(totals.rounding).toBe(0.12);
  });

  it("is the sum of rounded lines, so a printed column adds up", () => {
    const totals = invoiceTotals({
      roundTotal: false,
      lines: [
        line({ id: "a", quantity: 3, unitPrice: 0.335, vatRate: 0 }),
        line({ id: "b", quantity: 3, unitPrice: 0.335, vatRate: 0 }),
      ],
    });
    // Each line is 1.005 → 1.01; the total is 2.02, not 2.01.
    expect(totals.net).toBe(2.02);
  });

  it("nets a credit note negative", () => {
    const totals = invoiceTotals({
      roundTotal: true,
      lines: [line({ quantity: -10, unitPrice: 900, vatRate: 25 })],
    });
    expect(totals.net).toBe(-9000);
    expect(totals.vatTotal).toBe(-2250);
    expect(totals.total).toBe(-11250);
  });
});

describe("the number series", () => {
  it("starts at the company's first number when nothing has been sent", () => {
    expect(nextInvoiceNumber({}, 1000)).toBe(1000);
    expect(nextInvoiceNumber({ a: invoice({ number: null }) }, 1000)).toBe(
      1000,
    );
  });

  it("counts on from the highest number in use, gaps included", () => {
    const invoices = {
      a: invoice({ id: "a", number: 1000, status: "sent" }),
      b: invoice({ id: "b", number: 1002, status: "cancelled" }),
    };
    expect(nextInvoiceNumber(invoices, 1)).toBe(1003);
  });

  it("never starts below one", () => {
    expect(nextInvoiceNumber({}, 0)).toBe(1);
    expect(nextInvoiceNumber({}, -5)).toBe(1);
  });
});

describe("dueDateFor", () => {
  it("adds the days", () => {
    expect(dueDateFor("2026-09-30", 30)).toBe("2026-10-30");
    expect(dueDateFor("2026-12-31", 1)).toBe("2027-01-01");
    expect(dueDateFor("2026-09-30", -3)).toBe("2026-09-30");
  });
});

describe("sending", () => {
  it("numbers the invoice, freezes the parties and records the event", () => {
    const data = { ...emptyDoc(), company: company() };
    const c = ctx("2026-10-01T09:00:00.000Z");
    const sent = sendInvoice(
      invoice(),
      data,
      partyOf(company()),
      partyOf(customer()),
      c,
    );
    expect(sent.number).toBe(1000);
    expect(sent.status).toBe("sent");
    expect(sent.seller?.name).toBe("Agilator AB");
    expect(sent.buyer?.name).toBe("Acme AB");
    expect(sent.events.at(-1)).toEqual({ at: c.now, kind: "sent" });
    expect(sent.updatedAt).toBe(c.now);
  });

  it("is a no-op on anything but a draft", () => {
    const already = invoice({ status: "sent", number: 7 });
    expect(
      sendInvoice(
        already,
        emptyDoc(),
        partyOf(company()),
        partyOf(customer()),
        ctx(),
      ),
    ).toBe(already);
  });
});

describe("statuses", () => {
  it("only move the way an invoice's life goes", () => {
    expect(nextStatuses("draft")).toEqual(["sent", "cancelled"]);
    expect(nextStatuses("sent")).toEqual(["paid", "cancelled", "credited"]);
    expect(nextStatuses("paid")).toEqual([]);
    expect(nextStatuses("credited")).toEqual([]);
    expect(nextStatuses("cancelled")).toEqual(["draft"]);
  });

  it("record the step, and refuse a step that is not allowed", () => {
    const c = ctx("2026-10-05T09:00:00.000Z");
    const paid = setStatus(invoice({ status: "sent", number: 1 }), "paid", c);
    expect(paid.status).toBe("paid");
    expect(paid.events.at(-1)).toEqual({ at: c.now, kind: "paid" });
    const draft = invoice();
    expect(setStatus(draft, "paid", c)).toBe(draft);
    expect(
      setStatus(invoice({ status: "cancelled" }), "draft", c).events.at(-1)
        ?.kind,
    ).toBe("reopened");
  });
});

describe("a credit note", () => {
  it("mirrors the lines, points back, and marks the original credited", () => {
    const c = ctx("2026-10-10T09:00:00.000Z");
    const original = invoice({ status: "sent", number: 1000 });
    const { credit, original: marked } = creditInvoice(
      original,
      "2026-10-10",
      c,
    );
    expect(credit.id).toBe("id-1");
    expect(credit.number).toBeNull();
    expect(credit.status).toBe("draft");
    expect(credit.creditOf).toBe("inv-1");
    expect(credit.lines[0]?.quantity).toBe(-10);
    expect(credit.lines[0]?.id).not.toBe("l1");
    expect(marked.status).toBe("credited");
  });

  it("negates the VAT-in-kronor figure of a foreign-currency invoice", () => {
    const original = invoice({
      status: "sent",
      number: 7,
      currency: "EUR",
      vatInBaseCurrency: 250,
    });
    expect(
      creditInvoice(original, "2026-10-10", ctx()).credit.vatInBaseCurrency,
    ).toBe(-250);
  });
});

describe("formatMoney", () => {
  it("prints the code after the figure, in the locale's shape", () => {
    expect(formatMoney(11250, "SEK", "en-GB")).toBe("11,250.00 SEK");
    const sv = formatMoney(11250, "SEK", "sv-SE").replace(/[\xa0\u202f]/g, " ");
    expect(sv).toBe("11 250,00 SEK");
  });
});
