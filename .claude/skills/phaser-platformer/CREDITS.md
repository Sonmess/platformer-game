# Credits

This skill was written for this project. Its structure and several patterns were adapted
(rewritten, not copied verbatim) from these open-source collections:

- **awesome-gamedev-agent-skills** — https://github.com/gamedev-skills/awesome-gamedev-agent-skills
  Copyright 2026 Abhishek Barali and contributors. Licensed under the Apache License 2.0.
  Used: platformer jump-feel derivation and knob ranges, coyote time / jump buffer patterns,
  Phaser 4 Arcade Physics pitfalls, game-feel tiering and layered-feedback principles.

- **game-creator** (PlayableIntelligence / OpusGameLabs) — https://github.com/PlayableIntelligence/game-creator
  Licensed under the MIT License.
  Used: event-driven architecture with central state and constants, parallax speed ratios
  and visual-polish checklist, Playwright-based QA loop with an in-page game state API,
  "plan before code" and backlog discipline.

Changes: combined and condensed into a single platformer-specific skill, rewritten for
Phaser 4 + TypeScript, camera-driven TileSprite parallax instead of constant drift,
removed monetization, deployment, and AGPL audio tooling.
