import { describe, expect, it } from "vitest";
import { bob, outline, overlay, paths, pixels, shade, shift } from "./pixelart";

describe("pixel art", () => {
    it("reads rows from a template, ignoring indentation and blank lines", () => {
        expect(pixels(`
            .a.
            aba
        `)).toEqual([".a.", "aba"]);
    });

    it("draws one sprite over another", () => {
        expect(overlay(["aaa", "aaa"], ["b..", ".b."])).toEqual(["baa", "aba"]);
    });

    it("outlines the edges but not the corners", () => {
        expect(outline([
            "...",
            ".a.",
            "...",
        ])).toEqual([
            ".k.",
            "kak",
            ".k.",
        ]);
    });

    it("bobs the top half down a pixel onto the legs", () => {
        expect(bob(["h", "b", "l", "f"], 2)).toEqual([".", "h", "b", "f"]);
        expect(bob(["h.", "b.", ".l"], 2)).toEqual(["..", "h.", "bl"]);
    });

    it("scrolls rows sideways with wrapping", () => {
        expect(shift(["abc"], 1)).toEqual(["cab"]);
        expect(shift(["abc"], -1)).toEqual(["bca"]);
    });

    it("merges runs of a colour into one path per colour", () => {
        expect(paths(["aab", ".a."], { a: "#111", b: "#222" })).toEqual([
            { color: "#111", d: "M0 0h2v1h-2zM1 1h1v1h-1z" },
            { color: "#222", d: "M2 0h1v1h-1z" },
        ]);
    });

    it("refuses a pixel with no colour", () => {
        expect(() => paths(["x"], {})).toThrow(/"x"/);
    });

    it("darkens and lightens colours", () => {
        expect(shade("#808080", 0.5)).toBe("#404040");
        expect(shade("#000000", 2)).toBe("#ffffff");
    });
});
