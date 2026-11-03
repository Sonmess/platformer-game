# Testing and visual verification

Never declare something done from reading code. Run it, observe it, screenshot it.

## 1. Dev-only test API

`main.ts` installs a small API on `window.__game` when `import.meta.env.DEV` (or a `?test`
query param) is set. It is the contract between the game and automated checks.

```ts
declare global { interface Window { __game?: GameTestApi } }

interface GameTestApi {
  getState(): {
    scene: string;
    player: { x: number; y: number; vx: number; vy: number; onGround: boolean; alive: boolean };
    camera: { scrollX: number; scrollY: number };
    coins: number; deaths: number; level: number;
    checkpoint: { x: number; y: number };
  };
  /** Hold virtual inputs for N ms of game time, then release. */
  press(keys: Array<'left' | 'right' | 'jump' | 'down'>, ms: number): Promise<void>;
  teleport(x: number, y: number): void;
  setSeed(seed: number): void;     // deterministic randomness (particles excluded)
}
```

Inputs go through `systems/Input.ts`, so virtual presses behave exactly like real keys.
Every new mechanic adds its observable state to `getState()` (additively — never remove fields).

## 2. The verification loop (after every code change)

1. `npm run dev` (or reuse the running server).
2. Open the page with Playwright (headless Chromium), wait for `window.__game`.
3. Collect console errors/warnings — any error fails the check.
4. Drive a short scenario with `press()` and read `getState()` to confirm the behavior.
5. Take a screenshot at a meaningful moment (mid-jump, near parallax layers, after effect)
   and **look at it**.
6. Report what was observed, not what was expected.

## 3. Core invariants (keep as Playwright tests)

```ts
// tests/game.spec.ts (sketch)
test('boots without console errors', …);
test('player stands on ground after spawn', async ({ page }) => {
  const s = await page.evaluate(() => window.__game!.getState());
  expect(s.player.onGround).toBe(true);
});
test('full jump reaches ~designed height', …);      // tolerance ±15%
test('tap jump is lower than held jump', …);
test('coyote: jump shortly after leaving ledge works', …);
test('buffer: jump pressed just before landing triggers', …);
test('camera scrolls and parallax layers move at different speeds', …);
test('death respawns at last checkpoint', …);
test('restart 5× yields identical initial state', …);
```

Feel and polish items that can't be asserted are listed in the milestone as
**"verified by playtest"** — explicitly, never silently skipped. Never loosen a failing
test to make it pass; fix the code or change the acceptance criterion with the user.

## 4. Visual regression (once the look stabilizes)

Use `expect(page).toHaveScreenshot()` at fixed positions with particles/ambient motion
disabled via the test API, and a small diff tolerance. Update baselines only intentionally.

## 5. Performance

- Target a steady 60 FPS on a mid-range laptop and a recent phone.
- Check `game.loop.actualFps` in a test after 5 s of running; flag drops below ~55.
- Watch for: emitters created per event, colliders added in `update()`, huge textures,
  too many TileSprites redrawn at full screen size on low-end devices.
