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
    TREASURE: -1,           // behind the tilemap: hidden by the fake rock of a secret room until it turns see-through
    CLIMBABLES: 2,          // vines and tree trunks, above the tilemap (roots over the ground), behind platforms
    PLATFORMS: 5,           // moving platforms, above the tilemap
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
        LIFE: { key: 'sfx-life', url: 'assets/own/sfx/life.wav', volume: 0.5, detune: 0 },
        GROW: { key: 'sfx-grow', url: 'assets/own/sfx/grow.wav', volume: 0.5, detune: 0 },
        SHRINK: { key: 'sfx-shrink', url: 'assets/own/sfx/shrink.wav', volume: 0.5, detune: 0 },
        CHECKPOINT: { key: 'sfx-checkpoint', url: 'assets/own/sfx/checkpoint.wav', volume: 0.5, detune: 0 },
        DIE: { key: 'sfx-die', url: 'assets/own/sfx/die.wav', volume: 0.5, detune: 0 },
        GOAL: { key: 'sfx-goal', url: 'assets/own/sfx/goal.wav', volume: 0.55, detune: 0 },
        GAME_OVER: { key: 'sfx-gameover', url: 'assets/own/sfx/gameover.wav', volume: 0.55, detune: 0 },
        SCARE: { key: 'sfx-scare', url: 'assets/own/sfx/scare.wav', volume: 0.45, detune: 80 },
        CRACK: { key: 'sfx-crack', url: 'assets/own/sfx/crack.wav', volume: 0.4, detune: 60 },
        CRUMBLE: { key: 'sfx-crumble', url: 'assets/own/sfx/crumble.wav', volume: 0.45, detune: 60 },
        MEOW: { key: 'sfx-meow', url: 'assets/own/sfx/meow.wav', volume: 0.5, detune: 70 },
        CLAW: { key: 'sfx-claw', url: 'assets/own/sfx/claw.wav', volume: 0.4, detune: 120 },
        FLEE: { key: 'sfx-flee', url: 'assets/own/sfx/flee.wav', volume: 0.45, detune: 80 },
        HISS: { key: 'sfx-hiss', url: 'assets/own/sfx/hiss.wav', volume: 0.4, detune: 60 },
        SPRAY: { key: 'sfx-spray', url: 'assets/own/sfx/spray.wav', volume: 0.45, detune: 60 },
        GRAB: { key: 'sfx-grab', url: 'assets/own/sfx/grab.wav', volume: 0.4, detune: 80 },
        CLIMB: { key: 'sfx-climb', url: 'assets/own/sfx/climb.wav', volume: 0.25, detune: 150 },
        RUMBLE: { key: 'sfx-rumble', url: 'assets/own/sfx/rumble.wav', volume: 0.45, detune: 80 },
        SHATTER: { key: 'sfx-shatter', url: 'assets/own/sfx/shatter.wav', volume: 0.45, detune: 100 },
        SECRET: { key: 'sfx-secret', url: 'assets/own/sfx/secret.wav', volume: 0.45, detune: 0 },
        TREASURE: { key: 'sfx-treasure', url: 'assets/own/sfx/treasure.wav', volume: 0.5, detune: 0 }
    },
    // Background loops from tools/music.mjs, one per level (LevelDef.music); one instance each for the whole game.
    MUSIC: { key: 'music-forest', url: 'assets/own/music/forest.wav', volume: 0.4, pausedVolume: 0.12 } as MusicTrack,
    CAVE_MUSIC: { key: 'music-cave', url: 'assets/own/music/cave.wav', volume: 0.45, pausedVolume: 0.12 } as MusicTrack,
    MUSIC_FADE_MS: 1200,        // a different level's track crossfades over this long
    // Coins picked up in quick succession climb in pitch (a combo).
    COIN_COMBO: { windowMs: 700, stepCents: 100, maxSteps: 5 },
    // Precious feathers ring higher (cents added to the pickup sound).
    FEATHER_PITCH: { normal: 0, silver: 400, gold: 700 },
    LOG_SIZE: 20            // recently played keys kept for the test API
} as const;

