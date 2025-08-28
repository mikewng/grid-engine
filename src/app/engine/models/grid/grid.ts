import { IGrid } from "./igrid";
import { Tile } from "./tile";

export class Grid implements IGrid {

    constructor(height: number, width: number, gridcontent: Tile[][]) {
        this.height = height;
        this.width = width;
        this.gridcontent = gridcontent;
    }
    
    height: number;
    width: number;
    gridcontent: Tile[][];
}