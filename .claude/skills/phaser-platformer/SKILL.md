---
name: phaser-platformer
description: >
  Build and polish a professional-looking 2D side-scrolling platformer in the browser with
  Phaser 4 + TypeScript + Vite: tight jump feel (coyote time, jump buffer, variable height,
  asymmetric gravity), multi-layer parallax backgrounds, camera follow, juice (particles,
  squash & stretch, shake), and Playwright-based visual QA. Use for any work in this
  platformer project — new features, levels, feel tuning, visuals, bugs, or tests.
---

# Phaser 4 Platformer

A playbook for building a 2D platformer that *feels* good and *looks* finished. It composes
four concerns, each with a reference file. Read only the reference the current task needs.

| Concern | Read when | Reference |
|---|---|---|
| Project structure, scenes, state, constants | scaffolding, adding systems, refactoring | `references/architecture.md` |
| Player controller and jump feel | movement, jumping, collisions, camera | `references/jump-feel.md` |
| Parallax backgrounds and visual depth | backgrounds, art direction, level look | `references/parallax.md` |
| Juice and feedback | "make it feel better", polish, effects, audio hooks | `references/juice.md` |
| Testing and visual verification | after every code change, writing tests | `references/qa.md` |

## Stack (fixed for this project)

- **Phaser 4.x** (current major). Arcade Physics only — no Matter.
- **TypeScript**, bundled by **Vite**.
- **Playwright** for automated checks and screenshots.
- Scaffold with the official generator (`npm create @phaserjs/game@latest`) — never hand-write
  `package.json` or bundler config.
- Phaser 4 changed several Phaser 3 APIs (FX → filters, `setTintFill`, pipelines, `roundPixels`
  default). Many tutorials online are Phaser 3. **When unsure about an API, check the current
  Phaser 4 docs/examples before writing code** instead of trusting memory or old snippets.

## Order of work (always)

1. **Plan before code.** If `docs/gameplan.md` is missing or its open questions are
   unanswered for the area you're touching, ask the user first.
2. **Core loop first.** Controller + collision + one level + death/respawn + goal must work
   before any visual polish. Greybox (colored rectangles) is fine at this stage.
3. **Feel second.** Tune the jump with the knobs in `jump-feel.md` until it's tight.
4. **Look third.** Parallax, palette, tiles, animations (`parallax.md`).
5. **Juice fourth.** Layered feedback on every important event (`juice.md`).
6. **Verify every step.** Run the game, check the console, take a screenshot, read the
   test API state (`qa.md`). A change is not done until it was seen working.

One feature per session. Anything out of scope goes to `docs/backlog.md`, never silently dropped.

## Non-negotiable rules

- **No magic numbers.** Every speed, gravity, timing, color, and size lives in
  `src/config/constants.ts`. Feel values are expressed as designer-facing outcomes
  (jump height in tiles, seconds to apex) and physics values are *derived*.
- **Frame-rate independent.** Movement goes through Arcade bodies (velocity/acceleration).
  Timers use `delta` (ms) or the scene clock — never frame counts.
- **Restart-safe.** Per-run state is reset in `init()` (scene instances are reused). Remove
  event listeners on `shutdown`. Restarting the level 10× must behave identically.
- **Events, not cross-references.** Gameplay emits events (`player:jump`, `player:land`,
  `player:die`, `coin:collect` …); effects, audio, and HUD subscribe. Gameplay code never
  calls the effects layer directly. This keeps juice removable and testable.
- **Visuals don't touch simulation.** Screen shake moves the camera, squash & stretch scales
  the sprite, never the physics body.
- **Testable.** The game exposes a small dev-only test API on `window.__game` (see `qa.md`)
  and every new mechanic adds its observable state there.
- **Pixel-perfect if pixel art.** `pixelArt: true` in the game config; integer zoom.

## Definition of done for a feature

- [ ] Works in the browser with no console errors or warnings
- [ ] Values in `constants.ts`, none inline
- [ ] Emits events for every player-visible moment
- [ ] State exposed via `window.__game.getState()`
- [ ] Playwright test covers the acceptance criterion (feel/polish items may be marked
      "verified by playtest" explicitly)
- [ ] Screenshot taken and looked at
- [ ] `docs/gameplan.md` / `docs/backlog.md` updated if scope changed

## Credits

Patterns adapted and rewritten from two open-source skill collections — see `CREDITS.md`.
