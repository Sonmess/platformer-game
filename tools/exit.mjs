// Project-owned cave exit art, drawn procedurally. Run: `node tools/exit.mjs [outDir] [variant…]` → exit-<variant>.png.
// The exit stands at the right end of the cave level: a wall of cave rock with an opening that looks out into the
// moonlit forest at dusk (the next level), and moonlight spilling in onto the floor. 96×208 px, anchored at its
// bottom-right corner on the floor at the level's right edge. Deterministic.
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const W = 96, H = 208;

// ── Helpers ──────────────────────────────────────────────────────────────────────────────────
const hash = (...n) => {
    let h = 2166136261;
    for (const v of n) { h ^= v + 0x9e3779b9; h = Math.imul(h ^ (h >>> 15), 0x85ebca6b); h ^= h >>> 13; }
    return ((h >>> 0) % 100000) / 100000;
};
const rgb = hex => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };

function canvas ()
{
    const data = Buffer.alloc(W * H * 4);
    const put = (x, y, hex, alpha = 1) => {
        x = Math.round(x); y = Math.round(y);
        if (x < 0 || y < 0 || x >= W || y >= H) return;
        const i = (y * W + x) * 4, [r, g, b] = rgb(hex);
        const a0 = data[i + 3] / 255, a = alpha + a0 * (1 - alpha);
        if (a === 0) return;
        data[i] = Math.round((r * alpha + data[i] * a0 * (1 - alpha)) / a);
        data[i + 1] = Math.round((g * alpha + data[i + 1] * a0 * (1 - alpha)) / a);
        data[i + 2] = Math.round((b * alpha + data[i + 2] * a0 * (1 - alpha)) / a);
        data[i + 3] = Math.round(a * 255);
    };
    const get = (x, y) => data[(y * W + x) * 4 + 3];
    return { data, put, get };
}

const ROCK = { r1: '#2c2a3a', r2: '#363447', r3: '#23212e', dark: '#17151f', rim: '#6a6680' };

/** Cave rock everywhere `inRock(x, y)` says, lumpy like the cave tiles, with a moonlit rim along the opening. */
function rock (c, inRock, inOpening, rimColour)
{
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (!inRock(x, y)) continue;
        const n = hash(Math.floor(x / 3), Math.floor(y / 3), 41) * 0.6 + hash(x, y, 42) * 0.4;
        let col = n < 0.33 ? ROCK.r3 : n < 0.72 ? ROCK.r1 : ROCK.r2;
        const nearOpening = [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0]].some(([dx, dy]) => inOpening(x + dx, y + dy));
        if (nearOpening) col = [[1, 0], [0, 1], [1, 1]].some(([dx, dy]) => inOpening(x + dx, y + dy)) ? rimColour : mix(col, rimColour, 0.4);
        c.put(x, y, col);
    }
}

/** A slanted shaft of moonlight: pixels between two lines, fading towards the floor's left end, dithered. */
function beam (c, [ax, ay], [bx, by], [cx, cy], [dx, dy], hex, alpha, onlyEmpty)
{
    const side = (px, py, x1, y1, x2, y2) => (x2 - x1) * (py - y1) - (y2 - y1) * (px - x1);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (onlyEmpty && c.get(x, y) > 0) continue;
        if (side(x, y, ax, ay, cx, cy) > 0 || side(x, y, bx, by, dx, dy) < 0) continue;
        if (y < Math.min(ay, by)) continue;
        const t = y / H;
        if ((x + y) % 2 === 0) c.put(x, y, hex, alpha * (0.6 + 0.4 * t));
    }
}

function stars (c, inOpening, count, seed, top = 0, bottom = H)
{
    for (let i = 0; i < count; i++) {
        const x = Math.floor(hash(i, seed) * W), y = top + Math.floor(hash(i, seed, 1) * (bottom - top));
        if (inOpening(x, y)) c.put(x, y, hash(i, seed, 2) < 0.3 ? '#ffffff' : '#c8d0f0');
    }
}

