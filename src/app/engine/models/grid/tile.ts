import { ITile, TileType } from "./itile";

export class Tile implements ITile {
    constructor(type: TileType, x: number, y: number, movementCost: number, occupiedByUnitId?: string) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.movementCost = movementCost;
        this.occupiedByUnitId = occupiedByUnitId;
    }

    type: TileType;
    x: number;
    y: number;
    occupiedByUnitId?: string | undefined;
    movementCost: number;
}