// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  AuthError,
  ConflictError,
  RateLimitError,
  clearDirectoryHandle,
  completeDropboxAuth,
  createDropboxAdapter,
  createFolderAdapter,
  describeStorageError,
  ensurePermission,
  hasPendingDropboxAuth,
  isFolderBackendAvailable,
  isOfflineError,
  loadDirectoryHandle,
  localCacheKey,
  saveDirectoryHandle,
  startDropboxAuth,
  withLocalCache,
  type StorageAdapter,
} from "@niclaslindstedt/oss-framework/storage";
import type {
  ConnectionProbeResult,
  SaveStatus,
  SyncLocation,
} from "@niclaslindstedt/oss-framework/sync";

import { logStore } from "./log.ts";
import { mergeDocs } from "./merge.ts";
import { parseDoc, serializeDoc } from "./migrations.ts";
import type { DocStore } from "./useDocStore.ts";

// The app's sync engine — the state machine the framework's `SyncStatus`
// glyph and `SyncDetailsModal` command centre paint over. The device's
// document (IndexedDB, written by `useDocStore`) is always the working copy;
// when a backend is connected the engine pushes the serialized document
// there (debounced on the store's edit counter) and pulls the backend's
// copy on mount. A local folder and Dropbox both ride the framework's
// storage adapters, so the code below is provider-agnostic past the two
// `create*Adapter` calls.
//
// Reconciliation is a per-record merge (see `merge.ts`), not a "pick a side"
// prompt: each customer, invoice and template carries its own `updatedAt`,
// and the revisions are a union, so two devices that each edited something
// between syncs both keep it without anyone being asked to choose.
//
// The folder is the one backend with no account: a directory the reader
// picked, remembered in IndexedDB as a handle, whose permission the browser
// may ask for again on the next visit — which the engine reads as the same
// "reconnect needed" a lapsed OAuth session is.

const syncLog = logStore.createLogger("sync");

export type SyncBackendId = "local" | "folder" | "dropbox";

const BACKEND_KEY = "invoice:sync:backend";
const DROPBOX_TOKENS_KEY = "invoice:sync:dropbox";

/** How long after the last edit a push is sent. Long enough to coalesce a
 *  burst of keystrokes on an invoice into one request. */
const SAVE_DEBOUNCE_MS = 1200;

/** The document's file name on a backend. */
export const CLOUD_FILE_NAME = "invoice.json";

// The Dropbox app identity, injected at build time. Without it the backend
// is hidden rather than offered and then failing at connect time.
export const DROPBOX_APP_KEY: string =
  (import.meta.env.VITE_DROPBOX_APP_KEY as string | undefined) ?? "";

// Dropbox fixes the app-folder name from the app's own configuration (an
// "App folder"-scoped app lives under `Apps/<name>/`), so it isn't always
// `invoice`. Inject the real name at build time so the displayed location
// points at the folder that actually exists.
export const DROPBOX_APP_FOLDER: string =
  (import.meta.env.VITE_DROPBOX_APP_FOLDER as string | undefined)?.trim() ||
  "invoice";

/** Which backends this build can offer: the device always, a folder where
 *  the browser has the File System Access API, Dropbox where a client id
 *  was configured. */
export const AVAILABLE_BACKENDS: SyncBackendId[] = [
  "local",
  ...(isFolderBackendAvailable() ? (["folder"] as const) : []),
  ...(DROPBOX_APP_KEY ? (["dropbox"] as const) : []),
];

type DropboxTokens = { accessToken: string; refreshToken: string | null };

function readBackend(): SyncBackendId {
  try {
    const raw = localStorage.getItem(BACKEND_KEY);
    return raw === "dropbox" || raw === "folder" ? raw : "local";
  } catch {
    return "local";
  }
}

function writeBackend(backend: SyncBackendId): void {
  try {
    localStorage.setItem(BACKEND_KEY, backend);
  } catch {
    // The choice does not survive a reload; the document is unaffected.
  }
}