function moon (c, cx, cy, r, crescent, glow)
{
    for (let y = -r - glow; y <= r + glow; y++) for (let x = -r - glow; x <= r + glow; x++) {
        const d = Math.hypot(x, y);
        if (d <= r) {
            if (crescent && Math.hypot(x - r * 0.55, y - r * 0.25) < r * 0.85) continue;
            c.put(cx + x, cy + y, d > r - 1.2 ? '#e4dcb0' : (x + y) % 5 === 0 ? '#f8f2d4' : '#f4ecc8');
        } else if (glow && d <= r + glow && (x + y) % 2 === 0) {
            c.put(cx + x, cy + y, '#dfe6ff', 0.35 * (1 - (d - r) / glow));
        }
    }
}

/** Pine-like tree silhouettes against the sky, standing on y = ground. */
function trees (c, inOpening, ground, hex, seed, tall)
{
    for (let i = 0; i < 6; i++) {
        const tx = 40 + i * 10 + Math.floor(hash(i, seed) * 8), h = tall * (0.6 + hash(i, seed, 3) * 0.5);
        for (let y = 0; y < h; y++) {
            const half = Math.floor((y / h) * 6 * (0.7 + 0.3 * ((y % 6) / 6)));
            for (let dx = -half; dx <= half; dx++) if (inOpening(tx + dx, ground - h + y)) c.put(tx + dx, ground - h + y, hex);
        }
        for (let y = ground - 4; y < ground; y++) if (inOpening(tx, y)) c.put(tx, y, hex);
    }
    for (let y = ground; y < H; y++) for (let x = 0; x < W; x++) if (inOpening(x, y)) c.put(x, y, hex);
}

function sky (c, inOpening, stops)
{
    for (let y = 0; y < H; y++) {
        const t = y / H;
        let col = stops[0][1];
        for (let i = 1; i < stops.length; i++) {
            if (t <= stops[i][0]) { const [t0, c0] = stops[i - 1], [t1, c1] = stops[i]; col = mix(c0, c1, (t - t0) / (t1 - t0)); break; }
            col = stops[i][1];
        }
        for (let x = 0; x < W; x++) if (inOpening(x, y)) c.put(x, y, col);
    }
}

function fireflies (c, seed, count, area)
{
    for (let i = 0; i < count; i++) {
        const x = area.x + hash(i, seed) * area.w, y = area.y + hash(i, seed, 5) * area.h;
        c.put(x, y, '#f4ff9c');
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) c.put(x + dx, y + dy, '#d8ff6a', 0.35);
    }
}

