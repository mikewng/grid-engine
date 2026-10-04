export interface Coordinate {
    x: number;
    y: number;
}

/** A string key for a coordinate, for use in Sets and Maps. */
export function coordinateKey(coordinate: Coordinate): string {
    return `${coordinate.x},${coordinate.y}`;
}