import { Grid } from "../../models/grid/grid";
import { ITile } from "../../models/grid/itile";
import { IUnit, UnitFaction, UnitStats } from "../../models/units/iunit";
import { Coordinate } from "../../models/grid/coordinate";
import { Result } from "../../utils/resultclass";

export interface IGridManager {
    buildGridFromArr(arr: string[][]): Result<boolean>;
    setGrid(grid: Grid): Result<boolean>;
    getGrid(): Result<Grid>;
    getTileAtPosition(x: number, y: number): Result<ITile>;
    setTileOccupation(x: number, y: number, unitId: string | undefined): Result<void>;
    clearTileOccupation(x: number, y: number): Result<void>;
    isTileOccupied(x: number, y: number): Result<boolean>;
    isValidPosition(x: number, y: number): Result<boolean>;
}

export interface IUnitManager {
    setUnit(unit: IUnit): Result<boolean>;
    removeUnit(id: string): Result<boolean>;
    getUnitById(id: string): Result<IUnit>;
    getUnitAtPosition(x: number, y: number): Result<IUnit>;
    getUnitsByFaction(factionType: UnitFaction): Result<IUnit[]>;
    getUnitStats(id: string): Result<UnitStats>;
    getAllUnits(): Result<IUnit[]>;
    getAliveUnits(): Result<IUnit[]>;
    markUnitActed(id: string): Result<boolean>;
    markUnitUnacted(id: string): Result<boolean>;
    isUnitActed(id: string): Result<boolean>;
    setUnitPosition(id: string, x: number, y: number): Result<boolean>;
}

export interface IMovementManager {
    moveUnit(id: string, path: Coordinate[]): Result<boolean>;
    getMovementRange(unitId: string): Result<Coordinate[]>;
}

export interface IPathfindingManager {
    getMovementRange(unitId: string): Result<Coordinate[]>;
    findPath(unitId: string, from: Coordinate, to: Coordinate): Result<Coordinate[]>;
    validatePath(path: Coordinate[], unitId: string): Result<void>;
}