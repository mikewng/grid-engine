import React, { memo } from "react";
import { TileType } from "@/engine/models/grid/itile";

import "./tilecomponent.scss"

interface TileProps {
    x: number;
    y: number;
    type: TileType;
    /** Picks one of a few looks for the same terrain, so the map doesn't tile visibly. */
    variant?: number;
    onClick?: (x: number, y: number) => void;
    onHover?: (x: number, y: number) => void;
    isInMovementRange?: boolean;
    isInAttackRange?: boolean;
    isInDangerZone?: boolean;
    isTarget?: boolean;
    /** Who stands here, for screen readers ("Test Knight, 25 of 25 HP"). */
    occupant?: string;
}

const TileComponent: React.FC<TileProps> = memo(({
    x,
    y,
    type,
    variant = 0,
    onClick,
    onHover,
    isInMovementRange = false,
    isInAttackRange = false,
    isInDangerZone = false,
    isTarget = false,
    occupant,
}) => {
    const tileClasses = [
        "ge-tile",
        `ge-tile--${TileType[type].toLowerCase()}`,
        `ge-tile--v${variant}`,
        isInMovementRange && "is-move",
        isInAttackRange && "is-attack",
        isInDangerZone && "is-danger",
        isTarget && "is-target",
        onClick && "is-clickable",
    ].filter(Boolean).join(" ");

    const label = `${TileType[type]} at ${x}, ${y}` + (occupant ? `, ${occupant}` : "");

    return (
        <div
            className={tileClasses}
            onClick={onClick && (() => onClick(x, y))}
            onMouseEnter={onHover && (() => onHover(x, y))}
            // Clicking shouldn't move keyboard focus onto the map, so Enter and Space keep working as shortcuts
            onMouseDown={(e) => e.preventDefault()}
            onFocus={onHover && (() => onHover(x, y))}
            data-x={x}
            data-y={y}
            data-tile-type={TileType[type]}
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
            aria-label={label}
            onKeyDown={onClick && ((e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick(x, y);
                }
            })}
        />
    );
});

TileComponent.displayName = 'TileComponent';

export default TileComponent;
