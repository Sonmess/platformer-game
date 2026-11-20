import { COIN, LIVES } from '../config/constants';

/**
 * How a level is entered: a new run (title, final screen), the next level after a finished one (lives and points carry
 * over), the same level again from its results (as it was when the level started), or again after the game was over
 * (3 lives, the points of the earlier levels kept).
 */
export type LevelEntry = 'new' | 'next' | 'replay' | 'retry';

/**
 * Run state. Per-level fields are reset by reset() (Game.create); run fields (lives, points of finished levels) by
 * enter('new'). Scenes call these in init()/create(), never rely on constructor values.
 */
export const state = {
    level: 1,
    /** Feathers picked up in this level, and how many it holds. */
    coins: 0,
    coinsTotal: 0,
    /** Points from feathers (1 / 5 / 10 each) in this level, and the level's total. */
    points: 0,
    pointsTotal: 0,
    /** Points of the levels finished earlier in this run. */
    runPoints: 0,
    deaths: 0,
    /** Every death takes one; at none left the game is over. Carried from level to level. */
    lives: LIVES.START as number,
    /** Game time spent in the level, ms. */
    timeMs: 0,
    /** Respawn point at the player's feet. */
    checkpoint: { x: 0, y: 0 },
    /** Lives and run points as the current level started (a replay goes back to them). */
    levelStart: { lives: LIVES.START as number, runPoints: 0 },

    /** Points of the whole run so far (earlier levels + this one); the HUD shows them, extra lives count them. */
    get totalPoints (): number
    {
        return this.runPoints + this.points;
    },

    /** Called before a level starts: what carries over depends on how it is entered. */
    enter (how: LevelEntry): void
    {
        switch (how) {
        case 'new':
            this.lives = LIVES.START;
            this.runPoints = 0;
            break;
        case 'next':
            this.runPoints += this.points;
            break;
        case 'replay':
            this.lives = this.levelStart.lives;
            this.runPoints = this.levelStart.runPoints;
            break;
        case 'retry':
            this.lives = LIVES.START;
            this.runPoints = this.levelStart.runPoints;
            break;
        }
        this.points = 0;
    },

    /** A level starts: clears everything of the level (not the lives or the run points) and remembers the start. */
    reset (level = 1, spawn = { x: 0, y: 0 }, coinsTotal = 0, pointsTotal = 0): void
    {
        this.level = level;
        this.coins = 0;
        this.coinsTotal = coinsTotal;
        this.points = 0;
        this.pointsTotal = pointsTotal;
        this.deaths = 0;
        this.timeMs = 0;
        this.checkpoint = { ...spawn };
        this.levelStart = { lives: this.lives, runPoints: this.runPoints };
    },

    /**
     * A feather picked up: counts it and adds its points. Every `COIN.LIFE_EVERY` points of the whole run give an extra
     * life (up to `LIVES.MAX`, above the start too). Returns whether a life was given.
     */
    collect (value: number): boolean
    {
        const before = Math.floor(this.totalPoints / COIN.LIFE_EVERY);
        this.coins++;
        this.points += value;
        const after = Math.floor(this.totalPoints / COIN.LIFE_EVERY);
        let gained = false;
        for (let i = before; i < after; i++) gained = this.gainLife() || gained;
        return gained;
    },

    /** Counts a death and takes a life; returns the lives left (never below zero). */
    loseLife (): number
    {
        this.deaths++;
        this.lives = Math.max(0, this.lives - 1);
        return this.lives;
    },

    /** Adds a life, up to the maximum; returns whether one was added. */
    gainLife (): boolean
    {
        if (this.lives >= LIVES.MAX) return false;
        this.lives++;
        return true;
    },

    get gameOver (): boolean
    {
        return this.lives === 0;
    }
};
