import Phaser from 'phaser';
import { AUDIO } from '../config/constants';
import type { InputSnapshot } from './Input';

type LoopSound = Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound;

/**
 * The background loop. It lives in the game-wide sound manager, so scene switches never restart
 * or duplicate it: every scene that wants music just calls `music.start(this)`.
 * Mute (M) affects the music only and lasts for the session; the pause overlay ducks it.
 */
class Music
{
    muted = false;
    ducked = false;
    private sound: LoopSound | null = null;

    start (scene: Phaser.Scene): void
    {
        const { key } = AUDIO.MUSIC;
        this.sound = (scene.sound.get(key) ?? scene.sound.add(key, { loop: true })) as LoopSound;
        if (!this.sound.isPlaying) this.sound.play();
        this.apply();
    }

    /** Silence (the "game over" jingle plays alone); the next `start()` begins the loop again. */
    stop (): void
    {
        this.sound?.stop();
    }

    /** Call from every scene's update: M toggles the music in any screen. */
    handleKeys (input: InputSnapshot): void
    {
        if (input.mutePressed) {
            this.muted = !this.muted;
            this.apply();
        }
    }

    setDucked (ducked: boolean): void
    {
        this.ducked = ducked;
        this.apply();
    }

    /** Exposed to the test API. */
    get state () {
        return {
            playing: this.sound?.isPlaying ?? false,
            muted: this.muted,
            ducked: this.ducked,
            volume: this.volume
        };
    }

    private get volume (): number
    {
        if (this.muted) return 0;
        return this.ducked ? AUDIO.MUSIC.pausedVolume : AUDIO.MUSIC.volume;
    }

    private apply (): void
    {
        this.sound?.setVolume(this.volume);
    }
}

export const music = new Music();
