// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Sweden.
//
// What an invoice must carry here comes from two laws. The VAT Act
// (mervärdesskattelagen, 17 kap.) lists the content of a "fullständig
// faktura": the date of issue, a sequential number that identifies it
// uniquely, the seller's VAT registration number, the seller's and the
// buyer's name and address, the quantity and nature of what was supplied,
// the date of supply where it differs from the date of issue, the taxable
// amount per rate, the rate, and the VAT amount. The Companies Act
// (aktiebolagslagen 28 kap. 5 §) adds, for a limited company, the company's
// name, registered office and organisation number on every business letter.
// Beyond the law, a Swedish invoice says "Godkänd för F-skatt" — the Tax
// Agency's own advice, because without it the payer may be liable to
// withhold tax — and is paid by bankgiro or plusgiro, so one of those (or an
// IBAN) is what the payment block needs.
//
// The rates are 25 %, 12 % (food, hotels), 6 % (books, culture, transport)
// and 0 % (exempt or reverse-charged). Öre rounding of the total to a whole
// krona is customary rather than mandatory, printed as its own line so the
// VAT still reconciles.

import type { Region, RegionIssue } from "../index.ts";
import { fieldIssues } from "../index.ts";
import { strings } from "./strings.ts";

/** An organisation number: ten digits, printed `XXXXXX-XXXX`. The last is a
 *  Luhn check digit over the first nine. A sole trader uses a personal
 *  number, which is the same shape. */
function normalizeOrgNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  // A twelve-digit personal number carries the century; the invoice prints
  // the ten-digit form.
  const ten = digits.length === 12 ? digits.slice(2) : digits;
  if (ten.length !== 10) return value.trim();
  return `${ten.slice(0, 6)}-${ten.slice(6)}`;
}

function luhnValid(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[i]);
    if ((digits.length - i) % 2 === 0) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

export function validOrgNumber(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length === 10 && luhnValid(digits);
}

/** A VAT number: `SE` + the organisation number's ten digits + `01`. */
function normalizeVatNumber(value: string): string {
  const compact = value.replace(/[\s-]/g, "").toUpperCase();
  const digits = compact.replace(/^SE/, "");
  if (/^\d{10}$/.test(digits)) return `SE${digits}01`;
  return compact;
}

export function validVatNumber(value: string): boolean {
  const compact = value.replace(/[\s-]/g, "").toUpperCase();
  if (!/^SE\d{12}$/.test(compact)) return false;
  return luhnValid(compact.slice(2, 12)) && compact.endsWith("01");
}

/** A bankgiro number: seven or eight digits, printed `XXX-XXXX` or
 *  `XXXX-XXXX`, Luhn-checked. */
function normalizeBankgiro(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length === 8) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return value.trim();
}

export function validBankgiro(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return (digits.length === 7 || digits.length === 8) && luhnValid(digits);
}

/** A plusgiro number: two to eight digits, the last a Luhn check digit,
 *  printed with a dash before it. */
function normalizePlusgiro(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 2 || digits.length > 8) return value.trim();
  return `${digits.slice(0, -1)}-${digits.slice(-1)}`;
}

export function validPlusgiro(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 2 && digits.length <= 8 && luhnValid(digits);
}

function normalizeIban(value: string): string {
  const compact = value.replace(/\s/g, "").toUpperCase();
  return compact.replace(/(.{4})/g, "$1 ").trim();
}

/** An IBAN: country code, two check digits, then up to thirty characters,
 *  checked mod 97 the way the standard says. */
export function validIban(value: string): boolean {
  const compact = value.replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(compact)) return false;
  const rearranged = compact.slice(4) + compact.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const piece = /\d/.test(ch) ? ch : String(ch.charCodeAt(0) - 55);
    for (const digit of piece)
      remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

const VAT_RATES = [25, 12, 6, 0];

export const se: Region = {
  id: "se",
  locale: "sv-SE",
  currency: "SEK",
  vatRates: VAT_RATES,
  defaultDueDays: 30,
  roundTotal: true,
  requiredSections: ["header", "parties", "meta", "lines", "totals", "payment"],
  fields: [
    {
      id: "orgNumber",
      party: "both",
      required: true,
      placement: "party",
      kind: "text",
      inputMode: "numeric",
      normalize: normalizeOrgNumber,
      validate: validOrgNumber,
    },
    {
      id: "vatNumber",
      party: "seller",
      required: true,
      placement: "party",
      kind: "text",
      normalize: normalizeVatNumber,
      validate: validVatNumber,
    },
    {
      id: "seat",
      party: "seller",
      required: false,
      placement: "party",
      kind: "text",
    },
    {
      id: "fSkatt",
      party: "seller",
      required: false,
      placement: "payment",
      kind: "flag",
    },
    {
      id: "bankgiro",
      party: "seller",
      required: false,
      placement: "payment",
      kind: "text",
      inputMode: "numeric",
      normalize: normalizeBankgiro,
      validate: validBankgiro,
    },
    {
      id: "plusgiro",
      party: "seller",
      required: false,
      placement: "payment",
      kind: "text",
      inputMode: "numeric",
      normalize: normalizePlusgiro,
      validate: validPlusgiro,
    },
    {
      id: "iban",
      party: "seller",
      required: false,
      placement: "payment",
      kind: "text",
      normalize: normalizeIban,
      validate: validIban,
    },
    {
      id: "bic",
      party: "seller",
      required: false,
      placement: "payment",
      kind: "text",
      normalize: (v) => v.replace(/\s/g, "").toUpperCase(),
      validate: (v) => /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(v),
    },
    {
      id: "ocr",
      party: "seller",
      required: false,
      placement: "payment",
      kind: "text",
      inputMode: "numeric",
    },
  ],
  notices: (seller) => {
    const out = [];
    if (seller.details.fSkatt === "yes") out.push({ key: "fSkatt" });
    if (seller.details.seat) out.push({ key: "seat" });
    out.push({ key: "lateInterest" });
    return out;
  },
  check: (invoice, seller, buyer, totals) => {
    const issues: RegionIssue[] = [];
    if (!seller.name.trim()) issues.push({ key: "sellerName" });
    if (!buyer.name.trim()) issues.push({ key: "buyerName" });
    if (!seller.address.street.trim() && !seller.address.city.trim()) {
      issues.push({ key: "sellerAddress" });
    }
    if (!buyer.address.street.trim() && !buyer.address.city.trim()) {
      issues.push({ key: "buyerAddress" });
    }
    issues.push(...fieldIssues(se, "seller", seller.details));
    // A private customer has no organisation number; only a malformed one
    // is an issue on the buyer's side.
    issues.push(
      ...fieldIssues(se, "buyer", buyer.details).filter(
        (i) => i.key !== "missing",
      ),
    );
    if (!invoice.issueDate) issues.push({ key: "noIssueDate" });
    if (!invoice.dueDate) issues.push({ key: "noDueDate" });
    if (invoice.lines.length === 0) issues.push({ key: "noLines" });
    if (invoice.lines.some((l) => !l.description.trim())) {
      issues.push({ key: "noLineDescription" });
    }
    if (invoice.lines.some((l) => !VAT_RATES.includes(l.vatRate))) {
      issues.push({ key: "vatRate" });
    }
    const d = seller.details;
    if (!d.bankgiro && !d.plusgiro && !d.iban && totals.total > 0) {
      issues.push({ key: "noPayment" });
    }
    return issues;
  },
  strings,
};
