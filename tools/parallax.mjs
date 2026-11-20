// Project-owned parallax backgrounds, drawn procedurally. Run: `node tools/parallax.mjs` → PNG layers in
// public/assets/own/parallax/. Every layer repeats seamlessly sideways (shapes wrap around the width) and is as tall as a
// level (272 px), pinned to the top of the screen. Cave, far to near: the cave wall, distant stalactites and
// stalagmites, big columns, hanging roots. Dusk forest: the sky behind the tinted forest layers. Deterministic: the same script always writes the same files.
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const H = 272;

// ── Helpers ──────────────────────────────────────────────────────────────────────────────────
const hash = (...n) => {
    let h = 2166136261;
    for (const v of n) { h ^= v + 0x9e3779b9; h = Math.imul(h ^ (h >>> 15), 0x85ebca6b); h ^= h >>> 13; }
    return ((h >>> 0) % 100000) / 100000;
};
const rgb = hex => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];

function canvas (w)
{
    const data = Buffer.alloc(w * H * 4);
    /** Paints a pixel (x wraps around the width, so shapes cross the seam), blending by alpha. */
    const put = (x, y, hex, alpha = 1) => {
        if (y < 0 || y >= H) return;
        const xi = ((Math.round(x) % w) + w) % w, i = (Math.round(y) * w + xi) * 4;
        const [r, g, b] = rgb(hex);
        const a0 = data[i + 3] / 255, a = alpha + a0 * (1 - alpha);
        if (a === 0) return;
        data[i] = Math.round((r * alpha + data[i] * a0 * (1 - alpha)) / a);
        data[i + 1] = Math.round((g * alpha + data[i + 1] * a0 * (1 - alpha)) / a);
        data[i + 2] = Math.round((b * alpha + data[i + 2] * a0 * (1 - alpha)) / a);
        data[i + 3] = Math.round(a * 255);
    };
    return { w, data, put };
}

/** Smooth value noise in [0, 1) that repeats every `w` px sideways (cells must divide the width). */
function noise (x, y, cell, seed, w)
{
    const cols = Math.round(w / cell);
    const gx = x / cell, gy = y / cell;
    const x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
    const v = (ix, iy) => hash(((ix % cols) + cols) % cols, iy, seed);
    const s = t => t * t * (3 - 2 * t);
    const top = v(x0, y0) + (v(x0 + 1, y0) - v(x0, y0)) * s(fx);
    const bottom = v(x0, y0 + 1) + (v(x0 + 1, y0 + 1) - v(x0, y0 + 1)) * s(fx);
    return top + (bottom - top) * s(fy);
}

/** A hanging (from the top) or standing (from the bottom) spike: base width, length, lit edge on the left. */
function spike ({ put }, x, width, length, fromTop, fill, rim, seed)
{
    for (let k = 0; k < length; k++) {
        const t = k / length;
        const half = Math.max(0.5, (width / 2) * Math.pow(1 - t, 0.8) + (hash(k, seed) - 0.5) * 1.5);
        const y = fromTop ? k : H - 1 - k;
        for (let dx = -Math.floor(half); dx <= Math.floor(half); dx++) put(x + dx, y, dx === -Math.floor(half) ? rim : fill);
    }
}

/** A soft glow (dithered rings, so it stays pixel art) around a crystal cluster. */
function glow ({ put }, cx, cy, radius, hex, strength)
{
    for (let y = -radius; y <= radius; y++) for (let x = -radius; x <= radius; x++) {
        const d = Math.hypot(x, y) / radius;
        if (d > 1) continue;
        const a = strength * (1 - d) * (1 - d);
        if ((x + y) % 2 === 0 || d < 0.45) put(cx + x, cy + y, hex, a);
    }
}

function crystals (c, cx, cy, colours, seed)
{
    const [dark, mid, light] = colours;
    for (let i = 0; i < 4; i++) {
        const h = 3 + Math.floor(hash(i, seed) * 6), x = cx - 5 + i * 3 + Math.floor(hash(i, seed, 2) * 2);
        for (let k = 0; k < h; k++) {
            const w = k < h - 2 ? 1 : 0;
            for (let dx = -w; dx <= w; dx++) c.put(x + dx, cy - k, k === h - 1 ? light : dx < 0 ? light : dx > 0 ? dark : mid);
        }
    }
}

