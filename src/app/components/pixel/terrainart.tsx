import { TileType } from "@/engine/models/grid/itile";
import { Palette, paths, Pixels, pixels, shift } from "./pixelart";

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

// --- Road ---

const ROAD: Palette = { d: "#c4a374", D: "#a3845c", l: "#dcc394" };

const STONE = pixels(`
    ll
    DD
`);
const PEBBLE = ["lD"];

const road = stampAll(fill("d"), [
    [STONE, 2, 2], [PEBBLE, 9, 1], [STONE, 11, 7], [PEBBLE, 4, 9], [STONE, 6, 12], [PEBBLE, 13, 13],
    [["D"], 1, 7], [["l"], 8, 5], [["D"], 14, 3], [["l"], 1, 13],
]);

// --- Bridge ---

const BRIDGE: Palette = { w: "#b8874d", W: "#94683a", g: "#5e3d1c", r: "#6b4423", R: "#4a2e14" };

/** Planks running across the river, between a rail on each side with posts every eight pixels. */
const bridge: Pixels = Array.from({ length: SIZE }, (_, y) => {
    if (y === 0 || y === SIZE - 1) return "R".repeat(SIZE);
    if (y === 1 || y === SIZE - 2) return Array.from({ length: SIZE }, (_, x) => (x % 8 === 3 ? "R" : "r")).join("");
    return Array.from({ length: SIZE }, (_, x) => ["w", "w", "W", "g"][x % 4]).join("");
});

// --- Fort ---

const FORT: Palette = { ...GRASS, o: "#3f3b34", c: "#cfc9b8", n: "#a8a294", N: "#7d786c", x: "#2a2620", p: "#5e3d1c", f: "#c8452d" };

const KEEP = pixels(`
    ........pff.....
    ........pfff....
    .ooo..oooo..ooo.
    .oco..ocno..oco.
    .oooooooooooooo.
    .occcccccccccco.
    .ocnncnncnncnco.
    .occcccccccccco.
    .ocncnncnncnnco.
    .occccoooocccco.
    .ocncnoxxoncnco.
    .occccoxxocccco.
    .oNNNNoxxoNNNNo.
    .oooooooooooooo.
`);

const fort = stampAll(fill("g"), [[KEEP, 0, 0], [LIGHT, 2, 15], [DARK, 12, 14]]);

// --- Sand ---

const SAND: Palette = { s: "#e2c98a", S: "#c9ad6c", l: "#f2e2b0" };

const RIPPLE = ["ll..", ".SSS"];

const sand = stampAll(fill("s"), [
    [RIPPLE, 1, 2], [RIPPLE, 9, 5], [RIPPLE, 3, 10], [RIPPLE, 11, 12],
    [["S"], 7, 1], [["l"], 14, 8], [["S"], 1, 14], [["l"], 6, 7],
]);

// --- Village ---

const VILLAGE: Palette = { ...GRASS, o: "#3a2a1a", r: "#c8452d", R: "#8e2a1f", h: "#f0e2c0", H: "#c9b48a", x: "#5e3d1c", b: "#3d7fcb" };

const HOUSE = pixels(`
    ......oooo......
    .....orrrro.....
    ....orrrrrro....
    ...orrrrrrrro...
    ..orrrrrrrrrro..
    .oRRRRRRRRRRRRo.
    ..ohhhhhhhhhho..
    ..ohbbhhhhbbho..
    ..ohbbhhhhbbho..
    ..ohhhhxxhhhho..
    ..oHHHHxxHHHHo..
    ..oooooooooooo..
`);

const village = stampAll(fill("g"), [[TUFT, 12, 0], [HOUSE, 0, 2], [LIGHT, 1, 15], [DARK, 14, 15]]);

export const TERRAIN_TILES: Record<TileType, { palette: Palette; variants: Pixels[] }> = {
    [TileType.Grass]: { palette: GRASS, variants: grass },
    [TileType.Forest]: { palette: FOREST, variants: [forest] },
    [TileType.Mountain]: { palette: MOUNTAIN, variants: [mountain] },
    [TileType.Water]: { palette: WATER, variants: [water, shift(water, 2)] },
    [TileType.Block]: { palette: WALL, variants: [wall] },
    [TileType.Road]: { palette: ROAD, variants: [road] },
    [TileType.Bridge]: { palette: BRIDGE, variants: [bridge] },
    [TileType.Fort]: { palette: FORT, variants: [fort] },
    [TileType.Sand]: { palette: SAND, variants: [sand] },
    [TileType.Village]: { palette: VILLAGE, variants: [village] },
};

const swatchPaths = new Map<TileType, { color: string; d: string }[]>();

/** One tile's art as crisp SVG, for showing terrain off the map (the terrain card). */
export const TerrainSwatch = ({ type, className }: { type: TileType; className?: string }) => {
    if (!swatchPaths.has(type)) swatchPaths.set(type, paths(TERRAIN_TILES[type].variants[0], TERRAIN_TILES[type].palette));

    return (
        <svg className={className} viewBox={`0 0 ${SIZE} ${SIZE}`} shapeRendering="crispEdges" aria-hidden="true">
            {swatchPaths.get(type)!.map(({ color, d }) => <path key={color} fill={color} d={d} />)}
        </svg>
    );
};
