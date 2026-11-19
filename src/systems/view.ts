import Phaser from 'phaser';
import { CAMERA } from '../config/constants';

/**
 * Is a world point on screen, or just off it? For effects and sounds of things that repeat on their own (a snake's
 * poison cycle): off screen they are neither drawn nor heard.
 */
export function nearView (camera: Phaser.Cameras.Scene2D.Camera, x: number, y: number): boolean
{
    const view = camera.worldView, m = CAMERA.OFFSCREEN_MARGIN_PX;
    return x >= view.x - m && x <= view.right + m && y >= view.y - m && y <= view.bottom + m;
}
