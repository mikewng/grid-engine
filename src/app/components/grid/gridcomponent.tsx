import React, { CSSProperties, KeyboardEvent, PointerEvent, ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Grid } from "@/engine/models/grid/grid";
import { Tile } from "@/engine/models/grid/tile";
import { TileType } from "@/engine/models/grid/itile";
import { Coordinate, coordinateKey } from "@/engine/models/grid/coordinate";
import { drawMap, drawTerrain, hasWater, MapOverlays, TILE } from "./mapcanvas";

import "./gridcomponent.scss"

interface GridProps {
    grid: Grid;
    onTileClick?: (tile: Tile) => void;
    onTileHover?: (tile: Tile | null) => void;
    /** Right click: the "back" button. */
    onCancel?: () => void;
    // Sets of coordinateKey() strings. Pass the same set while nothing changes, and the map isn't redrawn.
    movementRangeTiles?: ReadonlySet<string>;
    attackRangeTiles?: ReadonlySet<string>;
    dangerTiles?: ReadonlySet<string>;
    targetTiles?: ReadonlySet<string>;
    /** Who stands on each tile, by coordinateKey, for screen readers. */
    occupants?: Map<string, string>;
    /** The tile under the pointer or the keyboard cursor: where the arrow keys move on from. */
    cursor?: Coordinate | null;
    /** Drawn over the map (units, cursor, effects). Position children in tile units with --cols and --rows. */
    children?: ReactNode;
}

const EMPTY: ReadonlySet<string> = new Set<string>();
const NO_OCCUPANTS = new Map<string, string>();

/** How often the map's own animations step: water ripples every other step, targets pulse every step. */
const STEP_MS = 400;
/** How long each frame of the units' idle bob lasts. */
const IDLE_MS = 600;

const ARROWS: Record<string, [number, number]> = {
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
};

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The map: terrain and highlights on one canvas, with units and windows over
 * it as children. Input is handled once for the whole board, working out the
 * tile from the pointer's position. With keyboard focus, the arrow keys move
 * the cursor and Enter or Space selects.
 */
