/**
 * Life of a crumbling platform, without Phaser (unit-tested):
 * solid → (cat stands on it) shaking → falling → gone → (after a while, if the spot is free) solid.
 * Solid while shaking, so the cat has a moment to jump off; no longer solid once it falls.
 */
export type CrumblePhase = 'solid' | 'shaking' | 'falling' | 'gone';

export class Crumble
{
    phase: CrumblePhase = 'solid';
    /** Time spent in the current phase (ms). */
    elapsedMs = 0;

    constructor (readonly shakeMs: number, readonly fallMs: number, readonly respawnMs: number) {}

    /** The cat can stand on it (solid or still shaking). */
    get solid (): boolean
    {
        return this.phase === 'solid' || this.phase === 'shaking';
    }

    /** The cat stood on it: start shaking (once; later touches change nothing). */
    touch (): boolean
    {
        if (this.phase !== 'solid') return false;
        this.phase = 'shaking';
        this.elapsedMs = 0;
        return true;
    }

    /**
     * Advances time. Returns the new phase when it changes, else null. `spotFree`: nothing stands
     * where the platform would come back (it never reappears inside the cat).
     */
    update (deltaMs: number, spotFree: boolean): CrumblePhase | null
    {
        if (this.phase === 'solid') return null;
        this.elapsedMs += deltaMs;
        const next = this.phase === 'shaking' && this.elapsedMs >= this.shakeMs ? 'falling'
            : this.phase === 'falling' && this.elapsedMs >= this.fallMs ? 'gone'
            : this.phase === 'gone' && this.elapsedMs >= this.respawnMs && spotFree ? 'solid'
            : null;
        if (next) {
            this.phase = next;
            this.elapsedMs = 0;
        }
        return next;
    }

    /** Back in place at once (the cat respawned). */
    reset (): void
    {
        this.phase = 'solid';
        this.elapsedMs = 0;
    }
}
