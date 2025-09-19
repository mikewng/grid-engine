import { Coordinate } from "../../models/grid/coordinate";
import { IGridManager, IUnitManager } from "../interfaces/manager-interfaces";
import { GridMutator } from "../interfaces/movement-interfaces";
import { Result } from "../../utils/resultclass";
import { IUnit } from "../../models/units/iunit";

export class BasicGridMutator implements GridMutator {
    constructor(
        private gridManager: IGridManager,
        private unitManager: IUnitManager
    ) {}

    moveUnit(unit: IUnit, newPosition: Coordinate): Result<void> {
        const clearResult = this.gridManager.clearTileOccupation(unit.position.x, unit.position.y);
        if (!clearResult.success) {
            return Result.Fail(clearResult.err || "Failed to clear old tile");
        }

        const setResult = this.gridManager.setTileOccupation(newPosition.x, newPosition.y, unit.id);
        if (!setResult.success) {
            this.gridManager.setTileOccupation(unit.position.x, unit.position.y, unit.id);
            return Result.Fail(setResult.err || "Failed to set new tile occupation");
        }

        const updateResult = this.unitManager.setUnitPosition(unit.id, newPosition.x, newPosition.y);
        if (!updateResult.success) {
            this.gridManager.clearTileOccupation(newPosition.x, newPosition.y);
            this.gridManager.setTileOccupation(unit.position.x, unit.position.y, unit.id);
            return Result.Fail(updateResult.err || "Failed to update unit position");
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