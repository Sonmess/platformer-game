/**
 * Frame-rate independent exponential approach: `rate` is the fraction of the remaining
 * distance covered per 60 FPS frame; other frame lengths give the same motion over time.
 */
export function approach (current: number, target: number, rate: number, deltaMs: number): number
{
    const frames = deltaMs / (1000 / 60);
    return target + (current - target) * Math.pow(1 - rate, frames);
}
