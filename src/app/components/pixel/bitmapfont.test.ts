import { describe, expect, it } from "vitest";
import { GLYPH_HEIGHT, textPixels } from "./bitmapfont";

describe("bitmap font", () => {
    it("sets glyphs side by side, a pixel apart", () => {
        const rows = textPixels("12");
        expect(rows).toHaveLength(GLYPH_HEIGHT);
        expect(rows[0]).toBe("..#.." + "." + ".###.");
    });

    it("has every digit, and skips what it doesn't have", () => {
        for (const digit of "0123456789") expect(textPixels(digit)[0]).toHaveLength(5);
        expect(textPixels("1?")).toEqual(textPixels("1"));
        expect(textPixels("miss")).toEqual(textPixels("MISS"));
    });
});
