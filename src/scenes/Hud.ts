import Phaser, { Scene } from 'phaser';
import { COIN, HUD } from '../config/constants';
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
        const iconX = HUD.MARGIN + HUD.ICON_RADIUS;
        const iconY = HUD.MARGIN + HUD.ICON_RADIUS;
        this.add.circle(iconX, iconY, HUD.ICON_RADIUS, COIN.COLOR).setStrokeStyle(1, COIN.OUTLINE);

        this.coinsText = this.add.text(iconX + HUD.ICON_RADIUS + HUD.ICON_GAP, iconY, '', {
            fontFamily: HUD.FONT_FAMILY,
            fontSize: HUD.FONT_SIZE,
            color: HUD.TEXT_COLOR,
            stroke: HUD.TEXT_STROKE,
            strokeThickness: HUD.TEXT_STROKE_WIDTH
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
