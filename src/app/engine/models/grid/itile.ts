export interface ITile {
    type: TileType;
    x: number;
    y: number;
    occupiedByUnitId?: string;
    movementCost: number;
}

export enum TileType {
    Grass,
    Forest,
    Mountain,
    Water,
    Block
}