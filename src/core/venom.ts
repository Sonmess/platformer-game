/**
 * The snake's poison cycle (pure, no Phaser): calm (slithers, can be clawed) → warn (stops and puffs up its hood)
 * → spray (a poison cloud around it) → calm again. Times in ms of game time.
 */
export type VenomPhase = 'calm' | 'warn' | 'spray';

export interface VenomTiming
{
    CALM_MS: number;
    WARN_MS: number;
    SPRAY_MS: number;
}

const NEXT: Record<VenomPhase, VenomPhase> = { calm: 'warn', warn: 'spray', spray: 'calm' };

export class Venom
{
    phase: VenomPhase = 'calm';
    private leftMs: number;

    constructor (private readonly timing: VenomTiming)
    {
        this.leftMs = timing.CALM_MS;
    }

    /** Time left in the current phase. */
    get remainingMs (): number
    {
        return this.leftMs;
    }

    private length (phase: VenomPhase): number
    {
        return phase === 'calm' ? this.timing.CALM_MS : phase === 'warn' ? this.timing.WARN_MS : this.timing.SPRAY_MS;
    }

    /** Advances the cycle; returns the new phase when it changed this update (at most one step per call), else null. */
    update (deltaMs: number): VenomPhase | null
    {
        this.leftMs -= deltaMs;
        if (this.leftMs > 0) return null;
        this.phase = NEXT[this.phase];
        this.leftMs += this.length(this.phase);
        return this.phase;
    }
}

export interface Circle { x: number; y: number; radius: number }
export interface Box { x: number; y: number; width: number; height: number }

/** Does the poison cloud (a circle) reach the box (the cat's hitbox, top-left corner)? */
export function inCloud (cloud: Circle, box: Box): boolean
{
    const nx = Math.max(box.x, Math.min(cloud.x, box.x + box.width));
    const ny = Math.max(box.y, Math.min(cloud.y, box.y + box.height));
    return (nx - cloud.x) ** 2 + (ny - cloud.y) ** 2 <= cloud.radius ** 2;
}
