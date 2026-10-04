import { Coordinate } from "../models/grid/coordinate";
import { IUnit } from "../models/units/iunit";
import { currentMovement } from "../models/units/statuseffects";
import { Ruleset } from "../rules/ruleset";
import { computeDistanceMap, DistanceMap, pathTo, reachableTiles } from "../utils/pathing/distancemap";
import { Result } from "../utils/resultclass";
import { IGridManager, IMovementManager, IUnitManager, MovementOptions } from "./interfaces/manager-interfaces";

export class MovementManager implements IMovementManager {
    constructor(
        private units: IUnitManager,
        private grid: IGridManager,
        private rules: Ruleset,
    ) { }

    getDistanceMap(unitId: string, options: MovementOptions = {}): Result<DistanceMap> {
        const unit = this.units.getUnitById(unitId);
        if (!unit.success) return Result.Fail(unit.err);

        const gridResult = this.grid.getGrid();
        if (!gridResult.success) return Result.Fail(gridResult.err);

        const { width, height } = gridResult.value;
        const origin = options.from ?? unit.value.position;
        const budget = options.budget ?? currentMovement(unit.value);

        return Result.Success(computeDistanceMap(width, height, origin, budget, (to) => this.stepCost(unit.value, to)));
    }

    getMovementRange(unitId: string): Result<Coordinate[]> {
        const map = this.getDistanceMap(unitId);
        if (!map.success) return Result.Fail(map.err);

        const unit = this.units.getUnitById(unitId).value!;
        return Result.Success(reachableTiles(map.value).filter(tile => this.canStopAt(unit, tile)));
    }

    findPath(unitId: string, destination: Coordinate): Result<Coordinate[]> {
        const map = this.getDistanceMap(unitId);
        if (!map.success) return Result.Fail(map.err);

        const unit = this.units.getUnitById(unitId).value!;

        if (!this.canStopAt(unit, destination)) {
            return Result.Fail(`(${destination.x}, ${destination.y}) is occupied or off the map`);
        }

        const path = pathTo(map.value, destination);
        if (!path) return Result.Fail(`(${destination.x}, ${destination.y}) is outside movement range`);

        return Result.Success(path);
    }

    moveUnit(unitId: string, path: Coordinate[]): Result<Coordinate[]> {
        const unitResult = this.units.getUnitById(unitId);
        if (!unitResult.success) return Result.Fail(unitResult.err);

        const unit = unitResult.value;
        const canMove = this.checkCanMove(unit);
        if (!canMove.success) return Result.Fail(canMove.err);

        // Walk the path, checking every step is adjacent, enterable and affordable
        let budget = currentMovement(unit);
        let from = unit.position;

        for (const step of path) {
            if (Math.abs(step.x - from.x) + Math.abs(step.y - from.y) !== 1) {
                return Result.Fail(`Step to (${step.x}, ${step.y}) is not adjacent to (${from.x}, ${from.y})`);
            }

            const cost = this.stepCost(unit, step);
            if (cost === null) return Result.Fail(`(${step.x}, ${step.y}) can't be entered`);

            budget -= cost;
            if (budget < 0) return Result.Fail("Path costs more movement than the unit has");

            from = step;
        }

        if (!this.canStopAt(unit, from)) {
            return Result.Fail(`(${from.x}, ${from.y}) is occupied`);
        }

        this.units.setUnitPosition(unit.id, from.x, from.y);
        unit.hasMoved = true;
        this.grid.refreshOccupancy(this.units.getAllUnits().value!);

        return Result.Success(path.map(step => ({ ...step })));
    }

    moveUnitTo(unitId: string, destination: Coordinate): Result<Coordinate[]> {
        const unitResult = this.units.getUnitById(unitId);
        if (!unitResult.success) return Result.Fail(unitResult.err);

        const canMove = this.checkCanMove(unitResult.value);
        if (!canMove.success) return Result.Fail(canMove.err);

        const path = this.findPath(unitId, destination);
        if (!path.success) return path;

        return this.moveUnit(unitId, path.value);
    }

    returnUnit(unitId: string, to: Coordinate): Result<void> {
        const unitResult = this.units.getUnitById(unitId);
        if (!unitResult.success) return Result.Fail(unitResult.err);

        const unit = unitResult.value;

        if (!unit.isAlive) return Result.Fail(`${unit.name} has been defeated`);
        if (unit.hasActed) return Result.Fail(`${unit.name} has already acted this turn`);
        if (!unit.hasMoved) return Result.Fail(`${unit.name} hasn't moved this turn`);
        if (!this.canStopAt(unit, to)) return Result.Fail(`(${to.x}, ${to.y}) is occupied or off the map`);

        this.units.setUnitPosition(unit.id, to.x, to.y);
        unit.hasMoved = false;
        this.grid.refreshOccupancy(this.units.getAllUnits().value!);

        return Result.Success(undefined);
    }

    /** Whether the unit may end its move here: on the map and empty (or its own tile). */
    canStopAt(unit: IUnit, tile: Coordinate): boolean {
        if (!this.grid.isValidPosition(tile.x, tile.y)) return false;

        const occupant = this.units.getUnitAtPosition(tile.x, tile.y);
        return !occupant.success || occupant.value.id === unit.id;
    }

    /** Cost for the unit to step onto a tile: terrain cost, or null if terrain or an enemy blocks it. */
    private stepCost(unit: IUnit, tile: Coordinate): number | null {
        const terrain = this.grid.getTerrainAt(tile.x, tile.y);
        if (!terrain.success) return null;

        const cost = this.rules.movement.terrainCost(unit, terrain.value);
        if (cost === null) return null;

        // Allies can be passed through (but not stopped on); enemies block the way
        const occupant = this.units.getUnitAtPosition(tile.x, tile.y);
        if (occupant.success && this.rules.factions.areHostile(unit.unitFaction, occupant.value.unitFaction)) {
            return null;
        }

        return cost;
    }

    private checkCanMove(unit: IUnit): Result<void> {
        if (!unit.isAlive) return Result.Fail(`${unit.name} has been defeated`);
        if (unit.hasActed) return Result.Fail(`${unit.name} has already acted this turn`);
        if (unit.hasMoved) return Result.Fail(`${unit.name} has already moved this turn`);
        return Result.Success(undefined);
    }
}
