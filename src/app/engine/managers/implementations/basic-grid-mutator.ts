import { Coordinate } from "../../models/grid/coordinate";
import { GridManager } from "../gridmanager";
import { GridMutator } from "../interfaces/movement-interfaces";
import { Result } from "../../utils/resultclass";

export class BasicGridMutator implements GridMutator {
    constructor(private gridManager: GridManager) {}

    moveUnit(unit: Unit, newPosition: Coordinate): Result<void> {
        const moveResult = this.gridManager.moveUnitOnGrid(unit, newPosition.x, newPosition.y);
        if (!moveResult.success) {
            return Result.Fail(moveResult.err || "Failed to move unit on grid");
        }
        return Result.Success(undefined);
    }

    canOccupy(position: Coordinate): boolean {
        const tile = this.gridManager.getTileAtPosition(position.x, position.y);
        if (!tile.success || !tile.value) {
            return false;
        }
        return !tile.value.occupiedByUnitId;
    }
}