import { Grid } from "../../models/grid/grid";
import { ITile, TileType } from "../../models/grid/itile";
import { TerrainDefinition } from "../../models/grid/terrain";
import { IUnit, UnitFaction, UnitStats } from "../../models/units/iunit";
import { Coordinate } from "../../models/grid/coordinate";
import { Result } from "../../utils/resultclass";
import { DistanceMap } from "../../utils/pathing/distancemap";
import { CombatOutcome } from "../../rules/combatresolver";
import { DisplayStats } from "../../rules/ruleset";

export interface IGridManager {
    buildGridFromArr(arr: string[][]): Result<boolean>;
    setGrid(grid: Grid): Result<boolean>;
    getGrid(): Result<Grid>;
    getTileAtPosition(x: number, y: number): Result<ITile>;
    setTileAtPosition(x: number, y: number, tileType: TileType): Result<ITile>;
    getTerrain(tileType: TileType): TerrainDefinition;
    getTerrainAt(x: number, y: number): Result<TerrainDefinition>;
    isTileOccupied(x: number, y: number): Result<boolean>;
    isValidPosition(x: number, y: number): boolean;
    /** Rebuild every tile's occupant from unit positions. */
    refreshOccupancy(units: IUnit[]): void;
}

export interface IUnitManager {
    setUnit(unit: IUnit): Result<boolean>;
    removeUnit(id: string): Result<boolean>;
    getUnitById(id: string): Result<IUnit>;
    /** The living unit on a tile. */
    getUnitAtPosition(x: number, y: number): Result<IUnit>;
    getUnitsByFaction(factionType: UnitFaction): Result<IUnit[]>;
    getUnitStats(id: string): Result<UnitStats>;
    getAllUnits(): Result<IUnit[]>;
    getAliveUnits(): Result<IUnit[]>;
    getActiveUnits(): Result<IUnit[]>;
    markUnitActed(id: string): Result<boolean>;
    markUnitUnacted(id: string): Result<boolean>;
    patchUnit(id: string, changes: Partial<IUnit>): Result<IUnit>;
    isUnitActed(id: string): Result<boolean>;
    setUnitPosition(id: string, x: number, y: number): Result<boolean>;
    /** Set HP to 0 and take the unit out of play. */
    killUnit(id: string): Result<boolean>;
    /** Let every living unit of a faction move and act again. */
    resetTurnFlags(faction: UnitFaction): void;
}

export interface MovementOptions {
    /** Search from here instead of the unit's position. */
    from?: Coordinate;
    /** Movement points to spend. Defaults to the unit's current movement; Infinity measures the whole map. */
    budget?: number;
}

export interface IMovementManager {
    /** Cheapest cost to every tile the unit can pass through. */
    getDistanceMap(unitId: string, options?: MovementOptions): Result<DistanceMap>;
    /** Tiles the unit can end its move on this turn, including the one it stands on. */
    getMovementRange(unitId: string): Result<Coordinate[]>;
    /** Cheapest path to a destination: every step after the start, ending on the destination. */
    findPath(unitId: string, destination: Coordinate): Result<Coordinate[]>;
    /** Move along a given path, checking every step. An empty path means staying put. */
    moveUnit(unitId: string, path: Coordinate[]): Result<Coordinate[]>;
    /** Move along the cheapest path to a destination. */
    moveUnitTo(unitId: string, destination: Coordinate): Result<Coordinate[]>;
    /** Take back a move: put a unit that has moved but not acted back on `to`, free to move again. */
    returnUnit(unitId: string, to: Coordinate): Result<void>;
}

export interface ICombatManager {
    /** The fight that would happen, with every strike landing and no crits. No randomness is used. */
    forecast(attackerId: string, defenderId: string, from?: Coordinate): Result<CombatOutcome>;
    /** Fight for real and apply the result. */
    initiateAttack(attackerId: string, defenderId: string): Result<CombatOutcome>;
    /** Tiles the unit's weapon reaches from its position (or from `from`). */
    getAttackRange(unitId: string, from?: Coordinate): Result<Coordinate[]>;
    getAttackableTargets(unitId: string, from?: Coordinate): Result<IUnit[]>;
    canAttackTarget(attackerId: string, targetId: string, from?: Coordinate): Result<boolean>;
    getDisplayStats(unitId: string): Result<DisplayStats>;
}
