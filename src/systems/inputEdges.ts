/** Turns a per-frame "is held" signal into edge events. Pure, so it is unit-testable. */
export class EdgeLatch
{
    private wasDown = false;

    update (isDown: boolean): { pressed: boolean; released: boolean }
    {
        const pressed = isDown && !this.wasDown;
        const released = !isDown && this.wasDown;
        this.wasDown = isDown;
        return { pressed, released };
    }

    /** Forget the history; pass the current held state so a key still held does not read as a new press. */
    reset (isDown = false): void
    {
        this.wasDown = isDown;
    }
}
