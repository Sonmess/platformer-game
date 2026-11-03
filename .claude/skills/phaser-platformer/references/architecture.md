# Project architecture

## 1. Scaffold

Use the official generator, choose **Vite + TypeScript**, then add Playwright:

```bash
npm create @phaserjs/game@latest      # pick: Vite, TypeScript, minimal template
npm install
npm install -D @playwright/test
npx playwright install chromium
```

Check the generator's current prompts/flags in its README before running; don't hand-write
`package.json`, `vite.config.ts`, or `tsconfig.json`. Adapt the generated structure to the
layout below rather than replacing it.

## 2. Folder layout

```
src/
├── main.ts                 # creates Phaser.Game from config; installs window.__game in dev
├── config/
│   ├── constants.ts        # ALL tunables: feel, physics (derived), camera, palette, juice, layers
│   └── gameConfig.ts       # Phaser.Types.Core.GameConfig
├── core/
│   ├── events.ts           # typed event bus + event name constants
│   └── state.ts            # run state (lives, coins, checkpoint, level) with reset()
├── scenes/
│   ├── Boot.ts             # minimal: load preloader assets
│   ├── Preload.ts          # load all assets, bake procedural textures, progress bar
│   ├── Title.ts            # title / start screen
│   ├── Game.ts             # gameplay: map, player, hazards, camera, parallax
│   ├── Hud.ts              # runs in parallel with Game, listens to events
│   └── LevelComplete.ts    # results, next level / retry
├── entities/
│   ├── Player.ts           # controller from jump-feel.md
│   └── …                   # enemies, collectibles, moving platforms
├── systems/
│   ├── Input.ts            # keyboard + gamepad + touch → { left, right, jumpPressed, jumpReleased, down }
│   ├── Parallax.ts
│   ├── Effects.ts
│   └── Audio.ts
└── levels/                 # Tiled JSON maps + level metadata (palette, layers, music)
public/assets/              # images, spritesheets, audio, fonts (+ CREDITS.md with licenses)
tests/                      # Playwright specs
docs/                       # gameplan.md, backlog.md, decisions/
```

## 3. Events

A single typed emitter. Names use `domain:action`.

```ts
// src/core/events.ts
import Phaser from 'phaser';

export const EV = {
  PLAYER_JUMP: 'player:jump',
  PLAYER_LAND: 'player:land',
  PLAYER_DIE: 'player:die',
  PLAYER_RESPAWN: 'player:respawn',
  COIN_COLLECT: 'coin:collect',
  CHECKPOINT_REACH: 'checkpoint:reach',
  LEVEL_COMPLETE: 'level:complete',
} as const;

export const events = new Phaser.Events.EventEmitter();
```

Every scene that subscribes must unsubscribe on `Phaser.Scenes.Events.SHUTDOWN`.

## 4. State

```ts
// src/core/state.ts
export const state = {
  level: 1, coins: 0, deaths: 0,
  checkpoint: { x: 0, y: 0 },
  reset(level = 1) { this.level = level; this.coins = 0; this.deaths = 0; this.checkpoint = { x: 0, y: 0 }; },
};
```

Scenes reset their own per-run fields in `init()`, not in the constructor.

## 5. Input

`Input.ts` produces one normalized snapshot per frame so the Player never reads devices
directly. Support from the start: arrows + WASD, Space/Z/W/Up for jump, gamepad (A button,
left stick/D-pad), and on-screen touch buttons on mobile. Jump press/release are edge events.

## 6. Resolution and scaling

- Pick a logical resolution (e.g. 480×270 for pixel art, scaled ×4 to 1920×1080; or
  960×540 for HD art) and keep it in `constants.ts`.
- `scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }`.
- Pixel art: `pixelArt: true`, integer zoom only.

## 7. Decisions

Record significant choices (art style, resolution, tilemap tool, audio approach) as short
ADRs in `docs/decisions/NNNN-title.md`: context, decision, consequences.
