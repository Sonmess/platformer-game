import Phaser, { Scene } from 'phaser';
import { GAME, HUD, LEVELS, RESULTS } from '../config/constants';
import { formatTime } from '../core/format';
import { state, type LevelEntry } from '../core/state';
import { Input } from '../systems/Input';
import { music } from '../systems/Music';

/**
 * Results of the finished level. Enter = the next level (lives and points carry over); after the last level the final
 * screen, where Enter starts a new game. R = this level again (as it started), Esc = the title. Jump keys do nothing.
 */
export class LevelComplete extends Scene
{
    private controls: Input;
    private shownMs = 0;
    private leaving = false;
    lines: string[] = [];
    /** The last level was finished (the final screen). */
    final = false;

    constructor ()
    {
        super('LevelComplete');
    }

    init ()
    {
        this.leaving = false;
    }

    create ()
    {
        this.cameras.main.setBackgroundColor(RESULTS.OVERLAY_COLOR).resetFX();     // no fade left over from leaving last time
        this.final = state.level >= LEVELS.length;
        const cx = GAME.WIDTH / 2;
        const style = (fontSize: string): Phaser.Types.GameObjects.Text.TextStyle => ({
            fontFamily: HUD.FONT_FAMILY, fontSize, color: HUD.TEXT_COLOR,
            stroke: HUD.TEXT_STROKE, strokeThickness: HUD.TEXT_STROKE_WIDTH, align: 'center',
            testString: HUD.TEXT_METRICS
        });

        const t = RESULTS.TEXT;
        this.lines = [
            `${t.COINS}: ${state.points}/${state.pointsTotal}`,     // feather points out of the level's total
            ...(state.treasuresTotal > 0 ? [`${t.TREASURE}: ${state.treasures}/${state.treasuresTotal}`] : []),
            `${t.TOTAL}: ${state.totalPoints}`,                     // the whole run so far
            `${t.LIVES}: ${state.lives}`,
            `${t.TIME}: ${formatTime(state.timeMs)}`
        ];

        this.add.text(cx, RESULTS.TITLE_Y, this.final ? t.FINAL_TITLE : t.TITLE, style(RESULTS.TITLE_SIZE)).setOrigin(0.5);
        let y = RESULTS.LINES_Y;
        for (const line of this.lines) {
            this.add.text(cx, y, line, style(RESULTS.LINE_SIZE)).setOrigin(0.5);
            y += RESULTS.LINE_SPACING;
        }
        this.add.text(cx, y + RESULTS.HINT_GAP - RESULTS.LINE_SPACING / 2, `${this.final ? t.NEW_GAME : t.NEXT}\n${t.BACK}`, style(RESULTS.HINT_SIZE))
            .setOrigin(0.5, 0).setAlpha(0.8);

        this.controls = new Input(this);
        // Count from deltas: the scene clock's `now` is stale inside create() of a freshly started scene.
        this.shownMs = 0;
    }

    update (_time: number, delta: number)
    {
        this.shownMs += delta;
        const input = this.controls.read();
        music.handleKeys(input);
        if (this.leaving || this.shownMs < RESULTS.INPUT_DELAY_MS) return;
        if (input.replayPressed) this.play(state.level, 'replay');          // R is a confirm key too: check it first
        else if (input.confirmPressed) this.play(this.final ? 1 : state.level + 1, this.final ? 'new' : 'next');
        else if (input.backPressed) this.scene.start('Title');
    }

    /** Fades out, then starts `level`. */
    private play (level: number, entry: LevelEntry): void
    {
        this.leaving = true;
        const camera = this.cameras.main;
        camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('Game', { level, entry }));
        camera.fadeOut(RESULTS.FADE_MS);
    }
}
