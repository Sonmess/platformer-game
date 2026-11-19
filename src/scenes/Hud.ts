import Phaser, { Scene } from 'phaser';
import { ASSETS, FEATHERS, GAME, HUD, JUICE, LIVES } from '../config/constants';
import { EV, events } from '../core/events';
import { state } from '../core/state';

/** Runs in parallel with Game; only listens to events, never reaches into gameplay objects. */
export class Hud extends Scene
{
    private coinsText: Phaser.GameObjects.Text;
    private icon: Phaser.GameObjects.Image;
    private meowLabel: Phaser.GameObjects.Text;
    private meowBar: Phaser.GameObjects.Rectangle;
    private lifeIcons: Phaser.GameObjects.Image[] = [];
    private shown = 0;
    /** False while the meow cooldown refills; exposed to the test API. */
    meowReady = true;

    constructor ()
    {
        super('Hud');
    }

    create ()
    {
        // Centre origin so the collect pop scales the icon in place.
        const icon = this.add.image(0, 0, FEATHERS.normal.key, 0);
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

        // Lives in the top-right corner: one cat head per possible life, the row ending at the margin.
        this.shown = state.lives;
        this.lifeIcons = Array.from({ length: LIVES.MAX }, () => this.add.image(0, icon.y, ASSETS.CAT.head.key));
        const w = this.lifeIcons[0].width;
        this.lifeIcons.forEach((head, i) => {
            head.setX(GAME.WIDTH - HUD.MARGIN - w / 2 - (LIVES.MAX - 1 - i) * (w + HUD.LIVES_GAP));
            head.setVisible(i < state.lives);
        });

        this.renderCoins();
        events.on(EV.COIN_COLLECT, this.onCoin, this);
        events.on(EV.PLAYER_MEOW, this.onMeow, this);
        events.on(EV.LIVES_CHANGE, this.onLives, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            events.off(EV.COIN_COLLECT, this.onCoin, this);
            events.off(EV.PLAYER_MEOW, this.onMeow, this);
            events.off(EV.LIVES_CHANGE, this.onLives, this);
        });
    }

    get coinsLabel (): string
    {
        return this.coinsText?.text ?? '';
    }

    /** Cat heads shown (lives); exposed to the test API. */
    get livesShown (): number
    {
        return this.shown;
    }

    /** A lost head pops and fades out (the rightmost one), a gained head pops in. */
    private onLives ({ lives }: { lives: number }): void
    {
        const pop = HUD.LIVES_POP;
        for (let i = 0; i < this.lifeIcons.length; i++) {
            const head = this.lifeIcons[i];
            const was = i < this.shown, now = i < lives;
            if (was === now) continue;
            this.tweens.killTweensOf(head);
            if (now) {
                head.setVisible(true).setAlpha(1).setScale(pop.SCALE);
                this.tweens.add({ targets: head, scale: 1, duration: pop.MS, ease: 'Back.easeOut' });
            } else {
                this.tweens.add({
                    targets: head, scale: pop.SCALE, alpha: 0, duration: pop.MS, ease: 'Quad.easeOut',
                    onComplete: () => head.setVisible(false).setScale(1).setAlpha(1)
                });
            }
        }
        this.shown = lives;
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
        this.coinsText.setText(`${state.points}`);     // feather points
    }
}
