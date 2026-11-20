import level1 from './level1.json';
import level2 from './level2.json';
import level3 from './level3.json';

/** Tiled maps by cache key (LevelDef.map). Edit the JSON in Tiled or with a script; it is the source of truth. */
export const LEVEL_MAPS: Record<string, object> = { level1, level2, level3 };
