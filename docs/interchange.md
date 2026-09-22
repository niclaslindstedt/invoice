# The interchange format

The file another app hands this one to fill an invoice with. The Time app
writes one from a range of hours (**Export for Invoice** on its Report
screen); dropping it onto a draft here — or picking it with **Import hours
from a file** — turns each line into an invoice line at the customer's default
price, in the region's usual VAT rate. The format knows nothing about money:
the exporter says what was delivered, and the invoice says what it costs.

## The file

`application/json`, any name, conventionally `<project>_<period>_invoice.json`.

```json
{
  "format": "invoice-lines",
  "version": 1,
  "source": { "app": "time", "version": "0.1.0" },
  "exportedAt": "2026-10-01T08:00:00.000Z",
  "project": { "name": "Acme" },
  "period": {
    "from": "2026-09-01",
    "to": "2026-09-30",
    "label": "September 2026"
  },
  "lines": [
    {
      "description": "Acme — September 2026",
      "quantity": 128.5,
      "unit": "hour"
    },
    {
      "description": "1 Sep",
      "quantity": 8.25,
      "unit": "hour",
      "date": "2026-09-01"
    }
  ]
}
```

| Field          | Type                                     | Meaning                                                                                                                                                                    |
| -------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `format`       | `"invoice-lines"`                        | What this is. Anything else is refused.                                                                                                                                    |
| `version`      | integer ≥ 1                              | The format's major version. A reader accepts any it knows; a newer one is refused with a message.                                                                          |
| `source`       | `{ app, version? }`                      | Who wrote it, for the record.                                                                                                                                              |
| `exportedAt`   | ISO 8601                                 | When.                                                                                                                                                                      |
| `project.name` | string                                   | What the lines are for. Named in the toast.                                                                                                                                |
| `period`       | `{ from, to, label }`                    | `YYYY-MM-DD` bounds and a human label. The label becomes the invoice's **period** when it has none.                                                                        |
| `lines[]`      | `{ description, quantity, unit, date? }` | One invoice line each. `unit` is `hour`, `day` or `piece`; the invoice prints it through its own catalog, so a Swedish invoice says "tim" for an hour exported in English. |

## What a reader does

- Refuses a file that is not JSON, not this format, or a newer major version,
  and says which.
- Keeps every well-formed line and drops the rest; a missing `project` or
  `period` is an empty string, not an error.
- Prices every line at the customer's **default price per unit** (zero when
  none — the toast then says to set one) and the region's usual VAT rate.
- Appends the lines to the draft; a sent invoice takes none.

## Versioning

A change that a version-1 reader would misread bumps `version` to 2. Adding an
optional field does not. The reader is `src/app/interchange.ts`; the writer in
the Time app is `src/app/invoiceExport.ts`. Keep the two in step.
