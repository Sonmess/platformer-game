# platformer-game

A professional-looking 2D side-scrolling platformer for the browser, with parallax backgrounds.

## Stack

Phaser 4 (Arcade Physics) · TypeScript · Vite · Playwright

## How to work in this repo

- For **any** game work, use the project skill `.claude/skills/phaser-platformer/` and read
  the reference file relevant to the task.
- Read `docs/gameplan.md` first. If it has unanswered open questions that affect the task,
  ask before coding.
- One feature per session. Out-of-scope ideas go to `docs/backlog.md`.
- All tunable values live in `src/config/constants.ts`.
- After every code change: run the game, check console, verify via `window.__game`, take and
  look at a screenshot (see `references/qa.md`).
- Phaser 3 tutorials are common online; this project is **Phaser 4** — check current docs
  when an API is uncertain.
- Every third-party asset (art, audio, fonts) must have its source and license recorded in
  `public/assets/CREDITS.md`.

## Commands

(filled in after scaffolding)

- `npm run dev` — dev server
- `npm run build` — production build
- `npx playwright test` — tests
