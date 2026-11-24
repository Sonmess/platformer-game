// Project-owned 8-bit sound effects. Run: `node tools/sfx.mjs` → WAV files in public/assets/own/sfx/.
// Each sound is a list of notes (see tools/synth.mjs): a tone (square / triangle / noise) with a
// pitch slide, a short attack and a decay.
import { mkdirSync, writeFileSync } from 'node:fs';
import { note, render, wav } from './synth.mjs';

// ── Sounds ───────────────────────────────────────────────────────────────────────────────────
// Musical pitches (Hz) for the jingles.
const C5 = 523.25, E5 = 659.25, G5 = 783.99, B5 = 987.77, C6 = 1046.5, E6 = 1318.5, G6 = 1568;
const E4 = 329.63, F4 = 349.23, A4 = 440;

/**
 * A note sung like the cat's meow (see `meow`): the pitch scoops up from below into a little peak ("mň-"), then settles
 * down onto the note ("-au") with a wobble, doubled an octave lower by a triangle for body. `long` = a held "mňaaau".
 */
function meowNote (f, at, dur, vol, long = false)
{
    const rise = Math.min(0.08, dur * 0.35);
    const wobble = long ? [6, 0.02] : [9, 0.015];
    return [
        note({ from: f * 0.82, to: f * 1.07, at, dur: rise, vol, duty: 0.35, attack: 0.015, decay: 0, vibrato: [9, 0.01] }),
        note({ from: f * 1.07, to: f * 0.97, at: at + rise, dur: dur - rise, vol, duty: 0.35, decay: long ? 1.2 : 0.9, vibrato: wobble }),
        note({ wave: 'triangle', from: f * 0.41, to: f * 0.535, at, dur: rise, vol: vol * 0.8, attack: 0.015, decay: 0 }),
        note({ wave: 'triangle', from: f * 0.535, to: f * 0.485, at: at + rise, dur: dur - rise, vol: vol * 0.8, decay: long ? 1.2 : 0.9 })
    ];
}

