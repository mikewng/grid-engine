import { GLYPH_HEIGHT, textPixels } from "./bitmapfont";

// Drawing pixel art on a canvas at the art's own resolution. Shapes drawn with
// ordinary canvas paths come out soft-edged, so a layer is "crisped" afterwards:
// every pixel becomes fully opaque or fully clear, takes the nearest colour from a
// small palette, and the silhouette gets a one-pixel outline. Scaled up with
// image-rendering: pixelated, the result reads as hand-placed pixels.

export type RGB = readonly [number, number, number];

export function rgb(hex: string): RGB {
    const value = parseInt(hex.slice(1), 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

export interface CrispOptions {
    /** Colours to snap to. Without one, colours are left as drawn. */
    palette?: readonly RGB[];
    /** A one-pixel outline around the silhouette. */
    outline?: RGB;
    /** Everything inside the outline turns white (a hit flash). */
    white?: boolean;
}

/** Pixels at least this opaque are kept; the rest are cleared. */
const ALPHA_CUTOFF = 110;

function nearest(palette: readonly RGB[], r: number, g: number, b: number): RGB {
    let best = palette[0];
    let bestDistance = Infinity;

    for (const color of palette) {
        const dr = color[0] - r;
        const dg = color[1] - g;
        const db = color[2] - b;
        const distance = dr * dr * 2 + dg * dg * 3 + db * db;
        if (distance < bestDistance) {
            bestDistance = distance;
            best = color;
        }
    }

    return best;
}

/** Snap a layer to hard pixels: opaque or clear, palette colours, optional outline. */
export function crisp(ctx: CanvasRenderingContext2D, width: number, height: number, options: CrispOptions = {}) {
    const image = ctx.getImageData(0, 0, width, height);
    const data = image.data;
    const solid = new Uint8Array(width * height);
    let any = false;

    for (let p = 0, i = 0; p < solid.length; p++, i += 4) {
        if (data[i + 3] < ALPHA_CUTOFF) {
            data[i + 3] = 0;
            continue;
        }

        solid[p] = 1;
        any = true;
        data[i + 3] = 255;

        if (options.white) {
            data[i] = data[i + 1] = data[i + 2] = 255;
        } else if (options.palette) {
            const color = nearest(options.palette, data[i], data[i + 1], data[i + 2]);
            data[i] = color[0];
            data[i + 1] = color[1];
            data[i + 2] = color[2];
        }
    }

    if (!any) return;

    if (options.outline) {
        const [r, g, b] = options.outline;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const p = y * width + x;
                if (solid[p]) continue;

                const touches = (x > 0 && solid[p - 1]) || (x < width - 1 && solid[p + 1]) || (y > 0 && solid[p - width]) || (y < height - 1 && solid[p + width]);
                if (!touches) continue;

                const i = p * 4;
                data[i] = r;
                data[i + 1] = g;
                data[i + 2] = b;
                data[i + 3] = 255;
            }
        }
    }

    ctx.putImageData(image, 0, 0);
}

/** A filled ellipse made of whole-pixel rows. */
export function fillEllipse(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number) {
    const top = Math.round(cy - ry);
    const bottom = Math.round(cy + ry);

    for (let y = top; y <= bottom; y++) {
        const t = (y + 0.5 - cy) / ry;
        if (Math.abs(t) > 1) continue;
        const half = Math.round(rx * Math.sqrt(1 - t * t));
        if (half > 0) ctx.fillRect(Math.round(cx) - half, y, half * 2, 1);
    }
}

/** A shape filled with whole-pixel rows, given its left and right edges at each row. */
export function fillRows(ctx: CanvasRenderingContext2D, top: number, bottom: number, edges: (y: number) => [number, number]) {
    for (let y = Math.round(top); y < Math.round(bottom); y++) {
        const [left, right] = edges(y);
        const l = Math.round(left);
        const r = Math.round(right);
        if (r > l) ctx.fillRect(l, y, r - l, 1);
    }
}

// --- Text ---

/** Bitmap text with a dark outline, centred on x, with its baseline at y. Each font pixel is `scale` pixels. */
export function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, scale: number, fill: string, ink: string) {
    const rows = textPixels(text);
    const left = Math.round(x - (rows[0].length * scale) / 2);
    const top = Math.round(y - GLYPH_HEIGHT * scale);

    for (const pass of ["ink", "fill"] as const) {
        ctx.fillStyle = pass === "ink" ? ink : fill;
        rows.forEach((row, gy) => {
            [...row].forEach((cell, gx) => {
                if (cell !== "#") return;
                const px = left + gx * scale;
                const py = top + gy * scale;
                if (pass === "ink") ctx.fillRect(px - 1, py - 1, scale + 2, scale + 2);
                else ctx.fillRect(px, py, scale, scale);
            });
        });
    }
}
