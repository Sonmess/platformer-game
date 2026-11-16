// Project-owned 8-bit sound effects. Run: `node tools/sfx.mjs` → WAV files in public/assets/own/sfx/.
// Each sound is a list of notes (see tools/synth.mjs): a tone (square / triangle / noise) with a
// pitch slide, a short attack and a decay.
import { mkdirSync, writeFileSync } from 'node:fs';
import { note, render, wav } from './synth.mjs';

// ── Sounds ───────────────────────────────────────────────────────────────────────────────────
// Musical pitches (Hz) for the jingles.
const C5 = 523.25, E5 = 659.25, G5 = 783.99, B5 = 987.77, C6 = 1046.5, E6 = 1318.5, G6 = 1568;

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
    // Falling wobble.
    die: [
        note({ from: 520, to: 90, dur: 0.45, vol: 0.32, duty: 0.5, decay: 0.8, vibrato: [18, 0.06] }),
        note({ wave: 'noise', from: 900, to: 200, dur: 0.18, vol: 0.25, decay: 2 })
    ],
    // Short fanfare: arpeggio, then a held chord.
    goal: [
        ...[C5, E5, G5].map((f, i) => note({ from: f, at: i * 0.1, dur: 0.12, vol: 0.22, duty: 0.25 })),
        note({ from: C6, at: 0.3, dur: 0.7, vol: 0.22, duty: 0.25, decay: 1.3, vibrato: [6, 0.008] }),
        note({ wave: 'triangle', from: E6 / 2, at: 0.3, dur: 0.7, vol: 0.35, decay: 1.3 }),
        note({ wave: 'triangle', from: G6 / 4, at: 0.3, dur: 0.7, vol: 0.35, decay: 1.3 })
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
