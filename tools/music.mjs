// Project-owned 8-bit music. Run: `node tools/music.mjs` → public/assets/own/music/forest.wav.
// A calm forest loop: 12 bars at 96 BPM (30 s) over Am–F–C–G. Bars 1–4 are bass + arpeggio only,
// bars 5–8 add the melody, bars 9–12 vary it and end on G, which leads back into the Am of bar 1.
// Rendered with `loop`, so notes ringing past the end wrap to the start: no click at the seam.
import { mkdirSync, writeFileSync } from 'node:fs';
import { note, render, wav } from './synth.mjs';

const BPM = 96;
const BEAT = 60 / BPM;
const BAR = 4 * BEAT;
const BARS = 12;
const hz = midi => 440 * Math.pow(2, (midi - 69) / 12);

// Chords as MIDI triads (root position, around middle C) plus the bass root.
const CHORDS = {
    Am: { triad: [57, 60, 64], bass: 45 },
    F: { triad: [53, 57, 60], bass: 41 },
    C: { triad: [60, 64, 67], bass: 48 },
    G: { triad: [55, 59, 62], bass: 43 }
};
const PROGRESSION = ['Am', 'F', 'C', 'G'];

// Melody: [midi, beats] per bar (0 = rest), A minor pentatonic.
const A4 = 69, B4 = 71, C5 = 72, D5 = 74, E5 = 76, G4 = 67, G5 = 79, A5 = 81;
const MELODY = {
    4: [[E5, 1], [D5, 0.5], [C5, 0.5], [A4, 2]],
    5: [[C5, 1], [D5, 1], [E5, 1.5], [C5, 0.5]],
    6: [[G5, 1.5], [E5, 0.5], [D5, 1], [C5, 1]],
    7: [[D5, 2], [B4, 1], [0, 1]],
    8: [[A5, 1], [G5, 0.5], [E5, 0.5], [D5, 1], [E5, 1]],
    9: [[C5, 1.5], [A4, 0.5], [C5, 1], [D5, 1]],
    10: [[E5, 1], [G5, 1], [E5, 1], [D5, 1]],
    11: [[D5, 1.5], [B4, 0.5], [G4, 2]]
};

const notes = [];
for (let bar = 0; bar < BARS; bar++) {
    const t0 = bar * BAR;
    const { triad, bass } = CHORDS[PROGRESSION[bar % PROGRESSION.length]];

    // Bass: root, then the fifth, soft triangle half notes.
    notes.push(note({ wave: 'triangle', from: hz(bass), at: t0, dur: 1.9 * BEAT, vol: 0.55, decay: 0.6 }));
    notes.push(note({ wave: 'triangle', from: hz(bass + 7), at: t0 + 2 * BEAT, dur: 1.9 * BEAT, vol: 0.45, decay: 0.6 }));

    // Arpeggio: eighth notes through the chord, thin pulse, quick decay.
    const pattern = [0, 1, 2, 3, 2, 1, 2, 1];
    pattern.forEach((p, i) => {
        const midi = p === 3 ? triad[0] + 12 : triad[p];
        notes.push(note({ from: hz(midi), at: t0 + i * BEAT / 2, dur: 0.45 * BEAT, vol: 0.1, duty: 0.125, decay: 2 }));
    });

    // Light shaker on beats 2 and 4.
    for (const beat of [1, 3]) {
        notes.push(note({ wave: 'noise', from: 7000, at: t0 + beat * BEAT, dur: 0.06, vol: 0.05, decay: 3 }));
    }

    // Melody.
    let at = t0;
    for (const [midi, beats] of MELODY[bar] ?? []) {
        if (midi) notes.push(note({ from: hz(midi), at, dur: beats * BEAT * 0.95, vol: 0.17, duty: 0.25, decay: 0.7, attack: 0.02, vibrato: [5, 0.006] }));
        at += beats * BEAT;
    }
}

const OUT = 'public/assets/own/music';
mkdirSync(OUT, { recursive: true });
const file = `${OUT}/forest.wav`;
const bytes = wav(render(notes, { length: BARS * BAR, loop: true }));
writeFileSync(file, bytes);
console.log(file, `${(bytes.length / 1024).toFixed(0)} KB, ${(BARS * BAR).toFixed(1)} s`);
