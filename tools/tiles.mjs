// Project-owned ground tiles, drawn procedurally. Run: `node tools/tiles.mjs [outDir]` → one tileset PNG per style,
// plus crumbling-platform strips (crumble-<style>.png: left end, middle, right end).
// Each tileset keeps the Tall Forest layout (7 columns; the level's gids stay valid): the 3×3 autotile block at
// indices 36-38 / 43-45 / 50-52 (top, middle, bottom rows; left, centre, right), the dark cave tile at 40. Extra rows
// below hold variants of the centre tiles, so long runs of ground do not repeat one tile (see VARIANTS, written next
// to the PNGs as <style>.json: gid → variant gids).
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const T = 16, COLS = 7, ROWS = 13;

// ── Small helpers ────────────────────────────────────────────────────────────────────────────
/** Deterministic pseudo-random in [0, 1) from integers (no state: the same pixel always gets the same value). */
const hash = (...n) => {
    let h = 2166136261;
    for (const v of n) { h ^= v + 0x9e3779b9; h = Math.imul(h ^ (h >>> 15), 0x85ebca6b); h ^= h >>> 13; }
    return ((h >>> 0) % 100000) / 100000;
};
const blank = () => Array.from({ length: T }, () => Array(T).fill(null));
const pick = (list, r) => list[Math.floor(r * list.length) % list.length];
function blob (g, cx, cy, rx, ry, fill, light, dark)
{
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
        const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
        if (d > 1) continue;
        const lit = (x - cx) / rx + (y - cy) / ry < -0.6;
        const shade = (x - cx) / rx + (y - cy) / ry > 0.7;
        g[y][x] = lit ? light : shade ? dark : fill;
    }
}

/**
 * A style draws one tile: `pos` = { top, bottom, left, right } (which edges are open air), `v` = variant number
 * (0 = plain). Returns a 16×16 grid of '#rrggbb' (null = transparent).
 */
