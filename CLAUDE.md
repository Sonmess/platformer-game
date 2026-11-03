# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# platformer-game

A professional-looking 2D side-scrolling platformer for the browser, with parallax backgrounds.

**Status:** planning only — no code is scaffolded yet. The commands below are the intended ones; update them once the project is generated.

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
- Scaffold with `npm create @phaserjs/game@latest` (Vite + TypeScript) and then add Playwright;
  never hand-write `package.json` or bundler config.
- Every third-party asset (art, audio, fonts) must have its source and license recorded in
  `public/assets/CREDITS.md`.
- Project docs (`README.md`, `docs/`) are written in Slovak; keep new docs in the same language.

## Commands

(Confirm after scaffolding.)

- `npm run dev` — dev server
- `npm run build` — production build
- `npx playwright test` — all tests
- `npx playwright test <file> -g "<test name>"` — single test

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
