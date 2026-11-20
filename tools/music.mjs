// Project-owned 8-bit music. Run: `node tools/music.mjs` → public/assets/own/music/forest.wav and cave.wav.
// Forest: a calm loop, 12 bars at 96 BPM (30 s) over Am–F–C–G. Bars 1–4 are bass + arpeggio only,
// bars 5–8 add the melody, bars 9–12 vary it and end on G, which leads back into the Am of bar 1.
// Cave: slower and darker (see caveTrack below).
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
for (let bar = 0; bar < BARS; bar++) {      // the forest loop
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

/**
 * The cave: 8 bars at 66 BPM (~29 s) in D minor, Dm–Bb–Gm–A. A low triangle drone holds each chord, a slow plucked
 * line answers itself with an echo (two quieter repeats a dotted eighth apart, like a voice off the cave walls),
 * water drips now and then, and a soft rumble swells under the A chord that leads back to Dm.
 */
function caveTrack ()
{
    const bpm = 66, beat = 60 / bpm, bar = 4 * beat, bars = 8;
    const chords = [{ root: 50, third: 53, fifth: 57 }, { root: 46, third: 50, fifth: 53 }, { root: 43, third: 46, fifth: 50 }, { root: 45, third: 49, fifth: 52 }];
    // Melody per bar: [midi, beats] (0 = rest); D natural minor, sparse.
    const line = {
        0: [[0, 1], [69, 1.5], [65, 0.5], [0, 1]],
        1: [[70, 1], [0, 1], [69, 1], [65, 1]],
        2: [[67, 2], [0, 0.5], [70, 0.5], [69, 1]],
        3: [[64, 1.5], [0, 2.5]],
        4: [[0, 1], [74, 1.5], [72, 0.5], [70, 1]],
        5: [[69, 2], [65, 1], [0, 1]],
        6: [[67, 1], [70, 1], [74, 1], [72, 1]],
        7: [[73, 2], [0, 2]]
    };
    const echoes = [[0.75 * beat, 0.45], [1.5 * beat, 0.2]];
    const out = [];
    for (let b = 0; b < bars; b++) {
        const t0 = b * bar, c = chords[b % chords.length];
        // Drone: root an octave down, held through the bar, plus a quiet fifth.
        out.push(note({ wave: 'triangle', from: hz(c.root - 12), at: t0, dur: bar * 0.98, vol: 0.5, attack: 0.3, decay: 0.3 }));
        out.push(note({ wave: 'triangle', from: hz(c.fifth - 12), at: t0 + beat, dur: bar * 0.7, vol: 0.22, attack: 0.4, decay: 0.5 }));
        // A slow broken chord, very soft.
        [c.root, c.third, c.fifth, c.third].forEach((m, i) =>
            out.push(note({ wave: 'triangle', from: hz(m + 12), at: t0 + i * beat, dur: beat * 0.9, vol: 0.12, decay: 1.5 })));
        // The plucked line and its echoes.
        let at = t0;
        for (const [midi, beats] of line[b]) {
            if (midi) {
                const pluck = { from: hz(midi), dur: Math.min(beats, 1.5) * beat, duty: 0.25, decay: 1.4, attack: 0.01, vibrato: [4, 0.004] };
                out.push(note({ ...pluck, at, vol: 0.16 }));
                for (const [delay, gain] of echoes) out.push(note({ ...pluck, at: at + delay, vol: 0.16 * gain }));
            }
            at += beats * beat;
        }
        // Water drips: a high blip that falls in pitch, at uneven places.
        const drips = [[[0.6, 96], [2.9, 91]], [[1.7, 93]], [[0.3, 98], [3.4, 94]], [[2.2, 95]]][b % 4];     // [beat, midi]
        for (const [when, midi] of drips) {
            out.push(note({ wave: 'triangle', from: hz(midi), to: hz(midi - 7), at: t0 + when * beat, dur: 0.07, vol: 0.16, decay: 2 }));
        }
        // Rumble under the A chord (the turn back to Dm).
        if (b % 4 === 3) out.push(note({ wave: 'noise', from: 120, to: 80, at: t0, dur: bar, vol: 0.12, attack: 1.2, decay: 1.2 }));
    }
    return { notes: out, length: bars * bar };
}

const OUT = 'public/assets/own/music';
mkdirSync(OUT, { recursive: true });
for (const [name, track] of [['forest', { notes, length: BARS * BAR }], ['cave', caveTrack()]]) {
    const file = `${OUT}/${name}.wav`;
    const bytes = wav(render(track.notes, { length: track.length, loop: true }));
    writeFileSync(file, bytes);
    console.log(file, `${(bytes.length / 1024).toFixed(0)} KB, ${track.length.toFixed(1)} s`);
}
