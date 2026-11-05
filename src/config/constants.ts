// All tunable values live here (see CLAUDE.md). Logical resolution per docs/decisions/0002.
export const GAME = {
    WIDTH: 480,
    HEIGHT: 270,
    BACKGROUND: '#1b2a1f',      // boot/results screens; the level shows PARALLAX.SKY_COLOR
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
    PARALLAX: -100,         // background layers stack upwards from here, behind the tilemap (0)
    PLAYER: 10,
    EFFECTS: 20
} as const;

/**
 * Sound effects: project-owned 8-bit WAVs from tools/sfx.mjs (each normalised to full scale, so
 * loudness is balanced here). `detune` = random pitch spread in cents, so repeats don't drone.
 */
export const AUDIO = {
    MASTER_VOLUME: 0.6,
    SFX: {
        JUMP: { key: 'sfx-jump', url: 'assets/own/sfx/jump.wav', volume: 0.35, detune: 60 },
        LAND: { key: 'sfx-land', url: 'assets/own/sfx/land.wav', volume: 0.5, detune: 80 },    // × impact strength
        COIN: { key: 'sfx-coin', url: 'assets/own/sfx/coin.wav', volume: 0.45, detune: 0 },
        CHECKPOINT: { key: 'sfx-checkpoint', url: 'assets/own/sfx/checkpoint.wav', volume: 0.5, detune: 0 },
        DIE: { key: 'sfx-die', url: 'assets/own/sfx/die.wav', volume: 0.5, detune: 0 },
        GOAL: { key: 'sfx-goal', url: 'assets/own/sfx/goal.wav', volume: 0.55, detune: 0 }
    },
    // Coins picked up in quick succession climb in pitch (a combo).
    COIN_COMBO: { windowMs: 700, stepCents: 100, maxSteps: 5 },
    LOG_SIZE: 20            // recently played keys kept for the test API
} as const;

/**
 * Juice (see references/juice.md): transient feedback driven by gameplay events, never touching
 * physics. Tiers: small = jump/coin, medium = hard landing/checkpoint, large = death.
 * Shake intensity is a fraction of the camera size (0.006 × 480 px ≈ 3 px).
 */
export const JUICE = {
    PARTICLE_SIZE: 2,                       // px, square pixels baked in Preload
    // Scales stay >= 1 (whole pixels; smaller pixel-art dots vanish); particles fade out via alpha.
    DUST: { key: 'fx-dust', color: 0xe8dcb8, speed: { min: 20, max: 60 }, lifespan: { min: 300, max: 450 }, scale: { start: 2, end: 1 }, gravityY: 80, spreadX: 10 },
    SPARK: { key: 'fx-spark', color: 0xffffff, speed: { min: 40, max: 110 }, lifespan: { min: 350, max: 550 }, scale: 1 },
    JUMP: { scaleX: 0.8, scaleY: 1.2, ms: 120, dust: 5 },
    LAND: {
        minImpact: 150,                     // px/s; softer touchdowns (small steps) get no effect
        scaleX: 1.25, scaleY: 0.8, ms: 140,
        dustMin: 4, dustMax: 12,            // scaled by impact / maxFallSpeed
        shakeAbove: 0.98, shakeMs: 80, shakeIntensity: 0.003    // only near terminal speed: a full jump lands at ~0.91
    },
    COIN: { sparks: 8, tint: [0xffffff, 0xffe066, 0xff6a6a], hudPopScale: 1.4, hudPopMs: 160 },
    CHECKPOINT: { sparks: 14, sparkHeight: 8, tint: [0xffe066, 0xffa030, 0xff5a20] },
    DEATH: { particles: 16, shakeMs: 160, shakeIntensity: 0.006, tint: [0xffffff, 0xd0d0d0] },
    RESPAWN: { fromScale: 0.5, ms: 220 }
} as const;

/**
 * Background layers, far to near (see references/parallax.md). The Tall Forest art is 240 px high,
 * pinned to the top of the 270 px screen; `fillBelow` extends a layer's bottom colour to the screen
 * edge (seen only in pits). `gap` adds empty space after the image so the layer repeats sparsely,
 * `flip` mirrors it so a reused image doesn't look copied.
 */
export const PARALLAX = {
    SKY_COLOR: '#96b624',   // = the top row of `back`, behind everything
    LAYERS: [
        { key: 'bg-back', url: 'assets/tall-forest/back.png', factor: 0.1 },
        { key: 'bg-far', url: 'assets/tall-forest/far.png', factor: 0.3, fillBelow: 0x37482c },
        { key: 'bg-middle', url: 'assets/tall-forest/middle.png', factor: 0.5, gap: 128 },
        { key: 'bg-near', url: 'assets/tall-forest/middle.png', factor: 0.75, gap: 352, flip: true, tint: 0x66767a }
    ] as readonly ParallaxLayerDef[]
} as const;

export interface ParallaxLayerDef
{
    key: string;
    url: string;
    factor: number;         // 0 = fixed to the screen, 1 = moves with the world
    fillBelow?: number;
    gap?: number;
    flip?: boolean;
    tint?: number;
}

export const PLAYER = {
    WIDTH: 18,              // hitbox, sized to the cat's body (ears and tail stick out, on purpose)
    HEIGHT: 14
    // The visible cat sprite follows the hitbox (see ASSETS.CAT).
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
    DECOR_LAYER: 'decor',           // non-colliding backdrop (cave interior), drawn behind the ground
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

// Art and fonts in public/assets (sources and licenses: public/assets/CREDITS.md).
export const ASSETS = {
    TILESET: { key: 'forest-tiles', url: 'assets/tall-forest/tileset.png' },
    // Project-owned pixel art from tools/sprites.mjs (run `node tools/sprites.mjs` to regenerate the PNGs).
    CAT: {
        frameWidth: 32, frameHeight: 22,
        idle: { key: 'cat-idle', url: 'assets/own/cat-idle.png', frames: 2, frameRate: 2 },
        run: { key: 'cat-run', url: 'assets/own/cat-run.png', frames: 4, frameRate: 12 },
        jump: { key: 'cat-jump', url: 'assets/own/cat-jump.png' }       // 0 = rising, 1 = falling
    },
    CAMPFIRE: {
        frameWidth: 24, frameHeight: 24,
        unlit: { key: 'campfire-unlit', url: 'assets/own/campfire-unlit.png' },
        lit: { key: 'campfire-lit', url: 'assets/own/campfire-lit.png', frames: 4, frameRate: 10 }
    },
    CHERRY: { key: 'cherry', url: 'assets/sunny-land/sprites/cherry.png', frameWidth: 21, frameHeight: 21, frames: 5, frameRate: 10 },
    SPIKES: { key: 'spikes', url: 'assets/sunny-land/props/spikes.png' },
    FONT: { key: 'PixelifySans', url: 'assets/fonts/PixelifySans.ttf' }
} as const;

/** Animation keys created in Preload. */
export const ANIM = {
    CAT_IDLE: 'cat-idle',
    CAT_RUN: 'cat-run',
    CAT_JUMP: 'cat-jump',
    CAT_FALL: 'cat-fall',
    CHERRY: 'cherry-spin',
    CAMPFIRE: 'campfire-burn'
} as const;

/** |vx| above this (px/s) on the ground plays the run animation. */
export const RUN_ANIM_THRESHOLD = 10;