const STYLES = {
    // ── A: grass and dark soil — a thick bright grass mat over cool, dark loam with pebbles and roots ──
    grass: {
        name: 'Tráva a tmavá hlina',
        C: { soil: '#3a2f45', soilD: '#2a2133', soilL: '#4e4160', stone: '#8a87a0', stoneL: '#b4b1c8', stoneD: '#5d5a72',
            root: '#6b5545', g1: '#a6e05a', g2: '#6cbf3c', g3: '#3e8a34', g4: '#245c2a', flower: '#fff1a8', flower2: '#ff9ab0', cave: '#1b1622' },
        tile (pos, v)
        {
            const { C } = this, g = blank();
            for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
                const r = hash(x, y, 11);
                g[y][x] = r < 0.12 ? C.soilD : r > 0.9 ? C.soilL : C.soil;
            }
            if (v === 1) blob(g, 7, 9, 3, 2.2, C.stone, C.stoneL, C.stoneD);
            if (v === 2) { for (const [x, y] of [[2, 6], [3, 7], [4, 7], [5, 8], [6, 9], [7, 9], [8, 10], [9, 11], [9, 12], [10, 13]]) g[y][x] = C.root; }
            if (v === 3) { blob(g, 4, 6, 1.6, 1.2, C.stone, C.stoneL, C.stoneD); blob(g, 11, 11, 2, 1.5, C.stone, C.stoneL, C.stoneD); }
            if (pos.top) {
                // The grass mat: 4 rows, a jagged fringe hanging 1-3 px below, a light top row.
                for (let x = 0; x < T; x++) {
                    const hang = 4 + Math.floor(hash(x, 3, v) * 3);
                    for (let y = 0; y < hang; y++) g[y][x] = y === 0 ? C.g1 : y === 1 ? C.g2 : y < hang - 1 ? C.g3 : C.g4;
                    if (hash(x, 9) < 0.3) g[1][x] = C.g1;
                }
                if (v === 1) { g[1][5] = C.flower; g[1][11] = C.flower2; }
                if (v === 2) { g[1][3] = C.g1; g[2][3] = C.g1; g[1][12] = C.flower; }
            }
            if (pos.left || pos.right) {
                for (let y = 0; y < T; y++) {
                    const x = pos.left ? 0 : T - 1;
                    g[y][x] = pos.top && y < 3 ? C.g2 : C.soilD;
                }
            }
            if (pos.bottom) for (let x = 0; x < T; x++) g[T - 1][x] = C.soilD;
            return g;
        },
        cave () { const g = blank(); for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) g[y][x] = hash(x, y, 5) < 0.1 ? '#241d2c' : this.C.cave; return g; }
    },

    // ── B: stone masonry — grey-blue bricks of an old wall, moss creeping over the top ───────────────
    bricks: {
        name: 'Kamenné murivo s machom',
        C: { b1: '#6f7686', b2: '#7d8597', b3: '#636a7a', hi: '#a3abbd', sh: '#4c5262', mortar: '#343846',
            m1: '#8fcf4a', m2: '#5aa83a', m3: '#2f6b2a', ivy: '#4f9a34', ivyL: '#86c94a', hole: '#1f222b', cave: '#191b22' },
        tile (pos, v, col)
        {
            const { C } = this, g = blank();
            for (let y = 0; y < T; y++) {
                const row = Math.floor(y / 4), off = row % 2 ? 4 : 0;
                for (let x = 0; x < T; x++) {
                    const bx = Math.floor((x + off) / 8);
                    const mortar = y % 4 === 3 || (x + off) % 8 === 7;
                    if (mortar) { g[y][x] = C.mortar; continue; }
                    const base = pick([C.b1, C.b2, C.b3], hash(bx, row, col ?? 0));
                    const firstRow = y % 4 === 0, firstCol = (x + off) % 8 === 0;
                    g[y][x] = firstRow || firstCol ? C.hi : y % 4 === 2 && (x + off) % 8 === 6 ? C.sh : base;
                }
            }
            if (v === 1) { for (const [x, y] of [[9, 4], [10, 5], [10, 6], [11, 6]]) g[y][x] = C.mortar; }          // crack
            if (v === 2) { for (let y = 8; y < 11; y++) for (let x = 1; x < 7; x++) g[y][x] = y === 8 ? C.mortar : C.hole; }   // missing brick
            if (v === 3) { for (const [x, y, c] of [[12, 5, C.ivy], [13, 6, C.ivy], [12, 7, C.ivyL], [13, 8, C.ivy], [12, 9, C.ivy], [11, 9, C.ivyL], [13, 10, C.ivy]]) g[y][x] = c; }
            if (pos.top) {
                for (let x = 0; x < T; x++) {
                    const drip = 2 + (hash(x, v, 7) < 0.35 ? 1 + Math.floor(hash(x, 2) * 3) : 0);
                    for (let y = 0; y < drip; y++) g[y][x] = y === 0 ? C.m1 : y === 1 ? C.m2 : C.m3;
                }
            }
            if (pos.left) for (let y = 0; y < T; y++) g[y][0] = pos.top && y < 2 ? C.m2 : C.sh;
            if (pos.right) for (let y = 0; y < T; y++) g[y][T - 1] = pos.top && y < 2 ? C.m2 : C.sh;
            if (pos.bottom) for (let x = 0; x < T; x++) g[T - 1][x] = C.sh;
            return g;
        },
        cave () { const g = this.tile({}, 0, 0); for (const r of g) for (let x = 0; x < T; x++) r[x] = r[x] === this.C.mortar ? '#111318' : this.C.cave; return g; }
    },

    // ── C: layered rock — slate-blue strata with a thin turf on top, the odd crystal and moss patch ─────────
    rock: {
        name: 'Vrstvená skala s kryštálmi',
        C: { s1: '#56627a', s2: '#66738c', s3: '#4a556b', s4: '#77859f', crack: '#2e3546', lt: '#9aa8c2',
            t1: '#b6e06a', t2: '#7cbf44', t3: '#4d8f38', xt: '#8ff0ee', xtL: '#e6ffff', xtD: '#3fa6b8', cave: '#1d2230' },
        tile (pos, v)
        {
            const { C } = this, g = blank();
            // Four wavy strata, 4 px each, waving with a period of 16 px (tiles join seamlessly); a dark seam between them.
            const bands = [C.s4, C.s2, C.s1, C.s3];
            for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
                const w = y + Math.round(1.2 * Math.sin((x / T) * 2 * Math.PI));
                const k = ((w % T) + T) % T;
                const band = Math.floor(k / 4);
                g[y][x] = k % 4 === 3 ? (hash(x, band) < 0.7 ? C.crack : C.s3) : k % 4 === 0 && hash(x, y, 4) < 0.5 ? C.lt : bands[band];
            }
            if (v === 1) { for (const [x, y] of [[4, 3], [5, 4], [5, 5], [6, 6], [6, 7], [7, 8], [8, 8], [8, 9], [9, 10]]) g[y][x] = C.crack; }
            if (v === 2) {                                                                          // a crystal cluster
                const X = [[8, 4, C.xtL], [8, 5, C.xtL], [9, 5, C.xt], [7, 6, C.xtL], [8, 6, C.xt], [9, 6, C.xt], [7, 7, C.xt], [8, 7, C.xt], [9, 7, C.xtD],
                    [5, 7, C.xtL], [5, 8, C.xt], [6, 8, C.xtD], [10, 7, C.xtL], [11, 8, C.xt], [10, 8, C.xtD], [7, 8, C.xtD], [8, 8, C.xtD], [9, 8, C.xtD],
                    [4, 9, C.crack], [5, 9, C.crack], [6, 9, C.crack], [7, 9, C.crack], [8, 9, C.crack], [9, 9, C.crack], [10, 9, C.crack], [11, 9, C.crack], [12, 9, C.crack]];
                for (const [x, y, c] of X) g[y][x] = c;
            }
            if (v === 3) {                                                                          // a patch of moss
                for (let y = 6; y < 11; y++) for (let x = 3; x < 12; x++) {
                    if (((x - 7.5) / 4.5) ** 2 + ((y - 8) / 2.3) ** 2 <= 1) g[y][x] = hash(x, y, 9) < 0.5 ? C.t2 : C.t3;
                }
            }
            if (pos.top) {
                for (let x = 0; x < T; x++) {
                    const h = 2 + (hash(x, 5, v) < 0.3 ? 1 : 0);
                    for (let y = 0; y < h; y++) g[y][x] = y === 0 ? C.t1 : y === 1 ? C.t2 : C.t3;
                }
                if (v === 1) g[0][9] = '#ffffff';
            }
            if (pos.left) for (let y = pos.top ? 2 : 0; y < T; y++) g[y][0] = C.crack;
            if (pos.right) for (let y = pos.top ? 2 : 0; y < T; y++) g[y][T - 1] = C.crack;
            if (pos.bottom) for (let x = 0; x < T; x++) g[T - 1][x] = C.crack;
            return g;
        },
        cave () { const g = blank(); for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) g[y][x] = hash(x, y, 8) < 0.08 ? '#262c3c' : this.C.cave; return g; }
    }
};

