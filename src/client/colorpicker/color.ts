/** Hue, saturation, brightness and alpha, all between 0 and 1. */
export interface HSB {
    h: number;
    s: number;
    b: number;
    a: number;
}

export interface RGB {
    r: number;
    g: number;
    b: number;
}

type Parser = [RegExp, (match: RegExpExecArray) => [number, number, number]];

const parsers: Parser[] = [
    [
        /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(\d+(?:\.\d+)?)\s*)?\)/,
        (m) => [Number(m[1]), Number(m[2]), Number(m[3])]
    ],
    [
        /rgba?\(\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\s*(?:,\s*(\d+(?:\.\d+)?)\s*)?\)/,
        (m) => [2.55 * Number(m[1]), 2.55 * Number(m[2]), 2.55 * Number(m[3])]
    ],
    [/#([a-f0-9]{2})([a-f0-9]{2})([a-f0-9]{2})/i, (m) => [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)]],
    [
        /#([a-f0-9])([a-f0-9])([a-f0-9])/i,
        (m) => [parseInt(m[1] + m[1], 16), parseInt(m[2] + m[2], 16), parseInt(m[3] + m[3], 16)]
    ]
];

export function rgbToHsb({ r, g, b }: RGB): HSB {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const chroma = max - Math.min(r, g, b);
    let hue: number | null;

    if (chroma === 0) {
        hue = null;
    } else if (max === r) {
        hue = (g - b) / chroma;
    } else if (max === g) {
        hue = (b - r) / chroma + 2;
    } else {
        hue = (r - g) / chroma + 4;
    }

    hue = ((((hue ?? 0) + 360) % 6) * 60) / 360;

    return { h: hue || 1, s: chroma === 0 ? 0 : chroma / max, b: max, a: 1 };
}

export function hsbToRgb({ h, s, b }: Pick<HSB, 'h' | 's' | 'b'>): RGB {
    const sector = ((h * 360) % 360) / 60;
    const chroma = b * s;
    const x = chroma * (1 - Math.abs((sector % 2) - 1));
    const index = Math.trunc(sector);
    const base = b - chroma;

    const r = base + [chroma, x, 0, 0, x, chroma][index];
    const g = base + [x, chroma, chroma, x, 0, 0][index];
    const blue = base + [0, 0, x, chroma, chroma, x][index];

    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(blue * 255) };
}

export function hsbToHex(hsb: Pick<HSB, 'h' | 's' | 'b'>): string {
    const { r, g, b } = hsbToRgb(hsb);

    return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** Parse `#rgb`, `#rrggbb`, `rgb(r, g, b)` or `rgb(r%, g%, b%)`. Returns null when unknown. */
export function parseColor(value: string | null | undefined): HSB | null {
    const text = (value ?? '').toLowerCase();

    for (const [pattern, parse] of parsers) {
        const match = pattern.exec(text);

        if (match) {
            const [r, g, b] = parse(match);

            return rgbToHsb({ r, g, b });
        }
    }

    return null;
}
