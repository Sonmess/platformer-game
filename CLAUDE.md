# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# platformer-game

A professional-looking 2D side-scrolling platformer for the browser, with parallax backgrounds.

**Status:** Milestone 1 complete and playtested (2026-11-05). Milestone 2 (ADR 0007) complete except the user's
final playtest (step 10); M3 (more levels) is in `docs/backlog.md` — checklist in
`docs/gameplan.md`.

## Stack

Phaser 4 (Arcade Physics only, no Matter) · TypeScript · Vite · Playwright

## How to work in this repo

- For **any** game work, use the project skill `.claude/skills/phaser-platformer/` and read
  the reference file relevant to the task (`architecture`, `jump-feel`, `parallax`, `juice`, `qa`).
- Read `docs/gameplan.md` first. If it has unanswered open questions (❓) that affect the task,
  ask before coding.
- One feature per session. Out-of-scope ideas go to `docs/backlog.md`.
- All tunable values live in `src/config/constants.ts` — no magic numbers. Feel is expressed as
  designer-facing outcomes (jump height in tiles, time to apex); physics values are derived.
- After every code change: run the game, check console, verify via `window.__game`, take and
  look at a screenshot (see `references/qa.md`).
- Phaser 3 tutorials are common online; this project is **Phaser 4** — check current docs
  when an API is uncertain.
- The project was scaffolded from the official generator (template-vite-ts); do not hand-write
  bundler config. The template's telemetry script (`log.js`) was removed on purpose — don't re-add it.
- Every third-party asset (art, audio, fonts) must have its source and license recorded in
  `public/assets/CREDITS.md`.
- Project docs (`README.md`, `docs/`) are written in Slovak; keep new docs in the same language.

## Commands

- `npm run dev` — dev server on http://localhost:8080 (exposes `window.__game`, dev only)
- `npm run build` — typecheck + production build
- `npm run typecheck` — `tsc --noEmit`
- `npm test` — unit (Vitest) then e2e (Playwright)
- `npm run test:unit` / `npm run test:watch` — Vitest, `tests/unit/**/*.test.ts`
- `npm run test:e2e` — Playwright, `tests/e2e/` (starts/reuses the dev server)
- `npx vitest run tests/unit/constants.test.ts -t "16:9"` — single unit test
- `npx playwright test tests/e2e/boot.spec.ts -g "boots"` — single e2e test

## Testing

- **Unit (Vitest):** pure logic only (jump math, timers, input edges, state reset) — keep it in
  small Phaser-free functions so it can be tested in Node.
- **E2E (Playwright):** drive scenarios through the dev-only test API `window.__game`
  (`src/testApi.ts`, installed only when `import.meta.env.DEV`). Each new mechanic adds its
  observable state to `GameState` (additively) and, once input exists, `press()` / `teleport()`.
  Physics assertions use tolerances and game time, not wall-clock time: wait with
  `window.__game.wait(ms)` (game-loop time, survives scene switches), never `setTimeout`/`waitForTimeout`,
  or tests flake when the machine is loaded. Pick test spots from known level landmarks (e.g. flat cols 90–107).
  Objects of the level's second half (goal, crows, platforms, crumbles, hedgehogs) come from
  `tests/e2e/landmarks.ts`, which reads `level1.json`, so specs follow the level when it changes; the arrays are
  in level order, as in `getState()`. `route.spec.ts` plays the second half section by section with a small
  in-page bot (`hold()`/`release()` from the test API): each section must be passable without dying. When
  editing the level, keep the cat's test spots clear of patrols and spikes, and keep every section passable.
- The game boots into the `Title` scene; level specs open `/?play` (dev-only, handled in `Preload`) to start
  straight in `Game`. Only `boot.spec.ts` and `title.spec.ts` open `/`.
