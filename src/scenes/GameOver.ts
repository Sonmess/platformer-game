import Phaser, { Scene } from 'phaser';
import { GAME, GAME_OVER, HUD, RESULTS } from '../config/constants';
import { state } from '../core/state';
import { Input } from '../systems/Input';
import { music } from '../systems/Music';

/**
 * The last life is gone: confirm (Enter/R) starts the same level from scratch with LIVES.START lives (the points of the
 * earlier levels kept), back (Esc) goes to the
 * title. A short delay first, so a key mashed during the death animation does not skip the screen.
 */
export class GameOver extends Scene
{
    private controls: Input;
    private shownMs = 0;

    constructor ()
    {
        super('GameOver');
    }

    create ()
    {
        this.cameras.main.setBackgroundColor(RESULTS.OVERLAY_COLOR);
        this.cameras.main.fadeIn(GAME_OVER.INPUT_DELAY_MS / 2);
        const cx = GAME.WIDTH / 2, cy = GAME.HEIGHT / 2;
        const style = (fontSize: string): Phaser.Types.GameObjects.Text.TextStyle => ({
            fontFamily: HUD.FONT_FAMILY, fontSize, color: HUD.TEXT_COLOR,
            stroke: HUD.TEXT_STROKE, strokeThickness: HUD.TEXT_STROKE_WIDTH, align: 'center',
            testString: HUD.TEXT_METRICS
        });
        const t = GAME_OVER.TEXT;
        this.add.text(cx, cy - 2 * RESULTS.LINE_SPACING, t.TITLE, style(GAME_OVER.TITLE_SIZE)).setOrigin(0.5);
        this.add.text(cx, cy - 0.5 * RESULTS.LINE_SPACING, t.LINE, style(GAME_OVER.LINE_SIZE)).setOrigin(0.5);
        this.add.text(cx, cy + RESULTS.LINE_SPACING, `${t.RETRY}\n${t.BACK}`, style(RESULTS.HINT_SIZE)).setOrigin(0.5, 0).setAlpha(0.8);

        this.controls = new Input(this);
        music.stop();               // let the sad jingle be heard; the title or the next run starts the loop again
        // Count from deltas: the scene clock's `now` is stale inside create() of a freshly started scene.
        this.shownMs = 0;
    }

    update (_time: number, delta: number)
    {
        this.shownMs += delta;
        const input = this.controls.read();
        music.handleKeys(input);
        if (this.shownMs < GAME_OVER.INPUT_DELAY_MS) return;
        if (input.confirmPressed) this.scene.start('Game', { level: state.level, entry: 'retry' });
        else if (input.backPressed) this.scene.start('Title');
    }
}
