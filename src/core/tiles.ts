// Phaser-free tile variation, unit-tested in tests/unit/tiles.test.ts.

/** Deterministic value in [0, 1) for a tile position: the same tile always gets the same variant. */
export function tileHash (col: number, row: number): number
{
    let n = (Math.imul(col, 374761393) + Math.imul(row, 668265263)) >>> 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177) >>> 0;
    n = (n ^ (n >>> 16)) >>> 0;
    return (n % 10000) / 10000;
}

/**
 * The gid to draw at a position: a plain tile with listed variants is swapped for one of them, except for a share
 * `plainShare` of positions, which keep the plain tile (so the variants stay occasional details).
 */
export function tileVariant (gid: number, col: number, row: number, variants: Readonly<Record<number, readonly number[]>>, plainShare: number): number
{
    const list = variants[gid];
    if (!list || list.length === 0) return gid;
    const r = tileHash(col, row);
    if (r < plainShare) return gid;
    return list[Math.min(list.length - 1, Math.floor((r - plainShare) / (1 - plainShare) * list.length))];
}
