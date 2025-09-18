import React, { memo, useMemo, useCallback } from "react";
import { Grid } from "../engine/models/grid/grid";
import { Tile } from "../engine/models/grid/tile";
import TileComponent from "./tilecomponent";

import "./gridcomponent.scss"

interface GridProps {
    grid: Grid;
    onTileClick?: (tile: Tile) => void;
    selectedTile?: Tile | null;
    highlightedTiles?: Set<string>;
    movementRangeTiles?: Set<string>;
}

const GridComponent: React.FC<GridProps> = memo(({
    grid,
    onTileClick,
    selectedTile,
    highlightedTiles = new Set(),
    movementRangeTiles = new Set()
}) => {
    // Flatten grid for efficient rendering
    const flattenedTiles = useMemo(() => {
        const tiles: Tile[] = [];
        for (let y = 0; y < grid.height; y++) {
            for (let x = 0; x < grid.width; x++) {
                tiles.push(grid.gridcontent[y][x]);
            }
        }
        return tiles;
    }, [grid.gridcontent, grid.height, grid.width]);

    // Memoized tile click handler
    const handleTileClick = useCallback((tile: Tile) => {
        onTileClick?.(tile);
    }, [onTileClick]);

    // CSS Grid template for optimal layout
    const gridStyle = useMemo(() => ({
        display: 'grid',
        gridTemplateColumns: `repeat(${grid.width}, 1fr)`,
        gridTemplateRows: `repeat(${grid.height}, 1fr)`,
        gap: '1px',
        aspectRatio: `${grid.width} / ${grid.height}`,
        width: '100%',
        margin: '0 auto'
    }), [grid.width, grid.height]);

    return (
        <div className="ge-grid-component-wrapper">
            <div 
                className="ge-grid-layout"
                style={gridStyle}
            >
                {flattenedTiles.map((tile) => {
                    const tileKey = `${tile.x}-${tile.y}`;
                    const isSelected = selectedTile?.x === tile.x && selectedTile?.y === tile.y;
                    const isHighlighted = highlightedTiles.has(tileKey);
                    const isInMovementRange = movementRangeTiles.has(tileKey);

                    return (
                        <TileComponent
                            key={tileKey}
                            tile={tile}
                            onClick={handleTileClick}
                            isSelected={isSelected}
                            isHighlighted={isHighlighted}
                            isInMovementRange={isInMovementRange}
                        />
                    );
                })}
            </div>
        </div>
    );
});

GridComponent.displayName = 'GridComponent';

export default GridComponent;