const GridComponent: React.FC<GridProps> = ({
    grid,
    onTileClick,
    onTileHover,
    onCancel,
    movementRangeTiles = EMPTY,
    attackRangeTiles = EMPTY,
    dangerTiles = EMPTY,
    targetTiles = EMPTY,
    occupants = NO_OCCUPANTS,
    cursor = null,
    children,
}) => {
    const board = useRef<HTMLDivElement>(null);
    const canvas = useRef<HTMLCanvasElement>(null);
    const layer = useRef<HTMLDivElement>(null);
    const [focused, setFocused] = useState(false);

    // What the next redraw needs, kept in a ref so the animation timer sees the latest
    const view = useRef<{ terrain: HTMLCanvasElement[]; overlays: MapOverlays; step: number; water: boolean }>({
        terrain: [],
        overlays: { move: EMPTY, attack: EMPTY, danger: EMPTY, target: EMPTY },
        step: 0,
        water: false,
    });

    const redraw = () => {
        const ctx = canvas.current?.getContext("2d");
        const { terrain, overlays, step, water } = view.current;
        if (!ctx || terrain.length === 0) return;

        drawMap(ctx, grid, terrain[water ? Math.floor(step / 2) % 2 : 0], overlays, step % 2 === 1);
    };
    const redrawRef = useRef(redraw);

    useLayoutEffect(() => {
        redrawRef.current = redraw;
    });

    useLayoutEffect(() => {
        view.current.terrain = drawTerrain(grid);
        view.current.water = hasWater(grid);
        redrawRef.current();
    }, [grid]);

    useLayoutEffect(() => {
        view.current.overlays = { move: movementRangeTiles, attack: attackRangeTiles, danger: dangerTiles, target: targetTiles };
        redrawRef.current();
    }, [movementRangeTiles, attackRangeTiles, dangerTiles, targetTiles]);

    // Water ripples and targets pulse, unless motion is reduced
    useEffect(() => {
        if (reducedMotion()) return;

        const timer = setInterval(() => {
            const { water, overlays } = view.current;
            if (!water && overlays.target.size === 0) return;

            view.current.step++;
            redrawRef.current();
        }, STEP_MS);

        return () => clearInterval(timer);
    }, []);

    // Every unit's idle bob in step, from one timer flipping one attribute (see unittoken.scss),
    // which costs far less than an animation on each sprite
    useEffect(() => {
        if (reducedMotion()) return;

        let frame = 0;
        const timer = setInterval(() => {
            frame = 1 - frame;
            layer.current?.setAttribute("data-idle", String(frame));
        }, IDLE_MS);

        return () => clearInterval(timer);
    }, []);

    // --- Input ---

    const hoverKey = useRef<string | null>(null);

    const hover = (tile: Tile | null) => {
        const key = tile ? coordinateKey(tile) : null;
        if (key === hoverKey.current) return;
        hoverKey.current = key;
        onTileHover?.(tile);
    };

    /** The tile under the pointer, if it's over the map itself (not a window drawn on it). */
    const tileAt = (event: PointerEvent | React.MouseEvent): Tile | null => {
        if (event.target !== canvas.current || !board.current) return null;

        const rect = board.current.getBoundingClientRect();
        const x = Math.floor(((event.clientX - rect.left) / rect.width) * grid.width);
        const y = Math.floor(((event.clientY - rect.top) / rect.height) * grid.height);

        return grid.gridcontent[y]?.[x] ?? null;
    };

    const onKeyDown = (event: KeyboardEvent) => {
        const arrow = ARROWS[event.key];

        if (arrow) {
            const from = cursor ?? { x: Math.floor(grid.width / 2), y: Math.floor(grid.height / 2) };
            const x = Math.min(grid.width - 1, Math.max(0, from.x + arrow[0]));
            const y = Math.min(grid.height - 1, Math.max(0, from.y + arrow[1]));

            event.preventDefault();
            event.stopPropagation();
            hover(grid.gridcontent[y][x]);
        } else if ((event.key === "Enter" || event.key === " ") && cursor) {
            event.preventDefault();
            event.stopPropagation();
            onTileClick?.(grid.gridcontent[cursor.y][cursor.x]);
        }
    };

    const describe = (tile: Coordinate) => {
        const occupant = occupants.get(coordinateKey(tile));
        return `${TileType[grid.gridcontent[tile.y][tile.x].type]} at ${tile.x}, ${tile.y}${occupant ? `, ${occupant}` : ""}`;
    };

    const boardStyle = {
        "--cols": grid.width,
        "--rows": grid.height,
    } as CSSProperties;

    return (
        <div
            ref={board}
            className="ge-board"
            style={boardStyle}
            role="application"
            aria-roledescription="map"
            aria-label={`${grid.width} by ${grid.height} map. Arrow keys move the cursor; Enter or Space selects.`}
            tabIndex={0}
            onPointerMove={(event) => {
                const tile = tileAt(event);
                if (tile) hover(tile);
            }}
            onPointerLeave={() => hover(null)}
            onClick={(event) => {
                const tile = tileAt(event);
                if (tile) onTileClick?.(tile);
            }}
            // Clicking shouldn't take keyboard focus, so Enter and Space keep working as shortcuts
            onMouseDown={(event) => event.preventDefault()}
            onKeyDown={onKeyDown}
            onFocus={() => {
                setFocused(true);
                if (!cursor) hover(grid.gridcontent[Math.floor(grid.height / 2)][Math.floor(grid.width / 2)]);
            }}
            onBlur={() => setFocused(false)}
            onContextMenu={onCancel && ((event) => {
                event.preventDefault();
                onCancel();
            })}
        >
            <canvas ref={canvas} className="ge-board-map" width={grid.width * TILE} height={grid.height * TILE} aria-hidden="true" />
            <div ref={layer} className="ge-board-layer" data-idle="0">
                {children}
            </div>
            <div className="ge-visually-hidden" aria-live="polite">
                {focused && cursor ? describe(cursor) : ""}
            </div>
        </div>
    );
};

export default GridComponent;