- Pause: `Game` launches the `Pause` overlay and pauses itself (physics, timers, tweens, anims and particles
  freeze; the camera follow still runs in `preRender`). Any scene that opens on a key press calls
  `Input.reset()` so a still-held key is not read as a new press; `Game` does the same on `RESUME`.
  `getState()` keeps reading the level while it is paused (`paused: true`, `scene: 'Pause'`). The pause also
  pauses `Hud` (its tweens, e.g. the meow refill bar, run on the Hud clock).
- Meow (X): `Player` owns a `Cooldown` and emits `player:meow` with a `MeowWave` (head position, `dir`, `range`,
  `halfHeight`, `behind`); enemies decide with `inMeowRange()` from `src/core/meow.ts` (pure, unit-tested).
  Effects draw the wave arcs, Audio plays the meow, Hud shows readiness. Tuning: `MEOW` in constants.
- Enemies (`src/entities/Enemy.ts`): invisible hitbox + sprite like the Player; the base owns the fright (`Scare`
  in `src/core/meow.ts`: frozen, shaking, harmless for `ENEMY.SCARE_MS`, recovers only once the cat is off it).
  `Game` routes `player:meow` to every enemy in reach and kills the cat on touching a `harmful` one. A hedgehog
  is a Tiled rectangle of type `hedgehog`: its width is the patrol range, its bottom edge the ground. A crow
  (type `crow`) flies its rectangle back and forth (wider than tall) or up and down, eased by `pingPong()`
  (`src/core/path.ts`), with no gravity (`body.moves = false`, positioned directly). Enemies keep patrolling
  after the cat dies; they reset only with the level. Level specs place the cat away from patrols.
- Moving platforms (`src/entities/MovingPlatform.ts`): Tiled rectangle of type `platform` = path (wider than tall =
  sideways), int property `tiles` = width; textures are baked from the tileset in Preload. An invisible immovable
  body moved by velocity (steered along `pingPong()`), so Arcade carries a rider sideways via `friction.x`, plus a
  tile image drawn at whole pixels. Gotchas (all found the hard way):
  - Arcade runs fixed 60 Hz steps, and on 120/144 Hz screens many frames run none. Anything that moves bodies or
    tracks contact works per physics step (`WORLD_STEP`, emitted after the colliders), never per frame: the
    platform sets its velocity there, and `Player` keeps "standing on a platform" from step to step.
  - Standing on another body sets no `blocked.down`, and overlaps with zones also set `touching`, so the platform
    collider calls `Player.standOnPlatform()`; it copies the platform's vertical speed (no drop each step on the
    way down, no fling at the top, no bounce on landing).
  - A rider's sprite snaps to the platform's drawn pixel grid, using `body.x` — `body.center` lags a step behind a
    friction carry — or cat and platform shimmer 1 px against each other.
  - To see frame-rate problems locally, launch Chromium with `--disable-gpu-vsync --disable-frame-rate-limit`.- Crumbling platforms (`src/entities/CrumblePlatform.ts`, Tiled type `crumble`, width = tiles): the phases live in
  `Crumble` (`src/core/crumble.ts`, pure: solid → shaking → falling → gone → solid). The body never moves; only
  the image shakes, falls and fades, and the collider's process callback skips it once it is not `solid`. Standing
  goes through the same `Player.standOnPlatform()` (any `Rideable`). `Game` resets them all when the cat
  respawns.
- The in-app browser pane throttles the page when hidden (game time stops); verify with
  headless Playwright screenshots instead.
- Every e2e test fails on console errors/warnings; Chromium "GL Driver Message" lines are ignored
  (headless GPU noise).
- On Windows, Playwright launches Chromium on the real GPU (`--use-angle=d3d11` in `playwright.config.ts`);
  software GL (SwiftShader) drops frames with 4 workers and the physics tests flake. Ad-hoc screenshot scripts
  should pass the same args. E2e runs with `workers: 2`: input is sampled per frame, so heavy parallel load
  stretches frames and the traversal/jump tests flake. `performance.spec.ts` (FPS > 55) has retries, because
  FPS also depends on whatever else the machine is running.
