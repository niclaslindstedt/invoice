// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { render } from "preact";

// The UI family (Inter) is imported statically so it ships in the main bundle
// and precaches for offline first paint.
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-ext-400.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "@fontsource/inter/latin-ext-700.css";

// The page's typefaces — the set an invoice may be set in (`TYPEFACE` in
// `app/layout.ts`): a serif, a didone for headings, a geometric sans, and a
// mono, beside Inter above. Self-hosted from `@fontsource` and served from
// this origin: an invoice has to print the same on every device, and a
// webfont host is exactly the request this app never makes. Latin and
// Latin Extended, because a Swedish address has å, ä and ö in it.
import "@fontsource/source-serif-4/latin-400.css";
import "@fontsource/source-serif-4/latin-ext-400.css";
import "@fontsource/source-serif-4/latin-700.css";
import "@fontsource/playfair-display/latin-700.css";
import "@fontsource/jost/latin-400.css";
import "@fontsource/jost/latin-ext-400.css";
import "@fontsource/jost/latin-600.css";
import "@fontsource/jetbrains-mono/latin-400.css";
import "@fontsource/jetbrains-mono/latin-ext-400.css";
import "@fontsource/jetbrains-mono/latin-700.css";

import "./styles.css";
import { App } from "./App.tsx";
import { LanguageRoot } from "./app/i18n/index.ts";

// In dev no worker registers (`usePwaUpdate` runs disabled), but a worker
// installed by a previous `vite preview` on this origin would keep serving
// stale bytes — unregister any so the dev server always wins. The production
// registration is owned by the framework's `usePwaUpdate` in `App.tsx`,
// against the worker `pwa-plugin.ts` emits.
if (import.meta.env.DEV && "serviceWorker" in navigator) {
  void navigator.serviceWorker
    .getRegistrations()
    .then((regs) => regs.forEach((reg) => void reg.unregister()));
}

const root = document.getElementById("root");
if (!root) throw new Error("missing #root element");

// Preact's own `render` mounts straight into the container — there is no root
// object to create, and no `StrictMode`, which `preact/compat` only aliases
// to a `Fragment`.
render(
  <LanguageRoot>
    <App />
  </LanguageRoot>,
  root,
);
