import Phaser, { Scene } from 'phaser';
import { ASSETS, HUD, JUICE } from '../config/constants';
import { EV, events } from '../core/events';
import { state } from '../core/state';

/** Runs in parallel with Game; only listens to events, never reaches into gameplay objects. */
export class Hud extends Scene
{
    private coinsText: Phaser.GameObjects.Text;
    private icon: Phaser.GameObjects.Image;

    constructor ()
    {
        super('Hud');
    }

    create ()
    {
        // Centre origin so the collect pop scales the icon in place.
        const icon = this.add.image(0, 0, ASSETS.CHERRY.key, 0);
        icon.setPosition(HUD.MARGIN + icon.width / 2, HUD.MARGIN + icon.height / 2);
        this.icon = icon;

        this.coinsText = this.add.text(HUD.MARGIN + icon.width + HUD.ICON_GAP, icon.y, '', {
            fontFamily: HUD.FONT_FAMILY,
            fontSize: HUD.FONT_SIZE,
            color: HUD.TEXT_COLOR,
            stroke: HUD.TEXT_STROKE,
            strokeThickness: HUD.TEXT_STROKE_WIDTH,
            testString: HUD.TEXT_METRICS
        }).setOrigin(0, 0.5);

        this.renderCoins();
        events.on(EV.COIN_COLLECT, this.onCoin, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => events.off(EV.COIN_COLLECT, this.onCoin, this));
    }

    get coinsLabel (): string
    {
        return this.coinsText?.text ?? '';
    }

    private onCoin (): void
    {
        this.renderCoins();
        this.tweens.killTweensOf(this.icon);
        this.icon.setScale(JUICE.COIN.hudPopScale);
        this.tweens.add({
            targets: this.icon,
            scale: 1,
            duration: JUICE.COIN.hudPopMs,
            ease: 'Back.easeOut'
        });
    }

    private renderCoins (): void
    {
        this.coinsText.setText(`${state.coins}/${state.coinsTotal}`);
    }
}
