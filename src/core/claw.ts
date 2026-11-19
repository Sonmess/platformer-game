// Claw mechanics without Phaser, so they are unit-testable. Game uses `clawHits` to find the enemies a swipe
// reaches and `clawOutcome` to decide what happens to each.

/** Where a claw swipe reaches: from `x` forward `reach` px (and `behind` px back), `halfHeight` px above and below `y`. */
export interface ClawSwipe
{
    x: number;
    y: number;
    /** 1 = right, -1 = left. */
    dir: 1 | -1;
    reach: number;
    behind: number;
    halfHeight: number;
}

export interface Box { left: number; right: number; top: number; bottom: number }

/** The swipe's area as a box (left < right). */
export function clawBox (swipe: ClawSwipe): Box
{
    const front = swipe.x + swipe.dir * swipe.reach;
    const back = swipe.x - swipe.dir * swipe.behind;
    return { left: Math.min(front, back), right: Math.max(front, back), top: swipe.y - swipe.halfHeight, bottom: swipe.y + swipe.halfHeight };
}

/** Does the swipe touch this hitbox? */
export function clawHits (swipe: ClawSwipe, box: Box): boolean
{
    const a = clawBox(swipe);
    return a.left <= box.right && a.right >= box.left && a.top <= box.bottom && a.bottom >= box.top;
}

/**
 * What a swipe does to an enemy: a spiky one (hedgehog) pricks the cat unless a meow has scared it first (then it
 * is rolled up and harmless); anything else, or a scared hedgehog, flees.
 */
export function clawOutcome (spiky: boolean, scared: boolean): 'flee' | 'prick'
{
    return spiky && !scared ? 'prick' : 'flee';
}
