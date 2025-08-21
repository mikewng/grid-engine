interface Tile {
    type: TileType;
    x: number;
    y: number;
    occupiedByUnitId?: string;
    movementCost: number;
}

enum TileType {
    Grass,
    Forest,
    Mountain,
    Water,
    Block
}