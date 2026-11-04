/** Per-run state. Scenes call reset() in init(), never rely on constructor values. */
export const state = {
    level: 1,
    coins: 0,
    coinsTotal: 0,
    deaths: 0,
    /** Game time spent in the level, ms. */
    timeMs: 0,
    /** Respawn point at the player's feet. */
    checkpoint: { x: 0, y: 0 },

    reset (level = 1, spawn = { x: 0, y: 0 }, coinsTotal = 0): void
    {
        this.level = level;
        this.coins = 0;
        this.coinsTotal = coinsTotal;
        this.deaths = 0;
        this.timeMs = 0;
        this.checkpoint = { ...spawn };
    }
};