// ── Crumbling platforms: three tiles (left end, middle, right end) that must read as fragile, unlike the ground ──
/** Ragged underside: a few pixels missing from the bottom rows, so the platform looks like it is already breaking. */
function ragged (g, seed)
{
    for (let x = 0; x < T; x++) {
        const bite = hash(x, seed, 77) < 0.45 ? 1 + Math.floor(hash(x, seed, 78) * 3) : 0;
        for (let y = T - bite; y < T; y++) g[y][x] = null;
    }
}
/** A zigzag crack from (x, y0) downwards. */
function crack (g, x, y0, len, colour, light)
{
    let cx = x;
    for (let y = y0; y < Math.min(T, y0 + len); y++) {
        if (g[y][cx]) g[y][cx] = colour;
        if (light && cx + 1 < T && g[y][cx + 1]) g[y][cx + 1] = light;
        cx = Math.max(1, Math.min(T - 2, cx + (hash(cx, y, len) < 0.5 ? -1 : 1)));
    }
}
const CRUMBLE_STYLES = {
    // Old weathered planks: two boards with grain, gaps and nails, tied with rope at the ends, splintered underneath.
    planks: {
        name: 'Staré drevené dosky',
        tile (side)
        {
            const C = { wood: '#a8743f', light: '#d4a565', dark: '#6e4423', gap: '#2e1c10', grain: '#8a5a30', nail: '#c9ccd6', rope: '#e3cf8f', ropeD: '#9c8650' };
            const g = blank();
            for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
                const board = y < 7 ? 0 : 1;
                if (y === 7 || y === 14) { g[y][x] = C.gap; continue; }
                if (y === 0 || y === 8) { g[y][x] = C.light; continue; }
                g[y][x] = (y + board * 3 + Math.floor(hash(x, board, 4) * 2)) % 4 === 0 && hash(x, y, 2) < 0.6 ? C.grain : C.wood;
                if (y === 6 || y === 13) g[y][x] = C.dark;
            }
            for (const [x, y] of [[3, 3], [12, 10]]) g[y][x] = C.nail;
            crack(g, side === 'mid' ? 9 : 6, 1, 5, C.gap);
            crack(g, side === 'mid' ? 4 : 10, 9, 4, C.gap);
            if (side !== 'mid') {
                const x0 = side === 'left' ? 1 : T - 4;
                for (let y = 0; y < 14; y++) for (let x = x0; x < x0 + 3; x++) g[y][x] = (y + x) % 3 === 0 ? C.ropeD : C.rope;
            }
            for (let x = 0; x < T; x++) if (hash(x, 9, 9) < 0.4) g[15][x] = C.dark;
            ragged(g, side === 'mid' ? 1 : side === 'left' ? 2 : 3);
            return g;
        }
    },
    // The ground's own grass slab, but split by bright cracks, with chunks missing underneath.
    grass: {
        name: 'Popraskaná tráva',
        tile (side)
        {
            const g = STYLES.grass.tile({ top: true, bottom: false, left: side === 'left', right: side === 'right' }, 0);
            crack(g, side === 'mid' ? 8 : 5, 3, 12, '#120d16', '#e8dcb8');
            crack(g, side === 'mid' ? 3 : 11, 6, 9, '#120d16', '#e8dcb8');
            for (const [x, y] of [[6, 13], [12, 12], [2, 11]]) g[y][x] = '#e8dcb8';
            ragged(g, side === 'mid' ? 4 : side === 'left' ? 5 : 6);
            return g;
        }
    },
    // Brittle reddish rock with a mossless, sandy top: stands out from the grass and the green forest.
    rock: {
        name: 'Drobivá červenkastá skala',
        tile (side)
        {
            const C = { r: '#b8523a', rl: '#e07a52', rd: '#7a2e22', top: '#f0a070', crack: '#3a1410', speck: '#d86a48' };
            const g = blank();
            for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
                const r = hash(x, y, 31);
                g[y][x] = y === 0 ? C.top : y === 1 ? C.rl : r < 0.15 ? C.rd : r > 0.88 ? C.speck : C.r;
            }
            if (side === 'left') for (let y = 0; y < T; y++) g[y][0] = C.rd;
            if (side === 'right') for (let y = 0; y < T; y++) g[y][T - 1] = C.rd;
            crack(g, side === 'mid' ? 7 : 4, 1, 13, C.crack, C.rl);
            crack(g, side === 'mid' ? 12 : 11, 4, 8, C.crack);
            ragged(g, side === 'mid' ? 7 : side === 'left' ? 8 : 9);
            return g;
        }
    }
};

