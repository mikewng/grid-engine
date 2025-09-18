import React, { memo, useMemo } from "react";
import { Tile } from "../../engine/models/grid/tile";
import { TileType } from "../../engine/models/grid/itile";

import "./tilecomponent.scss"

interface TileProps {
    tile: Tile;
    onClick?: (tile: Tile) => void;
    isSelected?: boolean;
    isHighlighted?: boolean;
    isInMovementRange?: boolean;
}

const TileComponent: React.FC<TileProps> = memo(({
    tile,
    onClick,
    isSelected = false,
    isHighlighted = false,
    isInMovementRange = false
}) => {
    const handleClick = useMemo(() => {
        return onClick ? () => onClick(tile) : undefined;
    }, [onClick, tile]);

    const tileClasses = useMemo(() => {
        const baseClass = "ge-tile-wrapper";
        const typeClass = `ge-tile-${TileType[tile.type].toLowerCase()}`;
        const stateClasses = [
            isSelected && "ge-tile-selected",
            isHighlighted && "ge-tile-highlighted",
            isInMovementRange && "ge-tile-movement-range",
            tile.occupiedByUnitId && "ge-tile-occupied",
            onClick && "ge-tile-clickable"
        ].filter(Boolean).join(" ");

        return `${baseClass} ${typeClass} ${stateClasses}`.trim();
    }, [tile.type, tile.occupiedByUnitId, isSelected, isHighlighted, isInMovementRange, onClick]);

    const tileStyle = useMemo(() => ({
        position: 'relative' as const,
        aspectRatio: '1',
        minHeight: '40px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s ease-in-out',
    }), [onClick]);

    return (
        <div 
            className={tileClasses}
            style={tileStyle}
            onClick={handleClick}
            data-x={tile.x}
            data-y={tile.y}
            data-tile-type={TileType[tile.type]}
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={handleClick && ((e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleClick();
                }
            })}
        >
            <div className="ge-tile-content">
                {/* Tile type indicator */}
                <div className="ge-tile-type" />
                {/* Unit indicator if occupied */}
                {tile.occupiedByUnitId && (
                    <div className="ge-tile-unit-indicator" />
                )}
                {process.env.NODE_ENV === 'development' && (
                    <div className="ge-tile-debug-info">
                        <span className="ge-tile-coords">{tile.x},{tile.y}</span>
                    </div>
                )}
            </div>
        </div>
    );
});

TileComponent.displayName = 'TileComponent';

export default TileComponent;