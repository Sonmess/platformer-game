// All tunable values live here (see CLAUDE.md). Logical resolution per docs/decisions/0002.
export const GAME = {
    WIDTH: 480,
    HEIGHT: 270,
    BACKGROUND: '#1b2a1f',
    PARENT_ID: 'game-container'
} as const;

/** Tile size in px; designer-facing distances are expressed in tiles. */
export const TILE = 16;

// Designer-facing movement outcomes (see references/jump-feel.md). Physics is derived below.
export const PLAYER_FEEL = {
    runSpeed: 130,          // px/s
    accelTime: 0.08,        // s to reach runSpeed on the ground
    decelTime: 0.06,        // s to stop on the ground
    airControl: 0.8,        // multiplier on acceleration in the air (<1 = committed arcs)
    airDragMult: 0.3,       // multiplier on stopping drag in the air (keeps momentum over gaps)
    jumpHeightTiles: 3.5,   // peak height of a full (held) jump
    timeToApex: 0.36,       // s
    fallGravityMult: 1.8,   // fall heavier than rise, so jumps don't feel floaty
    jumpCutMult: 0.45,      // releasing jump while rising multiplies vy by this (short hop)
    apexHangMult: 0.5,      // gravity multiplier near the apex
    apexThreshold: 20,      // |vy| below this (px/s) counts as "near the apex"
    maxFallSpeed: 420,      // px/s; keep maxFallSpeed / 60 below TILE (no tunneling)
    coyoteTime: 0.1,        // s after leaving a ledge you can still jump
    jumpBuffer: 0.12        // s a jump press is remembered before landing
} as const;

/** Physics derived from PLAYER_FEEL; never hand-tune these. Y axis points down. */
export function derivePhysics (feel: typeof PLAYER_FEEL, tile: number)
{
    const h = feel.jumpHeightTiles * tile;
    const t = feel.timeToApex;
    const gravity = (2 * h) / (t * t);
    return {
        gravity,                                    // world gravity = rise gravity
        fallGravity: gravity * feel.fallGravityMult,
        jumpVelocity: -(2 * h) / t,
        groundAccel: feel.runSpeed / feel.accelTime,
        groundDecel: feel.runSpeed / feel.decelTime
    };
}

export const PHYSICS = derivePhysics(PLAYER_FEEL, TILE);

/** Draw order; higher is in front. */
export const DEPTH = {
    PLAYER: 10
} as const;

export const PLAYER = {
    WIDTH: 12,
    HEIGHT: 16,
    // Hitbox only; the visible fox sprite follows it (see ASSETS.FOX).
} as const;

export const CAMERA = {
    lerpX: 0.15,            // per-frame follow smoothing (1 = rigid)
    lerpY: 0.1,             // looser vertically so small hops don't bob the view
    deadzoneW: 32,          // px the player can move without the camera following
    deadzoneH: 64,
    lookAhead: 48,          // px the view leads in the facing direction
    lookAheadRate: 0.04     // per-frame (at 60 FPS) approach rate of the look-ahead offset
} as const;

// Tiled map names (src/levels/*.json). The spawn point marks the player's feet.
export const LEVEL = {
    MAP_KEY: 'level1',
    TILESET_NAME: 'forest',         // tileset name inside the Tiled JSON
    GROUND_LAYER: 'ground',
    OBJECT_LAYER: 'objects',
    SPAWN_OBJECT: 'spawn',
    SPIKES_TYPE: 'spikes',
    CHECKPOINT_TYPE: 'checkpoint',
    COIN_TYPE: 'coin',
    GOAL_TYPE: 'goal'
} as const;

export const HAZARD = {
    FALL_MARGIN: 16,            // px below the level bottom before a fall counts as death
    SPIKE_INSET_TOP: 8,         // forgiving hitbox: only the lower half of a spike tile hurts
    SPIKE_INSET_X: 2
} as const;

// Collectible ("coin" in code, a cherry on screen).
export const COIN = {
    HITBOX: 10              // px, square, centred on the Tiled point
} as const;

export const HUD = {
    MARGIN: 8,
    ICON_GAP: 2,
    FONT_FAMILY: 'PixelifySans',    // loaded in Preload (ASSETS.FONT)
    FONT_SIZE: '16px',
    // Phaser sizes text from this string; include Slovak capitals with carons or their marks get clipped.
    TEXT_METRICS: '|MÉqgyČŠŽĽŤĎŇ',
    TEXT_COLOR: '#ffffff',
    TEXT_STROKE: '#000000',
    TEXT_STROKE_WIDTH: 2
} as const;

// "Level complete" screen. UI text is Slovak, like the rest of the project.
export const RESULTS = {
    INPUT_DELAY_MS: 600,        // ignore confirm briefly so a held key doesn't skip the screen
    OVERLAY_COLOR: 0x0d1410,
    TITLE_SIZE: '32px',
    LINE_SIZE: '24px',          // Pixelify Sans shows carons on capitals (Č, Š…) only from 24px up
    HINT_SIZE: '16px',          // lowercase-only hint line
    LINE_SPACING: 24,
    TEXT: {
        TITLE: 'Level dokončený!',
        COINS: 'Čerešne',
        DEATHS: 'Smrti',
        TIME: 'Čas',
        RESTART: 'Enter alebo R = hrať znova'
    }
} as const;

export const CHECKPOINT = {
    IDLE_TINT: 0x6b6b6b     // the sign is dimmed until reached
} as const;

// Art and fonts in public/assets (sources and licenses: public/assets/CREDITS.md).
export const ASSETS = {
    TILESET: { key: 'forest-tiles', url: 'assets/tall-forest/tileset.png' },
    FOX: {
        frameWidth: 33, frameHeight: 32,
        idle: { key: 'fox-idle', url: 'assets/sunny-land/sprites/player-idle.png', frames: 4, frameRate: 8 },
        run: { key: 'fox-run', url: 'assets/sunny-land/sprites/payer-run.png', frames: 6, frameRate: 12 },
        jump: { key: 'fox-jump', url: 'assets/sunny-land/sprites/player-jump.png' }     // 0 = rising, 1 = falling
    },
    CHERRY: { key: 'cherry', url: 'assets/sunny-land/sprites/cherry.png', frameWidth: 21, frameHeight: 21, frames: 5, frameRate: 10 },
    SPIKES: { key: 'spikes', url: 'assets/sunny-land/props/spikes.png' },
    SIGN: { key: 'sign', url: 'assets/sunny-land/props/sign.png' },
    DOOR: { key: 'door', url: 'assets/sunny-land/props/door.png' },
    FONT: { key: 'PixelifySans', url: 'assets/fonts/PixelifySans.ttf' }
} as const;

/** Animation keys created in Preload. */
export const ANIM = {
    FOX_IDLE: 'fox-idle',
    FOX_RUN: 'fox-run',
    FOX_JUMP: 'fox-jump',
    FOX_FALL: 'fox-fall',
    CHERRY: 'cherry-spin'
} as const;

/** |vx| above this (px/s) on the ground plays the run animation. */
export const FOX_RUN_THRESHOLD = 10;
