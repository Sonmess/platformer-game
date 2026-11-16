import Phaser, { Scene } from 'phaser';
import { ANIM, ASSETS, GAME, HUD, LEVEL, TILE, TITLE } from '../config/constants';
import { Input } from '../systems/Input';
import { music } from '../systems/Music';
import { Parallax } from '../systems/Parallax';

/**
 * Title screen: the forest drifts by while the cat runs in place on a strip of ground.
 * Confirm (Enter/R) fades into the level.
 */
export class Title extends Scene
{
    private controls: Input;
    private parallax: Parallax;
    private ground: Phaser.Tilemaps.TilemapLayer;
    private prompt: Phaser.GameObjects.Text;
    private shownMs = 0;
    private starting = false;
    /** Virtual camera scroll the background is drawn at (px). */
    scrollX = 0;

    constructor ()
    {
        super('Title');
    }

    init ()
    {
        this.shownMs = 0;
        this.scrollX = 0;
        this.starting = false;
    }

    create ()
    {
        this.parallax = new Parallax(this);
        this.ground = this.createGround();

        this.add.sprite(TITLE.CAT_X, TITLE.GROUND_ROW * TILE, ASSETS.CAT.run.key)
            .setOrigin(0.5, 1).play(ANIM.CAT_RUN);

        const cx = GAME.WIDTH / 2;
        const style = (fontSize: string, strokeThickness: number = HUD.TEXT_STROKE_WIDTH): Phaser.Types.GameObjects.Text.TextStyle => ({
            fontFamily: HUD.FONT_FAMILY, fontSize, color: HUD.TEXT_COLOR, align: 'center',
            stroke: HUD.TEXT_STROKE, strokeThickness, testString: HUD.TEXT_METRICS
        });
        this.add.text(cx, TITLE.NAME_Y, TITLE.TEXT.NAME, style(TITLE.NAME_SIZE, 2 * HUD.TEXT_STROKE_WIDTH)).setOrigin(0.5);
        const controls = this.add.text(cx, TITLE.CONTROLS_Y, TITLE.TEXT.CONTROLS.join('\n'), { ...style(TITLE.LINE_SIZE), lineSpacing: 4 })
            .setOrigin(0.5, 0).setDepth(1);
        const { COLOR, ALPHA, PADDING } = TITLE.PANEL;
        this.add.rectangle(cx, controls.y + controls.height / 2, controls.width + 2 * PADDING, controls.height + 2 * PADDING, COLOR, ALPHA);
        this.prompt = this.add.text(cx, TITLE.PROMPT_Y, TITLE.TEXT.PROMPT, style(TITLE.PROMPT_SIZE)).setOrigin(0.5);

        this.controls = new Input(this);
        music.start(this);
        this.cameras.main.fadeIn(TITLE.FADE_MS);
    }

    /** Exposed to the test API. */
    get promptVisible (): boolean
    {
        return this.prompt?.visible ?? false;
    }

    update (_time: number, delta: number)
    {
        // Count from deltas: the scene clock's `now` is stale inside create() of a freshly started scene.
        this.shownMs += delta;
        this.scrollX += TITLE.DRIFT_SPEED * delta / 1000;
        this.parallax.scrollTo(this.scrollX);
        this.ground.x = -(Math.round(this.scrollX) % TILE);
        this.prompt.setVisible(Math.floor(this.shownMs / TITLE.PROMPT_BLINK_MS) % 2 === 0);

        const input = this.controls.read();
        music.handleKeys(input);
        if (input.confirmPressed && this.shownMs >= TITLE.INPUT_DELAY_MS && !this.starting) {
            this.starting = true;
            const camera = this.cameras.main;
            camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('Game'));
            camera.fadeOut(TITLE.FADE_MS);
        }
    }

    /** One screen (plus a tile to scroll into) of the level's ground: grass top, earth below. */
    private createGround (): Phaser.Tilemaps.TilemapLayer
    {
        const cols = GAME.WIDTH / TILE + 1;
        const rows = Math.ceil(GAME.HEIGHT / TILE) - TITLE.GROUND_ROW;
        const { TOP, FILL } = TITLE.GROUND_TILES;
        const data = Array.from({ length: rows }, (_, r) => Array(cols).fill(r === 0 ? TOP : FILL));
        const map = this.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
        const tileset = map.addTilesetImage(LEVEL.TILESET_NAME, ASSETS.TILESET.key, TILE, TILE, 0, 0, 1)!;
        return (map.createLayer(0, tileset, 0, TITLE.GROUND_ROW * TILE) as Phaser.Tilemaps.TilemapLayer).setScrollFactor(0);
    }
}