// ── Layers ───────────────────────────────────────────────────────────────────────────────────
const PURPLE = ['#4b3191', '#8a6ad8', '#d6c4ff'];
const TEAL = ['#1f6f80', '#3fb7c9', '#c8f6ff'];

/** The cave wall far behind: dark, lumpy rock with a few faintly glowing crystal clusters. */
function back ()
{
    const c = canvas(480);
    const shades = ['#0e0c16', '#13101e', '#181427', '#1d1830'];
    for (let y = 0; y < H; y++) for (let x = 0; x < c.w; x++) {
        const depth = 1 - Math.abs(y - H * 0.55) / (H * 0.55);             // a little lighter around the middle
        const n = noise(x, y, 48, 1, c.w) * 0.55 + noise(x, y, 16, 2, c.w) * 0.3 + depth * 0.3;
        c.put(x, y, shades[Math.min(shades.length - 1, Math.floor(n * shades.length * 0.85))]);
    }
    for (let i = 0; i < 5; i++) {                                           // faint cracks
        const x0 = Math.floor(hash(i, 7) * c.w), y0 = 40 + Math.floor(hash(i, 8) * 160);
        for (let k = 0, x = x0; k < 30; k++) { c.put(x, y0 + k, '#0b0a12'); if (hash(k, i, 9) < 0.3) x += hash(k, i) < 0.5 ? -1 : 1; }
    }
    for (const [x, y, col, s] of [[70, 150, PURPLE, 1], [210, 96, TEAL, 2], [330, 182, PURPLE, 3], [430, 120, TEAL, 4]]) {
        glow(c, x, y - 3, 16, col[1], 0.22);
        crystals(c, x, y, col, s);
    }
    return c;
}

/** Distant stalactites and stalagmites, slightly lighter than the wall. */
function far ()
{
    const c = canvas(512);
    const fill = '#1f1a33', rim = '#2a2445';
    for (let x = 0; x < c.w; x++) {                                         // a ragged ceiling and floor band
        const top = 10 + Math.round(noise(x, 0, 32, 11, c.w) * 14), bottom = 14 + Math.round(noise(x, 0, 32, 12, c.w) * 16);
        for (let y = 0; y < top; y++) c.put(x, y, fill);
        for (let y = H - bottom; y < H; y++) c.put(x, y, fill);
    }
    for (let i = 0; i < 9; i++) spike(c, i * 57 + hash(i, 13) * 30, 14 + hash(i, 14) * 22, 40 + hash(i, 15) * 70, true, fill, rim, i);
    for (let i = 0; i < 7; i++) spike(c, i * 73 + 20 + hash(i, 16) * 30, 18 + hash(i, 17) * 26, 40 + hash(i, 18) * 60, false, fill, rim, i + 50);
    return c;
}

/** Big columns where a stalactite met a stalagmite, one with crystals glowing on it. */
function mid ()
{
    const c = canvas(640);
    const fill = '#27223d', rim = '#3a3358';
    for (const [x, w, i] of [[110, 44, 0], [420, 34, 1]]) {
        spike(c, x, w + 30, 150, true, fill, rim, 70 + i);
        spike(c, x, w + 34, 160, false, fill, rim, 80 + i);
        for (let y = 0; y < H; y++) {                                        // the narrow waist joining them
            const half = Math.floor(w / 4 + Math.abs(Math.sin(y / 23 + i)) * 4);
            for (let dx = -half; dx <= half; dx++) c.put(x + dx, y, dx === -half ? rim : fill);
        }
    }
    for (let i = 0; i < 5; i++) spike(c, 230 + i * 90 + hash(i, 21) * 30, 20 + hash(i, 22) * 16, 30 + hash(i, 23) * 50, i % 2 === 0, fill, rim, 90 + i);
    glow(c, 132, 196, 18, PURPLE[1], 0.3);
    crystals(c, 132, 200, PURPLE, 9);
    glow(c, 404, 84, 14, TEAL[1], 0.28);
    crystals(c, 404, 88, TEAL, 10);
    return c;
}

