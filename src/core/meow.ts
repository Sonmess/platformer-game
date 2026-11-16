// Meow mechanics without Phaser, so they are unit-testable. Enemies use `inMeowRange` to decide
// whether a meow scared them.

/** A timed lock-out: `trigger()` succeeds only when the previous use has run out. Advance with `update`. */
export class Cooldown
{
    remainingMs = 0;

    constructor (readonly durationMs: number) {}

    get ready (): boolean
    {
        return this.remainingMs <= 0;
    }

    update (deltaMs: number): void
    {
        this.remainingMs = Math.max(0, this.remainingMs - deltaMs);
    }

    /** Uses the ability if ready; returns whether it was used. */
    trigger (): boolean
    {
        if (!this.ready) return false;
        this.remainingMs = this.durationMs;
        return true;
    }

    reset (): void
    {
        this.remainingMs = 0;
    }
}

/**
 * An enemy's fright. `scare()` starts (or restarts) it; `update()` counts it down. When time is up the
 * enemy recovers only if `canRecover` (e.g. the cat is not standing inside it), so it never turns
 * dangerous right on top of the player.
 */
export class Scare
{
    remainingMs = 0;
    private active = false;

    constructor (readonly durationMs: number, readonly warnMs: number) {}

    get scared (): boolean
    {
        return this.active;
    }

    /** Last moments before recovering (enemies shake harder as a warning). */
    get warning (): boolean
    {
        return this.active && this.remainingMs <= this.warnMs;
    }

    scare (): void
    {
        this.active = true;
        this.remainingMs = this.durationMs;
    }

    /** Returns true on the frame the enemy recovers. */
    update (deltaMs: number, canRecover: boolean): boolean
    {
        if (!this.active) return false;
        this.remainingMs = Math.max(0, this.remainingMs - deltaMs);
        if (this.remainingMs > 0 || !canRecover) return false;
        this.active = false;
        return true;
    }
}

/** Where a meow reaches: from the cat's head forward `range` px, `halfHeight` px above and below. */
export interface MeowWave
{
    x: number;
    y: number;
    /** 1 = right, -1 = left. */
    dir: 1 | -1;
    range: number;
    halfHeight: number;
    /** Also reaches this far behind the origin, so something touching the cat's face counts. */
    behind: number;
}

export function inMeowRange (wave: MeowWave, point: { x: number; y: number }): boolean
{
    const ahead = (point.x - wave.x) * wave.dir;
    return ahead >= -wave.behind && ahead <= wave.range && Math.abs(point.y - wave.y) <= wave.halfHeight;
}
