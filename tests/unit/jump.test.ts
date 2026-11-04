import { describe, expect, it } from 'vitest';
import { JumpAssist, extraGravity } from '../../src/core/jump';

const FRAME = 1 / 60;

/** Runs frames until `fn` returns true or `frames` run out; returns the frame index or -1. */
function frameOf (frames: number, fn: (i: number) => boolean): number
{
    for (let i = 0; i < frames; i++) if (fn(i)) return i;
    return -1;
}

describe('JumpAssist', () => {
    it('jumps immediately when pressed on the ground', () => {
        const j = new JumpAssist(0.1, 0.12);
        expect(j.update(FRAME, true, true)).toBe(true);
    });

    it('allows a jump within coyote time after leaving the ground', () => {
        const j = new JumpAssist(0.1, 0.12);
        j.update(FRAME, true, false);
        for (let i = 0; i < 4; i++) j.update(FRAME, false, false);     // ~67 ms in the air
        expect(j.update(FRAME, false, true)).toBe(true);
    });

    it('refuses a jump after coyote time has run out', () => {
        const j = new JumpAssist(0.1, 0.12);
        j.update(FRAME, true, false);
        for (let i = 0; i < 10; i++) j.update(FRAME, false, false);    // ~167 ms in the air
        expect(j.update(FRAME, false, true)).toBe(false);
    });

    it('buffers a press made shortly before landing', () => {
        const j = new JumpAssist(0.1, 0.12);
        j.update(FRAME, false, true);                                   // pressed in the air
        // Lands 5 frames (~83 ms) later, inside the 120 ms buffer.
        expect(frameOf(10, i => j.update(FRAME, i >= 4, false))).toBe(4);
    });

    it('forgets a press made too long before landing', () => {
        const j = new JumpAssist(0.1, 0.12);
        j.update(FRAME, false, true);
        expect(frameOf(20, i => j.update(FRAME, i >= 10, false))).toBe(-1);
    });

    it('never jumps twice from one press', () => {
        const j = new JumpAssist(0.1, 0.12);
        expect(j.update(FRAME, true, true)).toBe(true);
        // Still touching the ground on the next frame (physics hasn't moved the body yet).
        expect(j.update(FRAME, true, false)).toBe(false);
    });
});

describe('extraGravity', () => {
    const physics = { gravity: 1000, fallGravity: 1800 };
    const feel = { apexHangMult: 0.5, apexThreshold: 20 };

    it('adds nothing while rising fast', () => {
        expect(extraGravity(-300, physics, feel)).toBe(0);
    });

    it('lightens gravity near the apex', () => {
        expect(extraGravity(-5, physics, feel)).toBe(-500);
        expect(extraGravity(5, physics, feel)).toBe(-500);
    });

    it('adds the fall difference while falling', () => {
        expect(extraGravity(200, physics, feel)).toBe(800);
    });
});
