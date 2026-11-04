// Phaser-free jump helpers, unit-tested in tests/unit/jump.test.ts.

/** Coyote time + jump buffer. Times in seconds. */
export class JumpAssist
{
    private coyote = 0;
    private buffer = 0;

    constructor (private readonly coyoteTime: number, private readonly bufferTime: number) {}

    /** Call once per frame; returns true on the frame the jump should start. */
    update (dt: number, onGround: boolean, jumpPressed: boolean): boolean
    {
        this.coyote = onGround ? this.coyoteTime : Math.max(0, this.coyote - dt);
        this.buffer = jumpPressed ? this.bufferTime : Math.max(0, this.buffer - dt);

        if (this.buffer > 0 && this.coyote > 0) {
            this.buffer = 0;
            this.coyote = 0;    // consume both, so one press can never jump twice
            return true;
        }
        return false;
    }

    reset (): void
    {
        this.coyote = 0;
        this.buffer = 0;
    }
}

/**
 * Extra gravity to add on top of world gravity (which equals the rise gravity) for the
 * current vertical velocity: heavier when falling, lighter near the apex.
 */
export function extraGravity (
    vy: number,
    physics: { gravity: number; fallGravity: number },
    feel: { apexHangMult: number; apexThreshold: number }
): number
{
    if (Math.abs(vy) < feel.apexThreshold) return physics.gravity * (feel.apexHangMult - 1);
    if (vy > 0) return physics.fallGravity - physics.gravity;
    return 0;
}
