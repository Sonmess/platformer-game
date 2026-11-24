/**
 * A bat's swoop, without Phaser (unit-tested in tests/unit/bat.test.ts):
 * hanging → (the cat comes below it, close sideways) waking (wings open, a squeak: the warning) → swooping (down in an arc
 * to where the cat was, and back up) → resting (hangs, can't swoop again for a moment) → hanging.
 * Positions are offsets from the roost (the bat's hitbox centre while it hangs); y points down.
 */
export type BatPhase = 'hanging' | 'waking' | 'swooping' | 'resting';

export interface BatTuning
{
    TRIGGER_X: number;          // the cat's centre this close sideways…
    TRIGGER_BELOW: number;      // …and at most this far below the roost
    WAKE_MS: number;
    SWOOP_MS: number;
    REST_MS: number;
    MAX_REACH_X: number;        // the swoop's target is clamped to this far sideways…
    MAX_DROP: number;           // …and this far down
}

export class BatFlight
{
    phase: BatPhase = 'hanging';
    elapsedMs = 0;
    /** Where the swoop aims (offset from the roost), fixed when the bat wakes. */
    target = { x: 0, y: 0 };

    constructor (private readonly tuning: BatTuning) {}

    /** `cat`: the cat's centre relative to the roost, or null when there is no cat to see (dead). Returns a new phase. */
    update (deltaMs: number, cat: { x: number; y: number } | null): BatPhase | null
    {
        const T = this.tuning;
        if (this.phase === 'hanging') {
            if (!cat || Math.abs(cat.x) > T.TRIGGER_X || cat.y <= 0 || cat.y > T.TRIGGER_BELOW) return null;
            this.target = { x: Math.max(-T.MAX_REACH_X, Math.min(T.MAX_REACH_X, cat.x)), y: Math.min(T.MAX_DROP, cat.y) };
            return this.enter('waking');
        }
        this.elapsedMs += deltaMs;
        if (this.phase === 'waking' && this.elapsedMs >= T.WAKE_MS) return this.enter('swooping');
        if (this.phase === 'swooping' && this.elapsedMs >= T.SWOOP_MS) return this.enter('resting');
        if (this.phase === 'resting' && this.elapsedMs >= T.REST_MS) return this.enter('hanging');
        return null;
    }

    /**
     * The bat's offset from the roost now. The swoop is an arc: it drops fast towards the target (the down move leads the
     * sideways one), reaches it halfway, and climbs back the same way.
     */
    get offset (): { x: number; y: number }
    {
        if (this.phase !== 'swooping') return { x: 0, y: 0 };
        const t = Math.min(1, this.elapsedMs / this.tuning.SWOOP_MS);
        const s = Math.sin(Math.PI * t);
        return { x: this.target.x * s, y: this.target.y * Math.pow(s, 0.6) };
    }

    /** Back on the roost, asleep (scared off, or the level restarted). */
    reset (): void
    {
        this.phase = 'hanging';
        this.elapsedMs = 0;
        this.target = { x: 0, y: 0 };
    }

    private enter (phase: BatPhase): BatPhase
    {
        this.phase = phase;
        this.elapsedMs = 0;
        return phase;
    }
}
