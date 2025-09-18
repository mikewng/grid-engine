import { Coordinate } from "../../models/grid/coordinate";
import { GridManager } from "../gridmanager";
import { PathValidator } from "../interfaces/movement-interfaces";
import { Result } from "../../utils/resultclass";
import { Unit } from "../../models/units/unit";

export class BasicPathValidator implements PathValidator {
    constructor(private gridManager: GridManager) {}

    validatePath(path: Coordinate[], unit: Unit): Result<void> {
        if (path.length === 0) {
            return Result.Fail("Path cannot be empty");
        }

        for (const step of path) {
            const stepValidation = this.validateStep(step, unit);
            if (!stepValidation.success) {
                return stepValidation;
            }
        }

        return Result.Success(undefined);
    }

    validateStep(coordinate: Coordinate, unit: Unit): Result<void> {
        const isValidPosition = this.gridManager.isValidPosition(coordinate.x, coordinate.y);
        if (!isValidPosition.success || !isValidPosition.value) {
            return Result.Fail(`Invalid position: (${coordinate.x}, ${coordinate.y})`);
        }

        const tile = this.gridManager.getTileAtPosition(coordinate.x, coordinate.y);
        if (!tile.success || !tile.value) {
            return Result.Fail(`Could not get tile at position: (${coordinate.x}, ${coordinate.y})`);
        }

        if (tile.value.occupiedByUnitId && tile.value.occupiedByUnitId !== unit.id) {
            return Result.Fail(`Tile at (${coordinate.x}, ${coordinate.y}) is occupied by another unit`);
        }

        return Result.Success(undefined);
    }
}