// ── Variants ─────────────────────────────────────────────────────────────────────────────────
const VARIANTS = {
    // A: an arch in the end wall looking out on the forest at dusk, a crescent moon, light slanting in.
    arch: () => {
        const c = canvas();
        const inOpening = (x, y) => {
            if (x < 56 || x > 89 || y > H - 1) return false;
            const cx = 72.5, top = 44, r = 17;
            return y >= top + r || Math.hypot(x - cx, y - (top + r)) <= r;
        };
        const inRock = (x, y) => x >= 44 + Math.round(Math.sin(y / 9) * 2) && !inOpening(x, y);
        sky(c, inOpening, [[0, '#1d1d4a'], [0.45, '#4a3468'], [0.7, '#a35c62'], [0.85, '#d9906a']]);
        stars(c, inOpening, 20, 3, 40, 120);
        moon(c, 78, 70, 7, true, 0);
        trees(c, inOpening, 186, '#140f22', 7, 44);
        rock(c, inRock, inOpening, '#8e9ad0');
        beam(c, [60, 70], [88, 96], [0, 200], [36, 207], '#cdd6ff', 0.2, true);
        fireflies(c, 11, 6, { x: 4, y: 150, w: 50, h: 50 });
        return c;
    },
    // B: a wide, round mouth, a big full moon with a halo, a branch across it, mist rolling in along the floor.
    fullMoon: () => {
        const c = canvas();
        const inOpening = (x, y) => {
            if (y > H - 1) return false;
            const cx = 71, cy = 120, rx = 22, ry = 84;
            return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 || (y > 160 && x > 49 && x < 93);
        };
        const inRock = (x, y) => x >= 40 + Math.round(Math.sin(y / 7) * 3) && !inOpening(x, y);
        sky(c, inOpening, [[0, '#0b1230'], [0.5, '#1d2b58'], [0.85, '#3a4e82']]);
        stars(c, inOpening, 28, 5, 36, 140);
        moon(c, 70, 74, 11, false, 6);
        // A branch from the right rock across the top of the mouth, with a few leaves.
        for (let x = 52; x < 94; x++) {
            const y = 58 + Math.round(Math.sin(x / 6) * 2 + (94 - x) * 0.25);
            if (inOpening(x, y)) { c.put(x, y, '#0d0b18'); c.put(x, y + 1, '#0d0b18'); }
            if (x % 5 === 0 && inOpening(x, y + 3)) { c.put(x, y + 2, '#0d0b18'); c.put(x - 1, y + 3, '#0d0b18'); }
        }
        trees(c, inOpening, 192, '#0f1228', 9, 36);
        rock(c, inRock, inOpening, '#a9b8ea');
        beam(c, [52, 90], [80, 110], [4, 207], [48, 207], '#dfe6ff', 0.22, true);
        for (let y = 186; y < H; y++) for (let x = 0; x < W; x++) {               // mist along the floor
            const a = 0.32 * ((y - 186) / (H - 186)) * (0.6 + 0.4 * Math.sin(x / 5 + y));
            if (c.get(x, y) === 0 || (inOpening(x, y) && y > 196)) if ((x + y) % 2 === 0) c.put(x, y, '#b8c6ec', a);
        }
        return c;
    },
    // C: a tall, narrow crack; bright moonlight pours through it in rays fanning out over the floor, fireflies drift.
    crack: () => {
        const c = canvas();
        const crackHalf = y => 2 + Math.round(Math.abs(Math.sin(y / 11)) * 2) + Math.max(0, Math.round((y - 150) / 10));
        const crackX = y => 74 + Math.round(Math.sin(y / 17) * 3);
        const inOpening = (x, y) => y > 30 && y < H && Math.abs(x - crackX(y)) <= crackHalf(y);
        const inRock = (x, y) => x >= 28 + Math.round(Math.sin(y / 8) * 3) && !inOpening(x, y);
        sky(c, inOpening, [[0, '#9fb2ff'], [0.6, '#dce4ff'], [1, '#f4f2ff']]);
        rock(c, inRock, inOpening, '#c6d0ff');
        for (const [y0, x1, w] of [[60, 0, 10], [100, 2, 12], [140, 8, 16], [175, 24, 18]]) {
            beam(c, [crackX(y0), y0], [crackX(y0 + 12), y0 + 12], [x1, 207], [x1 + w, 207], '#e8eeff', 0.22, false);     // over the rock too: it lights it
        }
        fireflies(c, 13, 9, { x: 2, y: 110, w: 40, h: 90 });
        return c;
    }
};

// ── PNG ──────────────────────────────────────────────────────────────────────────────────────
function png ({ data })
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
    ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6;
    const raw = Buffer.alloc((W * 4 + 1) * H);
    for (let y = 0; y < H; y++) data.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4);
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const OUT = process.argv[2] ?? 'public/assets/own/exit';
mkdirSync(OUT, { recursive: true });
// The game uses 'arch' (chosen 2026-11-20); name others to render them too: node tools/exit.mjs <outDir> fullMoon crack
const names = process.argv.slice(3).length ? process.argv.slice(3) : ['arch'];
for (const [name, draw] of Object.entries(VARIANTS).filter(([n]) => names.includes(n))) {
    writeFileSync(`${OUT}/exit-${name}.png`, png(draw()));
    console.log(`${OUT}/exit-${name}.png  ${W}×${H}`);
}