/** Close by and dark: roots hanging through cracks in the ceiling, a few rocks on the floor. */
function near ()
{
    const c = canvas(704);
    const dark = '#0b0a11', rootlet = '#110f18';
    for (let i = 0; i < 6; i++) {
        let x = 40 + i * 115 + hash(i, 31) * 40;
        const length = 50 + hash(i, 32) * 110;
        for (let y = 0; y < length; y++) {
            x += Math.sin(y / (9 + i)) * 0.35;
            const thick = y < length * 0.6 ? 2 : 1;
            for (let t = 0; t < thick; t++) c.put(x + t, y, dark);
            if (hash(y, i, 33) < 0.06) for (let k = 1; k < 6; k++) c.put(x + (i % 2 ? k : -k), y + k, rootlet);
        }
    }
    for (let i = 0; i < 4; i++) spike(c, 90 + i * 170 + hash(i, 34) * 50, 30 + hash(i, 35) * 30, 14 + hash(i, 36) * 18, false, dark, '#15131d', 120 + i);
    return c;
}

// ── Dusk forest (level 3) ────────────────────────────────────────────────────────────────────
const mixHex = (a, b, t) => { const A = rgb(a), B = rgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };

/**
 * The sky at dusk, far behind the (tinted) forest layers: deep blue at the top through violet to a warm pink glow at the
 * horizon, stars, a crescent moon, and a far line of tree tops against the glow (like the forest's own back layer).
 * Opaque, as tall as a level. Banded colours (no smooth gradient), so it stays pixel art.
 */
function duskSky ()
{
    const c = canvas(480);
    const stops = [[0, '#141433'], [0.3, '#2a2457'], [0.52, '#4a3470'], [0.66, '#8a4f78'], [0.74, '#c4746e'], [0.8, '#de9a74']];
    const band = y => {
        const t = y / H;
        for (let i = 1; i < stops.length; i++) {
            if (t <= stops[i][0]) {
                const [t0, c0] = stops[i - 1], [t1, c1] = stops[i];
                return mixHex(c0, c1, Math.round(((t - t0) / (t1 - t0)) * 4) / 4);      // 4 steps between stops
            }
        }
        return stops[stops.length - 1][1];
    };
    for (let y = 0; y < H; y++) for (let x = 0; x < c.w; x++) c.put(x, y, band(y));
    for (let i = 0; i < 70; i++) {                                                     // stars, fewer towards the glow
        const x = Math.floor(hash(i, 51) * c.w), y = Math.floor(Math.pow(hash(i, 52), 1.6) * 150);
        c.put(x, y, hash(i, 53) < 0.25 ? '#ffffff' : '#b9bfe8', hash(i, 54) < 0.5 ? 1 : 0.6);
    }
    // A crescent moon with a faint halo.
    const mx = 150, my = 108, r = 10;          // low enough to show between the canopy and the bushes
    for (let y = -r - 8; y <= r + 8; y++) for (let x = -r - 8; x <= r + 8; x++) {
        const d = Math.hypot(x, y);
        if (d <= r) {
            if (Math.hypot(x - r * 0.55, y - r * 0.25) < r * 0.85) continue;
            c.put(mx + x, my + y, d > r - 1.2 ? '#e4dcb0' : (x + y) % 5 === 0 ? '#f8f2d4' : '#f4ecc8');
        } else if (d <= r + 8 && (x + y) % 2 === 0) c.put(mx + x, my + y, '#cfd4ff', 0.22 * (1 - (d - r) / 8));
    }
    // Far tree tops against the glow, then the dark forest floor below them.
    for (let x = 0; x < c.w; x++) {
        const top = 150 + Math.round(noise(x, 0, 32, 61, c.w) * 18 + Math.abs(Math.sin(x / 7)) * 6);
        for (let y = top; y < H; y++) c.put(x, y, y < top + 2 ? '#4a3a6e' : '#2c2550');
    }
    return c;
}

// ── PNG ──────────────────────────────────────────────────────────────────────────────────────
function png ({ w, data })
{
    const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
    const crc = buf => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
    const chunk = (type, body) => {
        const len = Buffer.alloc(4); len.writeUInt32BE(body.length);
        const td = Buffer.concat([Buffer.from(type), body]);
        const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
        return Buffer.concat([len, td, c]);
    };
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6;
    const raw = Buffer.alloc((w * 4 + 1) * H);
    for (let y = 0; y < H; y++) data.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const OUT = process.argv[2] ?? 'public/assets/own/parallax';
mkdirSync(OUT, { recursive: true });
for (const [name, draw] of [['cave-back', back], ['cave-far', far], ['cave-mid', mid], ['cave-near', near], ['dusk-sky', duskSky]]) {
    const layer = draw();
    writeFileSync(`${OUT}/${name}.png`, png(layer));
    console.log(`${OUT}/${name}.png  ${layer.w}×${H}`);
}
