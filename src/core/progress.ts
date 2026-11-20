// Saved progress: the highest unlocked level, kept in the browser. Phaser-free; unit-tested in tests/unit/progress.test.ts.

/** The part of the Web Storage API the game uses (localStorage, or a fake in tests). */
export interface KeyValueStore
{
    getItem (key: string): string | null;
    setItem (key: string, value: string): void;
}

/** localStorage if the browser lets the page use it; null when it is blocked (private mode, policy, no window). */
export function browserStore (): KeyValueStore | null
{
    try {
        const store = globalThis.localStorage;
        return store ?? null;
    } catch {
        return null;
    }
}

/**
 * The highest unlocked level (1-based) stored under `key`, clamped to 1..levelCount. Anything missing, unreadable or
 * garbled reads as 1: the game always works, at worst from the first level.
 */
export function loadUnlocked (store: KeyValueStore | null, key: string, levelCount: number): number
{
    let raw: string | null = null;
    try {
        raw = store?.getItem(key) ?? null;
    } catch {
        return 1;
    }
    const n = Number.parseInt(raw ?? '', 10);
    return Number.isFinite(n) ? Math.min(Math.max(n, 1), levelCount) : 1;
}

/**
 * Unlocks `level` (never locks one again: the stored value only grows). Returns the highest unlocked level; a store
 * that cannot be written changes nothing.
 */
export function unlockLevel (store: KeyValueStore | null, key: string, level: number, levelCount: number): number
{
    const current = loadUnlocked(store, key, levelCount);
    const next = Math.min(Math.max(level, current), levelCount);
    if (next > current) {
        try {
            store?.setItem(key, String(next));
        } catch {
            // Full or blocked storage: progress is simply not saved this time.
        }
    }
    return next;
}

/** Ids of the treasures found in any earlier run (a garbled or blocked store reads as none). */
export function loadFound (store: KeyValueStore | null, key: string): string[]
{
    try {
        const list = JSON.parse(store?.getItem(key) ?? '[]');
        return Array.isArray(list) ? list.filter((id): id is string => typeof id === 'string') : [];
    } catch {
        return [];
    }
}

/** Remembers a found treasure (once). Returns the ids found so far; a store that cannot be written changes nothing. */
export function saveFound (store: KeyValueStore | null, key: string, id: string): string[]
{
    const found = loadFound(store, key);
    if (found.includes(id)) return found;
    found.push(id);
    try {
        store?.setItem(key, JSON.stringify(found));
    } catch {
        // Full or blocked storage: not remembered this time.
    }
    return found;
}

/** The level chosen after stepping `dir` (-1 / +1) from `selected`, staying within 1..unlocked. */
export const stepLevel = (selected: number, dir: number, unlocked: number): number =>
    Math.min(Math.max(selected + dir, 1), unlocked);
