#!/usr/bin/env node
// Generate the PWA install icons and the social-preview image from the same
// geometry as public/icons/icon.svg — an invoice: a sheet with three lines
// of text and an amount, drawn in flat green on the app's dark surface. Pure Node (zlib + a minimal
// PNG encoder), so the pipeline needs no native image dependencies. Rerun
// with `npm run icons` / `make icons` after changing the mark.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const iconsDir = join(root, "public", "icons");
mkdirSync(iconsDir, { recursive: true });

// The install tile's surface (the manifest's background/theme colour, see
// pwa-plugin.ts) and the mark's ink — flat green, the same treatment as the
// sibling apps, so they read as one family on a home screen. Kept in lockstep
// with the fill/stroke colours in public/icons/icon.svg.
//
// Flat is the whole treatment: one ink, painted at full strength wherever the
// mark covers a pixel and not at all where it doesn't. The only intermediate
// values in the output are antialiasing along an edge. No gradient, no bevel,
// no drop shadow — a home screen already lights icons its own way, and a mark
// carrying its own fake light reads as muddy next to one that doesn't.
const BG = [18, 16, 26]; // #12101a
const INK = [62, 240, 127]; // #3ef07f

// --- minimal PNG encoder ----------------------------------------------------

const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

// Pack already-encoded PNG blobs into a single ICONDIR (a .ico file). PNG-
// compressed entries are honoured by every current browser and by Windows
// since Vista, so one .ico carrying 16/32/48 px PNGs is the whole legacy-
// favicon story — the raster fallback for tabs that don't render the SVG mark.
function encodeIco(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // resource type: icon
  header.writeUInt16LE(pngs.length, 4);
  const dir = Buffer.alloc(16 * pngs.length);
  let offset = header.length + dir.length;
  pngs.forEach(({ size, data }, i) => {
    const e = dir.subarray(i * 16);
    e[0] = size >= 256 ? 0 : size; // width  (0 encodes 256)
    e[1] = size >= 256 ? 0 : size; // height (0 encodes 256)
    e[2] = 0; // palette size (0 for a true-colour PNG entry)
    e[3] = 0; // reserved
    e.writeUInt16LE(1, 4); // colour planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(data.length, 8); // bytes in this entry
    e.writeUInt32LE(offset, 12); // byte offset from the file start
    offset += data.length;
  });
  return Buffer.concat([header, dir, ...pngs.map((p) => p.data)]);
}

function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// --- the mark ----------------------------------------------------------------

// The mark: an invoice — a sheet of paper as a rounded outline, and a dollar
// sign on it, the way a receipt says what it is for. Analytic, so `inStroke`
// below is the definition rather than a sampling of one: a pixel is on the
// mark if it lies within half a stroke of the sheet's outline, of either of
// the two bowls the S is made of, of the spine between them, or of the bar
// through it (round caps
// included). That is what an SVG renderer does with public/icons/icon.svg
// too, which is why the .ico and the .svg agree.
//
// Everything below is unit space — the 100 viewBox divided by 100 — and is
// mirrored into public/icons/icon.svg and src/app/icons.tsx by hand.

/** The sheet: its edges and corner radius. */
const SHEET = { x0: 0.28, y0: 0.16, x1: 0.72, y1: 0.84, r: 0.07 };
/** Half the stroke width (SVG stroke-width 10 on the 100 viewBox). */
const STROKE_HALF = 0.05;
/** The sign's stroke is a touch finer than the sheet's, so the S keeps its
 *  counters at 16 px (SVG stroke-width 6). */
const SIGN_HALF = 0.03;
/** The S: two bowls of the same radius on the same axis, the top one
 *  opening to the right and the bottom one to the left, each sweeping 225°
 *  from its terminal to where the spine takes over. Angles are degrees in
 *  screen space (y down), sweeping from `from` to `to` the increasing way
 *  round. */