const SFX = {
    // Quick upward chirp.
    jump: [note({ from: 260, to: 620, dur: 0.14, vol: 0.32, duty: 0.25, decay: 1.5 })],
    // Soft thud: low noise with a falling pitch.
    land: [note({ wave: 'noise', from: 1800, to: 400, dur: 0.09, vol: 0.45, decay: 2 })],
    // Classic two-note pickup.
    coin: [
        note({ from: B5, dur: 0.06, vol: 0.28, duty: 0.5 }),
        note({ from: E6, at: 0.06, dur: 0.22, vol: 0.28, duty: 0.5, decay: 1.6 })
    ],
    // Rising arpeggio plus a crackle of fire.
    checkpoint: [
        ...[C5, E5, G5, C6].map((f, i) => note({ wave: 'triangle', from: f, at: i * 0.07, dur: 0.16, vol: 0.5, decay: 1.2 })),
        note({ wave: 'noise', from: 5000, to: 2500, at: 0.05, dur: 0.35, vol: 0.12, decay: 2.5 })
    ],
    // The cat gets hurt: a short angry hiss ("pšš"), then a sad, falling meow ("mňaaau") that trails off.
    die: [
        note({ wave: 'noise', from: 9000, to: 6000, dur: 0.16, vol: 0.35, attack: 0.01, decay: 1.5 }),
        note({ from: 560, to: 720, at: 0.2, dur: 0.1, vol: 0.28, duty: 0.35, attack: 0.02, decay: 0, vibrato: [7, 0.02] }),
        note({ from: 720, to: 300, at: 0.3, dur: 0.55, vol: 0.28, duty: 0.35, decay: 1.3, vibrato: [6, 0.035] }),
        note({ wave: 'triangle', from: 280, to: 360, at: 0.2, dur: 0.1, vol: 0.22, attack: 0.02, decay: 0 }),
        note({ wave: 'triangle', from: 360, to: 150, at: 0.3, dur: 0.55, vol: 0.22, decay: 1.3 })
    ],
    // "Mňau": pitch rises ("mň-") then falls ("-au"), with a wobbly vibrato; a triangle an octave
    // below gives it body.
    meow: [
        note({ from: 520, to: 880, dur: 0.12, vol: 0.3, duty: 0.35, attack: 0.02, decay: 0, vibrato: [9, 0.02] }),
        note({ from: 880, to: 480, at: 0.12, dur: 0.3, vol: 0.3, duty: 0.35, decay: 1.2, vibrato: [9, 0.025] }),
        note({ wave: 'triangle', from: 260, to: 440, dur: 0.12, vol: 0.25, attack: 0.02, decay: 0 }),
        note({ wave: 'triangle', from: 440, to: 240, at: 0.12, dur: 0.3, vol: 0.25, decay: 1.2 })
    ],
    // An enemy gets scared: a startled squeak that drops, with a short rustle.
    scare: [
        note({ from: 1500, to: 1900, dur: 0.05, vol: 0.25, duty: 0.25, decay: 0 }),
        note({ from: 1900, to: 700, at: 0.05, dur: 0.16, vol: 0.25, duty: 0.25, decay: 1.5 }),
        note({ wave: 'noise', from: 3000, to: 1500, dur: 0.12, vol: 0.15, decay: 2 })
    ],
    // Claw swipe: a fast airy "fsst" sweeping down, with a tiny scratch at the end.
    claw: [
        note({ wave: 'noise', from: 7000, to: 2500, dur: 0.09, vol: 0.35, attack: 0.005, decay: 2 }),
        note({ wave: 'noise', from: 9000, to: 6000, at: 0.07, dur: 0.03, vol: 0.2, decay: 3 })
    ],
    // A clawed enemy runs off: a yelp, then quick pattering steps fading away.
    // A snake puffs up its hood: a rising, rattling hiss ("ssSSS") as a warning.
    hiss: [
        note({ wave: 'noise', from: 4000, to: 8000, dur: 0.45, vol: 0.3, attack: 0.15, decay: 0.8, vibrato: [18, 0.08] })
    ],
    // The snake sprays poison: a wet burst ("pššš") with a low gurgle under it.
    spray: [
        note({ wave: 'noise', from: 6000, to: 2000, dur: 0.4, vol: 0.4, attack: 0.01, decay: 1.6 }),
        note({ wave: 'triangle', from: 180, to: 90, dur: 0.25, vol: 0.3, decay: 1.5, vibrato: [24, 0.1] })
    ],
    flee: [
        note({ from: 1200, to: 1700, dur: 0.05, vol: 0.25, duty: 0.25, decay: 0 }),
        note({ from: 1700, to: 900, at: 0.05, dur: 0.1, vol: 0.25, duty: 0.25, decay: 1.5 }),
        ...[0, 1, 2, 3].map(i => note({ wave: 'noise', from: 2500, to: 1500, at: 0.17 + i * 0.07, dur: 0.03, vol: 0.2 * (1 - i * 0.2), decay: 3 }))
    ],
    // The cat grabs a vine or trunk: a quick double scratch of claws on bark, with a soft thump of the body.
    grab: [
        note({ wave: 'noise', from: 5000, to: 2500, dur: 0.04, vol: 0.35, decay: 2.5 }),
        note({ wave: 'noise', from: 6000, to: 3000, at: 0.05, dur: 0.05, vol: 0.3, decay: 2.5 }),
        note({ wave: 'triangle', from: 200, to: 120, dur: 0.06, vol: 0.3, decay: 2 })
    ],
    // One climbing step: a tiny, dry scratch (plays often, so it stays short and quiet).
    climb: [
        note({ wave: 'noise', from: 4500, to: 3000, dur: 0.035, vol: 0.3, decay: 3 })
    ],
    // A stalactite comes loose: a low grinding rumble with a crack in it (the warning before it falls).
    rumble: [
        note({ wave: 'noise', from: 400, to: 250, dur: 0.45, vol: 0.4, attack: 0.05, decay: 0.8, vibrato: [22, 0.15] }),
        note({ wave: 'noise', from: 5000, to: 2500, at: 0.18, dur: 0.05, vol: 0.3, decay: 3 })
    ],
    // ...and shatters on the floor: a bright smash, then pieces tinkling and a thud.
    shatter: [
        note({ wave: 'noise', from: 7000, to: 1500, dur: 0.2, vol: 0.45, decay: 1.8 }),
        note({ wave: 'triangle', from: 160, to: 70, dur: 0.18, vol: 0.4, decay: 1.5 }),
        ...[0, 1, 2].map(i => note({ wave: 'noise', from: 9000 - i * 1200, to: 6000, at: 0.08 + i * 0.06, dur: 0.03, vol: 0.18 - i * 0.04, decay: 3 }))
    ],
    // A secret found: the hidden wall turns see-through — a soft, mysterious rising run on a triangle.
    secret: [
        ...[C5, E5 * 1.06, G5, B5].map((f, i) => note({ wave: 'triangle', from: f, at: i * 0.09, dur: 0.22, vol: 0.4, decay: 1.2, vibrato: [6, 0.01] }))
    ],
    // The golden fish: a bright, sparkling little fanfare.
    treasure: [
        ...[E5, G5, C6, E6, G6].map((f, i) => note({ from: f, at: i * 0.07, dur: 0.12, vol: 0.2, duty: 0.25, decay: 0.6 })),
        note({ wave: 'triangle', from: C6, at: 0.35, dur: 0.5, vol: 0.35, decay: 1.3, vibrato: [7, 0.01] }),
        note({ wave: 'noise', from: 9000, to: 7000, at: 0.35, dur: 0.3, vol: 0.06, decay: 2 })
    ],
    // A bat wakes and dives: two shrill squeaks, then the whoosh of its wings.
    bat: [
        note({ from: 2800, to: 3600, dur: 0.05, vol: 0.2, duty: 0.25, decay: 1 }),
        note({ from: 3000, to: 3900, at: 0.08, dur: 0.05, vol: 0.18, duty: 0.25, decay: 1 }),
        note({ wave: 'noise', from: 2200, to: 700, at: 0.14, dur: 0.32, vol: 0.18, attack: 0.05, decay: 1.4 })
    ],
    // A crumbling platform starts to give: two dry cracks.
    crack: [
        note({ wave: 'noise', from: 6000, to: 3000, dur: 0.04, vol: 0.4, decay: 3 }),
        note({ wave: 'noise', from: 5000, to: 2500, at: 0.09, dur: 0.05, vol: 0.35, decay: 3 }),
        note({ wave: 'square', from: 220, to: 160, at: 0.09, dur: 0.05, vol: 0.12, duty: 0.25, decay: 2 })
    ],
    // ...and gives way: a falling rumble of pieces.
    crumble: [
        note({ wave: 'noise', from: 1400, to: 300, dur: 0.35, vol: 0.45, decay: 1.5 }),
        note({ wave: 'noise', from: 4000, to: 1500, at: 0.04, dur: 0.12, vol: 0.2, decay: 2.5 }),
        note({ wave: 'triangle', from: 140, to: 70, dur: 0.3, vol: 0.35, decay: 1.5 })
    ],
    // Yarn picked up: the cat puffs up — a wobbly rising slide in three steps, like inflating.
    grow: [
        ...[0, 1, 2].map(i => note({ from: 300 * Math.pow(1.35, i), to: 420 * Math.pow(1.35, i), at: i * 0.09, dur: 0.09, vol: 0.26, duty: 0.25, decay: 0.3 })),
        note({ wave: 'triangle', from: 880, to: 1320, at: 0.27, dur: 0.18, vol: 0.3, decay: 1.2, vibrato: [14, 0.02] })
    ],
    // Hurt while big: the fluff goes — a falling "pfff" slide with a puff of noise.
    shrink: [
        note({ from: 700, to: 220, dur: 0.3, vol: 0.26, duty: 0.25, decay: 1, vibrato: [18, 0.04] }),
        note({ wave: 'noise', from: 3000, to: 900, dur: 0.22, vol: 0.2, decay: 2 })
    ],
    // A life won back: a quick, bright rising run that ends on a held high note.
    life: [
        ...[C5, E5, G5, C6, E6].map((f, i) => note({ from: f, at: i * 0.06, dur: 0.08, vol: 0.22, duty: 0.25, decay: 0.5 })),
        note({ from: G6, at: 0.3, dur: 0.35, vol: 0.2, duty: 0.25, decay: 1.2, vibrato: [8, 0.01] }),
        note({ wave: 'triangle', from: C6, at: 0.3, dur: 0.35, vol: 0.3, decay: 1.2 })
    ],
    // Game over: a slow, falling minor line that settles low.
    gameover: [
        ...[E5, C5, A4, F4].map((f, i) => note({ from: f, at: i * 0.22, dur: 0.24, vol: 0.22, duty: 0.25, decay: 0.8 })),
        note({ wave: 'triangle', from: E4 / 2, to: E4 / 2 * 0.97, at: 0.88, dur: 0.9, vol: 0.4, decay: 1.4, vibrato: [5, 0.01] }),
        note({ from: E4, at: 0.88, dur: 0.9, vol: 0.14, duty: 0.25, decay: 1.4, vibrato: [5, 0.01] })
    ],
    // The level is done: the same little fanfare as before (C–E–G, then a held high C over a chord), but every note is
    // sung as a happy meow — three quick "mňau"s up the arpeggio and a long, wobbly "mňaaau" on top.
    goal: [
        ...[C5, E5, G5].flatMap((f, i) => meowNote(f, i * 0.15, 0.16, 0.24)),
        ...meowNote(C6, 0.45, 0.75, 0.24, true),
        note({ wave: 'triangle', from: E6 / 2, at: 0.5, dur: 0.7, vol: 0.3, attack: 0.05, decay: 1.3 }),
        note({ wave: 'triangle', from: G6 / 4, at: 0.5, dur: 0.7, vol: 0.3, attack: 0.05, decay: 1.3 })
    ]
};

const OUT = 'public/assets/own/sfx';
mkdirSync(OUT, { recursive: true });
for (const [name, notes] of Object.entries(SFX)) {
    const file = `${OUT}/${name}.wav`;
    const bytes = wav(render(notes));
    writeFileSync(file, bytes);
    console.log(file, `${(bytes.length / 1024).toFixed(1)} KB`);
}
