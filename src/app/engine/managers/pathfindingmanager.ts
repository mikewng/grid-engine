import { Coordinate } from "../models/grid/coordinate";
import { Result } from "../utils/resultclass";
import { IGridManager, IUnitManager, IPathfindingManager } from "./interfaces/manager-interfaces";
import {
    MovementCostCalculator,
    PathValidator,
    MovementTracker,
    PathfindingService
} from "./interfaces/movement-interfaces";
import { IUnit } from "../models/units/iunit";

export class PathfindingManager implements IPathfindingManager {
    constructor(
        private units: IUnitManager,
        private grid: IGridManager,
        private costCalculator: MovementCostCalculator,
        private pathValidator: PathValidator,
        private movementTracker: MovementTracker,
        private pathfindingService: PathfindingService
    ) { }

    getMovementRange(unitId: string): Result<Coordinate[]> {
        const unit = this.units.getUnitById(unitId);
        if (!unit.success || !unit.value) {
            return Result.Fail("Could not find unit for getMovementRange()");
        }

        const movementBudget = this.movementTracker.initializeBudget(unit.value);
        return this.pathfindingService.calculateMovementRange(unit.value, movementBudget);
    }

    findPath(unitId: string, from: Coordinate, to: Coordinate): Result<Coordinate[]> {
        const unit = this.units.getUnitById(unitId);
        if (!unit.success || !unit.value) {
            return Result.Fail("Could not find unit for findPath()");
        }

        return this.pathfindingService.findPath(unit.value, from, to);
    }

    validatePath(path: Coordinate[], unitId: string): Result<void> {
        const unit = this.units.getUnitById(unitId);
        if (!unit.success || !unit.value) {
            return Result.Fail("Could not find unit for validatePath()");
        }

        return this.pathValidator.validatePath(path, unit.value);
    }
}