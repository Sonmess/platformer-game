import Phaser, { Scene } from 'phaser';
import { GAME, HUD, RESULTS } from '../config/constants';
import { formatTime } from '../core/format';
import { state } from '../core/state';
import { Input } from '../systems/Input';

/** Results of the finished run; confirm (Enter/R) starts the level again. Jump keys do nothing here. */
export class LevelComplete extends Scene
{
    private controls: Input;
    private shownMs = 0;
    lines: string[] = [];

    constructor ()
    {
        super('LevelComplete');
    }

    create ()
    {
        this.cameras.main.setBackgroundColor(RESULTS.OVERLAY_COLOR);
        const cx = GAME.WIDTH / 2;
        const style = (fontSize: string): Phaser.Types.GameObjects.Text.TextStyle => ({
            fontFamily: HUD.FONT_FAMILY, fontSize, color: HUD.TEXT_COLOR,
            stroke: HUD.TEXT_STROKE, strokeThickness: HUD.TEXT_STROKE_WIDTH, align: 'center',
            testString: HUD.TEXT_METRICS
        });

        const t = RESULTS.TEXT;
        this.lines = [
            `${t.COINS}: ${state.coins}/${state.coinsTotal}`,
            `${t.DEATHS}: ${state.deaths}`,
            `${t.TIME}: ${formatTime(state.timeMs)}`
        ];

        let y = GAME.HEIGHT / 2 - 2 * RESULTS.LINE_SPACING;
        this.add.text(cx, y, t.TITLE, style(RESULTS.TITLE_SIZE)).setOrigin(0.5);
        y += 1.5 * RESULTS.LINE_SPACING;
        for (const line of this.lines) {
            y += RESULTS.LINE_SPACING;
            this.add.text(cx, y, line, style(RESULTS.LINE_SIZE)).setOrigin(0.5);
        }
        y += 2 * RESULTS.LINE_SPACING;
        this.add.text(cx, y, t.RESTART, style(RESULTS.HINT_SIZE)).setOrigin(0.5).setAlpha(0.8);

        this.controls = new Input(this);
        // Count from deltas: the scene clock's `now` is stale inside create() of a freshly started scene.
        this.shownMs = 0;
    }

    update (_time: number, delta: number)
    {
        this.shownMs += delta;
        const input = this.controls.read();
        if (input.confirmPressed && this.shownMs >= RESULTS.INPUT_DELAY_MS) {
            this.scene.start('Game');
        }
    }
}
