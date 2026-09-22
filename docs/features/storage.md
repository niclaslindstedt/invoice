# Storage

Under **Settings → Where your invoices are kept**. The device always keeps a
copy, in IndexedDB. Optionally, a second place:

- **A folder** — a directory on this computer, picked in the browser's own
  dialog (Chrome and Edge; the option is absent where the browser cannot open
  a folder). The document is written to `invoice.json` in it. Point it at a
  folder another service syncs and two computers share the document through
  the file.
- **Dropbox** — your own account, an app folder under `Apps/`, connected with
  a PKCE consent flow. Offered only in a build with a Dropbox app key.

**Save now**, **Reload** and **Disconnect** sit under the choice; the storage
glyph on the top bar shows the state and opens the same controls. Disconnecting
drops the credentials or the folder handle and nothing else — the document
stays on this device and the copy stays where it is.

**Your data** downloads the document as a JSON backup, restores one by
merging it in, or deletes everything on this device. See
[`../sync.md`](../sync.md) for how two copies reconcile.
