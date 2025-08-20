interface Tile {
    type: TileType;
    x: number;
    y: number;
    occupiedBy?: string;
    movementCost: number;
}

enum TileType {
    Grass,
    Forest,
    Mountain,
    Water,
    Block
}