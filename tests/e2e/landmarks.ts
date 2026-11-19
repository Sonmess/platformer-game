import { readFileSync } from 'node:fs';
import { TILE } from '../../src/config/constants';

// Positions of level objects read straight from src/levels/level1.json, so specs follow the level when it changes.
// Arrays are in level order, which is also the order of the matching arrays in getState().

interface TiledObject { type: string; x: number; y: number; width: number; height: number }

const level = JSON.parse(readFileSync('src/levels/level1.json', 'utf8')) as {
    width: number; height: number;
    layers: { name: string; objects?: TiledObject[] }[];
};
const objects = level.layers.find(l => l.name === 'objects')!.objects!;
const ofType = (type: string) => objects.filter(o => o.type === type);
const box = (o: TiledObject) => ({ x: o.x, y: o.y, width: o.width, height: o.height, col: o.x / TILE, row: o.y / TILE });

const goal = ofType('goal')[0];
/** A point inside the goal zone (the cave mouth). */
export const GOAL = { x: goal.x + goal.width / 2, y: goal.y + goal.height - TILE };

export const LEVEL = { width: level.width * TILE, height: level.height * TILE, cols: level.width };

/** Crows; `vertical` = flies up and down (taller than wide). */
export const CROWS = ofType('crow').map(o => ({ ...box(o), vertical: o.height > o.width }));

/** Moving platforms; `vertical` = moves up and down. */
export const PLATFORMS = ofType('platform').map(o => ({ ...box(o), vertical: o.height > o.width }));

export const CRUMBLES = ofType('crumble').map(box);

export const HEDGEHOGS = ofType('hedgehog').map(box);

export const SNAKES = ofType('snake').map(box);

/** Index of the i-th snake in getState().enemies (hedgehogs, then crows, then snakes). */
export const snakeIndex = (i = 0) => HEDGEHOGS.length + CROWS.length + i;

