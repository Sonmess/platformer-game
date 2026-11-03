// All tunable values live here (see CLAUDE.md). Logical resolution per docs/decisions/0002.
export const GAME = {
    WIDTH: 480,
    HEIGHT: 270,
    BACKGROUND: '#1b2a1f',
    PARENT_ID: 'game-container'
} as const;

/** Tile size in px; designer-facing distances are expressed in tiles. */
export const TILE = 16;

// Designer-facing movement outcomes. Step 7 adds coyote, buffer, jump cut and fall gravity.
export const PLAYER_FEEL = {
    runSpeed: 130,          // px/s
    accelTime: 0.08,        // s to reach runSpeed on the ground
    decelTime: 0.06,        // s to stop on the ground
    jumpHeightTiles: 3.5,   // peak height of a full jump
    timeToApex: 0.36,       // s
    maxFallSpeed: 420       // px/s; keep maxFallSpeed / 60 below TILE (no tunneling)
} as const;

/** Physics derived from PLAYER_FEEL; never hand-tune these. Y axis points down. */
export function derivePhysics (feel: typeof PLAYER_FEEL, tile: number)
{
    const h = feel.jumpHeightTiles * tile;
    const t = feel.timeToApex;
    return {
        gravity: (2 * h) / (t * t),
        jumpVelocity: -(2 * h) / t,
        groundAccel: feel.runSpeed / feel.accelTime,
        groundDecel: feel.runSpeed / feel.decelTime
    };
}

export const PHYSICS = derivePhysics(PLAYER_FEEL, TILE);

export const PLAYER = {
    WIDTH: 12,
    HEIGHT: 16,
    COLOR: 0xf28c28
} as const;

// Tiled map names (src/levels/*.json). The spawn point marks the player's feet.
export const LEVEL = {
    MAP_KEY: 'level1',
    TILESET_NAME: 'greybox',        // tileset name inside the Tiled JSON
    GROUND_LAYER: 'ground',
    OBJECT_LAYER: 'objects',
    SPAWN_OBJECT: 'spawn'
} as const;

// Procedural greybox tileset (replaced by real art in step 9): [fill, surface].
export const GREYBOX = {
    TEXTURE_KEY: 'greybox-tiles',
    FILL: 0x4a574c,
    SURFACE: 0x7d8f74,
    EDGE: 0x2f3a31
} as const;
