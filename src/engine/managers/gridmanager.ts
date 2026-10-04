import { Grid } from "../models/grid/grid";
import { TileType } from "../models/grid/itile";
import { Tile } from "../models/grid/tile";
import { TerrainDefinition, TerrainTable } from "../models/grid/terrain";
import { IUnit } from "../models/units/iunit";
import { Result } from "../utils/resultclass";
import { IGridManager } from "./interfaces/manager-interfaces";

export class GridManager implements IGridManager {
    private grid: Grid | null = null;

    /**
     * @param terrain what each tile type does (costs, avoid, defense)
     * @param legend which map character stands for which tile type
     */
    constructor(
        private terrain: TerrainTable,
        private legend: Record<string, TileType>,
    ) { }

    // Generic Functions
    buildGridFromArr(arr: string[][]): Result<boolean> {
        if (!arr || arr.length === 0) {
            return Result.Fail("Array cannot be empty");
        }

        const height = arr.length;
        const width = arr[0].length;

        for (const row of arr) {
            if (row.length !== width) {
                return Result.Fail("All rows must have the same length");
            }
        }

        const gridContent: Tile[][] = [];

        for (let y = 0; y < height; y++) {
            const row: Tile[] = [];
            for (let x = 0; x < width; x++) {
                const tileChar = arr[y][x];
                const tileType = this.legend[tileChar];

                if (tileType === undefined) {
                    return Result.Fail(`Unknown tile character: '${tileChar}' at position (${x}, ${y})`);
                }

                row.push(new Tile(tileType, x, y));
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

        if (!this.isValidPosition(x, y)) {
            return Result.Fail(`Position (${x}, ${y}) is out of bounds`);
        }

        return Result.Success(this.grid.gridcontent[y][x]);
    }

    setTileAtPosition(x: number, y: number, tileType: TileType): Result<Tile> {
        const tile = this.getTileAtPosition(x, y);
        if (!tile.success) return tile;

        // Costs and cover are looked up from the type, so they follow automatically
        tile.value.type = tileType;
        return tile;
    }

    getTerrain(tileType: TileType): TerrainDefinition {
        return this.terrain[tileType];
    }

    getTerrainAt(x: number, y: number): Result<TerrainDefinition> {
        const tile = this.getTileAtPosition(x, y);
        if (!tile.success) return Result.Fail(tile.err);

        return Result.Success(this.getTerrain(tile.value.type));
    }

    getTilesByType(tileType: TileType): Result<Tile[]> {
        return this.filterTiles(tile => tile.type === tileType);
    }

    getOccupiedTiles(): Result<Tile[]> {
        return this.filterTiles(tile => !!tile.occupiedByUnitId);
    }

    getEmptyTiles(): Result<Tile[]> {
        return this.filterTiles(tile => !tile.occupiedByUnitId);
    }

    getAllTiles(): Result<Tile[]> {
        return this.filterTiles(() => true);
    }

    isValidPosition(x: number, y: number): boolean {
        return !!this.grid && x >= 0 && x < this.grid.width && y >= 0 && y < this.grid.height;
    }

    // Business Logic
    isTileOccupied(x: number, y: number): Result<boolean> {
        const tile = this.getTileAtPosition(x, y);
        if (!tile.success) return Result.Fail(tile.err);

        return Result.Success(!!tile.value.occupiedByUnitId);
    }

    /**
     * Rebuild every tile's occupant from unit positions. Positions are the
     * source of truth; tiles only mirror them, so the two can't drift apart.
     */
    refreshOccupancy(units: IUnit[]): void {
        if (!this.grid) return;

        for (const row of this.grid.gridcontent) {
            for (const tile of row) {
                tile.occupiedByUnitId = undefined;
            }
        }

        for (const unit of units) {
            if (unit.isAlive && this.isValidPosition(unit.position.x, unit.position.y)) {
                this.grid.gridcontent[unit.position.y][unit.position.x].occupiedByUnitId = unit.id;
            }
        }
    }

    private filterTiles(predicate: (tile: Tile) => boolean): Result<Tile[]> {
        if (!this.grid) return Result.Fail("Grid has not been initialized");

        return Result.Success(this.grid.gridcontent.flat().filter(predicate));
    }
}
