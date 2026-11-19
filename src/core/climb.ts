// Phaser-free climbing rules (vines and tree trunks), unit-tested in tests/unit/climb.test.ts.

export type ClimbKind = 'vine' | 'trunk';

/** A climbable area from the level (Tiled rectangle of type `vine` or `trunk`). */
export interface ClimbZone
{
    kind: ClimbKind;
    x: number;
    y: number;
    width: number;
    height: number;
}

/** The cat's hitbox. */
export interface Box
{
    left: number;
    right: number;
    top: number;
    bottom: number;
}

export const zoneCentreX = (z: ClimbZone): number => z.x + z.width / 2;

/**
 * The zone the cat can hold on to: its hitbox centre is over the zone (give or take `sideMargin`) and the hitbox
 * overlaps it vertically, with the paws reaching `reach` px beyond the hitbox. The nearest zone wins.
 */
export function zoneAt (zones: readonly ClimbZone[], box: Box, sideMargin: number, reach: number): ClimbZone | null
{
    const cx = (box.left + box.right) / 2;
    let best: ClimbZone | null = null;
    for (const z of zones) {
        if (cx < z.x - sideMargin || cx > z.x + z.width + sideMargin) continue;
        if (box.bottom + reach < z.y || box.top - reach > z.y + z.height) continue;
        if (!best || Math.abs(zoneCentreX(z) - cx) < Math.abs(zoneCentreX(best) - cx)) best = z;
    }
    return best;
}

/**
 * Does the cat take hold? Up (W) grabs a vine or a trunk, on the ground or in the air. A trunk is also caught by
 * jumping against it: in the air, steering towards its middle (`dx` = zone centre minus cat centre).
 */
export function wantsGrab (o: { kind: ClimbKind; up: boolean; onGround: boolean; dir: number; dx: number }): boolean
{
    if (o.up) return true;
    return o.kind === 'trunk' && !o.onGround && o.dir !== 0 && o.dir * o.dx >= 0;
}

/** Vertical speed while holding on: up climbs, down slides down, both or neither = hold still. */
export function climbVelocity (up: boolean, down: boolean, speed: number): number
{
    return ((down ? 1 : 0) - (up ? 1 : 0)) * speed;
}

/** The cat's head has reached the zone's top: climbing on means pulling up and over. */
export const atTop = (z: ClimbZone, box: Box): boolean => box.top <= z.y;

/** The cat's middle has slid below the zone's bottom (the end of a vine hanging in the air): it lets go. */
export const pastBottom = (z: ClimbZone, box: Box): boolean => (box.top + box.bottom) / 2 > z.y + z.height;

/** Launch speed (px/s, upwards = negative) that reaches `heightPx` under `gravity`. */
export const launchVelocity = (heightPx: number, gravity: number): number => -Math.sqrt(2 * gravity * heightPx);
