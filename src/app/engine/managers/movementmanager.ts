import { Coordinate } from "../models/grid/coordinate";
import { Result } from "../utils/resultclass";
import { GridManager } from "./gridmanager";
import { UnitManager } from "./unitmanager";
import {
    MovementCostCalculator,
    PathValidator,
    MovementTracker,
    GridMutator
} from "./interfaces/movement-interfaces";

export class MovementManager {
    constructor(
        private units: UnitManager,
        private grid: GridManager,
        private costCalculator: MovementCostCalculator,
        private pathValidator: PathValidator,
        private movementTracker: MovementTracker,
        private gridMutator: GridMutator
    ) { }

    moveUnit(id: string, path: Coordinate[]): Result<boolean> {
        const unit = this.units.getUnitById(id);
        if (!unit.success || !unit.value) {
            return Result.Fail("Could not find unit for moveUnit()");
        }

        const pathValidation = this.pathValidator.validatePath(path, unit.value);
        if (!pathValidation.success) {
            return Result.Fail(pathValidation.err || "Path validation failed");
        }

        const movementResult = this.executeMovement(unit.value, path);
        if (!movementResult.success) {
            return movementResult;
        }

        this.units.markUnitActed(id);
        return Result.Success(true);
    }

    private executeMovement(unit: Unit, path: Coordinate[]): Result<boolean> {
        let budget = this.movementTracker.initializeBudget(unit);
        const visited: Coordinate[] = [unit.position];

        for (const step of path) {
            const tile = this.grid.getTileAtPosition(step.x, step.y);
            if (!tile.success || !tile.value) {
                this.rollbackMovement(unit, visited);
                return Result.Fail("Could not find tile for movement step");
            }

            const movementCost = this.costCalculator.calculateCost(tile.value, unit);
            const budgetResult = this.movementTracker.consumeBudget(budget, movementCost);
            if (!budgetResult.success || !budgetResult.value) {
                this.rollbackMovement(unit, visited);
                return Result.Fail(budgetResult.err || "Movement budget exceeded");
            }
            budget = budgetResult.value;

            const moveResult = this.gridMutator.moveUnit(unit, step);
            if (!moveResult.success) {
                this.rollbackMovement(unit, visited);
                return Result.Fail(moveResult.err || "Failed to move unit on grid");
            }

            visited.push(step);
        }

        return Result.Success(true);
    }

    private rollbackMovement(unit: Unit, visited: Coordinate[]): void {
        if (visited.length > 0) {
            this.gridMutator.moveUnit(unit, visited[0]);
        }
    }
}