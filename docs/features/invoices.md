# Invoices

The list, newest first — drafts ahead of everything sent — filtered by where
each invoice is in its life: all, drafts, sent, paid. A card shows the number
(or "Draft"), the status, the customer, the date that matters for its status
(issued, due, paid) and the amount to pay.

**New invoice** starts a draft against the first customer, seeded from the
default template, and opens it in the editor. It is greyed out until there is
a company and a customer, and the empty state says which.

An invoice's life: a **draft** reads its sources live and has no number;
**sending** numbers it and freezes what it says; from there it is **marked
paid**, **cancelled**, or **credited** with a credit note. A cancelled invoice
can be reopened as a draft; a draft can be deleted (it has no number, so it
leaves no gap). Every step is an event under the page. See
[`../invoice-model.md`](../invoice-model.md).
