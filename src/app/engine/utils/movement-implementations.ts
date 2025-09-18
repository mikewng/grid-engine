import { Coordinate } from "../models/grid/coordinate";
import { ITile } from "../models/grid/itile";
import { Unit } from "../models/units/iunit";
import { Result } from "./resultclass";
import {
    MovementCostCalculator,
    PathValidator,
    MovementTracker,
    GridMutator
} from "../managers/interfaces/movement-interfaces";
import { GridManager } from "../managers/gridmanager";
import { UnitManager } from "../managers/unitmanager";

export class BasicMovementCostCalculator implements MovementCostCalculator {
    calculateCost(tile: ITile, unit: Unit): number {
        return tile.movementCost;
    }
}

export class BasicPathValidator implements PathValidator {
    constructor(private gridManager: GridManager) {}

    validatePath(path: Coordinate[], unit: Unit): Result<void> {
        if (path.length === 0) {
            return Result.Fail("Path cannot be empty");
        }

        // Check if path starts from unit's current position or adjacent to it
        const startPos = path[0];
        const unitPos = unit.position;
        const distance = Math.abs(startPos.x - unitPos.x) + Math.abs(startPos.y - unitPos.y);
        if (distance > 1 && !(startPos.x === unitPos.x && startPos.y === unitPos.y)) {
            return Result.Fail("Path must start from unit's current position or adjacent tile");
        }

        // Validate each step
        for (const coord of path) {
            const stepResult = this.validateStep(coord, unit);
            if (!stepResult.success) {
                return stepResult;
            }
        }

        return Result.Success(undefined);
    }

    validateStep(coordinate: Coordinate, unit: Unit): Result<void> {
        const positionValid = this.gridManager.isValidPosition(coordinate.x, coordinate.y);
        if (!positionValid.success || !positionValid.value) {
            return Result.Fail(`Invalid position: (${coordinate.x}, ${coordinate.y})`);
        }

        const occupied = this.gridManager.isTileOccupied(coordinate.x, coordinate.y);
        if (!occupied.success) {
            return Result.Fail(occupied.err || "Could not check tile occupation");
        }

        if (occupied.value) {
            return Result.Fail(`Tile (${coordinate.x}, ${coordinate.y}) is occupied`);
        }

        return Result.Success(undefined);
    }
}

export class BasicMovementTracker implements MovementTracker {
    initializeBudget(unit: Unit): number {
        return unit.stats.movement;
    }

    consumeBudget(current: number, cost: number): Result<number> {
        const remaining = current - cost;
        if (remaining < 0) {
            return Result.Fail("Insufficient movement budget");
        }
        return Result.Success(remaining);
    }
}

export class BasicGridMutator implements GridMutator {
    constructor(
        private gridManager: GridManager,
        private unitManager: UnitManager
    ) {}

    moveUnit(unit: Unit, newPosition: Coordinate): Result<void> {
        // Clear old position
        const oldTile = this.gridManager.getTileAtPosition(unit.position.x, unit.position.y);
        if (oldTile.success && oldTile.value) {
            oldTile.value.occupiedByUnitId = undefined;
        }

        // Set new position
        const newTile = this.gridManager.getTileAtPosition(newPosition.x, newPosition.y);
        if (!newTile.success || !newTile.value) {
            return Result.Fail("Could not find target tile");
        }

        newTile.value.occupiedByUnitId = unit.id;

        // Update unit position
        const updateResult = this.unitManager.setUnitPosition(unit.id, newPosition.x, newPosition.y);
        if (!updateResult.success) {
            return Result.Fail(updateResult.err || "Failed to update unit position");
        }

        return Result.Success(undefined);
    }

    canOccupy(position: Coordinate): boolean {
        const occupied = this.gridManager.isTileOccupied(position.x, position.y);
        return occupied.success && !occupied.value;
    }
}