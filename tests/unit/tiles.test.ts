import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GROUND_TILES } from '../../src/config/constants';
import { tileHash, tileVariant } from '../../src/core/tiles';

const V = { 38: [64, 65, 66], 45: [67, 68, 69] };

describe('tileVariant', () => {
    it('is the same for the same position (stable across restarts)', () => {
        for (let c = 0; c < 50; c++) expect(tileVariant(45, c, 15, V, 0.5)).toBe(tileVariant(45, c, 15, V, 0.5));
    });

    it('leaves tiles without variants alone', () => {
        for (let c = 0; c < 50; c++) expect(tileVariant(41, c, 3, V, 0.5)).toBe(41);
    });

    it('keeps about the plain share plain and spreads the rest over all variants', () => {
        const seen = new Map<number, number>();
        const n = 4000;
        for (let i = 0; i < n; i++) {
            const g = tileVariant(38, i % 230, Math.floor(i / 230), V, 0.55);
            seen.set(g, (seen.get(g) ?? 0) + 1);
        }
        expect([...seen.keys()].sort()).toEqual([38, 64, 65, 66]);
        expect(seen.get(38)! / n).toBeCloseTo(0.55, 1);
        for (const g of [64, 65, 66]) expect(seen.get(g)! / n).toBeGreaterThan(0.1);
    });

    it('neighbouring tiles are not all alike (no stripes)', () => {
        const row = Array.from({ length: 30 }, (_, c) => tileVariant(38, c, 15, V, 0.55));
        expect(new Set(row).size).toBeGreaterThan(2);
        expect(tileHash(3, 4)).not.toBe(tileHash(4, 3));
    });
});

describe('ground tileset', () => {
    it('the variant gids in constants match what tools/tiles.mjs generated', () => {
        const generated = JSON.parse(readFileSync('public/assets/own/tiles/grass.json', 'utf8')) as { variants: Record<string, number[]> };
        expect(Object.fromEntries(Object.entries(GROUND_TILES.VARIANTS).map(([k, v]) => [k, [...v]]))).toEqual(generated.variants);
    });
});