const S_R = 0.1;
const S_ARCS = [
  { cx: 0.5, cy: 0.395, from: 100, to: 325 },
  { cx: 0.5, cy: 0.605, from: 280, to: 145 },
];
/** The spine: the short diagonal from the top bowl's end to the bottom
 *  bowl's start, both of which head down and to the right, so the stroke
 *  never doubles back. */
const SPINE = [
  [0.4826, 0.4935],
  [0.5174, 0.5065],
];
/** The bar through the S. */
const BAR = [
  [0.5, 0.26],
  [0.5, 0.74],
];

/** Distance from (x, y) to the segment a–b. */
function segmentDistance(x, y, [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t =
    len2 === 0
      ? 0
      : Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len2));
  return Math.hypot(x - (ax + t * dx), y - (ay + t * dy));
}

/** Distance from (x, y) to an arc of a circle: to the ring where the point's
 *  bearing falls inside the sweep, else to the nearer end of the arc. */
function arcDistance(x, y, { cx, cy, from, to }) {
  const bearing = ((Math.atan2(y - cy, x - cx) * 180) / Math.PI + 360) % 360;
  const sweep = (to - from + 360) % 360;
  const along = (bearing - from + 360) % 360;
  if (along <= sweep) return Math.abs(Math.hypot(x - cx, y - cy) - S_R);
  const end = (deg) => [
    cx + S_R * Math.cos((deg * Math.PI) / 180),
    cy + S_R * Math.sin((deg * Math.PI) / 180),
  ];
  return Math.min(
    ...[from, to].map((deg) =>
      Math.hypot(...[x, y].map((v, i) => v - end(deg)[i])),
    ),
  );
}

/** Signed distance from (x, y) to the sheet's rounded outline: negative
 *  inside, positive outside, zero on the line. */
function sheetDistance(x, y) {
  const { x0, y0, x1, y1, r } = SHEET;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const hx = (x1 - x0) / 2 - r;
  const hy = (y1 - y0) / 2 - r;
  const qx = Math.abs(x - cx) - hx;
  const qy = Math.abs(y - cy) - hy;
  return (
    Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) +
    Math.min(Math.max(qx, qy), 0) -
    r
  );
}

/** Whether unit-space point (x, y) lands on the mark. */
function inStroke(x, y) {
  if (Math.abs(sheetDistance(x, y)) < STROKE_HALF) return true;
  if (segmentDistance(x, y, BAR[0], BAR[1]) < SIGN_HALF) return true;
  if (segmentDistance(x, y, SPINE[0], SPINE[1]) < SIGN_HALF) return true;
  return S_ARCS.some((arc) => arcDistance(x, y, arc) < SIGN_HALF);
}

// Render size×size RGBA. `pad` insets the mark (maskable icons need a safe
// zone); `radius` rounds the background corners (0 = square, for maskable).
function renderIcon(size, { pad = 0.08, radius = 0.2 } = {}) {
  const rgba = Buffer.alloc(size * size * 4);
  const r = radius * size;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const i = (py * size + px) * 4;
      // Rounded-rect background coverage, as the signed distance from the
      // pixel's centre to the tile's edge — half a pixel either side of zero
      // is the antialiased rim.
      const half = size / 2;
      const qx = Math.abs(px + 0.5 - half) - (half - r);
      const qy = Math.abs(py + 0.5 - half) - (half - r);
      const outside =
        Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) +
        Math.min(Math.max(qx, qy), 0) -
        r;
      const bgAlpha = Math.max(0, Math.min(1, 0.5 - outside));
      // Mark coverage in padded unit space, 3×3 supersampled so the sheet's
      // corners and the sign's curves stay smooth at every size.
      let hit = 0;
      for (const oy of [1 / 6, 0.5, 5 / 6]) {
        for (const ox of [1 / 6, 0.5, 5 / 6]) {
          const sx = ((px + ox) / size - pad) / (1 - 2 * pad);
          const sy = ((py + oy) / size - pad) / (1 - 2 * pad);
          if (inStroke(sx, sy)) hit += 1 / 9;
        }
      }
      const [br, bg2, bb] = BG;
      const [fr, fg2, fb] = INK;
      rgba[i] = Math.round(br + (fr - br) * hit);
      rgba[i + 1] = Math.round(bg2 + (fg2 - bg2) * hit);
      rgba[i + 2] = Math.round(bb + (fb - bb) * hit);
      rgba[i + 3] = Math.round(bgAlpha * 255);
    }
  }
  return encodePng(size, size, rgba);
}

