// Tiny 8-bit synth shared by tools/sfx.mjs and tools/music.mjs: square / triangle / noise notes with a
// pitch slide and an envelope, rendered to 16-bit mono WAV. Noise uses a seeded generator, so
// regenerating gives identical files. No dependencies.

export const RATE = 22050;

let seed = 1;
const noise = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x3fffffff - 1; };

/**
 * One note: `wave` at `from` Hz sliding to `to` Hz (exponentially) over `dur` s, starting at `at` s.
 * `vol` 0..1, `attack`/`decay` shape the envelope (decay = exponent of the fade; 1 = linear,
 * 0 = no fade), `duty` = square pulse width, `vibrato` = [Hz, depth as a pitch ratio].
 */
export function note ({ wave = 'square', from, to = from, at = 0, dur, vol = 0.5, attack = 0.005, decay = 1, duty = 0.5, vibrato = null })
{
    return { wave, from, to, at, dur, vol, attack, decay, duty, vibrato };
}

/**
 * Mixes notes into samples. `length` (s) fixes the output length; with `loop`, whatever rings past
 * the end wraps around to the start, so the file loops without a click or a cut-off tail.
 */
export function render (notes, { length = null, loop = false } = {})
{
    seed = 1;
    const end = Math.max(...notes.map(n => n.at + n.dur));
    const total = Math.ceil((length ?? end) * RATE);
    const out = new Float32Array(total);
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
            // A short release on every note avoids clicks when a non-decaying note stops.
            const release = Math.min(1, (count - i) / (0.004 * RATE));
            const env = Math.min(1, sec / n.attack) * Math.pow(1 - t, n.decay) * release;
            const k = start + i;
            if (k < total) out[k] += s * env * n.vol;
            else if (loop) out[k % total] += s * env * n.vol;
        }
    }
    return out;
}

/** 16-bit mono PCM, normalised to just below full scale (never clips). */
export function wav (samples)
{
    let peak = 1;
    for (const s of samples) peak = Math.max(peak, Math.abs(s));
    const data = Buffer.alloc(samples.length * 2);
    samples.forEach((s, i) => data.writeInt16LE(Math.round(s / peak * 32767), i * 2));
    const head = Buffer.alloc(44);
    head.write('RIFF', 0); head.writeUInt32LE(36 + data.length, 4); head.write('WAVE', 8);
    head.write('fmt ', 12); head.writeUInt32LE(16, 16); head.writeUInt16LE(1, 20); head.writeUInt16LE(1, 22);
    head.writeUInt32LE(RATE, 24); head.writeUInt32LE(RATE * 2, 28); head.writeUInt16LE(2, 32); head.writeUInt16LE(16, 34);
    head.write('data', 36); head.writeUInt32LE(data.length, 40);
    return Buffer.concat([head, data]);
}
