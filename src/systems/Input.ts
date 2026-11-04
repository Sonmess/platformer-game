import Phaser from 'phaser';
import { EdgeLatch } from './inputEdges';

export type VirtualKey = 'left' | 'right' | 'jump' | 'down' | 'confirm';

export interface InputSnapshot {
    left: boolean;
    right: boolean;
    down: boolean;
    jumpHeld: boolean;
    jumpPressed: boolean;
    jumpReleased: boolean;
    /** Menu confirm (Enter/R), edge-triggered. Not a gameplay action. */
    confirmPressed: boolean;
}

/** Keys held by the dev test API; merged with the keyboard so they behave like real keys. */
export const virtualKeys = new Set<VirtualKey>();

const K = Phaser.Input.Keyboard.KeyCodes;

/** One normalized snapshot per frame; the Player never reads devices directly. */
export class Input
{
    private readonly keys: Record<VirtualKey, Phaser.Input.Keyboard.Key[]>;
    private readonly jumpLatch = new EdgeLatch();
    private readonly confirmLatch = new EdgeLatch();
    // Key events seen since the last read(). A tap shorter than a frame (down and up between two
    // updates) never shows up in isDown, and Phaser clears JustDown on key up, so latch the events.
    private readonly downSeen = new Set<VirtualKey>();
    private readonly upSeen = new Set<VirtualKey>();

    constructor (scene: Phaser.Scene)
    {
        const kb = scene.input.keyboard!;
        const add = (...codes: number[]) => codes.map(c => kb.addKey(c));
        this.keys = {
            left: add(K.LEFT, K.A),
            right: add(K.RIGHT, K.D),
            down: add(K.DOWN, K.S),
            jump: add(K.SPACE, K.UP, K.W, K.Z),
            confirm: add(K.ENTER, K.R)
        };
        for (const [action, keys] of Object.entries(this.keys) as [VirtualKey, Phaser.Input.Keyboard.Key[]][]) {
            for (const key of keys) {
                key.on(Phaser.Input.Keyboard.Events.DOWN, (_k: unknown, ev: KeyboardEvent) => { if (!ev.repeat) this.downSeen.add(action); });
                key.on(Phaser.Input.Keyboard.Events.UP, () => this.upSeen.add(action));
            }
        }
        virtualKeys.clear();
    }

    private held (key: VirtualKey): boolean
    {
        return virtualKeys.has(key) || this.keys[key].some(k => k.isDown);
    }

    /** Edges for one action: held-state transitions plus any key events latched since the last read. */
    private edges (key: VirtualKey, latch: EdgeLatch): { held: boolean; pressed: boolean; released: boolean }
    {
        const held = this.held(key);
        const transition = latch.update(held);
        return {
            held,
            pressed: transition.pressed || this.downSeen.has(key),
            released: transition.released || (this.upSeen.has(key) && !held)
        };
    }

    read (): InputSnapshot
    {
        const jump = this.edges('jump', this.jumpLatch);
        const confirm = this.edges('confirm', this.confirmLatch);
        this.downSeen.clear();
        this.upSeen.clear();
        return {
            left: this.held('left'),
            right: this.held('right'),
            down: this.held('down'),
            jumpHeld: jump.held,
            jumpPressed: jump.pressed,
            jumpReleased: jump.released,
            confirmPressed: confirm.pressed
        };
    }
}
