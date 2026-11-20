import Phaser from 'phaser';
import { DEPTH, EXIT, JUICE } from '../config/constants';

/**
 * The way out of the cave: the end wall with an arched opening onto the moonlit forest at dusk (art from
 * tools/exit.mjs), moonlight falling in, and fireflies drifting in front of it. Pure decoration around the level's goal
 * zone: its bottom-right corner sits on the goal's bottom-right corner (the level's right edge).
 */
export class CaveExit
{
    readonly image: Phaser.GameObjects.Image;
    readonly fireflies: Phaser.GameObjects.Particles.ParticleEmitter;

    constructor (scene: Phaser.Scene, textureKey: string, right: number, bottom: number)
    {
        this.image = scene.add.image(right, bottom, textureKey).setOrigin(1, 1).setDepth(DEPTH.CLIMBABLES);
        const { AREA } = EXIT;
        this.fireflies = scene.add.particles(0, 0, JUICE.SPARK.key, {
            // In front of the opening, in the moonlight.
            emitZone: { type: 'random', source: { getRandomPoint: p => {
                p.x = Phaser.Math.Between(right - AREA.LEFT, right - AREA.RIGHT);
                p.y = Phaser.Math.Between(bottom - AREA.TOP, bottom - AREA.BOTTOM);
            } } },
            frequency: EXIT.FIREFLY_EVERY_MS,
            lifespan: EXIT.LIFESPAN,
            speedX: EXIT.SPEED_X,
            speedY: EXIT.SPEED_Y,
            scale: 1,
            alpha: { start: 1, end: 0, ease: 'Sine.easeIn' },
            tint: [...EXIT.TINT]
        }).setDepth(DEPTH.EFFECTS);
    }
}
