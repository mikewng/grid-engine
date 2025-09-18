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
import { IUnit } from "../models/units/iunit";

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

    private executeMovement(unit: IUnit, path: Coordinate[]): Result<boolean> {
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

    private rollbackMovement(unit: IUnit, visited: Coordinate[]): void {
        if (visited.length > 0) {
            this.gridMutator.moveUnit(unit, visited[0]);
        }
    }

    getMovementRange(unitId: string): Result<Coordinate[]> {
        const unit = this.units.getUnitById(unitId);
        if (!unit.success || !unit.value) {
            return Result.Fail("Could not find unit for getMovementRange()");
        }

        const movementBudget = this.movementTracker.initializeBudget(unit.value);
        const reachableTiles: Coordinate[] = [];
        const visited = new Set<string>();
        const queue: Array<{ position: Coordinate, remainingBudget: number }> = [];

        queue.push({ position: unit.value.position, remainingBudget: movementBudget });
        visited.add(`${unit.value.position.x},${unit.value.position.y}`);

        while (queue.length > 0) {
            const current = queue.shift()!;

            const neighbors = this.getAdjacentTiles(current.position);
            for (const neighbor of neighbors) {
                const positionKey = `${neighbor.x},${neighbor.y}`;

                if (visited.has(positionKey)) {
                    continue;
                }

                const stepValidation = this.pathValidator.validateStep(neighbor, unit.value);
                if (!stepValidation.success) {
                    continue;
                }

                const tile = this.grid.getTileAtPosition(neighbor.x, neighbor.y);
                if (!tile.success || !tile.value) {
                    continue;
                }

                const movementCost = this.costCalculator.calculateCost(tile.value, unit.value);
                const budgetResult = this.movementTracker.consumeBudget(current.remainingBudget, movementCost);

                if (budgetResult.success && budgetResult.value !== undefined && budgetResult.value >= 0) {
                    visited.add(positionKey);
                    reachableTiles.push(neighbor);

                    if (budgetResult.value > 0) {
                        queue.push({
                            position: neighbor,
                            remainingBudget: budgetResult.value
                        });
                    }
                }
            }
        }

        return Result.Success(reachableTiles);
    }

    private getAdjacentTiles(position: Coordinate): Coordinate[] {
        const adjacent: Coordinate[] = [];
        const directions = [
            { x: 0, y: -1 }, // North
            { x: 1, y: 0 },  // East
            { x: 0, y: 1 },  // South
            { x: -1, y: 0 }  // West
        ];

        for (const direction of directions) {
            const newPosition = {
                x: position.x + direction.x,
                y: position.y + direction.y
            };

            const isValid = this.grid.isValidPosition(newPosition.x, newPosition.y);
            if (isValid.success && isValid.value) {
                adjacent.push(newPosition);
            }
        }

        return adjacent;
    }
}