export interface ITile {
    type: TileType;
    x: number;
    y: number;
    /**
     * Which unit stands here. Derived from unit positions by
     * GridManager.refreshOccupancy; unit positions are the source of truth.
     */
    occupiedByUnitId?: string;
}

export enum TileType {
    Grass,
    Forest,
    Mountain,
    Water,
    Block
}
