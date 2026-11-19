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
        SPRAY: { key: 'sfx-spray', url: 'assets/own/sfx/spray.wav', volume: 0.45, detune: 60 }
    },
    // Background loop from tools/music.mjs; one instance for the whole game (title, level, results).
    MUSIC: { key: 'music-forest', url: 'assets/own/music/forest.wav', volume: 0.4, pausedVolume: 0.12 },
    // Coins picked up in quick succession climb in pitch (a combo).
    COIN_COMBO: { windowMs: 700, stepCents: 100, maxSteps: 5 },
    // Precious feathers ring higher (cents added to the pickup sound).
    FEATHER_PITCH: { normal: 0, silver: 400, gold: 700 },
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
    TEXTURE_PREFIX: 'crumble-',
    CRACK_COLOR: '#2e1d14',     // cracks drawn over the platform tiles, so it reads as fragile
    CRACKS: [[4, 3], [5, 4], [5, 5], [6, 6], [11, 2], [10, 3], [10, 4], [11, 5], [12, 6], [8, 9], [7, 10], [8, 11]]
} as const;

// Dying is not instant: the death animation plays with the controls off and the camera still, then the cat
// reappears at the checkpoint, invulnerable for a moment, and waits for the arrows to be let go before it moves.
// Three lives (nine took far too long to run out). At zero the game is over and the level starts again from scratch.
export const LIVES = {
    START: 3,
    MAX: 3
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
    COIN_TYPE: 'feather',
    HEDGEHOG_TYPE: 'hedgehog',      // rectangle = patrol range, bottom edge = the ground it walks on
    PLATFORM_TYPE: 'platform',
    CRUMBLE_TYPE: 'crumble',
    CROW_TYPE: 'crow',              // rectangle = flight path: wider than tall = back and forth, else up and down
    SNAKE_TYPE: 'snake',            // rectangle = patrol range, bottom edge = the ground it slithers on
    YARN_TYPE: 'yarn',              // point = a yarn ball power-up
    GOAL_TYPE: 'goal'
} as const;

export const HAZARD = {
    FALL_MARGIN: 16,            // px below the level bottom before a fall counts as death
    SPIKE_INSET_TOP: 8,         // forgiving hitbox: only the lower half of a spike tile hurts
    SPIKE_INSET_X: 2
} as const;

// Collectible ("coin" in code, a feather on screen). A Tiled point of type "feather"; its int property "value" is
// 1 (blue), 5 (silver) or 10 (gold). Every LIFE_EVERY points give a life back (up to LIVES.MAX).
export const COIN = {
    HITBOX: 10,             // px, square, centred on the Tiled point
    VALUE_PROPERTY: 'value',
    LIFE_EVERY: 50,         // the level holds ~61 points, so a careful run earns one life back
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
    OVERLAY_COLOR: 0x0d1410,
    TITLE_SIZE: '32px',
    LINE_SIZE: '24px',          // Pixelify Sans shows carons on capitals (Č, Š…) only from 24px up
    HINT_SIZE: '16px',          // lowercase-only hint line
    LINE_SPACING: 24,
    TEXT: {
        TITLE: 'Level dokončený!',
        COINS: 'Pierka',
        DEATHS: 'Smrti',
        LIVES: 'Životy',
        TIME: 'Čas',
        RESTART: 'Enter alebo R = hrať znova',
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
    NAME_Y: 56,
    CONTROLS_Y: 96,
    PROMPT_Y: 216,
    PANEL: { COLOR: 0x0d1410, ALPHA: 0.55, PADDING: 8 },   // behind the controls, for contrast with the forest
    CAT_X: 128,                 // the cat runs in place on the ground strip
    GROUND_ROW: 15,             // same ground line as the level (feet at row 15)
    GROUND_TILES: { TOP: 38, FILL: 45 },    // tileset gids, as in level1.json
    TEXT: {
        NAME: 'Lost Cat',
        CONTROLS: [
            'beh: šípky alebo A, D',
            'skok: medzerník alebo W (podrž = vyššie)',     // Z is a jump key too, but reads as "2" in this font
            'mňau: X, pauza: Esc alebo P, hudba: M',
            'cieľ: dobehni do jaskyne, zbieraj čerešne'
        ],
        PROMPT: 'Enter = hrať'
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
        jump: { key: 'cat-jump', url: 'assets/own/cat-jump.png' },      // 0 = rising, 1 = falling
        meow: { key: 'cat-meow', url: 'assets/own/cat-meow.png' },
        hurt: { key: 'cat-hurt', url: 'assets/own/cat-hurt.png' },
        claw: { key: 'cat-claw', url: 'assets/own/cat-claw.png' },
        head: { key: 'cat-head', url: 'assets/own/cat-head.png' }        // HUD lives icon
    },
    YARN: { key: 'yarn', url: 'assets/own/yarn.png' },
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
    HEDGEHOG_WALK: 'hedgehog-walk',
    CROW_FLY: 'crow-fly',
    SNAKE_SLITHER: 'snake-slither',
    SNAKE_WARN: 'snake-warn',
    CAMPFIRE: 'campfire-burn'
} as const;

/** |vx| above this (px/s) on the ground plays the run animation. */
export const RUN_ANIM_THRESHOLD = 10;
