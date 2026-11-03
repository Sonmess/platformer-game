# Player controller and jump feel

A platformer lives or dies on one jump repeated thousands of times. Get this right before
anything else.

## 1. Tune by outcome, derive the physics

Pick values a designer can *feel*, then compute physics. Y axis points down in Phaser.

```ts
// src/config/constants.ts
export const TILE = 32;

export const PLAYER_FEEL = {
  runSpeed: 260,          // px/s
  accelTime: 0.08,        // s to reach runSpeed on the ground
  decelTime: 0.06,        // s to stop on the ground
  airControl: 0.8,        // multiplier on accel in the air (<1 = committed arcs)
  jumpHeightTiles: 3.5,   // peak height of a full jump
  timeToApex: 0.36,       // s — lower = snappier
  fallGravityMult: 1.8,   // fall heavier than rise → not floaty
  jumpCutMult: 0.45,      // release jump while rising → vy *= this
  apexHangMult: 0.5,      // gravity multiplier near apex
  apexThreshold: 40,      // |vy| below this counts as "near apex" (px/s)
  maxFallSpeed: 900,      // terminal velocity (px/s)
  coyoteTime: 0.1,        // s after leaving a ledge you can still jump
  jumpBuffer: 0.12,       // s a jump press is remembered before landing
} as const;

// Derived — never hand-tune these
const h = PLAYER_FEEL.jumpHeightTiles * TILE;
const t = PLAYER_FEEL.timeToApex;
export const PHYSICS = {
  riseGravity: (2 * h) / (t * t),
  jumpVelocity: -(2 * h) / t,
  get fallGravity() { return this.riseGravity * PLAYER_FEEL.fallGravityMult; },
  groundAccel: PLAYER_FEEL.runSpeed / PLAYER_FEEL.accelTime,
  groundDecel: PLAYER_FEEL.runSpeed / PLAYER_FEEL.decelTime,
} as const;
```

Starting ranges: jump height 3–4 tiles, time to apex 0.30–0.40 s, fall multiplier 1.5–2.0,
coyote 0.08–0.12 s, buffer 0.10–0.15 s, jump cut ×0.4–0.5.

## 2. Gravity in Arcade Physics

Set **world gravity to the rise gravity** and add the difference per body while falling.
Arcade adds `body.gravity` on top of world gravity.

```ts
// game config
physics: { default: 'arcade', arcade: { gravity: { x: 0, y: PHYSICS.riseGravity }, debug: false } }

// each update, after jump logic
const vy = body.velocity.y;
let extra = 0;
if (vy > 0) extra = PHYSICS.fallGravity - PHYSICS.riseGravity;                 // falling
else if (Math.abs(vy) < PLAYER_FEEL.apexThreshold)                               // apex hang
  extra = PHYSICS.riseGravity * (PLAYER_FEEL.apexHangMult - 1);
body.setGravityY(extra);
if (vy > PLAYER_FEEL.maxFallSpeed) body.setVelocityY(PLAYER_FEEL.maxFallSpeed);
```

Note: discrete integration peaks a few px below the designed height. That's acceptable — tune
by eye — but don't "fix" it by changing the derived formulas.

## 3. Coyote time, jump buffer, variable height

```ts
// Player.update(delta) — timers in seconds, counting down
const dt = delta / 1000;
const onGround = body.blocked.down;

if (onGround) this.coyote = PLAYER_FEEL.coyoteTime; else this.coyote -= dt;
if (input.jumpPressed) this.buffer = PLAYER_FEEL.jumpBuffer; else this.buffer -= dt;

if (this.buffer > 0 && this.coyote > 0) {
  body.setVelocityY(PHYSICS.jumpVelocity);
  this.buffer = 0;
  this.coyote = 0;                       // consume both → no accidental double jump
  events.emit('player:jump');
}

if (input.jumpReleased && body.velocity.y < 0) {
  body.setVelocityY(body.velocity.y * PLAYER_FEEL.jumpCutMult);
}

if (!this.wasOnGround && onGround) events.emit('player:land', { impact: this.lastVy });
this.wasOnGround = onGround;
this.lastVy = body.velocity.y;
```

`jumpPressed` / `jumpReleased` must be **edge-triggered** (`Phaser.Input.Keyboard.JustDown/JustUp`
or your own latch), not `isDown`.

## 4. Horizontal movement

Use acceleration and drag, not instant velocity, so start/stop has a tiny bit of weight:

```ts
const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
const accel = PHYSICS.groundAccel * (onGround ? 1 : PLAYER_FEEL.airControl);
if (dir !== 0) {
  body.setAccelerationX(dir * accel);
  body.setDragX(0);
} else {
  body.setAccelerationX(0);                         // drag only applies at zero accel
  body.setDragX(onGround ? PHYSICS.groundDecel : PHYSICS.groundDecel * 0.3);
}
body.setMaxVelocity(PLAYER_FEEL.runSpeed, PLAYER_FEEL.maxFallSpeed);
// Snap-turn: when reversing direction on the ground, zero vx first so turning feels instant.
```

## 5. Collision setup

- Level geometry from a **Tiled** JSON tilemap (`this.make.tilemap`) with a collision
  property on tiles; collide the player with the layer once in `create()`.
- Player hitbox: one box, slightly narrower than the sprite (`body.setSize`, `setOffset`) so
  the player doesn't snag on tile seams or ledges.
- **One-way platforms:** `checkCollision.down = false` (and left/right for thin ledges).
  Drop-through = hold Down + Jump → ignore that platform for ~0.15 s.
- **Moving platforms:** immovable *dynamic* bodies carry the rider horizontally; static
  bodies do not. Verify in-game.
- **Tunneling:** Arcade has no swept collision. Keep `maxFallSpeed × (1/60)` below tile size.

## 6. Hazards, death, checkpoints

- Hazards (spikes, pits, enemies) emit `player:die`. Respawn must be **instant** (< 0.5 s
  incl. effect) at the last checkpoint. Long death animations kill flow.
- Checkpoints: overlap zones that store `{x, y}` in game state and emit `checkpoint:reach`.
- Falling below the level bounds = death.

## 7. Camera

```ts
const cam = this.cameras.main;
cam.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
cam.startFollow(player, true, 0.12, 0.12);       // roundPixels, lerp x/y
cam.setDeadzone(CAMERA.deadzoneW, CAMERA.deadzoneH);
// Look-ahead: lerp followOffset toward -facing * CAMERA.lookAhead (don't snap).
// Keep vertical follow loose so the camera doesn't bob on every small hop.
```

## 8. Feel checklist (play it, don't just read it)

- [ ] Tap = short hop, hold = full jump
- [ ] Jumping a few frames after walking off a ledge still works
- [ ] Pressing jump just before landing still jumps
- [ ] Fall is noticeably faster than rise; no "moon gravity"
- [ ] Starting/stopping is quick but not instant-robotic
- [ ] No snagging on tile seams; no clipping through floors at max fall speed
- [ ] Camera never shows outside the level and doesn't bob on hops
