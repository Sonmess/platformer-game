import Phaser from 'phaser';
import { AUDIO, type MusicTrack } from '../config/constants';
import type { InputSnapshot } from './Input';

type LoopSound = Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound;

/**
 * The background loop. It lives in the game-wide sound manager, so scene switches never restart
 * or duplicate it: every scene that wants music just calls `music.start(this, track)`. A different track crossfades
 * (the old one fades out while the new one fades in), driven by the game loop, so it carries on across scene switches.
 * Mute (M) affects the music only and lasts for the session; the pause overlay ducks it.
 */
class Music
{
    muted = false;
    ducked = false;
    private sound: LoopSound | null = null;
    private track: MusicTrack = AUDIO.MUSIC;
    /** 0..1: how far the current track has faded in. */
    private fadeIn = 1;
    /** Tracks fading out: the sound, its track, and how far it has faded (0..1). */
    private outgoing: { sound: LoopSound; track: MusicTrack; t: number }[] = [];
    private hooked: Phaser.Game | null = null;

    start (scene: Phaser.Scene, track: MusicTrack = AUDIO.MUSIC): void
    {
        this.hook(scene.game);
        if (this.sound && this.sound.key !== track.key) {
            if (this.sound.isPlaying) this.outgoing.push({ sound: this.sound, track: this.track, t: 0 });
            this.fadeIn = 0;
        }
        // Coming back to a track that is still fading out: it simply becomes the current one again.
        this.outgoing = this.outgoing.filter(o => o.track.key !== track.key);
        this.track = track;
        this.sound = (scene.sound.get(track.key) ?? scene.sound.add(track.key, { loop: true })) as LoopSound;
        if (!this.sound.isPlaying) this.sound.play();
        this.apply();
    }

    /** Silence (the "game over" jingle plays alone); the next `start()` begins the loop again. */
    stop (): void
    {
        this.sound?.stop();
        for (const o of this.outgoing) o.sound.stop();
        this.outgoing = [];
        this.fadeIn = 1;
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
            volume: this.volume(this.track) * this.fadeIn,
            track: this.track.key,
            fading: this.outgoing.length > 0 || this.fadeIn < 1
        };
    }

    /** The full volume of a track, before fading. */
    private volume (track: MusicTrack): number
    {
        if (this.muted) return 0;
        return this.ducked ? track.pausedVolume : track.volume;
    }

    private apply (): void
    {
        this.sound?.setVolume(this.volume(this.track) * this.fadeIn);
        for (const o of this.outgoing) o.sound.setVolume(this.volume(o.track) * (1 - o.t));
    }

    /** The crossfade runs on the game loop (not a scene clock): scenes start and stop while it plays. */
    private hook (game: Phaser.Game): void
    {
        if (this.hooked === game) return;
        this.hooked = game;
        game.events.on(Phaser.Core.Events.STEP, (_time: number, delta: number) => this.step(delta));
    }

    private step (deltaMs: number): void
    {
        if (this.fadeIn >= 1 && this.outgoing.length === 0) return;
        const k = deltaMs / AUDIO.MUSIC_FADE_MS;
        this.fadeIn = Math.min(1, this.fadeIn + k);
        for (const o of this.outgoing) {
            o.t = Math.min(1, o.t + k);
            if (o.t >= 1) o.sound.stop();
        }
        this.outgoing = this.outgoing.filter(o => o.t < 1);
        this.apply();
    }
}

export const music = new Music();
