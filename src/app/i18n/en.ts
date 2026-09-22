// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The English catalog — the app's single source of user-facing copy, and (as
// the fallback language) the source of the compile-time message-key type. Add
// a string here first; `t()` won't type-check against a key this file doesn't
// carry.
//
// `{name}`-style placeholders interpolate at call time. Keep the surrounding
// sentence in the catalog rather than concatenating fragments at the call
// site: a translator needs the whole sentence to move its words around.
//
// A region's own words — its field labels, its notices, what it finds wrong
// with an invoice — are not here. They live with the region (`regions/`).

import type { Widen } from "@niclaslindstedt/oss-framework/i18n";

export const en = {
  app: {
    name: "Invoice",
    tagline: "Your invoices, on your device",
    loading: "Opening your invoices…",
  },

  nav: {
    invoices: "Invoices",
    customers: "Customers",
    templates: "Templates",
    company: "Company",
    settings: "Settings",
  },

  common: {
    save: "Save",
    cancel: "Cancel",
    close: "Close",
    delete: "Delete",
    add: "Add",
    edit: "Edit",
    remove: "Remove",
    back: "Back",
    done: "Done",
    yes: "Yes",
    no: "No",
    none: "None",
    name: "Name",
    email: "Email",
    phone: "Phone",
    website: "Website",
    street: "Street",
    zip: "Postcode",
    city: "City",
    country: "Country",
    reference: "Contact person",
    history: "History",
    search: "Search",
    moveUp: "Move up",
    moveDown: "Move down",
    untitled: "Untitled",
  },

  // The units a line may be in, as printed. Short, because a column is
  // narrow, and the same word whether the line was typed or dropped in.
  units: {
    hour: "h",
    day: "days",
    piece: "pcs",
  },

  invoices: {
    empty:
      "No invoices yet. Add a customer and your company, and the first one is a tap away.",
    needCompany: "Set up the company that sends the invoices first.",
    needCustomer: "Add a customer to invoice first.",
    setUpCompany: "Set up company",
    addCustomer: "Add customer",
    new: "New invoice",
    filterAll: "All",
    draft: "Draft",
    credit: "Credit note",
    number: "Invoice {number}",
    creditNumber: "Credit note {number}",
    noNumber: "Not numbered yet",
    due: "Due {date}",
    issued: "Issued {date}",
    paidOn: "Paid {date}",
    unknownCustomer: "Customer removed",
    status: {
      draft: "Draft",
      sent: "Sent",
      paid: "Paid",
      cancelled: "Cancelled",
      credited: "Credited",
    },
    action: {
      send: "Send",
      sendHint:
        "Numbers the invoice and freezes what it says. Print it once it is sent.",
      markPaid: "Mark as paid",
      cancel: "Cancel invoice",
      credit: "Write a credit note",
      reopen: "Reopen as draft",
      print: "Print or save as PDF",
      delete: "Delete draft",
      deleteConfirm: "Delete this draft?",
      deleteHint: "A draft has no number and leaves no gap in the series.",
      duplicate: "Duplicate as draft",
    },
    event: {
      created: "Created",
      sent: "Sent",
      paid: "Paid",
      cancelled: "Cancelled",
      credited: "Credited",
      reopened: "Reopened",
    },
    issues: "Before it can be sent",
    issuesNone: "Ready to send.",
    frozen:
      "This invoice has been sent. What it says is fixed; write a credit note to change it.",
  },

  editor: {
    title: "Invoice",
    preview: "Preview",
    edit: "Edit",
    customer: "Customer",
    template: "Template",
    noTemplate: "No template",
    issueDate: "Invoice date",
    dueDate: "Due date",
    deliveryDate: "Delivery date",
    deliveryDateHint: "When the work was done, if not the invoice date.",
    period: "Period",
    periodHint: "What the lines cover — September 2026, say.",
    ourReference: "Our reference",
    yourReference: "Your reference",
    currency: "Currency",
    roundTotal: "Round the total to a whole unit",
    roundTotalHint: "The difference is printed as its own line.",
    lines: "Lines",
    addLine: "Add line",
    removeLine: "Remove line",
    description: "Description",
    quantity: "Quantity",
    unit: "Unit",
    unitPrice: "Price",
    vatRate: "VAT %",
    discount: "Discount %",
    note: "Note",
    noteHint: "Terms, a thank-you — printed under the totals.",
    sections: "Sections",
    sectionsHint:
      "Drag a section by its handle, or use the arrows, to change the order. A section the region requires cannot be hidden.",
    hidden: "Not on the page",
    show: "Show {section}",
    hide: "Hide {section}",
    dragHandle: "Drag to move {section}",
    required: "Required here",
    look: "Look",
    typeface: "Typeface",
    accent: "Accent",
    paper: "Paper",
    editSource:
      "Editing the {party} here updates the record and keeps the old version in its history.",
    sellerParty: "company",
    buyerParty: "customer",
    drop: "Drop a file from Time here to add its hours as lines",
    dropActive: "Drop to add the lines",
    importFile: "Import hours from a file",
    imported: "{count} lines added from {project}, {period}",
    importedNoPrice:
      "Set a price on the lines, or a default price on the customer for next time.",
    importNotJson: "That file is not readable as JSON.",
    importNotInvoiceLines: "That file is not an invoice-lines export.",
    importNewer:
      "That file was written by a newer version than this app can read.",
    importFrozen:
      "A sent invoice cannot take new lines. Reopen it or write a new one.",
    printHint:
      "The page prints as it is shown. Choose “Save as PDF” in the print dialog to get a file.",
  },

  // The page itself: the words printed on an invoice. These are printed in
  // the invoice's own language, which is the app's language when it was
  // sent.
  page: {
    invoice: "Invoice",
    creditNote: "Credit note",
    number: "Invoice no.",
    creditOf: "Credits invoice no. {number}",
    date: "Invoice date",
    dueDate: "Due date",
    deliveryDate: "Delivery date",
    period: "Period",
    customerNumber: "Customer no.",
    ourReference: "Our reference",
    yourReference: "Your reference",
    from: "From",
    to: "Bill to",
    description: "Description",
    quantity: "Qty",
    unit: "Unit",
    unitPrice: "Price",
    vat: "VAT",
    amount: "Amount",
    discount: "less {percent}%",
    net: "Net",
    vatAt: "VAT {rate}%",
    vatOn: "on {base}",
    rounding: "Rounding",
    total: "To pay",
    payment: "Payment",
    payBy: "Please pay {total} by {date}.",
    reference: "Reference",
    phone: "Phone",
    email: "Email",
    website: "Web",
    empty: "No lines yet.",
    sections: {
      header: "Header",
      parties: "From and to",
      meta: "Dates and references",
      lines: "Lines",
      totals: "Totals",
      payment: "Payment",
      note: "Note",
      footer: "Footer",
    },
  },

  customers: {
    empty: "No customers yet.",
    new: "New customer",
    editTitle: "Customer",
    number: "Customer number",
    defaultUnitPrice: "Default price per unit",
    defaultUnitPriceHint:
      "What a line starts at when hours are dropped in from Time.",
    notes: "Notes",
    archived: "Archived",
    archive: "Archive",
    unarchive: "Unarchive",
    delete: "Delete customer",
    deleteConfirm: "Delete {name}?",
    deleteHint:
      "Invoices already written stay as they are, and so does the history.",
    invoiceCount: "{count} invoices",
    invoiceCountOne: "1 invoice",
    address: "Address",
    identifiers: "Identifiers",
    deleted: "Customer deleted",
    saved: "Customer saved",
  },

  company: {
    title: "Company",
    intro:
      "Who the invoices are from. Everything here is printed on every invoice, and the region's rules decide what has to be there.",
    region: "Region",
    regionHint:
      "Which country's invoicing rules apply. More regions will follow.",
    firstInvoiceNumber: "First invoice number",
    firstInvoiceNumberHint:
      "Where the series starts when no invoice has been sent yet. After that it counts on from the highest number used.",
    payment: "Payment details",
    notices: "Printed on every invoice",
    saved: "Company saved",
    missing: "Not set up yet",
  },

  templates: {
    empty:
      "No templates yet. A new invoice then starts from the app's defaults.",
    new: "New template",
    editTitle: "Template",
    name: "Name",
    dueDays: "Days until due",
    vatRate: "Default VAT %",
    unit: "Default unit",
    currency: "Currency",
    note: "Default note",
    roundTotal: "Round the total",
    layoutHint:
      "Which sections a new invoice starts with, and in what order. Every invoice keeps its own copy, so this never rearranges one already written.",
    default: "Default",
    makeDefault: "Use for new invoices",
    delete: "Delete template",
    deleteConfirm: "Delete {name}?",
    deleteHint: "Invoices written from it keep their layout.",
    summary: "{dueDays} days · VAT {vatRate}% · {typeface}",
    typeface: {
      sans: "Sans",
      serif: "Serif",
      display: "Display",
      geometric: "Geometric",
      mono: "Mono",
    },
    accent: {
      ink: "Ink",
      green: "Green",
      blue: "Blue",
      plum: "Plum",
      rust: "Rust",
      teal: "Teal",
      gold: "Gold",
    },
    paper: {
      white: "White",
      cream: "Cream",
    },
  },

  history: {
    title: "History of {name}",
    intro:
      "Every version this record has been, newest first. Pick one to see what it said.",
    empty: "No history yet.",
    current: "Current",
    changed: "Changed: {fields}",
    first: "First version",
    restore: "Restore this version",
    restored: "Version restored",
    fields: {
      name: "name",
      "address.street": "street",
      "address.zip": "postcode",
      "address.city": "city",
      "address.country": "country",
      email: "email",
      phone: "phone",
      website: "website",
      reference: "contact person",
      details: "identifiers",
    },
  },

  settings: {
    appearance: "Appearance",
    theme: "Theme",
    themeLight: "Light",
    themeDark: "Dark",
    themeSystem: "Device",
    language: "Language",
    languageHint:
      "The app's language. An invoice is printed in the language the app had when it was sent.",
    english: "English",
    swedish: "Svenska",
    storage: "Where your invoices are kept",
    storageHint:
      "On this device, in a folder you pick, or in your own Dropbox. The device always keeps a copy.",
    storageHintNoFolder:
      "On this device, or in your own Dropbox. This browser cannot open a folder; Chrome and Edge can.",
    backend: "Storage",
    backendLocal: "This device",
    backendFolder: "A folder",
    backendDropbox: "Dropbox",
    connected: "Kept in {name}",
    localOnly: "Kept on this device only",
    saveNow: "Save now",
    reload: "Reload",
    reconnect: "Reconnect",
    disconnect: "Disconnect",
    data: "Your data",
    export: "Download a backup",
    exportHint:
      "A JSON file with the company, every customer, invoice and template, and their history.",
    import: "Restore a backup",
    importHint:
      "Merges the file into what is here — nothing already on this device is lost.",
    imported: "Restored {count} records",
    importFailed: "That file could not be read",
    deleteAll: "Delete everything on this device",
    deleteAllHint:
      "The company, every customer, invoice and template. A folder or Dropbox copy is left as it is.",
    deleteAllConfirm: "Delete everything?",
    deleted: "Everything deleted",
    developer: "Developer",
    devMode: "Developer mode",
    devModeHint: "Shows the log and the document's size.",
    captureLogs: "Capture console output",
    captureLogsHint: "Mirrors console lines into the log below.",
    documentSize: "Document size",
    about: "About",
    version: "Version",
    build: "Build",
    privacy:
      "Nothing leaves this device unless you connect a folder or a Dropbox of your own. No account, no analytics, no server.",
  },

  sync: {
    syncedTo: "Kept in {name}",
    provider: {
      local: "This device",
      folder: "Folder",
      dropbox: "Dropbox",
    },
  },

  update: {
    available: "A new version is ready",
    reload: "Reload",
  },
} as const;

/** The catalog's shape with every leaf widened to `string`, so a translation
 *  can say something different at every key and still type-check. */
export type Catalog = Widen<typeof en>;
