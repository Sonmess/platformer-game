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

    reset (): void
    {
        this.wasDown = false;
    }
}
