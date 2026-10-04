import React, { CSSProperties, ReactNode, useCallback, useLayoutEffect, useRef } from "react";
import { Grid } from "@/engine/models/grid/grid";
import { Tile } from "@/engine/models/grid/tile";
import { coordinateKey } from "@/engine/models/grid/coordinate";
import TileComponent from "@/app/components/tile/tilecomponent";

import "./gridcomponent.scss"

interface GridProps {
    grid: Grid;
    onTileClick?: (tile: Tile) => void;
    onTileHover?: (tile: Tile | null) => void;
    /** Right click: the "back" button. */
    onCancel?: () => void;
    // Sets of coordinateKey() strings
    movementRangeTiles?: Set<string>;
    attackRangeTiles?: Set<string>;
    dangerTiles?: Set<string>;
    targetTiles?: Set<string>;
    /** Who stands on each tile, by coordinateKey, for screen readers. */
    occupants?: Map<string, string>;
    /** Drawn over the tiles (units, cursor, effects). Position children in tile units with --cols and --rows. */
    children?: ReactNode;
}

const EMPTY = new Set<string>();
const NO_OCCUPANTS = new Map<string, string>();

/** A fixed-looking but varied pick of terrain art per tile. */
const variantOf = (x: number, y: number) => (((x * 73856093) ^ (y * 19349663)) >>> 0) & 3;

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
    children,
}) => {
    // Keep the latest handlers in refs, so tiles get stable callbacks and only
    // re-render when their own props change
    const clickRef = useRef(onTileClick);
    const hoverRef = useRef(onTileHover);

    useLayoutEffect(() => {
        clickRef.current = onTileClick;
        hoverRef.current = onTileHover;
    });

    const handleClick = useCallback((x: number, y: number) => {
        clickRef.current?.(grid.gridcontent[y][x]);
    }, [grid]);

    const handleHover = useCallback((x: number, y: number) => {
        hoverRef.current?.(grid.gridcontent[y][x]);
    }, [grid]);

    const boardStyle = {
        "--cols": grid.width,
        "--rows": grid.height,
    } as CSSProperties;

    return (
        <div
            className="ge-board"
            style={boardStyle}
            onMouseLeave={() => hoverRef.current?.(null)}
            onContextMenu={onCancel && ((e) => {
                e.preventDefault();
                onCancel();
            })}
        >
            <div className="ge-board-tiles" role="grid" aria-label={`${grid.width} by ${grid.height} map`}>
                {grid.gridcontent.flat().map((tile) => {
                    const key = coordinateKey(tile);

                    return (
                        <TileComponent
                            key={key}
                            x={tile.x}
                            y={tile.y}
                            type={tile.type}
                            variant={variantOf(tile.x, tile.y)}
                            onClick={onTileClick && handleClick}
                            onHover={onTileHover && handleHover}
                            isInMovementRange={movementRangeTiles.has(key)}
                            isInAttackRange={attackRangeTiles.has(key)}
                            isInDangerZone={dangerTiles.has(key)}
                            isTarget={targetTiles.has(key)}
                            occupant={occupants.get(key)}
                        />
                    );
                })}
            </div>
            <div className="ge-board-layer">
                {children}
            </div>
        </div>
    );
};

export default GridComponent;
