import Phaser, { Scene } from 'phaser';
import { GAME, HUD, PAUSE } from '../config/constants';
import { Input } from '../systems/Input';
import { music } from '../systems/Music';

/**
 * Overlay launched by Game, which pauses itself underneath (physics, timers, tweens, animations and
 * particles all stop with it). Esc/P resumes, Q leaves to the title screen.
 */
export class Pause extends Scene
{
    private controls: Input;

    constructor ()
    {
        super('Pause');
    }

    create ()
    {
        const cx = GAME.WIDTH / 2, cy = GAME.HEIGHT / 2;
        const style = (fontSize: string): Phaser.Types.GameObjects.Text.TextStyle => ({
            fontFamily: HUD.FONT_FAMILY, fontSize, color: HUD.TEXT_COLOR, align: 'center',
            stroke: HUD.TEXT_STROKE, strokeThickness: HUD.TEXT_STROKE_WIDTH, testString: HUD.TEXT_METRICS
        });
        this.add.rectangle(0, 0, GAME.WIDTH, GAME.HEIGHT, PAUSE.OVERLAY_COLOR, PAUSE.OVERLAY_ALPHA).setOrigin(0);
        this.add.text(cx, cy - PAUSE.LINE_SPACING, PAUSE.TEXT.TITLE, style(PAUSE.TITLE_SIZE)).setOrigin(0.5);
        this.add.text(cx, cy + PAUSE.LINE_SPACING, [PAUSE.TEXT.RESUME, PAUSE.TEXT.QUIT, PAUSE.TEXT.MUSIC].join('\n'), style(PAUSE.LINE_SIZE))
            .setOrigin(0.5, 0);

        this.controls = new Input(this);
        this.controls.reset();      // the Esc/P that opened the pause may still be held
        music.setDucked(true);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => music.setDucked(false));
    }

    update ()
    {
        const input = this.controls.read();
        music.handleKeys(input);
        if (input.pausePressed) {
            this.scene.resume('Game');
            this.scene.resume('Hud');
            this.scene.stop();
        } else if (input.quitPressed) {
            this.scene.stop('Hud');
            this.scene.stop('Game');
            this.scene.start('Title');
        }
    }
}
