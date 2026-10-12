// Pixel art drawn as text: one character per pixel, each standing for a colour in
// a palette, with "." for transparent. Sprites render as SVG made of 1x1
// squares (shape-rendering: crispEdges), so they stay sharp at any size.

/** A sprite: rows of equal length. */
export type Pixels = readonly string[];
export type Palette = Readonly<Record<string, string>>;

const CLEAR = ".";

/** Rows from a template string: one line per row, indentation and blank lines ignored. */
export function pixels(text: string): Pixels {
    return text.split("\n").map(line => line.trim()).filter(line => line.length > 0);
}

/** `top` drawn over `base`: wherever top isn't transparent, it wins. */
export function overlay(base: Pixels, top: Pixels): Pixels {
    return base.map((row, y) => {
        const over = top[y] ?? "";
        return [...row].map((pixel, x) => (over[x] && over[x] !== CLEAR ? over[x] : pixel)).join("");
    });
}

/** A one-pixel outline around everything: transparent pixels touching a filled one (not diagonally) become `ink`. */
export function outline(rows: Pixels, ink = "k"): Pixels {
    const filled = (x: number, y: number) => rows[y] !== undefined && rows[y][x] !== undefined && rows[y][x] !== CLEAR;

    return rows.map((row, y) => [...row].map((pixel, x) => {
        if (pixel !== CLEAR) return pixel;
        return filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1) ? ink : CLEAR;
    }).join(""));
}

/**
 * The second frame of an idle bob: everything above row `split` moves down a pixel,
 * landing over the top of that row (like a character bending its knees).
 */
export function bob(rows: Pixels, split: number): Pixels {
    const empty = CLEAR.repeat(rows[0].length);

    return rows.map((row, y) => {
        if (y === 0) return empty;
        if (y < split) return rows[y - 1];
        if (y === split) return overlay([row], [rows[y - 1]])[0];
        return row;
    });
}

/** Every row moved sideways by `dx` pixels, wrapping around (for tiles that scroll, like water). */
export function shift(rows: Pixels, dx: number): Pixels {
    return rows.map(row => {
        const n = ((dx % row.length) + row.length) % row.length;
        return row.slice(row.length - n) + row.slice(0, row.length - n);
    });
}

/** One SVG path per colour, made of horizontal runs of pixels. */
export function paths(rows: Pixels, palette: Palette): { color: string; d: string }[] {
    const byColor = new Map<string, string[]>();

    rows.forEach((row, y) => {
        let x = 0;
        while (x < row.length) {
            const key = row[x];
            let end = x + 1;
            while (end < row.length && row[end] === key) end++;

            if (key !== CLEAR) {
                const color = palette[key];
                if (color === undefined) throw new Error(`No colour for "${key}" in sprite`);
                if (!byColor.has(color)) byColor.set(color, []);
                byColor.get(color)!.push(`M${x} ${y}h${end - x}v1h${x - end}z`);
            }
            x = end;
        }
    });

    return [...byColor].map(([color, runs]) => ({ color, d: runs.join("") }));
}

/** The sprite as standalone SVG markup. */
export function svg(rows: Pixels, palette: Palette): string {
    const body = paths(rows, palette).map(({ color, d }) => `<path fill="${color}" d="${d}"/>`).join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${rows[0].length} ${rows.length}" shape-rendering="crispEdges">${body}</svg>`;
}

/** The sprite as a CSS url(), for background images. */
export function cssUrl(rows: Pixels, palette: Palette): string {
    const encoded = svg(rows, palette).replace(/"/g, "'").replace(/#/g, "%23").replace(/</g, "%3C").replace(/>/g, "%3E");
    return `url("data:image/svg+xml,${encoded}")`;
}

/** A colour made darker (amount below 1) or lighter (above 1). */
export function shade(hex: string, amount: number): string {
    const value = parseInt(hex.slice(1), 16);
    const channel = (shiftBy: number) => {
        const c = (value >> shiftBy) & 255;
        const out = amount < 1 ? c * amount : c + (255 - c) * (amount - 1);
        return Math.round(Math.max(0, Math.min(255, out)));
    };

    return `#${[16, 8, 0].map(s => channel(s).toString(16).padStart(2, "0")).join("")}`;
}

/** The outline colour used across the game's pixel art. */
export const INK = "#1b1a26";
