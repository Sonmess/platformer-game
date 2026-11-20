import { COIN, LIVES } from '../config/constants';

/** Per-run state. Scenes call reset() in init(), never rely on constructor values. */
export const state = {
    level: 1,
    /** Feathers picked up, and how many the level holds. */
    coins: 0,
    coinsTotal: 0,
    /** Points from feathers (1 / 5 / 10 each), and the level's total. */
    points: 0,
    pointsTotal: 0,
    deaths: 0,
    /** Every death takes one; at none left the game is over. */
    lives: LIVES.START as number,
    /** Game time spent in the level, ms. */
    timeMs: 0,
    /** Respawn point at the player's feet. */
    checkpoint: { x: 0, y: 0 },

    reset (level = 1, spawn = { x: 0, y: 0 }, coinsTotal = 0, pointsTotal = 0): void
    {
        this.level = level;
        this.coins = 0;
        this.coinsTotal = coinsTotal;
        this.points = 0;
        this.pointsTotal = pointsTotal;
        this.deaths = 0;
        this.lives = LIVES.START;
        this.timeMs = 0;
        this.checkpoint = { ...spawn };
    },

    /**
     * A feather picked up: counts it and adds its points. Every `COIN.LIFE_EVERY` points give an extra life
     * (up to `LIVES.MAX`, above the start too). Returns whether a life was given.
     */
    collect (value: number): boolean
    {
        const before = Math.floor(this.points / COIN.LIFE_EVERY);
        this.coins++;
        this.points += value;
        const after = Math.floor(this.points / COIN.LIFE_EVERY);
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