export interface MusicTrack
{
    key: string;
    url: string;
    volume: number;
    pausedVolume: number;       // ducked under the pause overlay
}

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
    // Sparkles in the feather's colours; more for the precious ones.
    COIN: {
        hudPopScale: 1.4, hudPopMs: 160,
        normal: { sparks: 8, tint: [0xffffff, 0xa6dcff, 0x3b86d6] },
        silver: { sparks: 12, tint: [0xffffff, 0xeef2f8, 0x9aa4b6] },
        gold: { sparks: 16, tint: [0xffffff, 0xffe58a, 0xd99a1e] }
    },
    LIFE: { sparks: 18, tint: [0xffffff, 0xff9ab0, 0xffe066] },     // a life won back: a burst on the cat
    // Growing / shrinking: the cat flickers between the two sizes a few times, like Mario.
    POWER: { sparks: 16, tint: [0xffffff, 0xffb6c8, 0xe8607f], flickers: 3, flickerMs: 70 },
    CHECKPOINT: { sparks: 14, sparkHeight: 8, tint: [0xffe066, 0xffa030, 0xff5a20] },
    DEATH: {
        particles: 16, shakeMs: 160, shakeIntensity: 0.006, tint: [0xffffff, 0xd0d0d0],
        // The knocked-out cat hops up, then spins and drops off the screen (not for pits: it is already gone).
        popPx: 28, popMs: 260, fallPx: 200, fallMs: 600, spinDeg: 200
    },
    CRUMBLE: { spacing: 12, dustPerPuff: 3, offsetY: 12 },     // dust along a crumbling platform as it falls
    SCARE: { drops: 8, tint: [0xffffff, 0xbfe3ff] },     // a burst of "sweat" over a scared enemy
    // Claw swipe: three short slash lines in front of the paw, sliding and fading; a hit enemy gets a puff of fur.
    CLAW: { LINES: 3, LENGTH_PX: 9, SPACING_PX: 4, SLANT_PX: 4, SLIDE_PX: 4, MS: 160, LINE: 1, COLOR: 0xffffff, HIT_SPARKS: 10, HIT_TINT: [0xffffff, 0xd0d0d0, 0x8a8a9a] },
    // Snake poison: a translucent cloud of exactly the hurting radius swells and fades, with drops bursting out.
    POISON: { COLOR: 0xa64fd1, ALPHA: 0.3, RIM_ALPHA: 0.7, RIM_LINE: 1, FROM_SCALE: 0.4, GROW_MS: 120, DROPS: 22, TINT: [0xe2b8ff, 0xa64fd1, 0x6e2a99], WARN_DROPS: 4,
        DROP_SPEED: { min: 10, max: 40 }, DROP_LIFESPAN: { min: 400, max: 600 } },     // ≤ 24 px: inside the cloud
    // Climbing: bits of bark or leaves fly off where the paws grab, a few fall with every climbing step.
    CLIMB: { GRAB_BITS: 6, STEP_BITS: 2, TINT: { trunk: [0x7a5538, 0x553829, 0x33211a], vine: [0x5f9e3c, 0x33703a, 0x1d4630] },
        SPEED: { min: 15, max: 45 }, LIFESPAN: { min: 300, max: 500 }, GRAVITY_Y: 160 },
    // The golden fish: a burst of gold sparkles.
    TREASURE: { sparks: 24, tint: [0xffffff, 0xfff3a6, 0xffcf3a, 0xc98a12] },
    // Stalactites: pebbles trickle down while one shakes; it bursts into pieces where it lands.
    STALACTITE: { PEBBLES: 2, PEBBLE_EVERY_MS: 90, BITS: 16, TINT: [0xb3aec8, 0x7e7996, 0x57536b], SHAKE_MS: 90, SHAKE_INTENSITY: 0.003 },
    RESPAWN: { fromScale: 0.5, ms: 220, blinkMs: 90, blinkAlpha: 0.35 }     // blinks while invulnerable
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

// The cave (level 2): project-owned layers from tools/parallax.mjs, as tall as the level, far to near.
export const CAVE_PARALLAX = {
    SKY_COLOR: '#0d0b14',
    LAYERS: [
        { key: 'cave-back', url: 'assets/own/parallax/cave-back.png', factor: 0.1 },
        { key: 'cave-far', url: 'assets/own/parallax/cave-far.png', factor: 0.3 },
        { key: 'cave-mid', url: 'assets/own/parallax/cave-mid.png', factor: 0.5 },
        { key: 'cave-near', url: 'assets/own/parallax/cave-near.png', factor: 0.75 }
    ] as readonly ParallaxLayerDef[]
} as const;

