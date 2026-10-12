import { TileType } from "@/engine/models/grid/itile";
import { cssUrl, Palette, Pixels, pixels, shift } from "./pixelart";

// The map's terrain as 16 x 16 pixel tiles. Each tile is a base colour with
// small motifs stamped on top, so the variations stay easy to tweak.

const SIZE = 16;

/** `motif` drawn onto `base` with its top-left corner at (x, y). Transparent pixels and anything off the tile are skipped. */
function stamp(base: Pixels, motif: Pixels, x: number, y: number): Pixels {
    return base.map((row, rowY) => {
        const line = motif[rowY - y];
        if (line === undefined) return row;
        return [...row].map((pixel, colX) => {
            const over = line[colX - x];
            return over && over !== "." ? over : pixel;
        }).join("");
    });
}

const fill = (key: string): Pixels => Array.from({ length: SIZE }, () => key.repeat(SIZE));

const stampAll = (base: Pixels, placements: [Pixels, number, number][]) =>
    placements.reduce((tile, [motif, x, y]) => stamp(tile, motif, x, y), base);

// --- Grass ---

const GRASS: Palette = { g: "#62a548", G: "#4b8c39", l: "#86c45f", y: "#f2df6b", w: "#fdf7e1" };

const TUFT = pixels(`
    l.l
    G.G
    .G.
`);
const FLOWER = pixels(`
    .w.
    wyw
    .w.
`);
const DARK = ["G"];
const LIGHT = ["l"];

const grass = [
    stampAll(fill("g"), [[TUFT, 2, 2], [TUFT, 10, 9], [LIGHT, 13, 4], [DARK, 6, 13], [LIGHT, 3, 11]]),
    stampAll(fill("g"), [[FLOWER, 10, 2], [TUFT, 3, 9], [DARK, 13, 12], [LIGHT, 6, 5]]),
    stampAll(fill("g"), [[TUFT, 7, 5], [LIGHT, 2, 13], [DARK, 12, 1], [DARK, 13, 14]]),
    stampAll(fill("g"), [[DARK, 4, 4], [LIGHT, 10, 8], [DARK, 13, 13], [LIGHT, 2, 10], [TUFT, 11, 1]]),
];

// --- Forest ---

const FOREST: Palette = { ...GRASS, t: "#2e7d32", T: "#1d5a24", L: "#58ad4a", b: "#6b4423", o: "#163a1b" };

const BIG_TREE = pixels(`
    ..ooooo..
    .oLLttto.
    oLLtttTTo
    oLttttTTo
    otttttTTo
    ottTTTTTo
    .oTTTTTo.
    ..ooboo..
    ...obo...
    ...obo...
`);

const SMALL_TREE = pixels(`
    ..ooo..
    .oLLto.
    oLLttTo
    oLtttTo
    ottTTTo
    .oTTTo.
    ..obo..
    ..obo..
`);

const forest = stampAll(fill("g"), [[TUFT, 11, 1], [LIGHT, 2, 14], [BIG_TREE, 0, 0], [SMALL_TREE, 9, 4], [SMALL_TREE, 3, 8]]);

// --- Mountain ---

const MOUNTAIN: Palette = { ...GRASS, r: "#a08159", R: "#735a3c", L: "#c9ab7c", s: "#f6f3ea", o: "#4a3a28" };

const PEAK = pixels(`
    .......oo.......
    ......osso......
    .....osssRo.....
    ....oLssRRRo....
    ....oLLrRRRo....
    ...oLLrrrRRRo...
    ...oLrrrrrRRo...
    ..oLLrrrrrRRRo..
    ..oLrrrrrrrRRo..
    .oLLrrrrrrrRRRo.
    .oLrrrrrrrrrRRo.
    oLLrrrrrrrrrRRRo
    oooooooooooooooo
`);

const mountain = stampAll(fill("g"), [[TUFT, 1, 0], [PEAK, 0, 2], [LIGHT, 13, 15]]);

// --- Water ---

const WATER: Palette = { w: "#3d7fcb", W: "#2f69ad", l: "#8ec3f2", s: "#e2f1ff" };

const WAVE = pixels(`
    sll.
    .WWW
`);

const water = stampAll(fill("w"), [[WAVE, 1, 2], [WAVE, 10, 6], [WAVE, 4, 10], [WAVE, 12, 13], [["l"], 8, 1], [["W"], 2, 14]]);

// --- Wall ---

const WALL: Palette = { l: "#9a958a", s: "#77736a", S: "#5c5850", k: "#33312c" };

/** Bricks eight pixels wide and three tall, every other course shifted by half a brick. */
const wall: Pixels = Array.from({ length: SIZE }, (_, y) => {
    if (y % 4 === 3) return "k".repeat(SIZE);
    const offset = (Math.floor(y / 4) % 2) * 4;

    return Array.from({ length: SIZE }, (_, x) => {
        if ((x + offset) % 8 === 7) return "k";
        return y % 4 === 0 ? "l" : y % 4 === 2 ? "S" : "s";
    }).join("");
});

export const TERRAIN_TILES: Record<TileType, { palette: Palette; variants: Pixels[] }> = {
    [TileType.Grass]: { palette: GRASS, variants: grass },
    [TileType.Forest]: { palette: FOREST, variants: [forest] },
    [TileType.Mountain]: { palette: MOUNTAIN, variants: [mountain] },
    [TileType.Water]: { palette: WATER, variants: [water, shift(water, 2)] },
    [TileType.Block]: { palette: WALL, variants: [wall] },
};

const tileClass = (type: TileType) => `.ge-tile--${TileType[type].toLowerCase()}`;

/** Background images for every tile class, and water's two-frame ripple. */
const TERRAIN_CSS = (() => {
    const rules: string[] = [];
    const url = (type: TileType, variant: number) => cssUrl(TERRAIN_TILES[type].variants[variant], TERRAIN_TILES[type].palette);

    grass.forEach((_, variant) => rules.push(`${tileClass(TileType.Grass)}.ge-tile--v${variant}{background-image:${url(TileType.Grass, variant)}}`));
    rules.push(`${tileClass(TileType.Grass)}{background-image:${url(TileType.Grass, 0)}}`);

    for (const type of [TileType.Forest, TileType.Mountain, TileType.Block]) {
        rules.push(`${tileClass(type)}{background-image:${url(type, 0)}}`);
    }

    rules.push(`${tileClass(TileType.Water)}{background-image:${url(TileType.Water, 0)};animation:ge-water-px 1.4s steps(1,end) infinite}`);
    rules.push(`@keyframes ge-water-px{0%{background-image:${url(TileType.Water, 0)}}50%,100%{background-image:${url(TileType.Water, 1)}}}`);
    rules.push(`@media (prefers-reduced-motion:reduce){.ge-tile${tileClass(TileType.Water)}{animation:none}}`);

    return rules.join("\n");
})();

/**
 * The terrain art, as a stylesheet. React puts it in the page once however many
 * times it's rendered, so anything that draws tiles can include it.
 */
export const TerrainStyles = () => (
    <style href="ge-terrain-art" precedence="default">{TERRAIN_CSS}</style>
);
