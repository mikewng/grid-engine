import { Grid } from "../models/grid/grid";
import { TileType } from "../models/grid/itile";
import { Tile } from "../models/grid/tile";
import { TileDictionary } from "@/app/data/grid/tileDictionary";
import { movementCostMap } from "@/app/data/grid/tileDictionary";
import { Result } from "../utils/resultclass";

export class GridManager {
    private grid: Grid | null = null;

    // Generic Functions
    buildGridFromArr(arr: string[][]): Result<boolean> {
        if (!arr || arr.length === 0) {
            return Result.Fail("Array cannot be empty");
        }

        const height = arr.length;
        const width = arr[0].length;

        for (let row of arr) {
            if (row.length !== width) {
                return Result.Fail("All rows must have the same length");
            }
        }

        const gridContent: Tile[][] = [];

        for (let y = 0; y < height; y++) {
            const row: Tile[] = [];
            for (let x = 0; x < width; x++) {
                const tileChar = arr[y][x];
                const tileType = TileDictionary[tileChar];

                if (tileType === undefined) {
                    return Result.Fail(`Unknown tile character: '${tileChar}' at position (${x}, ${y})`);
                }

                const movementCost = movementCostMap[tileType];
                const tile = new Tile(tileType, x, y, movementCost);
                row.push(tile);
            }
            gridContent.push(row);
        }

        this.grid = new Grid(height, width, gridContent);
        return Result.Success(true);
    }

    setGrid(grid: Grid): Result<boolean> {
        this.grid = grid;
        return Result.Success(true);
    }

    getGrid(): Result<Grid> {
        if (!this.grid) return Result.Fail("Grid has not been initialized");
        return Result.Success(this.grid);
    }

    getGridSize(): Result<{ height: number, width: number }> {
        if (!this.grid) return Result.Fail("Grid has not been initialized");
        return Result.Success({ height: this.grid.height, width: this.grid.width });
    }

    getGridHeight(): Result<number> {
        if (!this.grid) return Result.Fail("Grid has not been initialized");
        return Result.Success(this.grid.height);
    }

    getGridWidth(): Result<number> {
        if (!this.grid) return Result.Fail("Grid has not been initialized");
        return Result.Success(this.grid.width);
    }

    // Tile Specific Functions
    getTileAtPosition(x: number, y: number): Result<Tile> {
        if (!this.grid) return Result.Fail("Grid has not been initialized");

        if (x < 0 || x >= this.grid.width || y < 0 || y >= this.grid.height) {
            return Result.Fail(`Position (${x}, ${y}) is out of bounds`);
        }

        const tile = this.grid.gridcontent[y][x];
        return Result.Success(tile);
    }

    setTileAtPosition(x: number, y: number, tileType: TileType): Result<Tile> {
        if (!this.grid) return Result.Fail("Grid has not been initialized");

        if (x < 0 || x >= this.grid.width || y < 0 || y >= this.grid.height) {
            return Result.Fail(`Position (${x}, ${y}) is out of bounds`);
        }

        const tile = this.grid.gridcontent[y][x];
        this.grid.gridcontent[y][x].type = tileType;

        return Result.Success(tile);
    }

    getTilesByType(tileType: TileType): Result<Tile[]> {
        if (!this.grid) return Result.Fail("Grid has not been initialized");

        const tiles: Tile[] = [];
        for (let y = 0; y < this.grid.height; y++) {
            for (let x = 0; x < this.grid.width; x++) {
                const tile = this.grid.gridcontent[y][x];
                if (tile.type === tileType) {
                    tiles.push(tile);
                }
            }
        }
        return Result.Success(tiles);
    }

    getOccupiedTiles(): Result<Tile[]> {
        if (!this.grid) return Result.Fail("Grid has not been initialized");

        const occupiedTiles: Tile[] = [];
        for (let y = 0; y < this.grid.height; y++) {
            for (let x = 0; x < this.grid.width; x++) {
                const tile = this.grid.gridcontent[y][x];
                if (tile.occupiedByUnitId) {
                    occupiedTiles.push(tile);
                }
            }
        }
        return Result.Success(occupiedTiles);
    }

    getEmptyTiles(): Result<Tile[]> {
        if (!this.grid) return Result.Fail("Grid has not been initialized");

        const emptyTiles: Tile[] = [];
        for (let y = 0; y < this.grid.height; y++) {
            for (let x = 0; x < this.grid.width; x++) {
                const tile = this.grid.gridcontent[y][x];
                if (!tile.occupiedByUnitId) {
                    emptyTiles.push(tile);
                }
            }
        }
        return Result.Success(emptyTiles);
    }

    getAllTiles(): Result<Tile[]> {
        if (!this.grid) return Result.Fail("Grid has not been initialized");

        const allTiles: Tile[] = [];
        for (let y = 0; y < this.grid.height; y++) {
            for (let x = 0; x < this.grid.width; x++) {
                allTiles.push(this.grid.gridcontent[y][x]);
            }
        }
        return Result.Success(allTiles);
    }

    isValidPosition(x: number, y: number): Result<boolean> {
        if (!this.grid) return Result.Fail("Grid has not been initialized");

        const isValid = x >= 0 && x < this.grid.width && y >= 0 && y < this.grid.height;
        return Result.Success(isValid);
    }


    // Business Logic
    isTileOccupied(x: number, y: number): Result<boolean> {
        if (!this.grid) return Result.Fail("Grid has not been initialized");

        const tile = this.getTileAtPosition(x, y);
        if (!tile.value || !tile.success) {
            return Result.Fail("Could not find the tile at given position.");
        }

        if (tile.value.occupiedByUnitId) {
            return Result.Success(true);
        } else {
            return Result.Success(false);
        }
    }

    setTileOccupation(x: number, y: number, unitId: string | undefined): Result<void> {
        if (!this.grid) return Result.Fail("Grid has not been initialized");

        const tile = this.getTileAtPosition(x, y);
        if (!tile.success || !tile.value) {
            return Result.Fail(`Could not find tile at position (${x}, ${y})`);
        }

        tile.value.occupiedByUnitId = unitId;
        return Result.Success(undefined);
    }

    clearTileOccupation(x: number, y: number): Result<void> {
        return this.setTileOccupation(x, y, undefined);
    }

}