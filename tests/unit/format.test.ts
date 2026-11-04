import { describe, expect, it } from 'vitest';
import { formatTime } from '../../src/core/format';

describe('formatTime', () => {
    it('formats minutes, seconds and tenths', () => {
        expect(formatTime(83450)).toBe('1:23.4');
    });

    it('pads seconds and starts at zero', () => {
        expect(formatTime(0)).toBe('0:00.0');
        expect(formatTime(5099)).toBe('0:05.0');
    });

    it('truncates instead of rounding up', () => {
        expect(formatTime(59999)).toBe('0:59.9');
    });
});
