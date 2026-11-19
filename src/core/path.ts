/**
 * Back-and-forth motion along a segment of `length` px after travelling `distance` px in total.
 * Returns the eased position 0..1 along the segment (slowing down at both ends, like a bird turning)
 * and the direction of travel (1 = towards the end, -1 = back to the start). Pure, unit-tested.
 */
export function pingPong (distance: number, length: number): { t: number; dir: 1 | -1 }
{
    if (length <= 0) return { t: 0, dir: 1 };
    const phase = ((distance % (2 * length)) + 2 * length) % (2 * length) / length;    // 0..2
    const linear = phase <= 1 ? phase : 2 - phase;
    return { t: 0.5 - 0.5 * Math.cos(Math.PI * linear), dir: phase < 1 ? 1 : -1 };
}
