# Configuration

The app runs with no configuration at all. What follows is what a _deploy_ can
set at build time, what a _user_ can set at runtime, and where the app keeps
its state.

## Build-time variables

Read by Vite at build time through `import.meta.env` (declared in
`src/vite-env.d.ts`). All optional.

| Variable                  | Effect                                                                                                      |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `VITE_DROPBOX_APP_KEY`    | The Dropbox app key (a PKCE public client). Unset hides the Dropbox backend in Settings → Storage.          |
| `VITE_DROPBOX_APP_FOLDER` | The Dropbox app-folder name (`Apps/<name>/`), fixed by your Dropbox app's configuration. Default `invoice`. |
| `VITE_BASE`               | The deploy base path. `pages.yml` sets `/` for the release and `/preview/` for the rolling main build.      |
| `VITE_PWA_IGNORE_PATHS`   | Sibling deploy paths the root service worker must disown (`/preview/`). Only the root release sets it.      |

The OAuth identifier is public by design: the flow is PKCE, so there is no
client secret anywhere in the pipeline. The folder backend needs no variable:
it is offered wherever the browser has the File System Access API.

## Runtime settings

Under the **⚙** on the top bar. Persisted per device in localStorage
(`invoice:settings`), never synced.

| Setting                | Values                           | Default                   |
| ---------------------- | -------------------------------- | ------------------------- |
| Theme                  | Light / Dark / Device            | Device                    |
| Language               | English / Svenska                | detected from the browser |
| Storage                | This device / A folder / Dropbox | This device               |
| Default template       | any template                     | the first by name         |
| Developer mode         | on / off                         | off                       |
| Capture console output | on / off (developer mode)        | off                       |

The company, the customers, the templates and the invoices are **data**, not
settings: they live in the document, so they sync and back up together.

## Storage keys

| Key                                                 | Holds                                                            |
| --------------------------------------------------- | ---------------------------------------------------------------- |
| IndexedDB `invoice` / `document` / `doc`            | The document: company, customers, invoices, templates, revisions |
| IndexedDB `invoice` / `document` / `doc:unreadable` | A quarantined copy of a document this build could not parse      |
| IndexedDB (the framework's handle store)            | The picked folder's handle                                       |
| `invoice:settings`                                  | The runtime settings above                                       |
| `invoice:language`                                  | The language choice                                              |
| `invoice:sync:backend`                              | Which backend is active (`local`, `folder`, `dropbox`)           |
| `invoice:sync:dropbox`                              | Dropbox tokens                                                   |
| `invoice:logs`                                      | The in-app log buffer                                            |
| `oss:cache:dropbox:invoice`                         | The framework's offline cache of the Dropbox copy                |
