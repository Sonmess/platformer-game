import Phaser, { Scene } from 'phaser';
import { ASSETS, HUD } from '../config/constants';
import { EV, events } from '../core/events';
import { state } from '../core/state';

/** Runs in parallel with Game; only listens to events, never reaches into gameplay objects. */
export class Hud extends Scene
{
    private coinsText: Phaser.GameObjects.Text;

    constructor ()
    {
        super('Hud');
    }

    create ()
    {
        const icon = this.add.image(HUD.MARGIN, HUD.MARGIN, ASSETS.CHERRY.key, 0).setOrigin(0);
        const iconY = icon.y + icon.height / 2;

        this.coinsText = this.add.text(icon.x + icon.width + HUD.ICON_GAP, iconY, '', {
            fontFamily: HUD.FONT_FAMILY,
            fontSize: HUD.FONT_SIZE,
            color: HUD.TEXT_COLOR,
            stroke: HUD.TEXT_STROKE,
            strokeThickness: HUD.TEXT_STROKE_WIDTH,
            testString: HUD.TEXT_METRICS
        }).setOrigin(0, 0.5);

        this.renderCoins();
        events.on(EV.COIN_COLLECT, this.renderCoins, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => events.off(EV.COIN_COLLECT, this.renderCoins, this));
    }

    get coinsLabel (): string
    {
        return this.coinsText?.text ?? '';
    }

    private renderCoins (): void
    {
        this.coinsText.setText(`${state.coins}/${state.coinsTotal}`);
    }
}