// ── Layout ───────────────────────────────────────────────────────────────────────────────────
const BLOCK = { top: 36, mid: 43, bottom: 50 };       // left index of each autotile row; +1 centre, +2 right
const CAVE = 40;
const FIRST_VARIANT = 9 * COLS;                        // variants start on row 9

function build (style)
{
    const tiles = new Map();
    for (const [rowName, start] of Object.entries(BLOCK)) {
        ['left', 'centre', 'right'].forEach((side, i) => {
            const pos = { top: rowName === 'top', bottom: rowName === 'bottom', left: side === 'left', right: side === 'right' };
            tiles.set(start + i, style.tile(pos, 0, start + i));
        });
    }
    tiles.set(CAVE, style.cave());
    // Variants of the three centre tiles (gid = index + 1).
    const variants = {};
    let next = FIRST_VARIANT;
    for (const [rowName, start] of Object.entries(BLOCK)) {
        const pos = { top: rowName === 'top', bottom: rowName === 'bottom', left: false, right: false };
        const gids = [];
        for (const v of [1, 2, 3]) { tiles.set(next, style.tile(pos, v, next)); gids.push(next + 1); next++; }
        variants[start + 2] = gids;          // key: gid of the plain centre tile (index start + 1, gid start + 2)
    }
    return { tiles, variants };
}

function png (tiles, cols = COLS, rows = ROWS)
{
    const w = cols * T, h = rows * T;
    const rgba = Buffer.alloc(w * h * 4);
    for (const [index, grid] of tiles) {
        const ox = (index % cols) * T, oy = Math.floor(index / cols) * T;
        grid.forEach((row, y) => row.forEach((c, x) => {
            if (!c) return;
            rgba.set([parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16), 255], ((oy + y) * w + ox + x) * 4);
        }));
    }
    const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
    const crc = buf => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
    const chunk = (type, data) => {
        const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
        const td = Buffer.concat([Buffer.from(type), data]);
        const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
        return Buffer.concat([len, td, c]);
    };
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
    const raw = Buffer.alloc((w * 4 + 1) * h);
    for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const OUT = process.argv[2] ?? 'public/assets/own/tiles';
mkdirSync(OUT, { recursive: true });
for (const [key, style] of Object.entries(STYLES)) {
    const { tiles, variants } = build(style);
    writeFileSync(`${OUT}/${key}.png`, png(tiles));
    writeFileSync(`${OUT}/${key}.json`, JSON.stringify({ name: style.name, variants }));
    console.log(`${OUT}/${key}.png  (${style.name})`);
}
for (const [key, style] of Object.entries(CRUMBLE_STYLES)) {
    const tiles = new Map(['left', 'mid', 'right'].map((side, i) => [i, style.tile(side)]));
    writeFileSync(`${OUT}/crumble-${key}.png`, png(tiles, 3, 1));
    console.log(`${OUT}/crumble-${key}.png  (${style.name})`);
}
