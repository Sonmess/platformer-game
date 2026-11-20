import { readFileSync } from 'node:fs';
import { LEVELS, TILE } from '../../src/config/constants';

// Positions of level objects read straight from src/levels/<map>.json, so specs follow a level when it changes.
// Arrays are in level order, which is also the order of the matching arrays in getState().

interface TiledObject { type: string; x: number; y: number; width: number; height: number }

const box = (o: TiledObject) => ({ x: o.x, y: o.y, width: o.width, height: o.height, col: o.x / TILE, row: o.y / TILE });

/** Landmarks of level `n` (1-based). */
export function landmarks (n = 1)
{
    const level = JSON.parse(readFileSync(`src/levels/${LEVELS[n - 1].map}.json`, 'utf8')) as {
        width: number; height: number;
        layers: { name: string; objects?: TiledObject[] }[];
    };
    const objects = level.layers.find(l => l.name === 'objects')!.objects!;
    const ofType = (type: string) => objects.filter(o => o.type === type);
    const goal = ofType('goal')[0];
    const hedgehogs = ofType('hedgehog').map(box);
    const crows = ofType('crow').map(o => ({ ...box(o), vertical: o.height > o.width }));
    return {
        /** A point inside the goal zone (the cave mouth). */
        GOAL: { x: goal.x + goal.width / 2, y: goal.y + goal.height - TILE },
        LEVEL: { width: level.width * TILE, height: level.height * TILE, cols: level.width },
        /** Crows; `vertical` = flies up and down (taller than wide). */
        CROWS: crows,
        /** Moving platforms; `vertical` = moves up and down. */
        PLATFORMS: ofType('platform').map(o => ({ ...box(o), vertical: o.height > o.width })),
        CRUMBLES: ofType('crumble').map(box),
        HEDGEHOGS: hedgehogs,
        SNAKES: ofType('snake').map(box),
        CHECKPOINTS: ofType('checkpoint').map(box),
        FEATHERS: ofType('feather').map(box),
        /** Climbable tree trunks (bottom edge on the ground) and hanging vines, each in level order. */
        TRUNKS: ofType('trunk').map(box),
        VINES: ofType('vine').map(box),
        /** Secret rooms (fake rock) and the treasures (golden fish), in level order. */
        SECRETS: ofType('secret').map(box),
        TREASURES: ofType('treasure').map(o => ({ x: o.x, y: o.y })),
        /** Stalactites: where each hangs (top centre). */
        STALACTITES: ofType('stalactite').map(o => ({ x: o.x, y: o.y })),
        /** Index of the i-th snake in getState().enemies (hedgehogs, then crows, then snakes). */
        snakeIndex: (i = 0) => hedgehogs.length + crows.length + i
    };
}

// Level 1, under the names the specs have always used.
export const { GOAL, LEVEL, CROWS, PLATFORMS, CRUMBLES, HEDGEHOGS, SNAKES, TRUNKS, VINES, snakeIndex } = landmarks(1);
