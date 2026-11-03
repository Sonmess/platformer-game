import Phaser from 'phaser';
import { EdgeLatch } from './inputEdges';

export type VirtualKey = 'left' | 'right' | 'jump' | 'down';

export interface InputSnapshot {
    left: boolean;
    right: boolean;
    down: boolean;
    jumpHeld: boolean;
    jumpPressed: boolean;
    jumpReleased: boolean;
}

/** Keys held by the dev test API; merged with the keyboard so they behave like real keys. */
export const virtualKeys = new Set<VirtualKey>();

const K = Phaser.Input.Keyboard.KeyCodes;

/** One normalized snapshot per frame; the Player never reads devices directly. */
export class Input
{
    private readonly keys: Record<VirtualKey, Phaser.Input.Keyboard.Key[]>;
    private readonly jumpLatch = new EdgeLatch();

    constructor (scene: Phaser.Scene)
    {
        const kb = scene.input.keyboard!;
        const add = (...codes: number[]) => codes.map(c => kb.addKey(c));
        this.keys = {
            left: add(K.LEFT, K.A),
            right: add(K.RIGHT, K.D),
            down: add(K.DOWN, K.S),
            jump: add(K.SPACE, K.UP, K.W, K.Z)
        };
        virtualKeys.clear();
    }

    private held (key: VirtualKey): boolean
    {
        return virtualKeys.has(key) || this.keys[key].some(k => k.isDown);
    }

    read (): InputSnapshot
    {
        const jumpHeld = this.held('jump');
        const { pressed, released } = this.jumpLatch.update(jumpHeld);
        return {
            left: this.held('left'),
            right: this.held('right'),
            down: this.held('down'),
            jumpHeld,
            jumpPressed: pressed,
            jumpReleased: released
        };
    }
}
