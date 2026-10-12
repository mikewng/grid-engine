import { describe, expect, it } from "vitest";
import { paths } from "./pixelart";
import { TERRAIN_TILES } from "./terrainart";

describe("terrain art", () => {
    it("draws every tile 16 by 16, in colours its palette has", () => {
        for (const { palette, variants } of Object.values(TERRAIN_TILES)) {
            for (const tile of variants) {
                expect(tile).toHaveLength(16);
                for (const row of tile) expect(row).toHaveLength(16);
                expect(() => paths(tile, palette)).not.toThrow();
            }
        }
    });
});
