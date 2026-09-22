# Sync

The device always holds the working copy of the document, in IndexedDB. A
second place is optional: a **folder** you pick on this computer, or your own
**Dropbox**. When one is connected the app keeps a copy of its one document —
`invoice.json` — there, and pulls that copy in when it opens.

## The shape of it

The storage engine (`src/app/useSyncEngine.ts`) reads and writes _around_ the
document store:

- **On open**, and whenever the backend changes, it pulls the copy and merges
  it in (see below).
- **On edit**, it marks the document dirty and pushes it after a 1.2-second
  debounce, so a run of keystrokes on an invoice is one write.
- **On conflict** — the copy moved on since the last pull — it merges the copy
  in and pushes again on the newer revision.
- **Offline**, it keeps working on the device's copy and pushes when the
  network is back. For Dropbox the framework's `withLocalCache` keeps the last
  cloud copy readable offline too.

The framework's storage adapters (`createFolderAdapter`,
`createDropboxAdapter`) own the file system and provider APIs, the token
refresh and the revision checks; the engine is provider-agnostic past the two
`create*` calls.

## The folder

The folder backend is the File System Access API: the browser asks you to
pick a directory, and the app remembers its handle in IndexedDB. On the next
visit the browser may want the permission confirmed again — that shows as
**Reconnect** on the storage glyph, and it needs a click. A folder is a
computer's, not an account's: two computers pointed at the same synced folder
(a Dropbox or OneDrive folder on disk, say) see each other's copy through the
file, and the merge does the rest.

## The merge

Customers, invoices and templates are keyed by id, the company is one record,
and each carries an `updatedAt` timestamp. Two copies merge record by record,
the later edit winning (`src/app/merge.ts`). Revisions merge as a union by
timestamp, so a customer saved on two devices keeps both saves in order.

**The known cost:** a deleted record is an absence, not a tombstone. A
customer deleted on one device comes back from the other on the next sync,
because the deleting device has nothing to say about it. Deletions are rare
here — an invoice is cancelled rather than deleted — but delete on a device
that has already synced, or on both.

## What is sent

Exactly the document: the company, the customers, the invoices, the templates
and the revisions, as JSON. No device identifier, no settings, no logs. The
same file is what **Settings → Download a backup** writes, so it can be read
with any text editor.
