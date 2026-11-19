import Phaser from 'phaser';

// Gameplay emits; effects, audio and HUD subscribe. Names use `domain:action`.
// Subscribers must unsubscribe on Phaser.Scenes.Events.SHUTDOWN.
export const EV = {
    PLAYER_JUMP: 'player:jump',
    PLAYER_LAND: 'player:land',
    PLAYER_MEOW: 'player:meow',         // MeowWave & { cooldownMs }
    PLAYER_DIE: 'player:die',           // { x, y, cause }
    PLAYER_RESPAWN: 'player:respawn',   // { x, y }
    CHECKPOINT_REACH: 'checkpoint:reach', // { x, y }
    COIN_COLLECT: 'coin:collect',       // { x, y, coins, coinsTotal }
    LEVEL_COMPLETE: 'level:complete',   // { coins, coinsTotal, deaths, timeMs }
    ENEMY_SCARE: 'enemy:scare',         // { x, y, kind }
    ENEMY_RECOVER: 'enemy:recover',     // { x, y, kind }
    CRUMBLE_SHAKE: 'crumble:shake',     // { x, y, width } (top-left corner)
    CRUMBLE_FALL: 'crumble:fall'        // { x, y, width }
} as const;

export type DeathCause = 'pit' | 'spikes' | 'enemy';

export const events = new Phaser.Events.EventEmitter();