// The forest at dusk (level 3): its own sky (tools/parallax.mjs: gradient, stars, crescent moon, far tree tops) instead of
// the lime back layer, and the forest's own layers tinted towards violet-blue, darker the nearer they are.
export const DUSK_PARALLAX = {
    SKY_COLOR: '#141433',
    LAYERS: [
        { key: 'dusk-sky', url: 'assets/own/parallax/dusk-sky.png', factor: 0.05 },
        { key: 'bg-far', url: 'assets/tall-forest/far.png', factor: 0.3, fillBelow: 0x1e1a38, tint: 0x6f63a8 },
        { key: 'bg-middle', url: 'assets/tall-forest/middle.png', factor: 0.5, gap: 128, tint: 0x5a5290 },
        { key: 'bg-near', url: 'assets/tall-forest/middle.png', factor: 0.75, gap: 352, flip: true, tint: 0x3a3566 }
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

// Meow (X): scares enemies in front of the cat (see src/core/meow.ts).
export const MEOW = {
    RANGE_TILES: 4,             // reach in front of the cat's head
    HALF_HEIGHT_TILES: 1.5,     // reach above and below the head
    BEHIND_PX: 8,               // also counts what touches the cat's face
    COOLDOWN_MS: 2000,
    POSE_MS: 350,               // how long the open-mouth frame shows
    HEAD_OFFSET: { x: 9, y: -4 },   // head relative to the hitbox centre (facing right)
    WAVE: { ARCS: 3, SPACING_PX: 10, MS: 450, ANGLE_DEG: 40, LINE: 2, COLOR: 0xffffff }
} as const;

// Claw (C): a quick swipe in front of the cat (see src/core/claw.ts). A crow, or a hedgehog scared by a meow,
// flees the level for good (back only when the level restarts); an unscared hedgehog's spines prick the cat.
export const CLAW = {
    COOLDOWN_MS: 400,
    POSE_MS: 160,               // how long the raised-paw frame shows
    REACH_PX: 14,               // ahead of the hitbox's front edge
    BIG_EXTRA_REACH_PX: 10,     // a puffed-up cat (yarn ball) reaches this much further
    BEHIND_PX: 9,               // back to the hitbox centre: an enemy touching the cat counts
    HALF_HEIGHT_PX: 12          // above and below the hitbox centre
} as const;

// A clawed enemy runs (or flies) away and fades out; the look only, its hitbox is off at once.
export const FLEE = {
    MS: 650,
    hedgehog: { dx: 72, dy: 0, hopPx: 8, animScale: 3 },
    crow: { dx: 80, dy: -90, hopPx: 0, animScale: 2.5 },
    snake: { dx: 64, dy: 0, hopPx: 4, animScale: 3 }
} as const;

// Climbing (src/core/climb.ts): Tiled rectangles of type "vine" (hanging) or "trunk" (a tree) are climbable areas.
// Up (W) grabs and climbs, down (S) climbs down, the jump button (space) jumps off to the side held (no side = let
// go). A trunk is also caught by jumping against it. Climbing on past the top pulls the cat up with a small hop.
export const CLIMB = {
    SPEED: 72,                  // px/s up and down
    SIDE_MARGIN_PX: 4,          // the hitbox centre may be this far beside the zone and still grab it
    REACH_PX: 4,                // the paws reach this far above/below the hitbox
    TOP_HOP_TILES: 1.5,         // the pull-up at the top: enough to step onto a ledge beside the top
    JUMP_TILES: 3,              // jumping off (held; letting go early cuts it like a normal jump)
    KICK_SPEED: 130,            // px/s sideways when jumping off (≤ PLAYER_FEEL.runSpeed, the speed cap)
    REGRAB_MS: 250,             // after letting go, no grab for a moment (a jump off must get away first)
    STEP_PX: 12,                // a scratch (sound, bits) every this many px climbed
    SPRITE_OFFSET_Y: 4          // the back-view climbing cat is drawn a little lower, its paws around the hitbox
} as const;

// Enemies are scared by a meow (src/core/meow.ts): harmless and frozen, shaking, for SCARE_MS.
export const ENEMY = {
    SCARE_MS: 3000,
    WARN_MS: 600,               // shakes faster just before it recovers
    SHAKE_PX: 1,
    SHAKE_MS: 70,               // time between shake steps
    WARN_SHAKE_MS: 35
} as const;

export const HEDGEHOG = {
    SPEED: 28,                  // px/s
    WIDTH: 14,                  // hitbox; the sprite is 20×14
    HEIGHT: 10
} as const;

export const CROW = {
    SPEED: 36,                  // px/s along its path (eased: slower at the ends)
    WIDTH: 14,                  // hitbox; the sprite is 20×16
    HEIGHT: 10,
    SPRITE_ORIGIN_Y: 0.75       // body bottom at sprite row 12; the feet hang below the hitbox
} as const;

// Snake (src/core/venom.ts): slithers along its patrol range; every cycle it stops, puffs up its hood (warning) and
// sprays a poison cloud around itself. A meow does nothing to it; the claw drives it away (best between the sprays).
export const SNAKE = {
    SPEED: 14,                  // px/s, only while calm
    WIDTH: 16,                  // hitbox; the sprite is 24×12
    HEIGHT: 8,
    CALM_MS: 1800,
    WARN_MS: 700,
    SPRAY_MS: 700,
    CLOUD_RADIUS_PX: 24,        // 1.5 tiles around the cloud centre
    CLOUD_RAISE_PX: 4           // cloud centre above the hitbox centre (about the cat's middle)
} as const;

// Falling stalactites (src/core/stalactite.ts): a Tiled point of type "stalactite" where one hangs from the ceiling (its
// top centre). When the cat passes under it, it shakes for a moment (the warning), then falls and shatters on the floor;
// only a falling one hurts. A cat that keeps running gets past; one that stops under it does not. Back after a respawn.
export const STALACTITE = {
    SHAKE_MS: 450,
    FALL_GRAVITY: 1400,         // px/s²
    MAX_FALL_SPEED: 520,        // px/s (below TILE per 60 Hz step: it never skips the floor)
    TRIGGER_REACH_PX: 24,       // the cat's centre this close sideways, and below the tip
    HITBOX: { WIDTH: 8, HEIGHT: 16 },   // above the tip (the sprite is 12×26)
    SPRITE_HEIGHT: 26,
    SHAKE_PX: 1,
    SHAKE_STEP_MS: 50,
    FALL_OUT_PX: 64             // over a pit it falls this far below the level, then counts as shattered
} as const;

// Moving platforms: a Tiled rectangle of type "platform" is the path (wider than tall = left-right, otherwise
// up-down); the custom property "tiles" sets the platform width. Drawn from the level tileset.
export const PLATFORM = {
    SPEED: 40,                  // px/s along the path (eased: slower at the ends)
    DEFAULT_TILES: 3,
    TILES_PROPERTY: 'tiles',
    GIDS: { LEFT: 37, MID: 38, RIGHT: 39 },     // floating-platform top row of the tileset, as in level1.json
    TILESET_COLUMNS: 7,
    TEXTURE_PREFIX: 'platform-',
    MAX_TILES: 6
} as const;

// Crumbling platforms: a Tiled rectangle of type "crumble" (width = tiles, one tile tall). Stand on one and it
// shakes, then falls away (not solid any more), and comes back later — or at once when the cat respawns.
export const CRUMBLE = {
    SHAKE_MS: 500,
    FALL_MS: 700,               // how long the falling pieces are visible
    RESPAWN_MS: 3000,
    FALL_GRAVITY: 900,          // px/s², the look of the fall only
    SHAKE_PX: 1,
    SHAKE_STEP_MS: 50,
    FADE_IN_MS: 300,
    TEXTURE_PREFIX: 'crumble-'   // its own look (ASSETS.CRUMBLE_TILES), so it never passes for a normal platform
} as const;

// Dying is not instant: the death animation plays with the controls off and the camera still, then the cat
// reappears at the checkpoint, invulnerable for a moment, and waits for the arrows to be let go before it moves.
// Three lives to start (nine took far too long to run out). At zero the game is over and the level starts again from
// scratch. Feathers earn extra lives on top (every COIN.LIFE_EVERY points), up to a cat's proverbial nine.
export const LIVES = {
    START: 3,
    MAX: 9
} as const;

// Yarn ball power-up (like Mario's mushroom): the cat puffs up; a hit then only shrinks it back, with a moment of
// invulnerability, instead of costing a life. A pit always kills. The hitbox stays the same (only the look grows),
// so the level fits a big cat just as well.
export const POWER = {
    BIG_SCALE: 1.25,            // sprite scale of the big cat
    HURT_INVULNERABLE_MS: 1500,
    YARN_HITBOX: 12,
    YARN_BOB_PX: 2,
    YARN_BOB_MS: 700
} as const;

export const DEATH = {
    ANIM_MS: 900,
    INVULNERABLE_MS: 1200
} as const;

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
    lookAheadRate: 0.04,    // per-frame (at 60 FPS) approach rate of the look-ahead offset
    OFFSCREEN_MARGIN_PX: 32 // a snake's cycle further off screen than this is neither drawn nor heard
} as const;

// Ground tile variety: the plain centre tiles of the autotile block (top, middle, bottom row) are swapped at level start
// for variants (stones, roots, flowers…) at fixed positions, so long runs of ground do not repeat one tile. The gids
// must match tools/tiles.mjs (it writes them to public/assets/own/tiles/<style>.json, the same for every style; a unit
// test compares).
export const GROUND_TILES = {
    VARIANTS: { 38: [64, 65, 66], 45: [67, 68, 69], 52: [70, 71, 72] } as Record<number, readonly number[]>,
    PLAIN_SHARE: 0.55           // share of tiles that stay plain
} as const;

// Tiled map names (src/levels/*.json). The spawn point marks the player's feet.
export const LEVEL = {
    GROUND_LAYER: 'ground',
    DECOR_LAYER: 'decor',           // non-colliding backdrop (cave interior), drawn behind the ground
    OBJECT_LAYER: 'objects',
    SPAWN_OBJECT: 'spawn',
    SPIKES_TYPE: 'spikes',
    CHECKPOINT_TYPE: 'checkpoint',
    COIN_TYPE: 'feather',
    HEDGEHOG_TYPE: 'hedgehog',      // rectangle = patrol range, bottom edge = the ground it walks on
    PLATFORM_TYPE: 'platform',
    CRUMBLE_TYPE: 'crumble',
    CROW_TYPE: 'crow',              // rectangle = flight path: wider than tall = back and forth, else up and down
    SNAKE_TYPE: 'snake',            // rectangle = patrol range, bottom edge = the ground it slithers on
    YARN_TYPE: 'yarn',              // point = a yarn ball power-up
    VINE_TYPE: 'vine',              // rectangle = the climbable vine (drawn centred, hanging from its top)
    TRUNK_TYPE: 'trunk',
    STALACTITE_TYPE: 'stalactite',
    SECRET_TYPE: 'secret',          // rectangle = rock that is not really there (a secret room behind a wall)
    TREASURE_TYPE: 'treasure',      // point = a golden fish  // point = where it hangs (top centre), falls straight down            // rectangle = the climbable trunk, bottom edge on the ground; a crown on top
    GOAL_TYPE: 'goal'
} as const;

/**
 * One playable level: its Tiled map (src/levels/index.ts), the ground tileset and crumbling-platform strip
 * (tools/tiles.mjs), the background and the sky colour. The game plays them in order; `Game` gets the level number
 * (1-based) in `init`, and every per-level look is baked under the map key, so levels never share a texture by mistake.
 */
export interface LevelDef
{
    name: string;               // shown to the player (Slovak)
    map: string;                // tilemap cache key = key in LEVEL_MAPS
    tiles: { key: string; url: string };
    crumble: { key: string; url: string };
    parallax: readonly ParallaxLayerDef[];
    skyColor: string;
    music: MusicTrack;
    /** Art drawn around the goal (its bottom-right corner on the goal's), e.g. the cave's moonlit way out. */
    exit?: { key: string; url: string };
}

export const LEVELS: readonly LevelDef[] = [
    {
        name: 'Les',
        map: 'level1',
        tiles: { key: 'tiles-grass', url: 'assets/own/tiles/grass.png' },
        crumble: { key: 'crumble-strip-planks', url: 'assets/own/tiles/crumble-planks.png' },
        parallax: PARALLAX.LAYERS,
        skyColor: PARALLAX.SKY_COLOR,
        music: AUDIO.MUSIC
    },
    {
        // Cave terrain (floors: top + middle rows; ceilings: middle + bottom rows, which hang stalactites), cave background.
        name: 'Jaskyňa',
        map: 'level2',
        tiles: { key: 'tiles-cave', url: 'assets/own/tiles/cave.png' },
        crumble: { key: 'crumble-strip-cave', url: 'assets/own/tiles/crumble-cave.png' },
        parallax: CAVE_PARALLAX.LAYERS,
        skyColor: CAVE_PARALLAX.SKY_COLOR,
        music: AUDIO.CAVE_MUSIC,
        exit: { key: 'exit-arch', url: 'assets/own/exit/exit-arch.png' }
    },
    {
        // Greybox until M5 step 5 (the level) and step 2 (its own terrain); background: the forest at dusk.
        name: 'Les za súmraku',
        map: 'level3',
        tiles: { key: 'tiles-grass', url: 'assets/own/tiles/grass.png' },
        crumble: { key: 'crumble-strip-planks', url: 'assets/own/tiles/crumble-planks.png' },
        parallax: DUSK_PARALLAX.LAYERS,
        skyColor: DUSK_PARALLAX.SKY_COLOR,
        music: AUDIO.MUSIC
    }
];

/** A level number (1-based) clamped to the levels that exist. */
export const levelNumber = (n: number): number => Math.min(Math.max(Math.round(n) || 1, 1), LEVELS.length);
/** The definition of level `n` (1-based, clamped). */
export const levelDef = (n: number): LevelDef => LEVELS[levelNumber(n) - 1];

// The cave's way out (src/entities/CaveExit.ts, art from tools/exit.mjs): fireflies drift in the moonlight in front of
// the opening. AREA is measured from the exit's bottom-right corner (px to the left / up).
export const EXIT = {
    FIREFLY_EVERY_MS: 420,
    LIFESPAN: { min: 2200, max: 3400 },
    SPEED_X: { min: -8, max: 6 },
    SPEED_Y: { min: -10, max: 3 },
    TINT: [0xf4ff9c, 0xd8ff6a, 0xfff6c0],
    AREA: { LEFT: 92, RIGHT: 30, TOP: 80, BOTTOM: 6 }
} as const;

// Checkpoints: the campfire stands where the Tiled rectangle's bottom is, but the trigger reaches far above it (and a
// little to the sides), so jumping over a campfire still lights it.
export const CHECKPOINT = {
    TRIGGER_TILES: 10,          // trigger height above the campfire's base (clamped to the level top)
    PAD_X: 4                    // px added on each side
} as const;

export const HAZARD = {
    FALL_MARGIN: 16,            // px below the level bottom before a fall counts as death
    SPIKE_INSET_TOP: 8,         // forgiving hitbox: only the lower half of a spike tile hurts
    SPIKE_INSET_X: 2
} as const;

// Collectible ("coin" in code, a feather on screen). A Tiled point of type "feather"; its int property "value" is
// 1 (blue), 5 (silver) or 10 (gold). Every LIFE_EVERY points give an extra life (up to LIVES.MAX), also on top of the start.
export const COIN = {
    HITBOX: 10,             // px, square, centred on the Tiled point
    VALUE_PROPERTY: 'value',
    LIFE_EVERY: 50,         // the level holds 84 points, so a careful run earns one extra life
    BOB_PX: 2,              // the feather floats up and down a little (look only; the body stays put)
    BOB_MS: 900
} as const;

export type FeatherKind = 'normal' | 'silver' | 'gold';
/** Feather looks by value. */
export const FEATHERS: Record<FeatherKind, { value: number; key: string; url: string; anim: string }> = {
    normal: { value: 1, key: 'feather-normal', url: 'assets/own/feather-normal.png', anim: 'feather-normal-glint' },
    silver: { value: 5, key: 'feather-silver', url: 'assets/own/feather-silver.png', anim: 'feather-silver-glint' },
    gold: { value: 10, key: 'feather-gold', url: 'assets/own/feather-gold.png', anim: 'feather-gold-glint' }
};
export const featherKind = (value: number): FeatherKind => value >= FEATHERS.gold.value ? 'gold' : value >= FEATHERS.silver.value ? 'silver' : 'normal';
export const FEATHER_SHEET = { frameWidth: 14, frameHeight: 16, frames: 4, frameRate: 8, glintEveryMs: 1400 };

export const HUD = {
    MARGIN: 8,
    ICON_GAP: 2,
    FONT_FAMILY: 'PixelifySans',    // loaded in Preload (ASSETS.FONT)
    FONT_SIZE: '16px',
    // Phaser sizes text from this string; include Slovak capitals with carons or their marks get clipped.
    TEXT_METRICS: '|MÉqgyČŠŽĽŤĎŇ',
    TEXT_COLOR: '#ffffff',
    TEXT_STROKE: '#000000',
    TEXT_STROKE_WIDTH: 2,
    // Meow readiness under the cherries: label dims and a bar refills during the cooldown.
    MEOW_LABEL: 'X mňau',
    MEOW_BAR: { WIDTH: 40, HEIGHT: 2, GAP: 2, COLOR: 0xffffff, COOLING_ALPHA: 0.4 },
    // Lives in the top-right corner: one cat head per life. A lost head pops and fades out, a gained one pops in.
    LIVES_GAP: 2,
    LIVES_POP: { SCALE: 1.6, MS: 260 }
} as const;

// "Level complete" screen. UI text is Slovak, like the rest of the project.
export const RESULTS = {
    INPUT_DELAY_MS: 600,        // ignore confirm briefly so a held key doesn't skip the screen
    FADE_MS: 250,               // fade out before the next level starts
    OVERLAY_COLOR: 0x0d1410,
    TITLE_SIZE: '32px',
    LINE_SIZE: '24px',          // Pixelify Sans shows carons on capitals (Č, Š…) only from 24px up
    HINT_SIZE: '16px',          // lowercase-only hint line
    LINE_SPACING: 24,
    TITLE_Y: 40,
    LINES_Y: 84,                // first result line; hints follow the lines
    HINT_GAP: 12,
    TEXT: {
        TITLE: 'Level dokončený!',
        FINAL_TITLE: 'Hra dokončená!',     // after the last level
        COINS: 'Pierka',
        TOTAL: 'Spolu',                    // feather points of the whole run
        TREASURE: 'Poklad',                // only in levels that hide one
        DEATHS: 'Smrti',
        LIVES: 'Životy',
        TIME: 'Čas',
        NEXT: 'Enter = ďalší level, R = hrať znova',
        NEW_GAME: 'Enter = hrať od začiatku, R = level znova',
        BACK: 'Esc = úvodná obrazovka'
    }
} as const;

// "Game over" screen after the last life; same look as the results.
export const GAME_OVER = {
    INPUT_DELAY_MS: 900,        // the jingle plays first, and a key mashed while dying must not skip it
    TITLE_SIZE: '32px',
    LINE_SIZE: '16px',
    TEXT: {
        TITLE: 'Koniec hry',
        LINE: 'mačke došli všetky životy',     // lowercase: carons on 16px capitals read as dots
        RETRY: 'Enter alebo R = skúsiť znova',
        BACK: 'Esc = úvodná obrazovka'
    }
} as const;

// Pause overlay over the frozen level.
export const PAUSE = {
    OVERLAY_COLOR: 0x0d1410,
    OVERLAY_ALPHA: 0.6,
    TITLE_SIZE: '32px',
    LINE_SIZE: '16px',
    LINE_SPACING: 24,
    TEXT: {
        TITLE: 'Pauza',
        RESUME: 'Esc alebo P = pokračovať',
        QUIT: 'Q = úvodná obrazovka',
        MUSIC: 'M = hudba zap./vyp.'
    }
} as const;

// Title screen. Lines starting with a lowercase letter on purpose: carons on 16px capitals read as dots.
export const TITLE = {
    INPUT_DELAY_MS: 300,
    FADE_MS: 250,               // fade out of the title, fade into the level
    DRIFT_SPEED: 40,            // px/s of virtual camera scroll; the parallax layers follow with their factors
    PROMPT_BLINK_MS: 550,
    NAME_SIZE: '48px',
    LINE_SIZE: '16px',
    PROMPT_SIZE: '24px',
    NAME_Y: 40,
    CONTROLS_Y: 68,
    LINE_GAP: 2,                // extra px between the control lines
    PROMPT_Y: 212,
    LEVEL_Y: 184,               // the chosen level, between the controls and the prompt
    PANEL: { COLOR: 0x0d1410, ALPHA: 0.55, PADDING: 8 },   // behind the controls, for contrast with the forest
    CAT_X: 72,                  // the cat runs in place on the ground strip, left of the prompt
    GROUND_ROW: 15,             // same ground line as the level (feet at row 15)
    GROUND_TILES: { TOP: 38, FILL: 45 },    // tileset gids, as in level1.json
    TEXT: {
        NAME: 'Lost Cat',
        CONTROLS: [
            'beh: šípky alebo A, D',
            'skok: medzerník alebo W (podrž = vyššie)',     // Z is a jump key too, but reads as "2" in this font
            'mňau: X, pazúry: c, pauza: Esc alebo P, hudba: M',     // a capital C reads as "0" in this font
            'šplhanie: W a S pri liane alebo kmeni',
            'cieľ: dobehni do jaskyne, zbieraj pierka'
        ],
        PROMPT: 'Enter = hrať',
        CONTINUE: 'Enter = pokračovať',     // the highest unlocked level is chosen
        // Lowercase on purpose (16px). Arrows only where there is a level to step to.
        level: (n: number, name: string, left: boolean, right: boolean) => `${left ? '<  ' : ''}level ${n}: ${name}${right ? '  >' : ''}`
    }
} as const;

// Saved progress (src/core/progress.ts): the highest unlocked level, in the browser's localStorage.
export const PROGRESS = {
    STORAGE_KEY: 'lost-cat:unlocked-level',
    TREASURES_KEY: 'lost-cat:treasures'        // ids of the treasures (golden fish) ever found: "<map>:<n>"
} as const;

// Secret rooms (src/entities/Secret.ts): a Tiled rectangle of type "secret" marks rock that is not really there. Its
// tiles look like the wall around them but have no collision; when the cat is inside, they turn see-through. The
// entrance (string property "entrance": left/right, the rectangle's side) has a thin crack as the only hint, and only a
// small cat squeezes through it (a big one bumps into it).
export const SECRET = {
    REVEAL_ALPHA: 0.22,         // the fake rock while the cat is inside
    FADE_PER_S: 4,              // alpha change per second (in and out)
    ENTRANCE_PROPERTY: 'entrance',
    // A second hint: now and then a little dust drifts out of the crack, as if a draught came from behind the wall.
    DUST: { EVERY_MS: 700, COUNT: 3, SPEED_OUT: { min: 6, max: 20 }, SPEED_Y: { min: -8, max: 2 }, LIFESPAN: { min: 1000, max: 1700 },
        TINT: [0xb3aec8, 0x8c88a3, 0x6a6680], CRACK_HEIGHT: 40 }
} as const;

// Treasures (src/entities/Treasure.ts, Tiled point "treasure"): one golden fish per level, hidden in a secret room. No
// effect on play; the results show "Poklad n/total" and the browser remembers it. One found earlier glows fainter.
export const TREASURE = {
    HITBOX: 12,
    BOB_PX: 2,
    BOB_MS: 800,
    FOUND_BEFORE_ALPHA: 0.55,
    FRAME_RATE: 2
} as const;

// Art and fonts in public/assets (sources and licenses: public/assets/CREDITS.md).
export const ASSETS = {
    // Ground tiles and crumbling-platform strips (tools/tiles.mjs) are per level: see LEVELS.
    // Project-owned pixel art from tools/sprites.mjs (run `node tools/sprites.mjs` to regenerate the PNGs).
    CAT: {
        frameWidth: 32, frameHeight: 22,
        idle: { key: 'cat-idle', url: 'assets/own/cat-idle.png', frames: 2, frameRate: 2 },
        run: { key: 'cat-run', url: 'assets/own/cat-run.png', frames: 4, frameRate: 12 },
        jump: { key: 'cat-jump', url: 'assets/own/cat-jump.png' },      // 0 = rising, 1 = falling
        meow: { key: 'cat-meow', url: 'assets/own/cat-meow.png' },
        hurt: { key: 'cat-hurt', url: 'assets/own/cat-hurt.png' },
        claw: { key: 'cat-claw', url: 'assets/own/cat-claw.png' },
        climb: { key: 'cat-climb', url: 'assets/own/cat-climb.png', frames: 2, frameRate: 8 },     // seen from behind
        head: { key: 'cat-head', url: 'assets/own/cat-head.png' }        // HUD lives icon
    },
    YARN: { key: 'yarn', url: 'assets/own/yarn.png' },
    STALACTITE: { key: 'stalactite', url: 'assets/own/stalactite.png' },
    GOLDEN_FISH: { key: 'golden-fish', url: 'assets/own/golden-fish.png', frameWidth: 16, frameHeight: 12, frames: 2 },
    SECRET_CRACK: { key: 'secret-crack', url: 'assets/own/secret-crack.png' },        // 16×40, two and a half tiles tall
    CAMPFIRE: {
        frameWidth: 24, frameHeight: 24,
        unlit: { key: 'campfire-unlit', url: 'assets/own/campfire-unlit.png' },
        lit: { key: 'campfire-lit', url: 'assets/own/campfire-lit.png', frames: 4, frameRate: 10 }
    },
    SPIKES: { key: 'spikes', url: 'assets/sunny-land/props/spikes.png' },
    CROW: {
        frameWidth: 20, frameHeight: 16,
        fly: { key: 'crow-fly', url: 'assets/own/crow-fly.png', frames: 2, frameRate: 8 },
        scared: { key: 'crow-scared', url: 'assets/own/crow-scared.png' }
    },
    HEDGEHOG: {
        frameWidth: 20, frameHeight: 14,
        walk: { key: 'hedgehog-walk', url: 'assets/own/hedgehog-walk.png', frames: 2, frameRate: 6 },
        scared: { key: 'hedgehog-scared', url: 'assets/own/hedgehog-scared.png' }
    },
    SNAKE: {
        frameWidth: 24, frameHeight: 12,
        slither: { key: 'snake-slither', url: 'assets/own/snake-slither.png', frames: 2, frameRate: 4 },
        warn: { key: 'snake-warn', url: 'assets/own/snake-warn.png', frames: 2, frameRate: 12 },     // hood up, trembling
        spray: { key: 'snake-spray', url: 'assets/own/snake-spray.png' }
    },
    // Climbables, drawn from pieces: a 16 px tile repeated down the trunk/vine, plus caps.
    TRUNK: {
        bark: { key: 'trunk-bark', url: 'assets/own/trunk-bark.png' },         // 16×16, repeats
        roots: { key: 'trunk-roots', url: 'assets/own/trunk-roots.png' },      // 32×10, on the ground
        crown: { key: 'trunk-crown', url: 'assets/own/trunk-crown.png' },      // 56×40, over the top
        CROWN_OVERLAP_PX: 10                                                    // the crown hangs this far below the top
    },
    VINE: {
        stem: { key: 'vine-stem', url: 'assets/own/vine-stem.png' },           // 14×16, repeats
        tip: { key: 'vine-tip', url: 'assets/own/vine-tip.png' },              // 14×10, below the bottom
        knot: { key: 'vine-knot', url: 'assets/own/vine-knot.png' }            // 18×8, where it hangs from (not at the level top)
    },
    FONT: { key: 'PixelifySans', url: 'assets/fonts/PixelifySans.ttf' }
} as const;

/** Animation keys created in Preload. */
export const ANIM = {
    CAT_IDLE: 'cat-idle',
    CAT_RUN: 'cat-run',
    CAT_JUMP: 'cat-jump',
    CAT_FALL: 'cat-fall',
    CAT_MEOW: 'cat-meow',
    CAT_HURT: 'cat-hurt',
    CAT_CLAW: 'cat-claw',
    CAT_CLIMB: 'cat-climb',
    CAT_CLING: 'cat-cling',
    GOLDEN_FISH: 'golden-fish-glint',
    HEDGEHOG_WALK: 'hedgehog-walk',
    CROW_FLY: 'crow-fly',
    SNAKE_SLITHER: 'snake-slither',
    SNAKE_WARN: 'snake-warn',
    CAMPFIRE: 'campfire-burn'
} as const;

/** |vx| above this (px/s) on the ground plays the run animation. */
export const RUN_ANIM_THRESHOLD = 10;
