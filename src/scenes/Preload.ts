import { Scene } from 'phaser';
import { ANIM, ASSETS, AUDIO, LEVEL, PARALLAX } from '../config/constants';
import { bakePlatformTextures } from '../entities/MovingPlatform';
import { bakeEffectTextures } from '../systems/Effects';
import { bakeParallaxTextures, parallaxSourceKey } from '../systems/Parallax';
import level1 from '../levels/level1.json';

export class Preload extends Scene
{
    constructor ()
    {
        super('Preload');
    }

    preload ()
    {
        const { CAT, CHERRY, CAMPFIRE } = ASSETS;
        this.load.tilemapTiledJSON(LEVEL.MAP_KEY, level1);
        this.load.image(ASSETS.TILESET.key, ASSETS.TILESET.url);

        const cat = { frameWidth: CAT.frameWidth, frameHeight: CAT.frameHeight };
        this.load.spritesheet(CAT.idle.key, CAT.idle.url, cat);
        this.load.spritesheet(CAT.run.key, CAT.run.url, cat);
        this.load.spritesheet(CAT.jump.key, CAT.jump.url, cat);
        this.load.image(CAT.meow.key, CAT.meow.url);
        this.load.spritesheet(CHERRY.key, CHERRY.url, { frameWidth: CHERRY.frameWidth, frameHeight: CHERRY.frameHeight });
        this.load.image(CAMPFIRE.unlit.key, CAMPFIRE.unlit.url);
        this.load.spritesheet(CAMPFIRE.lit.key, CAMPFIRE.lit.url, { frameWidth: CAMPFIRE.frameWidth, frameHeight: CAMPFIRE.frameHeight });

        for (const layer of PARALLAX.LAYERS) this.load.image(parallaxSourceKey(layer), layer.url);
        this.load.image(ASSETS.SPIKES.key, ASSETS.SPIKES.url);
        const { HEDGEHOG } = ASSETS;
        this.load.spritesheet(HEDGEHOG.walk.key, HEDGEHOG.walk.url, { frameWidth: HEDGEHOG.frameWidth, frameHeight: HEDGEHOG.frameHeight });
        this.load.image(HEDGEHOG.scared.key, HEDGEHOG.scared.url);
        const { CROW } = ASSETS;
        this.load.spritesheet(CROW.fly.key, CROW.fly.url, { frameWidth: CROW.frameWidth, frameHeight: CROW.frameHeight });
        this.load.image(CROW.scared.key, CROW.scared.url);
        this.load.font(ASSETS.FONT.key, ASSETS.FONT.url);
        for (const sfx of Object.values(AUDIO.SFX)) this.load.audio(sfx.key, sfx.url);
        this.load.audio(AUDIO.MUSIC.key, AUDIO.MUSIC.url);
    }

    create ()
    {
        this.createAnimations();
        bakeParallaxTextures(this.textures);
        bakeEffectTextures(this);
        bakePlatformTextures(this.textures);
        // Dev only: "?play" skips the title screen (e2e tests start in the level).
        const skipTitle = import.meta.env.DEV && new URLSearchParams(location.search).has('play');
        this.scene.start(skipTitle ? 'Game' : 'Title');
    }

    /** Global animations, created once (the animation manager outlives scene restarts). */
    private createAnimations ()
    {
        const { CAT, CHERRY, CAMPFIRE } = ASSETS;
        const frames = (key: string, count: number) => this.anims.generateFrameNumbers(key, { start: 0, end: count - 1 });

        this.anims.create({ key: ANIM.CAT_IDLE, frames: frames(CAT.idle.key, CAT.idle.frames), frameRate: CAT.idle.frameRate, repeat: -1 });
        this.anims.create({ key: ANIM.CAT_RUN, frames: frames(CAT.run.key, CAT.run.frames), frameRate: CAT.run.frameRate, repeat: -1 });
        this.anims.create({ key: ANIM.CAT_JUMP, frames: [{ key: CAT.jump.key, frame: 0 }] });
        this.anims.create({ key: ANIM.CAT_FALL, frames: [{ key: CAT.jump.key, frame: 1 }] });
        this.anims.create({ key: ANIM.CAT_MEOW, frames: [{ key: CAT.meow.key }] });
        const { HEDGEHOG } = ASSETS;
        this.anims.create({ key: ANIM.HEDGEHOG_WALK, frames: frames(HEDGEHOG.walk.key, HEDGEHOG.walk.frames), frameRate: HEDGEHOG.walk.frameRate, repeat: -1 });
        const { CROW } = ASSETS;
        this.anims.create({ key: ANIM.CROW_FLY, frames: frames(CROW.fly.key, CROW.fly.frames), frameRate: CROW.fly.frameRate, repeat: -1 });
        this.anims.create({ key: ANIM.CHERRY, frames: frames(CHERRY.key, CHERRY.frames), frameRate: CHERRY.frameRate, repeat: -1 });
        this.anims.create({ key: ANIM.CAMPFIRE, frames: frames(CAMPFIRE.lit.key, CAMPFIRE.lit.frames), frameRate: CAMPFIRE.lit.frameRate, repeat: -1 });
    }
}
