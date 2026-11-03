# Juice and feedback

A satisfying moment is usually **several small responses within ~100 ms**: sound + particles
+ a little scale pop + maybe a tiny shake. Each is cheap; stacked they read as impact.

Two rules:
1. **Exaggerate briefly, return to rest.** Juice is transient.
2. **Scale to importance.** A footstep is not a boss death. Use tiers.

## 1. Architecture

All juice lives in `src/systems/Effects.ts` (and `Audio.ts`), which **subscribe to gameplay
events**. Gameplay never calls effects directly. Disabling the Effects system must leave a
fully playable game.

```ts
// Effects.ts (sketch)
constructor(private scene: Phaser.Scene, private player: Player) {
  events.on('player:jump', this.onJump, this);
  events.on('player:land', this.onLand, this);
  events.on('player:die', this.onDie, this);
  events.on('coin:collect', this.onCollect, this);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => events.off(/* … */));
}
```

## 2. Tiers

| Tier | Example events | Channels |
|---|---|---|
| Small | jump, footstep, coin | sound, 4–8 particles, scale pop |
| Medium | hard landing, stomp enemy, checkpoint | + small shake, flash, 12–20 particles |
| Large | death, level complete | + hit-stop 60–100 ms, bigger shake, camera flash/fade |

Define these as presets in `constants.ts` (`JUICE.small`, `JUICE.medium`, `JUICE.large`).

## 3. Platformer recipes

**Jump:** stretch the sprite vertically (scaleX 0.8, scaleY 1.2) and tween back with
`Back.easeOut` over ~120 ms; small dust puff at the feet.

**Land:** squash (scaleX 1.25, scaleY 0.8) → back to 1 with `Back.easeOut`; dust particles to
both sides; intensity scales with impact velocity (`lastVy / maxFallSpeed`). Only shake on
landings above ~70% of max fall speed.

**Run:** small dust particles every ~0.15 s while grounded and moving; slight lean/bob via
animation, not physics.

**Coin/pickup:** coin pops up and fades, particle sparkle, short rising pitch if collected in
quick succession (combo), HUD counter does a scale pop.

**Death:** hit-stop ~80 ms, white flash on the player, shake, burst of particles, quick fade →
respawn. Total under ~0.5 s.

**Level complete:** slow-mo moment, confetti burst, camera zoom-in, then transition.

## 4. Phaser building blocks

```ts
// Squash & stretch — visuals only, never the body
scene.tweens.add({
  targets: player.sprite,          // if the body is on a container, scale the child sprite
  scaleX: { from: 1.25, to: 1 },
  scaleY: { from: 0.8, to: 1 },
  duration: 140,
  ease: 'Back.easeOut',
});

// Particles (Phaser 3.60+/4 emitter API) — create once, explode on demand
const dust = scene.add.particles(0, 0, 'dust', {
  speed: { min: 40, max: 120 },
  angle: { min: 200, max: 340 },
  lifespan: 300,
  scale: { start: 1, end: 0 },
  alpha: { start: 0.8, end: 0 },
  emitting: false,
});
dust.explode(10, player.x, player.y + player.height / 2);

// Screen shake (camera only)
scene.cameras.main.shake(120, 0.006);

// Hit-stop: pause physics and anims briefly with a real-time timeout
scene.physics.world.pause();
scene.anims.pauseAll();
setTimeout(() => { scene.physics.world.resume(); scene.anims.resumeAll(); }, 80);
```

Verify emitter/tween option names against the Phaser 4 docs before use; prefer existing
easing names (`Quad`, `Cubic`, `Back`, `Elastic`, `Sine` with `.easeIn/.easeOut/.easeInOut`).

## 5. Restraint

- Shake is the most abused tool: short (≤ 200 ms), low intensity, only Medium/Large tiers.
  Provide a "reduce motion" option that disables shake and flashes.
- Never block input during juice (except the brief death/respawn).
- Particle counts: keep total live particles modest; pool emitters, don't create per event.
- If two effects fight for attention, the gameplay-relevant one wins.

## 6. Checklist

- [ ] Every player-visible event has at least 2 feedback channels
- [ ] Effects return to rest (scale 1, camera offset 0) — verified after spam-jumping
- [ ] Reduce-motion toggle works
- [ ] Game still fully playable with Effects disabled
