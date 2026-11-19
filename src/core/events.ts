import Phaser from 'phaser';

// Gameplay emits; effects, audio and HUD subscribe. Names use `domain:action`.
// Subscribers must unsubscribe on Phaser.Scenes.Events.SHUTDOWN.
export const EV = {
    PLAYER_JUMP: 'player:jump',
    PLAYER_LAND: 'player:land',
    PLAYER_MEOW: 'player:meow',         // MeowWave & { cooldownMs }
    PLAYER_CLAW: 'player:claw',         // ClawSwipe & { cooldownMs }
    PLAYER_GRAB: 'player:grab',         // { x, y, kind } (took hold of a vine or trunk; x, y = the paws)
    PLAYER_CLIMB_STEP: 'player:climb-step', // { x, y, kind } (every CLIMB.STEP_PX climbed)
    PLAYER_LET_GO: 'player:let-go',     // { x, y, kind, how } (how: 'jump' | 'top' | 'drop' | 'ground' | 'end')
    PLAYER_DIE: 'player:die',           // { x, y, cause, lives } (lives left after this death)
    GAME_OVER: 'game:over',             // { coins, coinsTotal, timeMs }
    LIVES_CHANGE: 'lives:change',       // { lives }
    PLAYER_RESPAWN: 'player:respawn',   // { x, y }
    CHECKPOINT_REACH: 'checkpoint:reach', // { x, y }
    COIN_COLLECT: 'coin:collect',       // { x, y, value, kind, coins, coinsTotal, points } (a feather)
    LIFE_GAIN: 'life:gain',             // { x, y } (enough points for a life back)
    PLAYER_GROW: 'player:grow',         // { x, y } (picked up a yarn ball)
    PLAYER_SHRINK: 'player:shrink',     // { x, y, cause } (hit while big: no life lost)
    LEVEL_COMPLETE: 'level:complete',   // { coins, coinsTotal, deaths, timeMs }
    ENEMY_SCARE: 'enemy:scare',         // { x, y, kind }
    ENEMY_RECOVER: 'enemy:recover',     // { x, y, kind }
    ENEMY_FLEE: 'enemy:flee',           // { x, y, kind, dir } (clawed: leaves the level until it restarts)
    SNAKE_WARN: 'snake:warn',           // { x, y } (stops and puffs up its hood: a spray is coming)
    SNAKE_SPRAY: 'snake:spray',         // { x, y, radius, ms } (the poison cloud: centre, radius, how long it hurts)
    CRUMBLE_SHAKE: 'crumble:shake',     // { x, y, width } (top-left corner)
    CRUMBLE_FALL: 'crumble:fall'        // { x, y, width }
} as const;

export type DeathCause = 'pit' | 'spikes' | 'enemy' | 'poison';

export const events = new Phaser.Events.EventEmitter();
