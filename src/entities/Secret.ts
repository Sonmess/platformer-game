import Phaser from 'phaser';
import { ASSETS, DEPTH, JUICE, SECRET, TILE } from '../config/constants';
import { EV, events } from '../core/events';

/**
 * Rock that is not really there: the ground tiles inside a Tiled rectangle of type "secret" keep their look but lose
 * their collision, so the cat walks into a hidden room. While the cat is inside they fade to see-through, and back
 * when it leaves. A thin crack on the entrance side is the only hint. A `tight` room (Tiled bool property) also has a zone
 * there that stops a big cat (Game's collider only collides while the cat is big), so only a small one squeezes through.
 */
export class Secret
{
    readonly rect: Phaser.Geom.Rectangle;
    /** Only in a tight room: stops a big cat at the crack. */
    readonly barrier: Phaser.GameObjects.Zone | null;
    private readonly tiles: Phaser.Tilemaps.Tile[];
    private readonly crack: Phaser.GameObjects.Image;
    /** Dust drifting out of the crack now and then (a draught from the room behind). */
    readonly dust: Phaser.GameObjects.Particles.ParticleEmitter;
    inside = false;
    alpha = 1;
    private revealed = false;

    constructor (scene: Phaser.Scene, rect: { x: number; y: number; width: number; height: number }, ground: Phaser.Tilemaps.TilemapLayer, entrance: 'left' | 'right', tight = false)
    {
        this.rect = new Phaser.Geom.Rectangle(rect.x, rect.y, rect.width, rect.height);
        this.tiles = ground.getTilesWithinWorldXY(rect.x, rect.y, rect.width, rect.height).filter(t => t.index > 0);
        for (const t of this.tiles) t.setCollision(false, false, false, false, true);   // neighbours get their faces back
        const doorX = entrance === 'right' ? rect.x + rect.width - TILE : rect.x;
        this.crack = scene.add.image(doorX, rect.y + rect.height, ASSETS.SECRET_CRACK.key).setOrigin(0, 1).setDepth(1);     // on the floor
        const D = SECRET.DUST, bottom = rect.y + rect.height, out = entrance === 'right' ? 1 : -1;
        this.dust = scene.add.particles(0, 0, JUICE.DUST.key, {
            emitZone: { type: 'random', source: { getRandomPoint: p => {
                p.x = doorX + TILE / 2 + Phaser.Math.Between(-3, 3);
                p.y = bottom - Phaser.Math.Between(4, D.CRACK_HEIGHT - 4);
            } } },
            frequency: D.EVERY_MS,
            quantity: D.COUNT,
            speedX: out > 0 ? D.SPEED_OUT : { min: -D.SPEED_OUT.max, max: -D.SPEED_OUT.min },
            speedY: D.SPEED_Y,
            lifespan: D.LIFESPAN,
            scale: { start: 2, end: 1 },
            alpha: { start: 0.9, end: 0 },
            tint: [...D.TINT]
        }).setDepth(DEPTH.EFFECTS);
        this.barrier = tight ? scene.add.zone(doorX, rect.y, TILE, rect.height).setOrigin(0) : null;
        if (this.barrier) scene.physics.add.existing(this.barrier, true);
    }

    update (deltaMs: number, cat: Phaser.Geom.Rectangle): void
    {
        // Really in, not just touching the edge (a big cat pressed against the crack must not reveal the room).
        const r = this.rect;
        this.inside = cat.right > r.left + 1 && cat.left < r.right - 1 && cat.bottom > r.top + 1 && cat.top < r.bottom - 1;
        if (this.inside && !this.revealed) {
            this.revealed = true;
            events.emit(EV.SECRET_REVEAL, { x: this.rect.centerX, y: this.rect.centerY });
        }
        const target = this.inside ? SECRET.REVEAL_ALPHA : 1;
        const step = SECRET.FADE_PER_S * deltaMs / 1000;
        this.alpha = this.alpha < target ? Math.min(target, this.alpha + step) : Math.max(target, this.alpha - step);
        for (const t of this.tiles) t.setAlpha(this.alpha);
        this.crack.setAlpha(this.alpha);
    }
}
