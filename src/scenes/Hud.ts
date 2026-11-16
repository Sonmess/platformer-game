import Phaser, { Scene } from 'phaser';
import { ASSETS, HUD, JUICE } from '../config/constants';
import { EV, events } from '../core/events';
import { state } from '../core/state';

/** Runs in parallel with Game; only listens to events, never reaches into gameplay objects. */
export class Hud extends Scene
{
    private coinsText: Phaser.GameObjects.Text;
    private icon: Phaser.GameObjects.Image;
    private meowLabel: Phaser.GameObjects.Text;
    private meowBar: Phaser.GameObjects.Rectangle;
    /** False while the meow cooldown refills; exposed to the test API. */
    meowReady = true;

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

        const style: Phaser.Types.GameObjects.Text.TextStyle = {
            fontFamily: HUD.FONT_FAMILY,
            fontSize: HUD.FONT_SIZE,
            color: HUD.TEXT_COLOR,
            stroke: HUD.TEXT_STROKE,
            strokeThickness: HUD.TEXT_STROKE_WIDTH,
            testString: HUD.TEXT_METRICS
        };
        this.coinsText = this.add.text(HUD.MARGIN + icon.width + HUD.ICON_GAP, icon.y, '', style).setOrigin(0, 0.5);

        // Meow readiness: the label dims and the bar under it refills during the cooldown.
        const bar = HUD.MEOW_BAR;
        this.meowReady = true;
        this.meowLabel = this.add.text(HUD.MARGIN, HUD.MARGIN + icon.height + HUD.ICON_GAP, HUD.MEOW_LABEL, style);
        this.meowBar = this.add.rectangle(HUD.MARGIN, this.meowLabel.y + this.meowLabel.height + bar.GAP, bar.WIDTH, bar.HEIGHT, bar.COLOR)
            .setOrigin(0);

        this.renderCoins();
        events.on(EV.COIN_COLLECT, this.onCoin, this);
        events.on(EV.PLAYER_MEOW, this.onMeow, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            events.off(EV.COIN_COLLECT, this.onCoin, this);
            events.off(EV.PLAYER_MEOW, this.onMeow, this);
        });
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

    private onMeow ({ cooldownMs }: { cooldownMs: number }): void
    {
        this.meowReady = false;
        this.meowLabel.setAlpha(HUD.MEOW_BAR.COOLING_ALPHA);
        this.tweens.killTweensOf(this.meowBar);
        this.meowBar.setScale(0, 1);
        this.tweens.add({
            targets: this.meowBar,
            scaleX: 1,
            duration: cooldownMs,
            onComplete: () => {
                this.meowReady = true;
                this.meowLabel.setAlpha(1);
            }
        });
    }

    private renderCoins (): void
    {
        this.coinsText.setText(`${state.coins}/${state.coinsTotal}`);
    }
}
