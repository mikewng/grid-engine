import { Coordinate } from "../../models/grid/coordinate";
import { ITile } from "../../models/grid/itile";
import { Unit } from "../../models/units/unit";
import { Result } from "../../utils/resultclass";

export interface MovementCostCalculator {
    calculateCost(tile: ITile, unit: Unit): number;
}

export interface PathValidator {
    validatePath(path: Coordinate[], unit: Unit): Result<void>;
    validateStep(coordinate: Coordinate, unit: Unit): Result<void>;
}

export interface MovementTracker {
    initializeBudget(unit: Unit): number;
    consumeBudget(current: number, cost: number): Result<number>;
}

export interface GridMutator {
    moveUnit(unit: Unit, newPosition: Coordinate): Result<void>;
    canOccupy(position: Coordinate): boolean;
}