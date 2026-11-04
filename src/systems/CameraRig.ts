import Phaser from 'phaser';
import { CAMERA } from '../config/constants';
import { approach } from '../core/math';
import type { Player } from '../entities/Player';

/** Follows the player with a deadzone, level bounds and a smoothed look-ahead. */
export class CameraRig
{
    constructor (private readonly camera: Phaser.Cameras.Scene2D.Camera, private readonly player: Player, bounds: { width: number; height: number })
    {
        camera.setBounds(0, 0, bounds.width, bounds.height);
        camera.startFollow(player, true, CAMERA.lerpX, CAMERA.lerpY);
        camera.setDeadzone(CAMERA.deadzoneW, CAMERA.deadzoneH);
        camera.setFollowOffset(-player.facing * CAMERA.lookAhead, 0);
    }

    /** Jump straight to the player (after a respawn) instead of sliding across the level. */
    snap (): void
    {
        const offset = this.camera.followOffset;
        offset.x = -this.player.facing * CAMERA.lookAhead;
        this.camera.centerOn(this.player.x - offset.x, this.player.y - offset.y);
    }

    update (deltaMs: number): void
    {
        // Phaser subtracts followOffset from the target, so leading right needs a negative offset.
        const target = -this.player.facing * CAMERA.lookAhead;
        const offset = this.camera.followOffset;
        offset.x = approach(offset.x, target, CAMERA.lookAheadRate, deltaMs);
    }
}
