import { Coordinate } from "../models/grid/coordinate";
import { Result } from "../utils/resultclass";
import { UnitManager } from "./unitmanager";
import { GridMutator } from "./interfaces/movement-interfaces";
import { IUnit } from "../models/units/iunit";
import { PathfindingManager } from "./pathfindingmanager";

export class MovementManager {
    constructor(
        private units: UnitManager,
        private pathfindingManager: PathfindingManager,
        private gridMutator: GridMutator
    ) { }

    moveUnit(id: string, path: Coordinate[]): Result<boolean> {
        const unit = this.units.getUnitById(id);
        if (!unit.success || !unit.value) {
            return Result.Fail("Could not find unit for moveUnit()");
        }

        // Validate path structure and obstacles
        const pathValidation = this.pathfindingManager.validatePath(path, id);
        if (!pathValidation.success) {
            return Result.Fail(pathValidation.err || "Path validation failed");
        }

        // Validate movement is within range
        const rangeValidation = this.validateMovementRange(id, path);
        if (!rangeValidation.success) {
            return Result.Fail(rangeValidation.err || "Movement out of range");
        }

        const movementResult = this.executeMovement(unit.value, path);
        if (!movementResult.success) {
            return movementResult;
        }

        this.units.markUnitActed(id);
        return Result.Success(true);
    }

    private executeMovement(unit: IUnit, path: Coordinate[]): Result<boolean> {
        const visited: Coordinate[] = [unit.position];

        for (const step of path) {
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
        return this.pathfindingManager.getMovementRange(unitId);
    }

    private validateMovementRange(unitId: string, path: Coordinate[]): Result<void> {
        if (path.length === 0) {
            return Result.Success(undefined);
        }

        const targetPosition = path[path.length - 1];
        const movementRange = this.getMovementRange(unitId);

        if (!movementRange.success || !movementRange.value) {
            return Result.Fail("Could not calculate movement range");
        }

        const isInRange = movementRange.value.some(coord =>
            coord.x === targetPosition.x && coord.y === targetPosition.y
        );

        if (!isInRange) {
            return Result.Fail(`Target position (${targetPosition.x}, ${targetPosition.y}) is outside movement range`);
        }

        return Result.Success(undefined);
    }

}