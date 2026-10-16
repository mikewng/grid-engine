import { Grid } from "@/engine/models/grid/grid";
import { TileType } from "@/engine/models/grid/itile";
import { coordinateKey } from "@/engine/models/grid/coordinate";
import { TERRAIN_TILES } from "@/app/components/pixel/terrainart";

// The map drawn on one canvas at the art's own resolution, 16 pixels a tile:
// terrain first, then the danger zone and range highlights on top. The page
// scales it up with image-rendering: pixelated. One canvas costs far less to
// style, paint and hit-test than a few hundred tiles with overlays of their own.

export const TILE = 16;

/** A fixed-looking but varied pick of terrain art per tile, so the map doesn't tile visibly. */
const variantOf = (x: number, y: number) => (((x * 73856093) ^ (y * 19349663)) >>> 0) & 3;

const bitmaps = new Map<string, HTMLCanvasElement>();

/** One tile's art as a 16 x 16 canvas, drawn once and reused. */
function bitmap(type: TileType, variant: number): HTMLCanvasElement {
    const { palette, variants } = TERRAIN_TILES[type];
    const pick = variant % variants.length;
    const key = `${type}-${pick}`;
    const cached = bitmaps.get(key);
    if (cached) return cached;

    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = TILE;
    const ctx = canvas.getContext("2d")!;

    variants[pick].forEach((row, y) => {
        let x = 0;
        while (x < row.length) {
            let end = x + 1;
            while (end < row.length && row[end] === row[x]) end++;
            if (row[x] !== ".") {
                ctx.fillStyle = palette[row[x]];
                ctx.fillRect(x, y, end - x, 1);
            }
            x = end;
        }
    });

    bitmaps.set(key, canvas);
    return canvas;
}

/** The whole map's terrain, once per water frame (water ripples between two). */
export function drawTerrain(grid: Grid): HTMLCanvasElement[] {
    return [0, 1].map(frame => {
        const canvas = document.createElement("canvas");
        canvas.width = grid.width * TILE;
        canvas.height = grid.height * TILE;
        const ctx = canvas.getContext("2d")!;

        for (const tile of grid.gridcontent.flat()) {
            const variant = tile.type === TileType.Water ? frame : variantOf(tile.x, tile.y);
            ctx.drawImage(bitmap(tile.type, variant), tile.x * TILE, tile.y * TILE);
        }

        return canvas;
    });
}

export const hasWater = (grid: Grid) => grid.gridcontent.some(row => row.some(tile => tile.type === TileType.Water));

/** Sets of coordinateKey() strings. */
export interface MapOverlays {
    move: ReadonlySet<string>;
    attack: ReadonlySet<string>;
    danger: ReadonlySet<string>;
    target: ReadonlySet<string>;
}

let stripes: CanvasPattern | null = null;

/** The danger zone's diagonal stripes, two pixels wide. */
function dangerPattern(ctx: CanvasRenderingContext2D): CanvasPattern {
    if (stripes) return stripes;

    const tile = document.createElement("canvas");
    tile.width = tile.height = 4;
    const tc = tile.getContext("2d")!;
    for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
            tc.fillStyle = (x + y) % 4 < 2 ? "rgba(196, 40, 120, 0.5)" : "rgba(196, 40, 120, 0.12)";
            tc.fillRect(x, y, 1, 1);
        }
    }

    stripes = ctx.createPattern(tile, "repeat")!;
    return stripes;
}

/** A one-pixel frame just inside a tile. */
function frame(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, width = 1) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, TILE, width);
    ctx.fillRect(x, y + TILE - width, TILE, width);
    ctx.fillRect(x, y + width, width, TILE - width * 2);
    ctx.fillRect(x + TILE - width, y + width, width, TILE - width * 2);
}

/** A saturated tint that keeps the terrain's texture (hard light), inside a light frame. */
function tint(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, alpha: number) {
    ctx.globalCompositeOperation = "hard-light";
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, TILE, TILE);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
}

/**
 * Draw the map: terrain, then the danger zone, then where the selected unit can
 * move and strike. `pulse` flips the targets' frame between two looks.
 */
export function drawMap(ctx: CanvasRenderingContext2D, grid: Grid, terrain: HTMLCanvasElement, overlays: MapOverlays, pulse: boolean) {
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.drawImage(terrain, 0, 0);

    for (const tile of grid.gridcontent.flat()) {
        if (!overlays.danger.has(coordinateKey(tile))) continue;
        ctx.fillStyle = dangerPattern(ctx);
        ctx.fillRect(tile.x * TILE, tile.y * TILE, TILE, TILE);
    }

    for (const tile of grid.gridcontent.flat()) {
        const key = coordinateKey(tile);
        const x = tile.x * TILE;
        const y = tile.y * TILE;

        if (overlays.target.has(key)) {
            tint(ctx, x, y, "rgb(255, 40, 40)", 0.85);
            frame(ctx, x, y, pulse ? "rgba(255, 220, 120, 0.95)" : "rgba(255, 90, 90, 0.95)", pulse ? 2 : 1);
        } else if (overlays.attack.has(key)) {
            tint(ctx, x, y, "rgb(255, 40, 40)", 0.75);
            frame(ctx, x, y, "rgba(255, 200, 200, 0.95)");
        } else if (overlays.move.has(key)) {
            tint(ctx, x, y, "rgb(40, 110, 255)", 0.8);
            frame(ctx, x, y, "rgba(200, 225, 255, 0.95)");
        }
    }
}