- Phaser gotcha: inside `create()` of a freshly started scene `this.time.now` is stale; time UI delays
  by summing `delta` in `update()`.
- Feel/polish that can't be asserted is marked "verified by playtest" in the gameplan.

## Architecture rules (from the skill; details in `references/architecture.md`)

- Planned layout: `src/config` (constants, game config), `src/core` (typed event bus, run state
  with `reset()`), `src/scenes` (Boot → Preload → Title → Game + parallel Hud → LevelComplete),
  `src/entities` (Player, etc.), `src/systems` (input, etc.).
- **Events, not cross-references:** gameplay emits events (`player:jump`, `player:die`,
  `coin:collect` …); effects, audio, and HUD subscribe. Gameplay never calls the effects layer.
- **Frame-rate independent:** movement via Arcade bodies; timers use `delta` or the scene clock,
  never frame counts.
- **Restart-safe:** reset per-run state in `init()` (scene instances are reused) and remove
  listeners on `shutdown`; restarting a level 10× must behave identically.
- Order of work: core loop (greybox OK) → jump feel → look (parallax, tiles) → juice → verify.
- **Player = invisible hitbox + cat sprite.** `Player` is a 18×14 Arcade rectangle (all physics/tests use it);
  the cat `sprite` is repositioned on `POST_UPDATE` (after the physics step). Put animation and squash & stretch
  on the sprite, never on the hitbox.
- Project-owned pixel art (cat, campfire) is text in `tools/sprites.mjs`; `node tools/sprites.mjs` writes the PNGs to
  `public/assets/own/` (outline is added automatically). The repo is public: never add assets whose license forbids
  redistribution. Sound works the same way: `tools/synth.mjs` (tiny synth: square/triangle/noise notes → WAV) is
  used by `tools/sfx.mjs` (→ `public/assets/own/sfx/`, played on gameplay events by `src/systems/Audio.ts`) and
  `tools/music.mjs` (→ `public/assets/own/music/forest.wav`, a 30 s loop rendered with wrap-around so the seam is
  clean). `src/systems/Music.ts` keeps one loop in the game-wide sound manager: every scene calls `music.start()`
  (idempotent) and `music.handleKeys()` (M = mute); the pause ducks it. Tuning: `AUDIO` in constants. Headless
  Chromium keeps the AudioContext locked, so e2e tests assert the `sfx` log and `music` state in `getState()`,
  not audio output.
- Parallax (`src/systems/Parallax.ts`): layers are `PARALLAX.LAYERS` in constants (far to near); Preload bakes each
  into its own texture (`gap` spacing, `flip`), and TileSprite offsets update on the camera's `FOLLOW_UPDATE` so they
  never lag the world.
- Juice (`src/systems/Effects.ts`) only subscribes to gameplay events and touches visuals (cat sprite scale,
  particles, camera shake); tuning is `JUICE` in constants. Set a pop's start scale immediately — a tween's `from`
  applies a frame late. Particle `x`/`y` ops are ignored when `explode(n, x, y)` gets a position; spread with an
  `emitZone`. For screenshots of effects freeze with `game.loop.sleep()` (a paused scene's camera keeps following).
- Level `src/levels/level1.json` uses the Tall Forest tileset (autotiled 3×3 block); it opens in Tiled because the
  tileset image path is relative to the map. The JSON is the source of truth (edit it in Tiled or with a script).
  230 columns: cols 0–113 are the M1 course (run, pits, wall, climb); 113–136 hedgehogs (ground + ledge),
  136–157 moving platforms over a wide pit up to a cliff, 157–190 a crumbling bridge under a crow, 190–229 the
  finale (spikes, an up-and-down crow, a hedgehog) and the cave. Checkpoints at 56, 73, 113, 136, 157, 190.
