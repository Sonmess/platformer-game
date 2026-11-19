import Phaser from 'phaser';
import { ASSETS, DEPTH, TILE } from '../config/constants';
import type { ClimbKind, ClimbZone } from '../core/climb';

/**
 * A vine or a tree trunk the cat can climb: a Tiled rectangle (the climbable area) plus its look. No body; the
 * Player checks the zones itself (src/core/climb.ts). A trunk stands on the ground (roots at the bottom edge) with
 * a leafy crown over its top; a vine hangs from its top edge (a knot of leaves, unless it hangs from the level's
 * top) and ends in a curled tip.
 */
export class Climbable implements ClimbZone
{
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;

    constructor (scene: Phaser.Scene, readonly kind: ClimbKind, rect: { x: number; y: number; width: number; height: number })
    {
        ({ x: this.x, y: this.y, width: this.width, height: this.height } = rect);
        const cx = this.x + this.width / 2;
        const bottom = this.y + this.height;
        const img = (x: number, y: number, key: string, ox: number, oy: number) =>
            scene.add.image(x, y, key).setOrigin(ox, oy).setDepth(DEPTH.CLIMBABLES);

        if (kind === 'trunk') {
            const { bark, roots, crown, CROWN_OVERLAP_PX } = ASSETS.TRUNK;
            for (let y = this.y; y < bottom; y += TILE) {
                for (let x = this.x; x < this.x + this.width; x += TILE) img(x, y, bark.key, 0, 0);
            }
            img(cx, bottom, roots.key, 0.5, 1);
            img(cx, this.y + CROWN_OVERLAP_PX, crown.key, 0.5, 1);
        } else {
            const { stem, tip, knot } = ASSETS.VINE;
            for (let y = this.y; y < bottom; y += TILE) img(cx, y, stem.key, 0.5, 0);
            img(cx, bottom, tip.key, 0.5, 0);
            if (this.y > 0) img(cx, this.y, knot.key, 0.5, 1);
        }
    }
}
