import { ITile, TileType } from "./itile";

export class Tile implements ITile {
    constructor(type: TileType, x: number, y: number, occupiedByUnitId?: string) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.occupiedByUnitId = occupiedByUnitId;
    }

    type: TileType;
    x: number;
    y: number;
    occupiedByUnitId?: string | undefined;
}
