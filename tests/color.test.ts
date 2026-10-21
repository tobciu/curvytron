import { describe, expect, it } from 'vitest';
import { hsbToHex, hsbToRgb, parseColor, rgbToHsb } from '../src/client/colorpicker/color';

describe('color picker maths', () => {
    it('parses hex colors', () => {
        expect(hsbToHex(parseColor('#ff0000')!)).toBe('#ff0000');
        expect(hsbToHex(parseColor('#00ff00')!)).toBe('#00ff00');
        expect(hsbToHex(parseColor('#336699')!)).toBe('#336699');
        expect(hsbToHex(parseColor('#fff')!)).toBe('#ffffff');
        expect(hsbToHex(parseColor('#ABCDEF')!)).toBe('#abcdef');
    });

    it('parses rgb() colors', () => {
        expect(hsbToHex(parseColor('rgb(10, 200, 30)')!)).toBe('#0ac81e');
        expect(hsbToHex(parseColor('rgb(100%, 0%, 0%)')!)).toBe('#ff0000');
    });

    it('rejects unknown colors', () => {
        expect(parseColor('banana')).toBeNull();
        expect(parseColor('')).toBeNull();
        expect(parseColor(null)).toBeNull();
    });

    it('converts between rgb and hsb', () => {
        const hsb = rgbToHsb({ r: 0, g: 0, b: 255 });

        expect(hsb.h).toBeCloseTo(2 / 3);
        expect(hsb.s).toBe(1);
        expect(hsb.b).toBe(1);
        expect(hsbToRgb(hsb)).toEqual({ r: 0, g: 0, b: 255 });
    });

    it('round trips every primary and secondary color', () => {
        for (const hex of ['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#808080', '#000000']) {
            expect(hsbToHex(parseColor(hex)!)).toBe(hex);
        }
    });
});
