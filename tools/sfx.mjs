// Project-owned 8-bit sound effects. Run: `node tools/sfx.mjs` → WAV files in public/assets/own/sfx/.
// Each sound is a list of notes; a note is a tone (square / triangle / noise) with a pitch slide,
// a short attack and a decay. Noise uses a seeded generator, so regenerating gives identical files.
// No dependencies: a tiny WAV encoder lives at the bottom.
import { mkdirSync, writeFileSync } from 'node:fs';

const RATE = 22050;

// ── Synth ────────────────────────────────────────────────────────────────────────────────────
let seed = 1;
const noise = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x3fffffff - 1; };

/**
 * One note: `wave` at `from` Hz sliding to `to` Hz (exponentially) over `dur` s, starting at `at` s.
 * `vol` 0..1, `attack`/`decay` shape the envelope (decay = exponent of the fade; 1 = linear),
 * `duty` = square pulse width, `vibrato` = [Hz, depth as a pitch ratio].
 */
function note ({ wave = 'square', from, to = from, at = 0, dur, vol = 0.5, attack = 0.005, decay = 1, duty = 0.5, vibrato = null })
{
    return { wave, from, to, at, dur, vol, attack, decay, duty, vibrato };
}

function render (notes)
{
    const length = Math.ceil(Math.max(...notes.map(n => n.at + n.dur)) * RATE);
    const out = new Float32Array(length);
    for (const n of notes) {
        let phase = 0, held = 0;
        const start = Math.floor(n.at * RATE), count = Math.floor(n.dur * RATE);
        for (let i = 0; i < count; i++) {
            const t = i / count;
            let freq = n.from * Math.pow(n.to / n.from, t);
            if (n.vibrato) freq *= 1 + Math.sin(2 * Math.PI * n.vibrato[0] * i / RATE) * n.vibrato[1];
            const prev = phase;
            phase = (phase + freq / RATE) % 1;
            let s;
            if (n.wave === 'square') s = phase < n.duty ? 1 : -1;
            else if (n.wave === 'triangle') s = 1 - 4 * Math.abs(phase - 0.5);
            else {                                  // noise, resampled at the note's pitch
                if (phase < prev) held = noise();
                s = held;
            }
            const sec = i / RATE;
            const env = Math.min(1, sec / n.attack) * Math.pow(1 - t, n.decay);
            out[start + i] += s * env * n.vol;
        }
    }
    return out;
}

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

// ── WAV encoder (16-bit mono PCM) ───────────────────────────────────────────────────────────
function wav (samples)
{
    const peak = Math.max(1, ...samples.map(Math.abs));        // never clip
    const data = Buffer.alloc(samples.length * 2);
    samples.forEach((s, i) => data.writeInt16LE(Math.round(s / peak * 32767), i * 2));
    const head = Buffer.alloc(44);
    head.write('RIFF', 0); head.writeUInt32LE(36 + data.length, 4); head.write('WAVE', 8);
    head.write('fmt ', 12); head.writeUInt32LE(16, 16); head.writeUInt16LE(1, 20); head.writeUInt16LE(1, 22);
    head.writeUInt32LE(RATE, 24); head.writeUInt32LE(RATE * 2, 28); head.writeUInt16LE(2, 32); head.writeUInt16LE(16, 34);
    head.write('data', 36); head.writeUInt32LE(data.length, 40);
    return Buffer.concat([head, data]);
}

const OUT = 'public/assets/own/sfx';
mkdirSync(OUT, { recursive: true });
for (const [name, notes] of Object.entries(SFX)) {
    seed = 1;
    const file = `${OUT}/${name}.wav`;
    const bytes = wav(render(notes));
    writeFileSync(file, bytes);
    console.log(file, `${(bytes.length / 1024).toFixed(1)} KB`);
}
