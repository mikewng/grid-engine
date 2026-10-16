import { CSSProperties } from "react";
import { Coordinate } from "@/engine/models/grid/coordinate";
import { INK, outline, paths, pixels } from "@/app/components/pixel/pixelart";

import "./mapoverlays.scss"

// All of these live inside GridComponent's overlay layer, which sets --cols and --rows

export const tileStyle = (tile: Coordinate): CSSProperties => ({
    left: `calc(${tile.x} * 100% / var(--cols))`,
    top: `calc(${tile.y} * 100% / var(--rows))`,
});

// Corner brackets two pixels thick, reaching a pixel past a 16-pixel tile, then outlined: 20 x 20 in all
const CURSOR = outline(pixels(`
    ....................
    .#####........#####.
    .#####........#####.
    .##..............##.
    .##..............##.
    .##..............##.
    ....................
    ....................
    ....................
    ....................
    ....................
    ....................
    ....................
    ....................
    .##..............##.
    .##..............##.
    .##..............##.
    .#####........#####.
    .#####........#####.
    ....................
`));

const CURSOR_COLORS = { default: "#fff4c8", attack: "#ff8a7a" };

/** The pulsing corner brackets around the tile under the pointer. */
export const MapCursor = ({ tile, tone = "default" }: { tile: Coordinate; tone?: "default" | "attack" }) => (
    <div className="ge-cursor" style={tileStyle(tile)} aria-hidden="true">
        <svg viewBox="0 0 20 20" shapeRendering="crispEdges">
            {paths(CURSOR, { "#": CURSOR_COLORS[tone], k: INK }).map(({ color, d }) => <path key={color} fill={color} d={d} />)}
        </svg>
    </div>
);

interface PathArrowProps {
    cols: number;
    rows: number;
    /** The unit's tile followed by every step of its path. */
    points: Coordinate[];
}

/** An arrow along the path a unit would take. */
export const PathArrow = ({ cols, rows, points }: PathArrowProps) => {
    if (points.length < 2) return null;

    const centers = points.map(p => [p.x + 0.5, p.y + 0.5] as const);
    const [endX, endY] = centers[centers.length - 1];
    const [prevX, prevY] = centers[centers.length - 2];
    const dx = Math.sign(endX - prevX);
    const dy = Math.sign(endY - prevY);

    // The shaft stops at the arrowhead's base; the head points along the last step
    const base = [endX - dx * 0.1, endY - dy * 0.1];
    const tip = [endX + dx * 0.32, endY + dy * 0.32];
    const half = 0.28;
    const head = [tip, [base[0] - dy * half, base[1] + dx * half], [base[0] + dy * half, base[1] - dx * half]];

    const shaft = [...centers.slice(0, -1), base].map(p => p.join(",")).join(" ");

    return (
        <svg className="ge-path-arrow" viewBox={`0 0 ${cols} ${rows}`} aria-hidden="true">
            <polyline className="ge-path-outline" points={shaft} />
            <polygon className="ge-path-outline" points={head.map(p => p.join(",")).join(" ")} />
            <polyline className="ge-path-fill" points={shaft} />
            <polygon className="ge-path-head" points={head.map(p => p.join(",")).join(" ")} />
        </svg>
    );
};

export interface FloatingText {
    id: number;
    x: number;
    y: number;
    text: string;
    kind: "damage" | "crit" | "miss" | "poison" | "heal" | "break" | "info";
}

/** Damage numbers and "MISS" popping up over units. */
export const FloatingTexts = ({ items }: { items: FloatingText[] }) => (
    <>
        {items.map(item => (
            <div key={item.id} className={`ge-float ge-float--${item.kind}`} style={tileStyle(item)} aria-hidden="true">
                <span>{item.text}</span>
            </div>
        ))}
    </>
);
