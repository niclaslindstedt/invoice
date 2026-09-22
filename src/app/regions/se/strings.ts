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
    companyForm: "Company form",
    lateFee: "Charge the 450 kr late fee (business customers)",
    reminderFee: "Charge a 60 kr reminder fee",
  },
  choices: {
    companyForm: {
      ab: "Limited company (AB)",
      sole: "Sole trader (enskild firma)",
      hb: "Partnership (HB / KB)",
      other: "Other",
    },
  },
  issues: {
    missing: "{field} is missing",
    invalid: "{field} does not look right",
    buyerVatNumber:
      "Under reverse charge the buyer's VAT number must be on the invoice",
    noVatUnderTreatment:
      "Under reverse charge or an exemption every line must be at 0 % VAT",
    vatInSek: "An invoice in another currency must also state the VAT in SEK",
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
      "Interest on late payment is charged under the Swedish Interest Act (the reference rate plus 8 percentage points)",
    lateFee:
      "A late-payment fee of SEK 450 is charged on overdue invoices to businesses",
    reminderFee: "A reminder fee of SEK 60 is charged per reminder",
    seat: "Registered office: {seat}",
    terms: "Payment terms: {days} days net",
    reverseCharge:
      "Omvänd betalningsskyldighet — reverse charge, the buyer accounts for the VAT",
    exempt: "Undantagen från skatteplikt — exempt from VAT",
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
    companyForm: "Företagsform",
    lateFee: "Ta ut förseningsersättning 450 kr (näringsidkare)",
    reminderFee: "Ta ut påminnelseavgift 60 kr",
  },
  choices: {
    companyForm: {
      ab: "Aktiebolag",
      sole: "Enskild firma",
      hb: "Handelsbolag / kommanditbolag",
      other: "Annan",
    },
  },
  issues: {
    missing: "{field} saknas",
    invalid: "{field} ser inte rätt ut",
    buyerVatNumber:
      "Vid omvänd betalningsskyldighet ska köparens momsregistreringsnummer stå på fakturan",
    noVatUnderTreatment:
      "Vid omvänd betalningsskyldighet eller undantag ska varje rad ha 0 % moms",
    vatInSek: "En faktura i annan valuta ska även ange momsbeloppet i SEK",
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
    lateInterest:
      "Dröjsmålsränta debiteras enligt räntelagen (referensräntan + 8 procentenheter)",
    lateFee:
      "Vid försenad betalning debiteras förseningsersättning 450 kr (näringsidkare)",
    reminderFee: "Påminnelseavgift 60 kr debiteras per påminnelse",
    seat: "Säte: {seat}",
    terms: "Betalningsvillkor: {days} dagar netto",
    reverseCharge: "Omvänd betalningsskyldighet",
    exempt: "Undantagen från skatteplikt",
  },
};

export const strings = { en, sv };
