// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Sweden's words, in the app's two languages. Kept beside the rules rather
// than in the app's catalogs so the region is one folder — a translator
// adding a language to the app adds a key here too, and the type says so.

import type { RegionStrings } from "../index.ts";

const en: RegionStrings = {
  name: "Sweden",
  fields: {
    orgNumber: "Organisation number",
    vatNumber: "VAT number",
    fSkatt: "Approved for F-tax",
    seat: "Registered office",
    bankgiro: "Bankgiro",
    plusgiro: "Plusgiro",
    iban: "IBAN",
    bic: "BIC",
    ocr: "OCR / payment reference",
  },
  issues: {
    missing: "{field} is missing",
    invalid: "{field} does not look right",
    noNumber: "The invoice has no number",
    noIssueDate: "The invoice has no date",
    noDueDate: "The invoice has no due date",
    noLines: "The invoice has no lines",
    noLineDescription: "A line has no description",
    noPayment: "No way to pay: give a bankgiro, plusgiro or IBAN",
    sellerName: "The seller has no name",
    buyerName: "The buyer has no name",
    sellerAddress: "The seller has no address",
    buyerAddress: "The buyer has no address",
    vatRate: "A line has a VAT rate Sweden does not use",
  },
  notices: {
    fSkatt: "Godkänd för F-skatt",
    lateInterest:
      "Interest on late payment is charged under the Swedish Interest Act",
    seat: "Registered office: {seat}",
  },
};

const sv: RegionStrings = {
  name: "Sverige",
  fields: {
    orgNumber: "Organisationsnummer",
    vatNumber: "Momsregistreringsnummer",
    fSkatt: "Godkänd för F-skatt",
    seat: "Säte",
    bankgiro: "Bankgiro",
    plusgiro: "Plusgiro",
    iban: "IBAN",
    bic: "BIC",
    ocr: "OCR / betalningsreferens",
  },
  issues: {
    missing: "{field} saknas",
    invalid: "{field} ser inte rätt ut",
    noNumber: "Fakturan saknar nummer",
    noIssueDate: "Fakturan saknar datum",
    noDueDate: "Fakturan saknar förfallodatum",
    noLines: "Fakturan har inga rader",
    noLineDescription: "En rad saknar beskrivning",
    noPayment: "Inget sätt att betala: ange bankgiro, plusgiro eller IBAN",
    sellerName: "Säljaren saknar namn",
    buyerName: "Köparen saknar namn",
    sellerAddress: "Säljaren saknar adress",
    buyerAddress: "Köparen saknar adress",
    vatRate: "En rad har en momssats som inte används i Sverige",
  },
  notices: {
    fSkatt: "Godkänd för F-skatt",
    lateInterest: "Dröjsmålsränta debiteras enligt räntelagen",
    seat: "Säte: {seat}",
  },
};

export const strings = { en, sv };