// The 1200×630 Open Graph card: the mark on the left, and on the right the
// shape of an invoice's lines — five rows of bars of differing lengths with
// an amount at the end of each, and a heavier total under a rule.
function renderOg() {
  const w = 1200;
  const h = 630;
  const rgba = Buffer.alloc(w * h * 4);
  const markSize = 440;
  const markX = 110;
  const markY = (h - markSize) / 2;

  const rowsX = 640;
  const rowsY = 150;
  const ROW = 34;
  const GAP = 30;
  const widths = [300, 220, 260, 180, 240];
  const amountW = 90;
  const rowsRight = 1090;
  const totalY = rowsY + 5 * (ROW + GAP) + 24;

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const i = (py * w + px) * 4;
      let [cr, cg, cb] = BG;

      if (
        px >= markX &&
        px < markX + markSize &&
        py >= markY &&
        py < markY + markSize
      ) {
        const sx = (px - markX) / markSize;
        const sy = (py - markY) / markSize;
        if (inStroke(sx, sy)) [cr, cg, cb] = INK;
      }

      let alpha = 0;
      const row = Math.floor((py - rowsY) / (ROW + GAP));
      const inRow = py - rowsY - row * (ROW + GAP) < ROW;
      if (row >= 0 && row < 5 && inRow && py >= rowsY) {
        if (px >= rowsX && px < rowsX + widths[row]) alpha = 0.45;
        if (px >= rowsRight - amountW && px < rowsRight) alpha = 0.8;
      }
      // The rule above the total, and the total itself.
      if (px >= rowsX && px < rowsRight && Math.abs(py - (totalY - 18)) < 2) {
        alpha = 0.6;
      }
      if (
        py >= totalY &&
        py < totalY + ROW &&
        px >= rowsRight - amountW * 1.6 &&
        px < rowsRight
      ) {
        alpha = 1;
      }
      if (alpha > 0) {
        cr = Math.round(BG[0] + (INK[0] - BG[0]) * alpha);
        cg = Math.round(BG[1] + (INK[1] - BG[1]) * alpha);
        cb = Math.round(BG[2] + (INK[2] - BG[2]) * alpha);
      }

      rgba[i] = cr;
      rgba[i + 1] = cg;
      rgba[i + 2] = cb;
      rgba[i + 3] = 255;
    }
  }
  return encodePng(w, h, rgba);
}

writeFileSync(join(iconsDir, "pwa-192.png"), renderIcon(192));
writeFileSync(join(iconsDir, "pwa-512.png"), renderIcon(512));
writeFileSync(
  join(iconsDir, "pwa-512-maskable.png"),
  // The maskable safe zone is the centre circle of 80% diameter, i.e. radius
  // 0.4. The mark's furthest ink from centre — a corner of the sheet — sits
  // at about 0.4 of the padded square, so this inset keeps it inside the
  // zone whatever shape the launcher crops to.
  renderIcon(512, { pad: 0.12, radius: 0 }),
);
writeFileSync(
  join(iconsDir, "apple-touch-icon-180.png"),
  renderIcon(180, { pad: 0.1, radius: 0 }),
);
writeFileSync(join(root, "public", "og.png"), renderOg());

// favicon.ico — the browser-tab fallback for engines that ignore the SVG
// favicon (Safari, search crawlers) and for the implicit /favicon.ico request.
writeFileSync(
  join(root, "public", "favicon.ico"),
  encodeIco(
    [16, 32, 48].map((size) => ({
      size,
      data: renderIcon(size, { pad: 0.06 }),
    })),
  ),
);
console.log(
  "icons: wrote pwa-192/512/512-maskable, apple-touch-180, og.png, favicon.ico",
);
