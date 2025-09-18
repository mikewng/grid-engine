import { Coordinate } from "../../models/grid/coordinate";
import { ITile } from "../../models/grid/itile";
import { IUnit } from "../../models/units/iunit";
import { Result } from "../../utils/resultclass";

export interface MovementCostCalculator {
    calculateCost(tile: ITile, unit: IUnit): number;
}

export interface PathValidator {
    validatePath(path: Coordinate[], unit: IUnit): Result<void>;
    validateStep(coordinate: Coordinate, unit: IUnit): Result<void>;
}

export interface MovementTracker {
    initializeBudget(unit: IUnit): number;
    consumeBudget(current: number, cost: number): Result<number>;
}

export interface GridMutator {
    moveUnit(unit: IUnit, newPosition: Coordinate): Result<void>;
    canOccupy(position: Coordinate): boolean;
}

export interface PathfindingService {
    calculateMovementRange(unit: IUnit, movementBudget: number): Result<Coordinate[]>;
    findPath(unit: IUnit, from: Coordinate, to: Coordinate): Result<Coordinate[]>;
}