/**
 * Life of a falling stalactite, without Phaser (unit-tested in tests/unit/stalactite.test.ts):
 * hanging → (the cat passes underneath) shaking → falling → shattered (on the floor, or gone down a pit).
 * Only a falling one hurts. It hangs again when the cat respawns.
 */
export type StalactitePhase = 'hanging' | 'shaking' | 'falling' | 'shattered';

export interface StalactiteTuning
{
    SHAKE_MS: number;
    FALL_GRAVITY: number;       // px/s²
    MAX_FALL_SPEED: number;     // px/s
}

export class StalactiteLife
{
    phase: StalactitePhase = 'hanging';
    /** Time spent in the current phase (ms). */
    elapsedMs = 0;
    /** How far it has fallen (px); its speed now (px/s). */
    dropPx = 0;
    speed = 0;

    /** @param fallPx distance from where it hangs to the floor below (Infinity over a pit). */
    constructor (private readonly tuning: StalactiteTuning, readonly fallPx: number) {}

    get harmful (): boolean
    {
        return this.phase === 'falling';
    }

    /**
     * Advances time. `catBelow`: the cat is under it (only matters while it hangs). Returns the new phase when it
     * changes, else null. Falls with gravity up to a top speed; lands (shatters) after `fallPx`.
     */
    update (deltaMs: number, catBelow: boolean): StalactitePhase | null
    {
        if (this.phase === 'hanging') {
            if (!catBelow) return null;
            return this.enter('shaking');
        }
        this.elapsedMs += deltaMs;
        if (this.phase === 'shaking' && this.elapsedMs >= this.tuning.SHAKE_MS) return this.enter('falling');
        if (this.phase === 'falling') {
            const dt = deltaMs / 1000;
            this.speed = Math.min(this.tuning.MAX_FALL_SPEED, this.speed + this.tuning.FALL_GRAVITY * dt);
            this.dropPx = Math.min(this.fallPx, this.dropPx + this.speed * dt);
            if (this.dropPx >= this.fallPx) return this.enter('shattered');
        }
        return null;
    }

    /** Hanging again, still (the cat respawned or the level restarted). */
    reset (): void
    {
        this.phase = 'hanging';
        this.elapsedMs = 0;
        this.dropPx = 0;
        this.speed = 0;
    }

    private enter (phase: StalactitePhase): StalactitePhase
    {
        this.phase = phase;
        this.elapsedMs = 0;
        return phase;
    }
}

/**
 * Does the cat set it off? Its hitbox is below the stalactite's tip and its centre within `reach` px sideways.
 */
export function catUnder (tipX: number, tipY: number, cat: { left: number; right: number; top: number }, reach: number): boolean
{
    const cx = (cat.left + cat.right) / 2;
    return cat.top > tipY && Math.abs(cx - tipX) <= reach;
}