function readDropboxTokens(): DropboxTokens | null {
  try {
    const raw = localStorage.getItem(DROPBOX_TOKENS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DropboxTokens;
    return typeof parsed.accessToken === "string" ? parsed : null;
  } catch {
    return null;
  }
}

function writeDropboxTokens(tokens: DropboxTokens | null): void {
  if (tokens) localStorage.setItem(DROPBOX_TOKENS_KEY, JSON.stringify(tokens));
  else localStorage.removeItem(DROPBOX_TOKENS_KEY);
}

export type SyncEngine = {
  backend: SyncBackendId;
  /** The provider's name for the glyph and the command centre — the app's
   *  catalog supplies it (`providerName`), the engine only says which. */
  connected: boolean;
  status: SaveStatus;
  statusDetail: string | null;
  /** Local edits the backend hasn't got yet. */
  dirty: boolean;
  /** The backend is unreachable and we're on the on-device copy. */
  offline: boolean;
  location: SyncLocation;
  /** The picked folder's name, for the location line. */
  folderName: string | null;
  available: SyncBackendId[];
  /** Start the connect flow for a backend, or drop back to the device. */
  connect: (backend: SyncBackendId) => Promise<void>;
  disconnect: () => void;
  /** Flush queued edits now. */
  saveNow: () => void;
  /** Re-read the backend's copy and merge it in. */
  reload: () => Promise<void>;
  /** Re-issue the backend grant after the session lapsed. */
  reconnect: () => Promise<void>;
  /** Actively re-probe reachability, for the "Check connection" button. */
  checkConnection: () => Promise<ConnectionProbeResult>;
};

export function useSyncEngine(store: DocStore): SyncEngine {
  const [backend, setBackendState] = useState<SyncBackendId>(readBackend);
  const [dropboxTokens, setDropboxTokens] = useState<DropboxTokens | null>(
    readDropboxTokens,
  );
  // The picked directory, once its handle has been read back and its
  // permission confirmed. Null until then, and null when the browser wants
  // asking again — which `reconnect` does, inside a click.
  const [folder, setFolder] = useState<FileSystemDirectoryHandle | null>(null);
  const [folderName, setFolderName] = useState<string | null>(null);

  const [status, setStatus] = useState<SaveStatus>("idle");
  const [statusDetail, setStatusDetail] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [dirty, setDirty] = useState(false);

  // The backend revision the next push is based on. Until the mount pull has
  // resolved it, a push would carry an unknown base revision — which the
  // adapter rejects as a conflict once a document exists — so pushes are held
  // behind `baselineReady`. The edit is safe in the device's copy meanwhile.
  const baseRevision = useRef<string | undefined>(undefined);
  const [baselineReady, setBaselineReady] = useState(false);
  const pushedEdit = useRef(0);
  const dataRef = useRef(store.data);
  dataRef.current = store.data;

  // Read the remembered folder handle back on boot. Its permission can only
  // be *queried* here — asking needs a gesture — so a handle the browser
  // wants re-confirming lands as "reconnect needed" rather than as a folder.
  useEffect(() => {
    if (backend !== "folder") return;
    let alive = true;
    void (async () => {
      const handle = await loadDirectoryHandle();
      if (!alive) return;
      if (!handle) {
        setStatus("auth-error");
        setStatusDetail("The folder is no longer remembered");
        return;
      }
      setFolderName(handle.name);
      const permission = await ensurePermission(handle, false);
      if (!alive) return;
      if (permission === "granted") setFolder(handle);
      else {
        setStatus("auth-error");
        setStatusDetail("The folder needs its permission confirmed");
      }
    })();
    return () => {
      alive = false;
    };
  }, [backend]);

  const adapter: StorageAdapter | null = useMemo(() => {
    if (backend === "dropbox" && dropboxTokens) {
      const auth = {
        accessToken: dropboxTokens.accessToken,
        refreshToken: dropboxTokens.refreshToken,
        onAccessTokenRefreshed: (accessToken: string) => {
          const next = { ...dropboxTokens, accessToken };
          writeDropboxTokens(next);
          setDropboxTokens(next);
        },
      };
      const cloud = createDropboxAdapter(auth, {
        appKey: DROPBOX_APP_KEY || undefined,
        fileName: CLOUD_FILE_NAME,
        logger: logStore.createLogger("dropbox"),
      });
      return withLocalCache(cloud, {
        storage: localStorage,
        key: localCacheKey("dropbox", "invoice"),
      });
    }
    if (backend === "folder" && folder) {
      return createFolderAdapter(folder, {
        fileName: CLOUD_FILE_NAME,
        logger: logStore.createLogger("folder"),
        onPermissionLost: () => {
          setFolder(null);
          setStatus("auth-error");
          setStatusDetail("The folder's permission was withdrawn");
        },
      });
    }
    return null;
  }, [backend, dropboxTokens, folder]);

  const connected = adapter !== null;

  // Turn a thrown error into the matching surface state. Every failure path
  // funnels through here so the glyph, the command centre, and the log always
  // agree on what went wrong.
  const reportFailure = useCallback((err: unknown, what: string): void => {
    const detail = describeStorageError(err);
    syncLog.error(`${what} failed — ${detail}`);
    setStatusDetail(detail);
    if (err instanceof AuthError) {
      setStatus("auth-error");
      return;
    }
    if (err instanceof RateLimitError) {
      setStatus("throttled");
      return;
    }
    if (isOfflineError(err)) {
      setOffline(true);
      setStatus("idle");
      return;
    }
    setStatus("error");
  }, []);

  /** Adopt a remote snapshot into the local document by merging it record
   *  by record, and report whether the merge left anything the remote
   *  doesn't have. */
  const adoptRemote = useCallback(
    (text: string): boolean => {
      const remote = parseDoc(text);
      const merged = mergeDocs(dataRef.current, remote);
      const mergedText = serializeDoc(merged);
      if (mergedText !== serializeDoc(dataRef.current)) {
        store.replaceAll(merged);
      }
      return mergedText !== serializeDoc(remote);
    },
    [store],
  );

  const push = useCallback(
    async (editAtSend: number): Promise<void> => {
      if (!adapter) return;
      setStatus("saving");
      try {
        const snapshot = await adapter.save(
          serializeDoc(dataRef.current),
          baseRevision.current,
        );
        baseRevision.current = snapshot.revision;
        pushedEdit.current = editAtSend;
        setStatus("saved");
        setStatusDetail(null);
        setOffline(false);
        setDirty(false);
        syncLog.info("pushed document");
      } catch (err) {
        if (err instanceof ConflictError) {
          // The backend moved on. Merge its copy in and let the debounce fire
          // again with the merged document on the newer base revision.
          syncLog.warn("conflict — merging the backend's copy");
          baseRevision.current = err.remote.revision;
          adoptRemote(err.remote.text);
          setStatus("idle");
          setStatusDetail(null);
          return;
        }
        reportFailure(err, "save");
      }
    },
    [adapter, adoptRemote, reportFailure],
  );

  const pull = useCallback(async (): Promise<void> => {
    if (!adapter) return;
    try {
      const snapshot = await adapter.load();
      baseRevision.current = snapshot?.revision;
      setOffline(Boolean(snapshot?.offline));
      if (snapshot) {
        const localAhead = adoptRemote(snapshot.text);
        if (localAhead) setDirty(true);
        syncLog.info("pulled document");
      } else {
        // Nothing stored yet: this device's copy is the first one up.
        setDirty(true);
      }
      setStatusDetail(null);
    } catch (err) {
      reportFailure(err, "load");
    } finally {
      setBaselineReady(true);
    }
  }, [adapter, adoptRemote, reportFailure]);

  // Complete a Dropbox OAuth redirect: trade the `?code=` for tokens, persist
  // them, and adopt the backend. Runs once on boot when a flow is mid-flight.
  useEffect(() => {
    if (!DROPBOX_APP_KEY || !hasPendingDropboxAuth()) return;
    const code = new URLSearchParams(window.location.search).get("code");
    if (!code) return;
    void (async () => {
      try {
        const result = await completeDropboxAuth(DROPBOX_APP_KEY, code);
        const tokens: DropboxTokens = {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken ?? null,
        };
        writeDropboxTokens(tokens);
        setDropboxTokens(tokens);
        writeBackend("dropbox");
        setBackendState("dropbox");
        syncLog.info("dropbox: connected");
      } catch (err) {
        syncLog.error(`dropbox: connect failed — ${describeStorageError(err)}`);
      } finally {
        // Drop the `?code=` from the address bar either way.
        window.history.replaceState(null, "", window.location.pathname);
      }
    })();
  }, []);

  // Baseline read whenever the active adapter changes (connect, reconnect,
  // provider switch). Held until the store has loaded: merging a backend's
  // copy into the empty starter would push the starter's absence of records
  // as a fact.
  useEffect(() => {
    setBaselineReady(false);
    if (!adapter) {
      if (backend === "local") {
        setStatus("idle");
        setStatusDetail(null);
      }
      setDirty(false);
      setOffline(false);
      return;
    }
    if (!store.loaded) return;
    void pull();
  }, [adapter, backend, store.loaded, pull]);

  // Local edits mark the document dirty regardless of backend, so switching
  // one on later still pushes what's already here.
  useEffect(() => {
    if (store.editCount === pushedEdit.current) return;
    setDirty(true);
  }, [store.editCount]);

  // Debounced auto-push. Held while there's no connected backend, before the
  // baseline read resolves, or while a blocking fault stands in the way — the
  // edit is already safe on the device, so waiting costs nothing.
  useEffect(() => {
    if (!adapter || !baselineReady || !dirty) return;
    if (status === "saving" || status === "auth-error") return;
    const editAtSend = store.editCount;
    const timer = setTimeout(() => void push(editAtSend), SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [adapter, baselineReady, dirty, status, store.editCount, push]);

  const connect = useCallback(async (next: SyncBackendId): Promise<void> => {
    if (next === "local") {
      writeBackend("local");
      setBackendState("local");
      return;
    }
    if (next === "folder") {
      if (!isFolderBackendAvailable()) {
        throw new Error("This browser cannot open a folder");
      }
      // Inside the click: the picker and the permission both need a
      // gesture, and the handle is remembered so the next visit finds it.
      const handle = await (
        window as unknown as {
          showDirectoryPicker: (options?: {
            mode?: "read" | "readwrite";
          }) => Promise<FileSystemDirectoryHandle>;
        }
      ).showDirectoryPicker({ mode: "readwrite" });
      const permission = await ensurePermission(handle, true);
      if (permission !== "granted")
        throw new Error("The folder was not allowed");
      await saveDirectoryHandle(handle);
      writeBackend("folder");
      setFolderName(handle.name);
      setFolder(handle);
      setStatus("idle");
      setStatusDetail(null);
      setBackendState("folder");
      syncLog.info(`folder: connected to ${handle.name}`);
      return;
    }
    if (!DROPBOX_APP_KEY) throw new Error("Dropbox is not configured");
    // Redirects away; `completeDropboxAuth` picks the flow up on return.
    await startDropboxAuth(DROPBOX_APP_KEY, syncLog);
  }, []);

  const disconnect = useCallback((): void => {
    // Only the credentials go: the document stays on this device, and the
    // copy already in the folder or the cloud is left exactly where it is.
    writeDropboxTokens(null);
    void clearDirectoryHandle();
    writeBackend("local");
    setDropboxTokens(null);
    setFolder(null);
    setFolderName(null);
    setBackendState("local");
    setStatus("idle");
    setStatusDetail(null);
    syncLog.info("disconnected — your invoices stay on this device");
  }, []);

  const saveNow = useCallback((): void => {
    if (!adapter || !baselineReady) return;
    void push(store.editCount);
  }, [adapter, baselineReady, push, store.editCount]);

  const reload = useCallback(async (): Promise<void> => {
    await pull();
  }, [pull]);

  const reconnect = useCallback(async (): Promise<void> => {
    if (backend === "folder") {
      // The handle is still remembered; only its permission lapsed. Ask
      // again, inside the click this runs in, before falling back to a
      // fresh pick.
      const handle = await loadDirectoryHandle();
      if (handle && (await ensurePermission(handle, true)) === "granted") {
        setFolderName(handle.name);
        setFolder(handle);
        setStatus("idle");
        setStatusDetail(null);
        return;
      }
    }
    await connect(backend);
  }, [backend, connect]);

  const checkConnection =
    useCallback(async (): Promise<ConnectionProbeResult> => {
      if (!adapter?.probe) return offline ? "offline" : "online";
      try {
        const reachable = await adapter.probe();
        if (reachable) {
          setOffline(false);
          setStatusDetail(null);
          await pull();
          return "online";
        }
        setOffline(true);
        return "offline";
      } catch (err) {
        if (err instanceof AuthError) {
          setStatus("auth-error");
          setStatusDetail(describeStorageError(err));
          return "auth-error";
        }
        setOffline(true);
        return "offline";
      }
    }, [adapter, offline, pull]);

  const path =
    backend === "dropbox"
      ? `Apps/${DROPBOX_APP_FOLDER}/${CLOUD_FILE_NAME}`
      : backend === "folder"
        ? `${folderName ?? "…"}/${CLOUD_FILE_NAME}`
        : "";

  return {
    backend,
    connected,
    status,
    statusDetail,
    dirty,
    offline,
    location: { path },
    folderName,
    // The stored choice is always offered even when this browser cannot
    // make it — a segmented control whose value is not one of its options
    // draws as nothing selected, which would read as "your invoices are
    // nowhere".
    available: AVAILABLE_BACKENDS.includes(backend)
      ? AVAILABLE_BACKENDS
      : [...AVAILABLE_BACKENDS, backend],
    connect,
    disconnect,
    saveNow,
    reload,
    reconnect,
    checkConnection,
  };
}
