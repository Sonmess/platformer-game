import Phaser from 'phaser';

// Gameplay emits; effects, audio and HUD subscribe. Names use `domain:action`.
export const EV = {
    PLAYER_JUMP: 'player:jump',
    PLAYER_LAND: 'player:land'
} as const;

export const events = new Phaser.Events.EventEmitter();
