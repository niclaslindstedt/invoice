# The editor

One invoice, as it prints. A draft has two modes over the same page:

**Preview** is the page. **Edit** is the same page with everything on it
alive:

- Above the page, the details card: the customer, a template to apply, the
  dates, the currency, rounding, and the buttons that add a line or import
  hours from a file.
- The look: typeface, accent, paper, and the sections not currently on the
  page, each a chip that puts it back.
- The issues the region still finds — "Ready to send" when there are none.
- The page, with every section in a frame: a **handle** to drag it up or
  down, **arrows** to move it a place at a time, an **eye** to hide it. A
  section the region requires says so instead of offering the eye.
- On the page, the fields are inputs: the lines (description, quantity,
  unit, price, VAT, a discount), the period and references, the note, and —
  in the parties block and the payment block — the company's and the
  customer's own details. Those last are the **sources**: editing the
  customer's city here edits the customer, and the old version goes into its
  history. A field commits when you leave it, so one edit is one revision.

Drop a file exported from the Time app anywhere on the editor and its hours
are appended as lines at the customer's default price; the invoice's period
takes the file's label if it had none. See
[`../interchange.md`](../interchange.md).

The **…** menu: send, print, mark paid, cancel, write a credit note, reopen,
duplicate as a draft, delete a draft. **Print** switches to the preview and
opens the browser's print dialog, where "Save as PDF" makes a file; only the
page goes to the printer.

Once sent, the page is read-only and the invoice carries frozen copies of
both parties. A change is a credit note.
