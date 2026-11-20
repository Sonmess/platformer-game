import { describe, expect, it } from 'vitest';
import { loadFound, loadUnlocked, saveFound, stepLevel, unlockLevel, type KeyValueStore } from '../../src/core/progress';

const KEY = 'k';
const memory = (init: Record<string, string> = {}): KeyValueStore & { data: Record<string, string> } => {
    const data = { ...init };
    return { data, getItem: k => data[k] ?? null, setItem: (k, v) => { data[k] = v; } };
};
const broken: KeyValueStore = {
    getItem: () => { throw new Error('blocked'); },
    setItem: () => { throw new Error('blocked'); }
};

describe('saved progress', () => {
    it('starts at level 1 with nothing saved, a blocked store or no store at all', () => {
        expect(loadUnlocked(memory(), KEY, 2)).toBe(1);
        expect(loadUnlocked(broken, KEY, 2)).toBe(1);
        expect(loadUnlocked(null, KEY, 2)).toBe(1);
    });

    it('reads a garbled or out-of-range value safely', () => {
        expect(loadUnlocked(memory({ k: 'abc' }), KEY, 2)).toBe(1);
        expect(loadUnlocked(memory({ k: '0' }), KEY, 2)).toBe(1);
        expect(loadUnlocked(memory({ k: '99' }), KEY, 2)).toBe(2);
        expect(loadUnlocked(memory({ k: '2' }), KEY, 3)).toBe(2);
    });

    it('unlocking only ever moves forward, and never past the last level', () => {
        const store = memory();
        expect(unlockLevel(store, KEY, 2, 3)).toBe(2);
        expect(store.data.k).toBe('2');
        expect(unlockLevel(store, KEY, 1, 3)).toBe(2);           // replaying level 1 locks nothing
        expect(store.data.k).toBe('2');
        expect(unlockLevel(store, KEY, 9, 3)).toBe(3);           // past the last level: the last one
        expect(store.data.k).toBe('3');
    });

    it('a store that cannot be written changes nothing and does not throw', () => {
        expect(unlockLevel(broken, KEY, 2, 2)).toBe(2);
        expect(unlockLevel(null, KEY, 2, 2)).toBe(2);
        expect(loadUnlocked(broken, KEY, 2)).toBe(1);
    });

    it('the level choice stays within the unlocked levels', () => {
        expect(stepLevel(1, -1, 2)).toBe(1);
        expect(stepLevel(1, 1, 2)).toBe(2);
        expect(stepLevel(2, 1, 2)).toBe(2);
        expect(stepLevel(1, 1, 1)).toBe(1);                      // nothing unlocked yet
    });
});

describe('found treasures', () => {
    it('remembers each treasure once and reads a garbled or blocked store as none', () => {
        const store = memory();
        expect(loadFound(store, 't')).toEqual([]);
        expect(saveFound(store, 't', 'level2:0')).toEqual(['level2:0']);
        expect(saveFound(store, 't', 'level2:0')).toEqual(['level2:0']);       // once
        expect(saveFound(store, 't', 'level3:0')).toEqual(['level2:0', 'level3:0']);
        expect(loadFound(memory({ t: 'not json' }), 't')).toEqual([]);
        expect(loadFound(memory({ t: '{"a":1}' }), 't')).toEqual([]);
        expect(loadFound(memory({ t: '["x", 3, null]' }), 't')).toEqual(['x']);
        expect(loadFound(broken, 't')).toEqual([]);
        expect(saveFound(broken, 't', 'x')).toEqual(['x']);                    // not stored, no error
        expect(saveFound(null, 't', 'x')).toEqual(['x']);
    });
});
