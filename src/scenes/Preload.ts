import { Scene } from 'phaser';
import { ANIM, ASSETS, LEVEL } from '../config/constants';
import level1 from '../levels/level1.json';

export class Preload extends Scene
{
    constructor ()
    {
        super('Preload');
    }

    preload ()
    {
        const { FOX, CHERRY } = ASSETS;
        this.load.tilemapTiledJSON(LEVEL.MAP_KEY, level1);
        this.load.image(ASSETS.TILESET.key, ASSETS.TILESET.url);

        const fox = { frameWidth: FOX.frameWidth, frameHeight: FOX.frameHeight };
        this.load.spritesheet(FOX.idle.key, FOX.idle.url, fox);
        this.load.spritesheet(FOX.run.key, FOX.run.url, fox);
        this.load.spritesheet(FOX.jump.key, FOX.jump.url, fox);
        this.load.spritesheet(CHERRY.key, CHERRY.url, { frameWidth: CHERRY.frameWidth, frameHeight: CHERRY.frameHeight });

        this.load.image(ASSETS.SPIKES.key, ASSETS.SPIKES.url);
        this.load.image(ASSETS.SIGN.key, ASSETS.SIGN.url);
        this.load.image(ASSETS.DOOR.key, ASSETS.DOOR.url);
        this.load.font(ASSETS.FONT.key, ASSETS.FONT.url);
    }

    create ()
    {
        this.createAnimations();
        this.scene.start('Game');
    }

    /** Global animations, created once (the animation manager outlives scene restarts). */
    private createAnimations ()
    {
        const { FOX, CHERRY } = ASSETS;
        const frames = (key: string, count: number) => this.anims.generateFrameNumbers(key, { start: 0, end: count - 1 });

        this.anims.create({ key: ANIM.FOX_IDLE, frames: frames(FOX.idle.key, FOX.idle.frames), frameRate: FOX.idle.frameRate, repeat: -1 });
        this.anims.create({ key: ANIM.FOX_RUN, frames: frames(FOX.run.key, FOX.run.frames), frameRate: FOX.run.frameRate, repeat: -1 });
        this.anims.create({ key: ANIM.FOX_JUMP, frames: [{ key: FOX.jump.key, frame: 0 }] });
        this.anims.create({ key: ANIM.FOX_FALL, frames: [{ key: FOX.jump.key, frame: 1 }] });
        this.anims.create({ key: ANIM.CHERRY, frames: frames(CHERRY.key, CHERRY.frames), frameRate: CHERRY.frameRate, repeat: -1 });
    }
}
