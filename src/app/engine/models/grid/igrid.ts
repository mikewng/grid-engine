import { Tile } from "./tile";

export interface IGrid {
    height: number;
    width: number;
    gridcontent: Tile[][];
}